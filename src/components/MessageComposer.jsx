import { useRef, useState } from "react";
import ClassicIcon from "./ClassicIcon.jsx";
import { errorText, useI18n } from "../lib/i18n/index.jsx";

export default function MessageComposer({ onSend, placeholder, buttonText, disabled, secondary }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const input = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (disabled || sending.current || !text.trim()) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await onSend(text.trim());
      setText("");
    } catch (failure) {
      setError(errorText(t, failure.code));
    } finally {
      sending.current = false;
      setBusy(false);
      input.current?.focus({ preventScroll: true });
    }
  }

  return <form className="message-composer" onSubmit={submit}>
    <textarea ref={input} className="control" rows={2} maxLength={4000} value={text}
      aria-label={placeholder} placeholder={placeholder} readOnly={busy}
      onChange={event => setText(event.target.value)} onKeyDown={event => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        event.currentTarget.form.requestSubmit();
      }} />
    <button type="submit" className={`btn ${secondary ? "secondary" : "primary"}`}
      disabled={disabled || busy || !text.trim()}>
      <ClassicIcon name={secondary ? "review" : "mail"} />{busy ? t("common_loading") : buttonText}
    </button>
    {error && <p className="notice" role="alert">{error}</p>}
  </form>;
}
