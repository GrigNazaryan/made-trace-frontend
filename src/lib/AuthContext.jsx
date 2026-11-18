import { rememberAccount, SESSION_CHANGED } from "./rememberedAccounts.js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, getToken, setToken, setImpersonating } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
        [loading, setLoading] = useState(true),
        [connectionError, setConnectionError] = useState(false),
        [isReadOnlyImpersonation, setReadOnly] = useState(false);

  const backup = useRef(null);
  const revision = useRef(0);

  const accept = useCallback((data, changed = false) => {
    revision.current++;
    setLoading(false);
    setToken(data.accessToken);
    setUser(data.user);
    setConnectionError(false);
    if (changed) {
      rememberAccount(data.user);
      try { localStorage.setItem(SESSION_CHANGED, crypto.randomUUID()); } catch { /* optional cross-tab sync */ }
    }
    return data.user;
  }, []);

  const refresh = useCallback(async () => {
    const attempt = revision.current;
    try {
      const user = getToken() ? await api.me() : null;
      const data = user ? { accessToken: getToken(), user } : await api.restoreSession();
      if (attempt === revision.current) return accept(data);
    } catch (error) {
      if (attempt !== revision.current) return null;
      if (error.status === 401) {
        setToken("");
        setUser(null);
        setConnectionError(false);
      } else setConnectionError(true);
    } finally {
      if (attempt === revision.current) setLoading(false);
    }
    return null;
  }, [accept]);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.split("?")[1]);
    if (location.hash.startsWith("#/oauth-return?") && ["ok", "resume"].includes(params.get("result"))) {
      setLoading(false);
    } else refresh();
  }, [refresh]);

  useEffect(() => {
    const ended = () => { revision.current++; setLoading(false); setUser(null); backup.current = null; setImpersonating(false); };
    window.addEventListener("madetrace:session-ended", ended);
    return () => window.removeEventListener("madetrace:session-ended", ended);
  }, []);

  useEffect(() => {
    function sync(event) {
      if (event.key !== SESSION_CHANGED || backup.current) return;
      revision.current++;
      setToken("");
      setUser(null);
      setLoading(true);
      refresh();
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refresh]);

  const login = useCallback(async (email, password) => accept(await api.login({ email, password }), true), [accept]);
  const adminLogin = useCallback(async (email, password) => accept(await api.adminLogin({ email, password }), true), [accept]);
  const verifyRegistration = useCallback(async body => accept(await api.verifyRegistration(body), true), [accept]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { setConnectionError(true); return false; }
    backup.current = null; setReadOnly(false); setImpersonating(false); accept({ accessToken: "", user: null },true); return true;
  }, [accept]);

  const impersonateAs = useCallback(async (token, readOnly) => {
    backup.current = { token: getToken(), user };
    setImpersonating(true);
    setReadOnly(readOnly);
    setToken(token);
    await refresh();
  }, [user, refresh]);

  const stopImpersonating = useCallback(async () => {
    if (!backup.current) return;
    setImpersonating(false);
    setReadOnly(false);
    accept({ accessToken: backup.current.token, user: backup.current.user });
    backup.current = null;
    await refresh();
  }, [accept, refresh]);

  return (
    <AuthContext.Provider value={{
      user, loading, connectionError, refresh, login, adminLogin, verifyRegistration, logout,
      accept, setUser, impersonateAs, stopImpersonating,
      isImpersonated: !!user?.isImpersonated, isReadOnlyImpersonation, canStopImpersonating: !!backup.current
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw Error("useAuth must be inside AuthProvider");
  return context;
}
