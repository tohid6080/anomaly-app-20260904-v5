import { sb, sbOk, SUPABASE_URL, SUPABASE_ANON_KEY } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * سمتِ کاربر/بازدیدکننده‌ی ماژولِ «نظرسنجی‌های پلتفرم» — کاملاً مستقل از
 * survey/ (نظرسنجیِ مختصِ هر شرکت). خواندنِ نظرسنجیِ فعال مستقیم است
 * (RLS: status='active' برای anon+authenticated باز است)؛ هر نوشتنی
 * (ثبتِ نمایش/ردکردن/پاسخ) از طریقِ Edge Function عمومیِ
 * submit-platform-survey-response می‌رود، چون آن جدول‌ها (responses/
 * impressions) هیچ policy ای برایِ anon/authenticated ندارند — دقیقاً
 * همان الگوی livechatApi.js.
 *
 * ردیابیِ «دیده‌شده/ردشده» فقط برایِ کاربرِ واردشده معنا دارد (username
 * پایدار). برایِ بازدیدکننده‌ی ناشناسِ نوعِ public، همین ردیابی عیناً روی
 * localStorage شبیه‌سازی می‌شود (همان شمارنده/دیده‌شده، فقط سمتِ کلاینت).
 */

const PUBLIC_STATE_KEY = "ihms_platform_survey_public_state";

function loadPublicState() {
  try {
    const raw = localStorage.getItem(PUBLIC_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePublicState(state) {
  try {
    localStorage.setItem(PUBLIC_STATE_KEY, JSON.stringify(state));
  } catch {
    // بی‌اهمیت اگر localStorage در دسترس نبود (حالتِ خصوصیِ مرورگر)
  }
}

function incrementPublicImpressionLocally(surveyId) {
  const state = loadPublicState();
  const existing = state[surveyId] || { shownCount: 0, dismissed: false };
  const next = { shownCount: existing.shownCount + 1, dismissed: existing.dismissed };
  state[surveyId] = next;
  savePublicState(state);
  return { shownCount: next.shownCount, dismissed: existing.dismissed };
}

function dismissPublicLocally(surveyId) {
  const state = loadPublicState();
  const existing = state[surveyId] || { shownCount: 0, dismissed: false };
  state[surveyId] = { shownCount: existing.shownCount, dismissed: true };
  savePublicState(state);
}

function callPlatformSurveyFn(action, params) {
  return fetch(`${SUPABASE_URL}/functions/v1/submit-platform-survey-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ action, ...params }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) return { __error: true, message: data?.error || tr("psErrGeneric") };
      return data;
    })
    .catch(() => ({ __error: true, message: tr("saErrServerConn") }));
}

function platformSurveyFromRow(r) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    description: r.description || "",
    questions: Array.isArray(r.questions) ? r.questions : [],
    triggerModule: r.trigger_module || "",
    triggerEvent: r.trigger_event || "",
    displayDelaySeconds: Number(r.display_delay_seconds) || 0,
    maxDisplayCount: Number(r.max_display_count) || 1,
    targetRoles: Array.isArray(r.target_roles) ? r.target_roles : [],
    targetJobPositionIds: Array.isArray(r.target_job_position_ids) ? r.target_job_position_ids : [],
    startDate: r.start_date || "",
    endDate: r.end_date || "",
  };
}

function withinDateRange(row, now) {
  if (row.start_date && new Date(row.start_date) > now) return false;
  if (row.end_date && new Date(row.end_date) < now) return false;
  return true;
}

function matchesTarget(row, currentUser) {
  const roles = Array.isArray(row.target_roles) ? row.target_roles : [];
  const jobPositionIds = Array.isArray(row.target_job_position_ids) ? row.target_job_position_ids : [];
  if (roles.length > 0 && !roles.includes(currentUser?.role)) return false;
  if (jobPositionIds.length > 0 && !jobPositionIds.includes(currentUser?.jobPositionId)) return false;
  return true;
}

// ---------- ثبتِ نمایش / ردکردن — یکپارچه برایِ هر دو حالت ----------
// بدونِ username (بازدیدکننده‌ی ناشناسِ public) => فقط localStorage؛ با
// username (کاربرِ واردشده) => Edge Function (جدولِ impressions).
export async function recordImpression(surveyId, username) {
  if (!username) {
    const r = incrementPublicImpressionLocally(surveyId);
    return { shownCount: r.shownCount, dismissed: r.dismissed };
  }
  return callPlatformSurveyFn("recordImpression", { surveyId, username });
}

export async function dismissSurvey(surveyId, username) {
  if (!username) {
    dismissPublicLocally(surveyId);
    return { ok: true };
  }
  return callPlatformSurveyFn("dismiss", { surveyId, username });
}

export async function submitSurveyResponse(surveyId, answers, respondent) {
  return callPlatformSurveyFn("submit", { surveyId, answers, respondent: respondent || {} });
}

// ---------- انتخابِ نظرسنجیِ واجدِ شرایط از میانِ چند کاندیدایِ فعال ----------
async function pickEligibleSurvey(rows, currentUser) {
  const now = new Date();
  const eligible = rows.filter((r) => withinDateRange(r, now) && matchesTarget(r, currentUser));
  const username = currentUser?.username || "";
  for (const row of eligible) {
    const survey = platformSurveyFromRow(row);
    const gate = await recordImpression(survey.id, username);
    if (gate?.__error || gate.dismissed) continue;
    if (gate.shownCount > survey.maxDisplayCount) continue;
    return survey;
  }
  return null;
}

export async function loadActivePublicSurvey() {
  const rows = await sb(`platform_surveys?kind=eq.public&status=eq.active&select=*&order=created_at.desc`);
  if (!sbOk(rows)) return null;
  return pickEligibleSurvey(rows, null);
}

export async function loadActiveWelcomeSurvey(currentUser) {
  if (!currentUser?.username) return null;
  const rows = await sb(`platform_surveys?kind=eq.welcome&status=eq.active&select=*&order=created_at.desc`);
  if (!sbOk(rows)) return null;
  return pickEligibleSurvey(rows, currentUser);
}

export async function checkEventSurvey(eventKey, currentUser) {
  if (!eventKey || !currentUser?.username) return null;
  const rows = await sb(`platform_surveys?kind=eq.event&status=eq.active&trigger_event=eq.${encodeURIComponent(eventKey)}&select=*&order=created_at.desc`);
  if (!sbOk(rows)) return null;
  return pickEligibleSurvey(rows, currentUser);
}
