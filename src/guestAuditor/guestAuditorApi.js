import { sb, sbOk, uid, getCurrentCompanyId, SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_APP_URL } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

function fromRow(r) {
  return {
    id: r.id,
    label: r.label || "",
    token: r.token,
    expiresAt: r.expires_at,
    status: r.status || "active",
    revokedAt: r.revoked_at || "",
    revokedBy: r.revoked_by || "",
    lastAccessedAt: r.last_accessed_at || "",
    accessCount: Number(r.access_count) || 0,
    createdAt: r.created_at,
  };
}

export function isLinkLive(link) {
  return link.status === "active" && !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now();
}

/* ---------------- احراز-هویت‌شده — صدور/فهرست/لغو ---------------- */
export async function loadGuestAuditorLinks() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`guest_auditor_links?select=*&order=created_at.desc${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(fromRow);
}

export async function createGuestAuditorLink({ label, expiresAt, createdBy }) {
  if (!expiresAt) return { __error: true, message: tr("gaErrExpiryRequired") };
  const id = uid("gauditor");
  const res = await offlineWrite({
    module: "guestAuditorLinks", table: "guest_auditor_links", action: "insert", id,
    payload: { label: label || "", expires_at: expiresAt, company_id: getCurrentCompanyId(), created_by: createdBy || "" },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("gaErrSave") };
  return { ok: true, record: res.record };
}

export async function revokeGuestAuditorLink(id, revokedBy) {
  const res = await offlineWrite({
    module: "guestAuditorLinks", table: "guest_auditor_links", action: "update", id,
    payload: { status: "revoked", revoked_at: new Date().toISOString(), revoked_by: revokedBy || "" },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("gaErrSave") };
  return { ok: true };
}

export function buildGuestAuditorLink(token) {
  const base = PUBLIC_APP_URL.endsWith("/") ? PUBLIC_APP_URL : `${PUBLIC_APP_URL}/`;
  return `${base}#guest-auditor/${token}`;
}

/* ---------------- عمومی/بدونِ ورود — از طریقِ Edge Function guest-auditor-info ---------------- */
async function callGuestAuditorInfo(body) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-auditor-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("gaErrFetchInfo") };
    return data;
  } catch {
    return { __error: true, message: tr("gaErrServer") };
  }
}
export async function loadGuestAuditorSummary(token) {
  return callGuestAuditorInfo({ token, action: "summary" });
}
export async function loadGuestAuditorList(token, listKey) {
  return callGuestAuditorInfo({ token, action: "list", listKey });
}
