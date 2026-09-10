import { sb, sbOk, uid, getCurrentCompanyId, SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_APP_URL } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { newSurvey, SCHEMA_VERSION } from "./surveyModel.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const MODULE = "hseSurvey";
const TABLE = "surveys";

/* ---------------- نگاشتِ ردیف ↔ آبجکت ---------------- */
export function surveyFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    title: r.title || "",
    description: r.description || "",
    status: r.status || "draft",
    questions: Array.isArray(r.questions) ? r.questions : [],
    settings: r.settings && typeof r.settings === "object" ? r.settings : {},
    publicToken: r.public_token,
    responseCount: Number(r.response_count) || 0,
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function surveyToDb(rec) {
  return {
    company_id: rec.companyId || getCurrentCompanyId(),
    title: (rec.title || "").trim(),
    description: (rec.description || "").trim(),
    status: ["draft", "active", "closed"].includes(rec.status) ? rec.status : "draft",
    questions: Array.isArray(rec.questions) ? rec.questions : [],
    settings: { schemaVersion: SCHEMA_VERSION, ...(rec.settings || {}) },
    created_by: rec.createdBy || "",
    updated_at: new Date().toISOString(),
  };
}

/* ---------------- خواندن (احراز هویت‌شده) ---------------- */
export async function loadSurveys() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`${TABLE}?select=*&order=updated_at.desc${filter}`);
  return sbOk(rows) ? rows.map(surveyFromRow) : [];
}

export async function loadSurvey(id) {
  const rows = await sb(`${TABLE}?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length ? surveyFromRow(rows[0]) : null;
}

export async function loadSurveyResponses(surveyId) {
  const rows = await sb(`survey_responses?survey_id=eq.${surveyId}&select=*&order=submitted_at.desc`);
  return sbOk(rows)
    ? rows.map((r) => ({
        id: r.id,
        answers: r.answers && typeof r.answers === "object" ? r.answers : {},
        respondentMeta: r.respondent_meta && typeof r.respondent_meta === "object" ? r.respondent_meta : {},
        source: r.source || "link",
        submittedAt: r.submitted_at,
        score: r.score != null ? Number(r.score) : null,
        maxScore: r.max_score != null ? Number(r.max_score) : null,
        percent: r.percent != null ? Number(r.percent) : null,
        passed: typeof r.passed === "boolean" ? r.passed : null,
      }))
    : [];
}

export async function deleteSurveyResponse(id) {
  const res = await sb(`survey_responses?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (res && res.__error) return { __error: true, message: res.message };
  return { ok: true };
}

/* ---------------- نوشتن (offlineWrite) ---------------- */
export async function createSurvey(partial, createdBy) {
  const id = uid("srv");
  const base = { ...newSurvey(), ...(partial || {}), createdBy: createdBy || "" };
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "insert", id,
    payload: surveyToDb(base),
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("svErrSave") };
  return { ...base, id, companyId: getCurrentCompanyId(), status: "draft", responseCount: 0 };
}

export async function saveSurvey(rec) {
  if (!rec?.id) return { __error: true, message: tr("svErrSave") };
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "update", id: rec.id,
    payload: surveyToDb(rec),
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("svErrSave") };
  return { ok: true };
}

export async function setSurveyStatus(id, status) {
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "update", id,
    payload: { status, updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("svErrSave") };
  return { ok: true };
}

export async function duplicateSurvey(id, createdBy) {
  const src = await loadSurvey(id);
  if (!src) return { __error: true, message: tr("svErrNotFound") };
  return createSurvey(
    { title: tr("svCopyOf", { title: src.title || tr("svUntitled") }), description: src.description, questions: JSON.parse(JSON.stringify(src.questions)), settings: { ...src.settings }, status: "draft" },
    createdBy,
  );
}

export async function deleteSurvey(id) {
  const res = await offlineWrite({ module: MODULE, table: TABLE, action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("svErrSave") };
  return { ok: true };
}

/* ---------------- لینکِ عمومی ---------------- */
// همیشه به PUBLIC_APP_URL اشاره می‌کند (نه window.location) — دلیلش همان
// چیزی است که در hseClimateCampaignsApi توضیح داده شده (اپ اندروید).
export function buildSurveyLink(publicToken) {
  const base = PUBLIC_APP_URL.endsWith("/") ? PUBLIC_APP_URL : `${PUBLIC_APP_URL}/`;
  return `${base}#survey/${publicToken}`;
}
export function surveyQrUrl(publicToken, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(buildSurveyLink(publicToken))}`;
}

/* ---------------- مسیرِ عمومی (بدونِ ورود) — از طریق Edge Function ---------------- */
export async function loadPublicSurvey(token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/survey-public-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("svErrFetchInfo") };
    return data;
  } catch {
    return { __error: true, message: tr("svErrServer") };
  }
}

export async function submitSurveyResponse(token, answers, respondentMeta, source) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-survey-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, answers, respondentMeta: respondentMeta || {}, source: source || "link" }),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("svErrSubmit") };
    // در حالتِ آزمون (اگر نمایشِ نمره روشن باشد) نمره هم برمی‌گردد.
    return { ok: true, score: data?.score, maxScore: data?.maxScore, percent: data?.percent, passed: data?.passed };
  } catch {
    return { __error: true, message: tr("svErrServer") };
  }
}
