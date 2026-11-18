import { useRef, useState } from "react";
import ClassicIcon from "./ClassicIcon.jsx";
import { useI18n } from "../lib/i18n/index.jsx";

export default function FilePicker({ inputRef, accept, disabled, onFile, fileName }) {
  const { t } = useI18n();
  const ownInput = useRef(null);
  const input = inputRef || ownInput;
  const [name, setName] = useState("");
  const displayName = fileName ?? name;
  function select(files) {
    const file = files?.[0];
    if (!file) return;
    setName(file.name);
    if (onFile) {
      onFile(file);
      input.current.value = "";
    }
  }

  return <div className="styled-file-picker">
    <input hidden type="file" ref={input} accept={accept} disabled={disabled}
      onChange={event => select(event.target.files)} />
    <button type="button" className="btn secondary" disabled={disabled} onClick={() => input.current.click()}
      onDragOver={event => { event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        if (disabled || !event.dataTransfer.files.length) return;
        if (!onFile) input.current.files = event.dataTransfer.files;
        select(event.dataTransfer.files);
      }}>
      <ClassicIcon name="upload" />{t("control_choose_file")}
    </button>
    {displayName && <span className="small styled-file-name" title={displayName}>{displayName}</span>}
  </div>;
}
