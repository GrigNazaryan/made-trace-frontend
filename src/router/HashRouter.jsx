import { flushPendingContinuation } from "../lib/authReturn.js";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const RouteContext = createContext(null);

function currentPath() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.split("?")[0] || "/";
}

export function HashRouterProvider({ children }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onHashChange = () => setPath(currentPath());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (!to.startsWith("/") || to.startsWith("//")) return;
    // Daily workspace tabs share one browser-history entry.
    const internal = /^\/(workspace|admin)(\/|$)/;
    if (replace || internal.test(currentPath()) && internal.test(to)) {
      window.history.replaceState(null, "", "#" + to);
      setPath(to.split("?")[0]);
    } else if (currentPath() !== to) window.location.hash = to;
    else setPath(to.split("?")[0]);
  }, []);

  // Product back means a semantic parent/exit, never ten previous tab selections.
  const goBack = useCallback((fallbackTo) => navigate(fallbackTo || "/", { replace: true }), [navigate]);

  return <RouteContext.Provider value={{ path, navigate, goBack }}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("useRoute must be used inside <HashRouterProvider>");
  return ctx;
}

/** Matches "/workshops/:id" style patterns against the current path. Returns params or null. */
export function matchRoute(pattern, path) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(pathParts[i]);
    else if (p !== pathParts[i]) return null;
  }
  return params;
}

/** A consistent "← Back" affordance. Prefers real browser history so it retraces the
 * user's actual path; falls back to `fallback` when there's nothing to go back to
 * (e.g. the page was opened directly from a bookmark or a shared link). */
export function BackButton({ fallback, label = "← Back", className = "back-link" }) {
  const { goBack } = useRoute();
  return (
    <button type="button" className={className} onClick={() => goBack(fallback)}>
      {label}
    </button>
  );
}

export function Link({ to, className, children, onClick, ...rest }) {
  const { navigate } = useRoute();
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={async (e) => {
        onClick?.(e);
        if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;
        e.preventDefault();
        if(["/login","/register"].includes(to)) {
          try{await flushPendingContinuation();}catch{window.dispatchEvent(new Event("madetrace:draft-failed"));return;}
        }
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
