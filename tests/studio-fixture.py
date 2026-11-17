import os
import re
import sys
import tempfile
from pathlib import Path
from datetime import timezone

root = Path(__file__).resolve().parents[2]
data = Path(tempfile.mkdtemp(prefix="madetrace-release-preview-"))
os.environ.update(DATABASE_URL="sqlite:///" + (data/"test.db").as_posix(),
                  APP_ENV="test", SECRET_KEY="isolated-fixture-preview-signing-key-" * 2,
                  COOKIE_SECURE="false", COOKIE_SAMESITE="lax",
                  FRONTEND_ORIGINS="http://127.0.0.1:4212", FRONTEND_URL="http://127.0.0.1:4212",
                  GOOGLE_CLIENT_ID="", GOOGLE_CLIENT_SECRET="", GOOGLE_REDIRECT_URI="",
                  MAIL_MODE="file", MAIL_OUTBOX=str(data / "outbox"), SUPABASE_URL="", SUPABASE_SERVICE_ROLE_KEY="")
sys.path.insert(0, str(root/"backend"))
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB
@compiles(JSONB, "sqlite")
def sqlite_json(element, compiler, **kw):
    return "JSON"

from app.main import app
from app import storage
from fastapi import Request, Response, HTTPException
stored = {}
storage.storage_configured = lambda: True
storage.sign_upload = lambda path: {"path": path, "uploadUrl": "http://127.0.0.1:9043/fixture-upload/" + path}
storage.sign_download = lambda path, **kw: "http://127.0.0.1:9043/fixture-art/" + path

@app.put("/fixture-upload/{path:path}")
async def fixture_upload(path: str, request: Request):
    stored[path] = await request.body()
    return {"ok": True}

@app.get("/fixture-art/{path:path}")
def fixture_art(path: str):
    if path not in stored:
        raise HTTPException(404)
    return Response(stored[path], media_type="image/png")

from app.database import Base
from app import orders_common
from sqlalchemy import DateTime, event, text
from sqlalchemy.orm.attributes import set_committed_value
from fastapi.testclient import TestClient
import uvicorn

def dates(instance, *args):
    for column in instance.__mapper__.columns:
        value = getattr(instance, column.key, None)
        if isinstance(column.type, DateTime) and value is not None and value.tzinfo is None:
            set_committed_value(instance, column.key, value.replace(tzinfo=timezone.utc))
event.listen(Base, "load", dates, propagate=True)
event.listen(Base, "refresh", dates, propagate=True)

def local_number(db):
    value = db.execute(text("SELECT COALESCE(MAX(CAST(SUBSTR(number,4) AS INTEGER)),1000) FROM mt_orders")).scalar()
    return f"MT-{int(value)+1}"
orders_common.next_number = local_number

def seed(client, email, company=False):
    body = dict(email=email, fullName="Local Fixture", password="Fixture ONLY 2026", role="company" if company else "customer")
    if company:
        body.update(tosAccepted=True, company=dict(name="Preview Workshop", country="US", city="Test City"))
    before = set((data / "outbox").glob("*.eml"))
    pending = client.post("/api/auth/register", json=body)
    pending.raise_for_status()
    message, = set((data / "outbox").glob("*.eml")) - before
    code = re.search(r"MadeTrace: ([0-9]{6})", message.read_text(encoding="utf-8")).group(1)
    r = client.post("/api/auth/register/verify", json={"ticket":pending.json()["ticket"],"code":code})
    r.raise_for_status()
    client.headers["Authorization"] = "Bearer " + r.json()["accessToken"]

with TestClient(app, headers={"Origin": "http://127.0.0.1:4212"}) as client:
    seed(client, "workshop@example.com", True)
    r = client.put("/api/workspace/profile", json=dict(name="Preview Workshop", country="US", city="Test City", public=True, paymentLink="https://example.com/preview-payment"))
    r.raise_for_status()
    r = client.post("/api/workspace/products", json=dict(name="Preview Tee", base=12, published=True, colors=["#ffffff", "#111111"], sizes=["M"], mockupType="tee"))
    r.raise_for_status()
    for kind in ("cap", "mug", "hoodie"):
        r = client.post("/api/workspace/products", json=dict(name="Preview " + kind, base=12, published=True, colors=["#ffffff","#111111"], sizes=["One size"], mockupType=kind))
        r.raise_for_status()
with TestClient(app, headers={"Origin": "http://127.0.0.1:4212"}) as client:
    seed(client, "buyer@example.com")
    workshop_id = client.get("/api/directory").json()[0]["id"]
    product_id = client.get("/api/workshops/"+workshop_id).json()["products"][0]["id"]
    placed = client.post("/api/orders", json={"workshopId":workshop_id,"lines":[{"id":"fixture-line","productId":product_id,"color":"#ffffff","size":"M","quantity":2}]})
    placed.raise_for_status()
    order_id = placed.json()["id"]
    with TestClient(app, headers={"Origin": "http://127.0.0.1:4212"}) as owner:
        login = owner.post("/api/auth/login", json={"email":"workshop@example.com","password":"Fixture ONLY 2026"})
        login.raise_for_status()
        owner.headers["Authorization"] = "Bearer " + login.json()["accessToken"]
        owner.post("/api/workspace/orders/"+order_id+"/quote", json={"amount":25}).raise_for_status()
        client.post("/api/orders/"+order_id+"/quotes/1/decision", json={"decision":"accepted"}).raise_for_status()
        owner.post("/api/workspace/orders/"+order_id+"/status", json={"status":"ready"}).raise_for_status()
        owner.put("/api/workspace/orders/"+order_id+"/schedule", json={"productionStart":"2026-11-16","productionDue":"2026-11-16","promisedDate":"2026-11-16"}).raise_for_status()
        placed = client.post("/api/orders", json={"workshopId":workshop_id,"lines":[{"id":"fixture-line2","productId":product_id,"color":"#ffffff","size":"M","quantity":3}]})
        placed.raise_for_status()
        owner.put("/api/workspace/orders/"+placed.json()["id"]+"/schedule", json={"productionStart":"2026-11-16"}).raise_for_status()



print("Local preview ready on 9043 with synthetic fixtures only.", flush=True)
uvicorn.run(app, host="127.0.0.1", port=9043, log_level="warning")
