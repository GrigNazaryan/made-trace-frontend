import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";
import { destinationAfterAuth } from "../lib/authReturn.js";

export function GoogleButton({ disabled = false }) {
  const { t } = useI18n();
  const [options, setOptions] = useState(null), [error,setError] = useState("");
  useEffect(() => { api.authOptions().then(setOptions).catch(()=>setOptions({})); }, []);
  return <div style={{marginTop:16}}><button className="btn secondary block" type="button"
    disabled={disabled || !options?.google} onClick={async()=>{
      try { const result=await api.googleStart(); window.location.assign(result.url); }
      catch(error){setError(errorText(t,error.code));}
    }}>{t("account_google")}</button>
    {disabled ? <p className="small">{t("account_google_company")}</p> : options && !options.google && <p className="small">{t("account_google_setup")}</p>}
    {error && <p className="notice" role="alert">{error}</p>}</div>;
}

export function OAuthReturn() {
  const { accept } = useAuth(), { navigate } = useRoute(), { t } = useI18n();
  const [error,setError] = useState("");
  useEffect(()=>{let cancelled=false;const result=new URLSearchParams(location.hash.split("?")[1]).get("result");
    if(result!=="ok"){setError(t(result==="link-required"?"account_google_link":"account_google_failed"));return;}
    api.restoreSession().then(async data=>{if(!cancelled){accept(data);navigate(await destinationAfterAuth(data.user.role),{replace:true});}})
      .catch(()=>!cancelled&&setError(t("account_google_failed")));
    return()=>{cancelled=true;};
  },[]);
  return <div className="page narrow"><p role="status">{error||t("common_loading")}</p>{error&&<Link to="/login">{t("nav_login")}</Link>}</div>;
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
