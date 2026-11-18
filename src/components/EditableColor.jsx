import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/index.jsx";

export default function EditableColor({ color, selected, onSelect, onRemove }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const action = useRef(null);
  const timer = useRef(null);
  const start = useRef(null);
  const longPress = useRef(false);

  function cancelHold() {
    clearTimeout(timer.current);
    start.current = null;
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (open) action.current?.focus({ preventScroll: true }); }, [open]);

  return <div className="editable-color" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    setOpen(false);
    trigger.current?.focus();
  }}>
    <button ref={trigger} type="button" className="studio-swatch catalog-color" title={color}
      aria-label={color} aria-pressed={selected} aria-describedby="catalog-color-hint"
      onClick={() => {
        if (longPress.current) { longPress.current = false; return; }
        setOpen(false);
        onSelect();
      }} onContextMenu={event => {
        event.preventDefault();
        cancelHold();
        longPress.current = event.pointerType === "touch";
        setOpen(true);
      }} onPointerDown={event => {
        longPress.current = false;
        if (event.pointerType !== "touch") return;
        start.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(() => {
          longPress.current = true;
          setOpen(true);
        }, 500);
      }} onPointerMove={event => {
        if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancelHold();
      }} onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold}
      onKeyDown={event => {
        if (event.key !== "Delete" && event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        setOpen(true);
      }}>
      <span style={{backgroundColor:color}} />
    </button>
    {open && <div className="color-action-popover">
      <button ref={action} type="button" className="btn danger small"
        onClick={() => {setOpen(false); onRemove();}}>{t("catalog_remove_color", {color})}</button>
    </div>}
  </div>;
}
