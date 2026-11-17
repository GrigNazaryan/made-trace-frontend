import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import DesignEditor from "../../components/DesignEditor.jsx";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const blank = () => ({name:"", mockupType:"tee", design:{front:[],back:[]}, published:false});

export default function Templates() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    return api.listTemplates().then(setTemplates).catch(err => setError(errorText(t, err.code)));
  }
  useEffect(loadOnMount, []);
  function loadOnMount() { load(); }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const {id, name, mockupType, design, published} = form;
      const payload = {name, mockupType, design, published};
      if (id) await api.updateTemplate(id, payload);
      else await api.createTemplate(payload);
      setForm(null);
      await load();
    } catch (err) { setError(errorText(t, err.code)); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!window.confirm(t("confirm_delete_template"))) return;
    try { await api.deleteTemplate(id); await load(); }
    catch (err) { setError(errorText(t, err.code)); }
  }

  return <WorkspaceLayout section="templates">
    <div className="row between wrap"><h2>{t("ws_templates_title")}</h2>
      {!form && <button type="button" className="btn primary" onClick={() => setForm(blank())}>{t("ws_templates_new")}</button>}
    </div>
    {error && <p className="notice" role="alert">{error}</p>}
    {form ? <form className="card pad stack" onSubmit={save}>
      <label className="field"><span>{t("ws_template_name")}</span><input className="control" required maxLength={80}
        value={form.name} onChange={event => setForm({...form,name:event.target.value})} /></label>
      <label className="field"><span>{t("ws_product_mockup")}</span><select className="control" value={form.mockupType}
        onChange={event => {
          if (form.design.front.length + form.design.back.length && !window.confirm(t("confirm_replace_product"))) return;
          setForm({...form,mockupType:event.target.value,design:{front:[],back:[]}});
        }}>
        {["tee","hoodie","tank","tote","cap","mug"].map(type => <option key={type} value={type}>{t("mockup_"+type)}</option>)}
      </select></label>
      <DesignEditor key={form.mockupType} product={{mockupType:form.mockupType}} color="#f7f7f5"
        value={form.design} allowUpload={false} onChange={design => setForm(current => current && ({...current,design}))} />
      <label className="check-row"><input type="checkbox" checked={form.published}
        onChange={event => setForm({...form,published:event.target.checked})} />{t("template_publish")}</label>
      <p className="small">{t("template_text_only")}</p>
      <div className="row wrap">
        <button className="btn primary" type="submit" disabled={busy}>{t("common_save")}</button>
        <button className="btn secondary" type="button" onClick={() => setForm(null)}>{t("common_cancel")}</button>
      </div>
    </form> : templates === null ? <p>{t("common_loading")}</p> : templates.length === 0
      ? <p>{t("ws_templates_empty")}</p>
      : <div className="products-grid">{templates.map(template => <article className="card pad stack" key={template.id}>
        <h3>{template.name}</h3>
        <p>{t("mockup_"+template.mockupType)} · {t(template.published ? "template_public" : "template_private")}</p>
        <div className="row wrap">
          <button type="button" className="btn secondary" onClick={() => setForm(template)}>{t("common_edit")}</button>
          <button type="button" className="btn danger" onClick={() => remove(template.id)}>{t("common_delete")}</button>
        </div>
      </article>)}</div>}
  </WorkspaceLayout>;
}
