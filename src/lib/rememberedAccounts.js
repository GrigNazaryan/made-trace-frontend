const ACCOUNT_LIST = "madetrace:recent-account-emails";
export const SESSION_CHANGED = "madetrace:auth-session-change";

export function rememberedAccounts() {
  try {
    const emails = JSON.parse(localStorage.getItem(ACCOUNT_LIST) || "[]");
    return Array.isArray(emails) ? emails.filter(email => typeof email === "string" && email.includes("@")).slice(0,4) : [];
  } catch {
    return [];
  }
}

export function rememberAccount(user) {
  if (!user?.email || user.role === "admin" || user.isImpersonated) return;
  try {
    localStorage.setItem(ACCOUNT_LIST, JSON.stringify([user.email, ...rememberedAccounts().filter(email => email !== user.email)].slice(0,4)));
  } catch {
    // Sign-in still works with browser storage disabled.
  }
}

export function forgetAccounts() {
  try { localStorage.removeItem(ACCOUNT_LIST); } catch { /* Browser storage is unavailable. */ }
}
