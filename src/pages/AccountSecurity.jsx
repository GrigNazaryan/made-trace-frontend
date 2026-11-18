import { useEffect, useState } from "react";
import { api, BASE_URL } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";
import { destinationAfterAuth } from "../lib/authReturn.js";

const GOOGLE_VERIFIER_KEY = "madetrace_google_verifier";
let exchangeInFlight;

function googleExchange(code, state) {
  const key = state ? state + ":" + code : code;
  if (exchangeInFlight?.key === key) return exchangeInFlight.promise;
  const verifier = sessionStorage.getItem(GOOGLE_VERIFIER_KEY);
  if (!code || !verifier) return Promise.reject(new Error("Missing Google sign-in context"));
  const exchange = async () => {
    const result = state ? await api.googleResume({ state, code, verifier }) : { result: "ok", code };
    if (result.result !== "ok") throw Object.assign(new Error("Google sign-in"), { code: result.result });
    return api.googleExchange({ code: result.code, verifier });
  };
  const promise = exchange().then(data => {
    if (sessionStorage.getItem(GOOGLE_VERIFIER_KEY) === verifier) {
      sessionStorage.removeItem(GOOGLE_VERIFIER_KEY);
    }
    return data;
  });
  exchangeInFlight = { key, promise };
  return promise;
}

export function GoogleButton({ disabled = false }) {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [options, setOptions] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.authOptions().then(setOptions).catch(() => setOptions({})); }, []);
  if (!options?.google) return null;

  async function start() {
    setBusy(true);
    setLinkError("");
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const hex = array => Array.from(array, value => value.toString(16).padStart(2, "0")).join("");
      const verifier = hex(bytes);
      const challenge = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      const query = new URLSearchParams({ challenge, origin: location.origin });
      if (user) query.set("link", (await api.googleLinkToken()).token);
      sessionStorage.setItem(GOOGLE_VERIFIER_KEY, verifier);
      window.location.assign(BASE_URL + "/api/auth/google/start?" + query);
    } catch (error) {
      setLinkError(errorText(t, error.code));
      setBusy(false);
    }
  }

  return <div style={{ marginTop: 16 }}>
    <button className="btn secondary block google-sign-in" type="button" disabled={disabled || busy || loading} onClick={start}>
      <img src="/google-sign-in.png" width="18" height="18" alt="" />{t("account_google")}
    </button>
    {disabled && <p className="small">{t("account_google_company")}</p>}
    {linkError && <p className="notice" role="alert">{linkError}</p>}
  </div>;
}

export function OAuthReturn() {
  const { accept, user } = useAuth();
  const { navigate } = useRoute();
  const { t } = useI18n();
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.hash.split("?")[1]);
    const result = params.get("result");
    if (result !== "ok" && result !== "resume") {
      sessionStorage.removeItem(GOOGLE_VERIFIER_KEY);
      setError(result === "link-required" ? "account_google_link" : result === "cancelled" ? "google_cancelled" : "google_retry");
      return;
    }
    let exchanging;
    try { exchanging = googleExchange(params.get("code"), result === "resume" ? params.get("state") : null); }
    catch (error) { exchanging = Promise.reject(error); }
    exchanging.then(async data => {
      if (cancelled) return;
      accept(data);
      const fallback = data.user.role === "company_owner" ? "/workspace/overview" : "/my-orders";
      const destination = data.linked ? "/account/security" : await destinationAfterAuth(data.user.role).catch(() => fallback);
      if (!cancelled && location.hash.startsWith("#/oauth-return")) {
        navigate(destination, { replace: true });
      }
    }).catch(error => {
      if (!cancelled) {
        setError(error.code === "link-required" ? "account_google_link" : "google_retry");
        history.replaceState(null, "", "#/oauth-return");
      }
    });
    return () => { cancelled = true; };
  }, [accept, navigate]);

  return <div className="page narrow">
    <p role="status">{t(error || "common_loading")}</p>
    {error && <>
      <GoogleButton />
      <Link to={user ? "/account/security" : "/login"}>{t(user ? "account_security" : "nav_login")}</Link>
    </>}
  </div>;
}

export function PasswordRecovery({ reset = false }) {
  const { t }=useI18n(), { navigate }=useRoute(), { accept }=useAuth();
  const [token]=useState(()=>new URLSearchParams(location.hash.split("?")[1]).get("token")||"");
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{if(reset)history.replaceState(null,"","#/reset-password");},[reset]);
  return <div className="page narrow"><BackButton fallback="/login"/><section className="card pad">
    <h2>{t(reset?"account_reset":"account_forgot")}</h2>
    <form className="form" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage("");
      try{if(reset){await api.resetPassword({token,password});accept({accessToken:"",user:null});navigate("/login",{replace:true});}
        else {await api.forgotPassword({email});setMessage(t("account_recovery_sent"));}}
      catch(error){setMessage(errorText(t,error.code));}finally{setBusy(false);}
    }}>
      <label className="field"><span>{t(reset?"account_new_password":"auth_email")}</span>
        {reset?<input className="control" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/>
          :<input className="control" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}</label>
      <button className="btn primary" disabled={busy}>{t(reset?"account_reset":"account_send_link")}</button>
      {message&&<p className="notice" role="status">{message}</p>}
    </form></section></div>;
}

export default function AccountSecurity() {
  const { user,loading,accept }=useAuth(),{t}=useI18n(),{navigate}=useRoute();
  const [password,setPassword]=useState(""),[next,setNext]=useState(""),[confirmation,setConfirmation]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function action(kind){setBusy(true);setMessage("");try{
    if(kind==="change"){await api.changePassword({currentPassword:password,newPassword:next});accept(await api.login({email:user.email,password:next}));}
    if(kind==="others")accept(await api.revokeOthers({password}));
    if(kind==="delete"){await api.deleteAccount({password,confirmation});accept({accessToken:"",user:null});navigate("/",{replace:true});return;}
    setPassword("");setNext("");setMessage(t("account_saved"));
  }catch(error){setMessage(errorText(t,error.code));}finally{setBusy(false);}}
  if(loading)return <p className="page">{t("common_loading")}</p>;
  if(!user)return <div className="page"><Link to="/login">{t("nav_login")}</Link></div>;
  return <div className="page narrow"><BackButton fallback={user.role==="company_owner"?"/workspace/settings":"/my-orders"}/>
    <h2>{t("account_security")}</h2><section className="card pad stack">
    <label className="field"><span>{t("account_current_password")}</span><input className="control" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <label className="field"><span>{t("account_new_password")}</span><input className="control" type="password" autoComplete="new-password" minLength={8} value={next} onChange={e=>setNext(e.target.value)}/></label>
    <button className="btn secondary" disabled={busy||next.length<8} onClick={()=>action("change")}>{t("account_change_password")}</button>
    <button className="btn secondary" disabled={busy} onClick={()=>action("others")}>{t("account_logout_others")}</button>
    <p className="small">{t("account_session_help")}</p>
    {user.role!=="admin"&&<><GoogleButton/><p className="small">{t("account_google_link")}</p>
      <div className="divider"/><h3>{t("account_delete")}</h3><p className="small">{t("account_delete_help")}</p>
      <label className="field"><span>{t("account_confirm_delete")}</span><input className="control" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label>
      <button className="btn danger" disabled={busy||confirmation!=="DELETE"} onClick={()=>action("delete")}>{t("account_delete")}</button></>}
    {message&&<p className="notice" role="status">{message}</p>}
    </section></div>;
}
