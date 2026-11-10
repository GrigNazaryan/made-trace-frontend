import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, getToken, setToken, setImpersonating } from "./api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const loginWithGoogle = useCallback(async (googleToken) => {
    // Вызываем метод из вашего api.js, который отправляет токен на бэкенд
    const data = await api.googleLogin({ token: googleToken });
    return accept(data);
  }, [accept]);
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [connectionError, setConnectionError] = useState(false), [isReadOnlyImpersonation, setReadOnly] = useState(false);
  const backup = useRef(null);
  const accept = useCallback(data => { setToken(data.accessToken); setUser(data.user); setConnectionError(false); return data.user; }, []);
  const refresh = useCallback(async () => {
    try { return accept(getToken() ? { accessToken: getToken(), user: await api.me() } : await api.restoreSession()); }
    catch (error) { if (error.status === 401) { setToken(""); setUser(null); } else setConnectionError(true); return null; }
    finally { setLoading(false); }
  }, [accept]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const ended = () => { setUser(null); backup.current = null; setImpersonating(false); }; window.addEventListener("madetrace:session-ended", ended); return () => window.removeEventListener("madetrace:session-ended", ended); }, []);
  const login = useCallback(async (email, password) => accept(await api.login({ email, password })), [accept]);
  const adminLogin = useCallback(async (email, password) => accept(await api.adminLogin({ email, password })), [accept]);
  const register = useCallback(async body => accept(await api.register(body)), [accept]);
  const logout = useCallback(async () => { try { await api.logout(); } catch { setConnectionError(true); return false; } backup.current = null; setReadOnly(false); setImpersonating(false); setToken(""); setUser(null); return true; }, []);
  const impersonateAs = useCallback(async (token, readOnly) => { backup.current = { token: getToken(), user }; setImpersonating(true); setReadOnly(readOnly); setToken(token); await refresh(); }, [user, refresh]);
  const stopImpersonating = useCallback(async () => { if (!backup.current) return; setImpersonating(false); setReadOnly(false); accept({ accessToken: backup.current.token, user: backup.current.user }); backup.current = null; await refresh(); }, [accept, refresh]);
  return <AuthContext.Provider value={{ user, loading, connectionError, refresh, login, adminLogin, register, logout, accept, setUser, impersonateAs, stopImpersonating, isImpersonated: !!user?.isImpersonated, isReadOnlyImpersonation, canStopImpersonating: !!backup.current }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw Error("useAuth must be inside AuthProvider"); return context; }
