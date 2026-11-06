import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

export default function Templates() {
  const { t, formatDate } = useI18n();
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.listTemplates().then(setTemplates).catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createEmpty(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      // A template saved here starts blank — the usual flow is designing a piece in the
      // order editor and saving it as a template from there (same design shape either way).
      await api.createTemplate({ name: name.trim(), design: { front: [], back: [] } });
      setName("");
      load();
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await api.deleteTemplate(id);
    load();
  }

  return (
    <WorkspaceLayout section="templates">
      <h2>{t("ws_templates_title")}</h2>

      <form onSubmit={createEmpty} className="row wrap" style={{ margin: "18px 0" }}>
        <input
          className="control"
          placeholder={t("ws_template_name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <button className="btn primary" type="submit" disabled={busy}>
          {t("ws_templates_new")}
        </button>
      </form>

      {error && <div className="notice" role="alert">{error}</div>}
      {templates === null && !error && <p className="small">{t("common_loading")}</p>}

      {templates !== null && (
        templates.length === 0 ? (
          <div className="empty"><strong>{t("ws_templates_empty")}</strong></div>
        ) : (
          <div className="grid">
            {templates.map((tpl) => (
              <div className="card pad" key={tpl.id}>
                <span className="eyebrow">SAVED DESIGN</span>
                <h3 style={{ marginTop: 14 }}>{tpl.name}</h3>
                <p className="small">
                  {(tpl.design.front || []).length} front layer(s) · {(tpl.design.back || []).length} back layer(s)
                </p>
                <p className="small">{formatDate(tpl.createdAt)}</p>
                <button className="btn danger small" onClick={() => remove(tpl.id)}>
                  {t("ws_template_delete")}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </WorkspaceLayout>
  );
}
