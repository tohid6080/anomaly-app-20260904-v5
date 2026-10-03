import { sb, sbOk, uid, getCurrentCompanyId, THEME, SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_APP_URL } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

export const DRILL_STATUS_META = {
  planned: { labelKey: "edStatusPlanned", color: THEME.warn },
  in_progress: { labelKey: "edStatusInProgress", color: THEME.ok },
  completed: { labelKey: "edStatusCompleted", color: THEME.text3 },
  cancelled: { labelKey: "edStatusCancelled", color: THEME.danger },
};
export const drillStatusMeta = (v) => DRILL_STATUS_META[v] || DRILL_STATUS_META.planned;

function drillFromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    scheduledAt: r.scheduled_at || "",
    siteMapId: r.site_map_id || "",
    status: r.status || "planned",
    createdAt: r.created_at,
  };
}

function musterPointFromRow(r) {
  return {
    id: r.id,
    drillId: r.drill_id,
    name: r.name || "",
    zoneId: r.zone_id || "",
    checkinToken: r.checkin_token,
  };
}

function checkinFromRow(r) {
  return {
    id: r.id,
    musterPointId: r.muster_point_id,
    participantName: r.participant_name || "",
    checkedInAt: r.checked_in_at,
  };
}

/* ---------------- تمرین‌ها ---------------- */
export async function loadDrills() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`evacuation_drills?select=*&order=scheduled_at.desc.nullslast${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(drillFromRow);
}

export async function createDrill({ title, scheduledAt, siteMapId }) {
  if (!String(title || "").trim()) return { __error: true, message: tr("edErrTitleRequired") };
  const id = uid("drill");
  const res = await offlineWrite({
    module: "evacuationDrills", table: "evacuation_drills", action: "insert", id,
    payload: {
      title: title.trim(), scheduled_at: scheduledAt || null,
      site_map_id: siteMapId || null, company_id: getCurrentCompanyId(),
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("edErrSave") };
  return { ok: true, record: res.record };
}

export async function updateDrillStatus(id, status) {
  const res = await offlineWrite({
    module: "evacuationDrills", table: "evacuation_drills", action: "update", id,
    payload: { status, updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("edErrSave") };
  return { ok: true };
}

export async function deleteDrill(id) {
  const res = await offlineWrite({ module: "evacuationDrills", table: "evacuation_drills", action: "delete", id, payload: {} });
  if (!res?.ok) return { __error: true, message: res?.error || tr("edErrSave") };
  return { ok: true };
}

/* ---------------- نقاطِ تجمع ---------------- */
export async function loadMusterPoints(drillId) {
  if (!drillId) return [];
  const rows = await sb(`evacuation_muster_points?select=*&drill_id=eq.${drillId}&order=created_at.asc`);
  if (!sbOk(rows)) return [];
  return rows.map(musterPointFromRow);
}

export async function createMusterPoint({ drillId, name, zoneId }) {
  if (!String(name || "").trim()) return { __error: true, message: tr("edErrNameRequired") };
  const id = uid("muster");
  const res = await offlineWrite({
    module: "evacuationMusterPoints", table: "evacuation_muster_points", action: "insert", id,
    payload: { drill_id: drillId, name: name.trim(), zone_id: zoneId || null, company_id: getCurrentCompanyId() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("edErrSave") };
  return { ok: true, record: res.record };
}

export async function deleteMusterPoint(id) {
  const res = await offlineWrite({ module: "evacuationMusterPoints", table: "evacuation_muster_points", action: "delete", id, payload: {} });
  if (!res?.ok) return { __error: true, message: res?.error || tr("edErrSave") };
  return { ok: true };
}

/* ---------------- چک‌این‌ها (فقط خواندن — درج فقط از طریقِ Edge Function) ---------------- */
export async function loadCheckinsForDrill(drillId) {
  if (!drillId) return [];
  const rows = await sb(`evacuation_checkins?select=*&drill_id=eq.${drillId}&order=checked_in_at.desc`);
  if (!sbOk(rows)) return [];
  return rows.map(checkinFromRow);
}

/* ---------------- لینک/QR عمومی ---------------- */
export function buildDrillCheckinLink(checkinToken) {
  const base = PUBLIC_APP_URL.endsWith("/") ? PUBLIC_APP_URL : `${PUBLIC_APP_URL}/`;
  return `${base}#drill-checkin/${checkinToken}`;
}
export function musterPointQrUrl(checkinToken, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(buildDrillCheckinLink(checkinToken))}`;
}

/* ---------------- عمومی/بدونِ ورود — از طریقِ Edge Function evacuation-checkin ---------------- */
export async function loadPublicMusterPointInfo(token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/evacuation-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, action: "info" }),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("edErrFetchInfo") };
    return data;
  } catch {
    return { __error: true, message: tr("edErrServer") };
  }
}

export async function submitDrillCheckin(token, participantName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/evacuation-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, action: "checkin", participantName }),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("edErrSubmit") };
    return { ok: true, musterPointName: data?.musterPointName || "", drillTitle: data?.drillTitle || "" };
  } catch {
    return { __error: true, message: tr("edErrServer") };
  }
}
