import { api } from "./api.js";
export async function destinationAfterAuth(role){
  const draft=await api.continuation();if(/^\/order\/[a-zA-Z0-9-]{1,64}$/.test(draft?.returnTo))return draft.returnTo;
  return role==="company_owner"?"/workspace/overview":role==="admin"?"/admin/workshops":"/my-orders";
}

let pendingContinuation=null;
export function setPendingContinuation(save){pendingContinuation=save;}
export async function flushPendingContinuation(){if(pendingContinuation)await pendingContinuation();}
