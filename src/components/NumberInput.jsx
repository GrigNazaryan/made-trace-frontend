import { useEffect, useRef, useState } from "react";
import { normalizeNumberText, numberOnBlur } from "../lib/numberInput.js";

// Editing text stays editable: no forced zero after every deleted character.
export default function NumberInput({ value, onChange, onFocus, onBlur, ...props }) {
  const [text, setText] = useState(String(value ?? ""));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value ?? "")); }, [value]);
  function emit(value) { onChange?.({ target: { value }, currentTarget: { value } }); }
  return <input {...props} type="number" value={text}
    onFocus={event => { focused.current = true; if (Number(text) === 0) { try { event.target.select(); } catch {} } onFocus?.(event); }}
    onChange={event => { const next = normalizeNumberText(event.target.value); setText(next); emit(next); }}
    onBlur={event => { focused.current = false; const next = numberOnBlur(text, props.min); setText(next); emit(next); onBlur?.(event); }} />;
}
