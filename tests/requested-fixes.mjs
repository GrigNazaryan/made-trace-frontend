import {test,after} from "node:test";
import assert from "node:assert/strict";
import {normalizeNumberText,numberOnBlur} from "../src/lib/numberInput.js";
import {createServer} from "vite";
process.env.VITE_API_BASE_URL="http://127.0.0.1:9010";
globalThis.localStorage={removeItem(){},getItem(){return null;}};
globalThis.window=new EventTarget();
const server=await createServer({server:{middlewareMode:true},appType:"custom"});
after(()=>server.close());
const transport=await server.ssrLoadModule("/src/lib/api.js");
const {api,setToken,getToken,setImpersonating}=transport;
const answer=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});

test("zero never prefixes newly entered digits; decimals and negative adjustments survive",()=>{
  for(const [raw,want] of [["012","12"],["0005.25","5.25"],["0.25","0.25"],["-025","-25"],["",""],["0","0"]])assert.equal(normalizeNumberText(raw),want);
});
test("blank stays editable until blur, then restores zero or the required positive minimum",()=>{
  assert.equal(normalizeNumberText(""),"");assert.equal(numberOnBlur(""),"0");assert.equal(numberOnBlur("",1),"1");assert.equal(numberOnBlur("",2),"2");assert.equal(numberOnBlur("12.50",0),"12.50");
});
test("all five shipped languages are registered and new security controls have translations",async()=>{
  const {dictionaries,languageNames}=await server.ssrLoadModule("/src/lib/i18n/index.jsx");
  assert.deepEqual(Object.keys(dictionaries).sort(),["de","en","fr","hy","ru"]);
  for(const code of Object.keys(dictionaries)){assert.ok(languageNames[code]);for(const key of ["account_delete","account_security","account_google","account_reset"])assert.ok(dictionaries[code][key]);}
});
test("expired access JWT refreshes once and retries with the new token and cookies",async()=>{
  setToken("expired");const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options]);if(String(url).endsWith("/refresh"))return answer({accessToken:"fresh",user:{id:"one"}});return answer({ok:true},options.headers.Authorization==="Bearer fresh"?200:401);};
  assert.deepEqual(await api.me(),{ok:true});
  assert.deepEqual(await api.myOrders(),{ok:true});assert.equal(getToken(),"fresh");assert.equal(calls.filter(([u])=>String(u).endsWith("/refresh")).length,1);assert.ok(calls.every(([,o])=>o.credentials==="include"));
});
test("network failure never clears a valid token",async()=>{
  setToken("keep-this-session");globalThis.fetch=async()=>{throw Error("offline");};await assert.rejects(api.myOrders(),error=>error.code==="network_error");assert.equal(getToken(),"keep-this-session");
});
test("wrong password does not refresh or erase an unrelated signed-in session",async()=>{
  setToken("existing");let calls=0;globalThis.fetch=async()=>{calls++;return answer({detail:"invalid_credentials"},401);};await assert.rejects(api.login({email:"fake@example.com",password:"wrong"}));assert.equal(calls,1);assert.equal(getToken(),"existing");
});
test("parallel refresh requests share one operation",async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return answer({accessToken:"fresh",user:{id:"one"}});};await Promise.all([api.restoreSession(),api.restoreSession(),api.restoreSession()]);assert.equal(calls,1);
});
test("a revoked refresh ends the local session, while an impersonation cannot silently become the admin",async()=>{
  let ended=0;window.addEventListener("madetrace:session-ended",()=>ended++,{once:true});setToken("old");globalThis.fetch=async()=>answer({detail:"invalid_credentials"},401);await assert.rejects(api.myOrders());assert.equal(getToken(),"");assert.equal(ended,1);
  setImpersonating(true);setToken("company-session");let calls=0;globalThis.fetch=async()=>{calls++;return answer({},401);};await assert.rejects(api.workspaceOrders());assert.equal(calls,1);assert.equal(getToken(),"company-session");setImpersonating(false);
});
test("login return accepts only an internal order route",async()=>{
  const {destinationAfterAuth}=await server.ssrLoadModule("/src/lib/authReturn.js");
  globalThis.fetch=async()=>answer({returnTo:"https://attacker.invalid"});assert.equal(await destinationAfterAuth("customer"),"/my-orders");
  globalThis.fetch=async()=>answer({returnTo:"/order/valid-workshop"});assert.equal(await destinationAfterAuth("customer"),"/order/valid-workshop");
});

test("refresh after a cross-tab account switch never resubmits the previous account's mutation",async()=>{
  setToken("test."+Buffer.from(JSON.stringify({sub:"account-a"})).toString("base64url")+".signature");let writes=0;
  globalThis.fetch=async(url,options)=>{if(String(url).endsWith("/refresh"))return answer({accessToken:"new-b",user:{id:"account-b"}});writes++;return answer({},401);};
  await assert.rejects(api.createProduct({name:"private account A",base:10}),error=>error.code==="account_changed");assert.equal(writes,1);assert.equal(getToken(),"");
});

test("failed continuation recovery cannot silently redirect away from an unfinished order",async()=>{
  const {destinationAfterAuth}=await server.ssrLoadModule("/src/lib/authReturn.js");
  globalThis.fetch=async()=>{throw Error("offline");};await assert.rejects(destinationAfterAuth("customer"),error=>error.code==="network_error");
});
