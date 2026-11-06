// Thin fetch wrapper around the FastAPI backend. Every function here returns parsed JSON
// or throws an ApiError whose `.code` is the machine-readable string the backend sent
// (e.g. "quote_outdated", "invalid:email") — i18n.js turns that into user-facing text.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "madetrace_token";

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

let memoryToken = "";
let memoryIdentity = "";
let refreshInFlight = null;
let impersonating = false;
export function getToken() { return memoryToken; }
export function setToken(token) {
  memoryToken=token||"";memoryIdentity="";
  try{memoryIdentity=JSON.parse(atob(memoryToken.split(".")[1].replaceAll("-","+").replaceAll("_","/"))).sub||"";}catch{}
  localStorage.removeItem(TOKEN_KEY);
}
export function setImpersonating(value) { impersonating = value; }
export async function restoreSession() {
  if (!refreshInFlight) refreshInFlight = request("POST", "/api/auth/refresh", { body: {} })
    .then(data => { setToken(data.accessToken); return data; })
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function request(method, path, { body, params, retried = false } = {}) {
  if (!BASE_URL) {
    throw new ApiError("api_base_url_not_configured", 0);
  }
  const url = new URL(BASE_URL + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
  }
  const headers = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("network_error", 0);
  }

  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    // no body (e.g. 500 with empty response) — fall through with data=null
  }

  if (!response.ok) {
    const code = (data && (data.detail?.code || data.detail)) || `http_${response.status}`;
    if (response.status === 401 && !["/api/auth/login","/api/auth/admin-login","/api/auth/register","/api/auth/refresh","/api/auth/logout","/api/auth/forgot-password","/api/auth/reset-password"].includes(path) && !retried && !impersonating) {
      const expectedIdentity=memoryIdentity;
      try { const session=await restoreSession();
        if(expectedIdentity && session.user?.id!==expectedIdentity)throw new ApiError("account_changed",401);
        return request(method, path, {body, params, retried:true}); }
      catch (error) {
        if (error.status === 401) { setToken(""); window.dispatchEvent(new Event("madetrace:session-ended")); }
        throw error;
      }
    }
    throw new ApiError(typeof code === "string" ? code : JSON.stringify(code), response.status);
  }
  return data;
}

const get = (path, params) => request("GET", path, { params });
const post = (path, body) => request("POST", path, { body: body ?? {} });
const put = (path, body) => request("PUT", path, { body: body ?? {} });
const del = (path) => request("DELETE", path);

