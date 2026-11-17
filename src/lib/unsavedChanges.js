import { useEffect } from "react";

export function confirmNavigation() {
  return window.dispatchEvent(new Event("madetrace:before-navigate", {cancelable: true}));
}

export function useUnsavedChanges(dirty, t) {
  useEffect(() => {
    if (!dirty) return;
    const leave = event => {
      if (!event.defaultPrevented && !window.confirm(t("confirm_unsaved_product"))) event.preventDefault();
    };
    const unload = event => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("madetrace:before-navigate", leave);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("madetrace:before-navigate", leave);
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, t]);
}
