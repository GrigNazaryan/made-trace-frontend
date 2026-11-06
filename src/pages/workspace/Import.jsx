import { useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

function parseRows(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [customerName, email, orderTitle, quantity] = line.split(",").map((s) => s.trim());
      return { customerName, email, orderTitle, quantity: Number(quantity) };
    });
}

export default function Import() {
  const { t } = useI18n();
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const rows = parseRows(raw);
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const res = await api.importOrders(rows);
      setResult(res.created.length);
      setRaw("");
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceLayout section="import">
      <h2>{t("ws_import_title")}</h2>
      <p className="small" style={{ marginTop: 8 }}>{t("ws_import_lead")}</p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        {result !== null && <div className="notice">{t("ws_import_result", { count: result })}</div>}
        <textarea
          className="control"
          rows={10}
          placeholder={t("ws_import_placeholder")}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          style={{ fontFamily: "monospace", marginTop: 10 }}
        />
        <button className="btn primary" type="submit" disabled={busy || !raw.trim()} style={{ marginTop: 14 }}>
          {busy ? t("common_loading") : t("ws_import_submit")}
        </button>
      </form>
    </WorkspaceLayout>
  );
}