export const api = {
  // --- auth -------------------------------------------------------------
  register: (body) => post("/api/auth/register", body),
  login: (body) => post("/api/auth/login", body),
  adminLogin: (body) => post("/api/auth/admin-login", body),
  me: () => get("/api/auth/me"),
  changePassword: (body) => post("/api/auth/change-password", body),
  bootstrapAdmin: (body) => post("/api/auth/bootstrap-admin", body),

  restoreSession,
  authOptions: () => get("/api/auth/options"),
  logout: () => post("/api/auth/logout"),
  revokeOthers: (body) => post("/api/auth/logout-others", body),
  forgotPassword: (body) => post("/api/auth/forgot-password", body),
  resetPassword: (body) => post("/api/auth/reset-password", body),
  deleteAccount: (body) => post("/api/auth/delete-account", body),
  googleStart: () => post("/api/auth/google/start"),
  continuation: () => get("/api/auth/continuation"),
  saveContinuation: (body) => put("/api/auth/continuation", body),
  clearContinuation: () => del("/api/auth/continuation"),

  // --- public -------------------------------------------------------------
  health: () => get("/api/health"),
  directory: () => get("/api/directory"),
  storefront: (workshopId) => get(`/api/workshops/${workshopId}`),
  billingPlans: () => get("/api/billing/plans"),

  // --- orders: customer side ----------------------------------------------
  createOrder: (body) => post("/api/orders", body),
  myOrders: () => get("/api/orders/mine"),
  getOrder: (number) => get(`/api/orders/${number}`),
  markOrderRead: (number) => post(`/api/orders/${number}/read`),
  sendMessage: (number, text) => post(`/api/orders/${number}/messages`, { text }),
  decideQuote: (number, version, decision) => post(`/api/orders/${number}/quotes/${version}/decision`, { decision }),
  approveProof: (number, version) => post(`/api/orders/${number}/proofs/${version}/approve`),
  reviseProof: (number, version) => post(`/api/orders/${number}/proofs/${version}/revise`),
  repeatOrder: (number) => post(`/api/orders/${number}/repeat`),

  // --- workspace: company console ------------------------------------------
  getProfile: () => get("/api/workspace/profile"),
  updateProfile: (body) => put("/api/workspace/profile", body),
  updatePreferences: (body) => put("/api/workspace/preferences", body),
  updatePricing: (body) => put("/api/workspace/pricing", body),

  listProducts: () => get("/api/workspace/products"),
  createProduct: (body) => post("/api/workspace/products", body),
  updateProduct: (id, body) => put(`/api/workspace/products/${id}`, body),
  deleteProduct: (id) => del(`/api/workspace/products/${id}`),
  bulkPricePreview: (body) => post("/api/workspace/products/bulk-price/preview", body),
  bulkPriceApply: (body) => post("/api/workspace/products/bulk-price/apply", body),
  bulkPriceUndo: (adjustmentId) => post(`/api/workspace/products/bulk-price/${adjustmentId}/undo`),

  listTemplates: () => get("/api/workspace/templates"),
  createTemplate: (body) => post("/api/workspace/templates", body),
  deleteTemplate: (id) => del(`/api/workspace/templates/${id}`),

  workspaceOrders: (params) => get("/api/workspace/orders", params),
  sendQuote: (number, body) => post(`/api/workspace/orders/${number}/quote`, body),
  sendProof: (number, body) => post(`/api/workspace/orders/${number}/proofs`, body),
  changeOrderStatus: (number, body) => post(`/api/workspace/orders/${number}/status`, body),
  updateSchedule: (number, body) => put(`/api/workspace/orders/${number}/schedule`, body),
  addNote: (number, body) => post(`/api/workspace/orders/${number}/notes`, body),
  importOrders: (rows) => post("/api/workspace/orders/import", { rows }),
  clients: () => get("/api/workspace/clients"),
  reports: () => get("/api/workspace/reports"),

  // --- billing --------------------------------------------------------------
  billingInfo: () => get("/api/billing/info"),
  listPayments: () => get("/api/billing/payments"),
  createPayment: (body) => post("/api/billing/payments", body),
  submitPayment: (id, body) => post(`/api/billing/payments/${id}/submit`, body),
  cancelPayment: (id) => post(`/api/billing/payments/${id}/cancel`),

  // --- admin ------------------------------------------------------------------
  adminWorkshops: (params) => get("/api/admin/workshops", params),
  adminWorkshop: (id) => get(`/api/admin/workshops/${id}`),
  adminSetPlan: (id, plan) => put(`/api/admin/workshops/${id}`, { plan }),
  adminGrantTrial: (id) => post(`/api/admin/workshops/${id}/trial`),
  adminBlock: (id) => post(`/api/admin/workshops/${id}/block`),
  adminUnblock: (id) => post(`/api/admin/workshops/${id}/unblock`),
  adminPayments: (params) => get("/api/admin/payments", params),
  adminConfirmPayment: (id) => post(`/api/admin/payments/${id}/confirm`),
  adminRejectPayment: (id) => post(`/api/admin/payments/${id}/reject`),
  adminImpersonate: (workshopId, readOnly = true) =>
    post(`/api/admin/workshops/${workshopId}/impersonate`, { readOnly }),
  adminAuditLog: (params) => get("/api/admin/audit-log", params),
  adminStats: () => get("/api/admin/stats"),
};
