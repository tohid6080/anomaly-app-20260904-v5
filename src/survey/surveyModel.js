/* ============================================================================ *
 * مدلِ خالصِ نظرسنجی — بدونِ React، قابلِ استفاده در سازنده، اجرا و اعتبارسنجی.
 * ساختارِ سؤال: { id, type, title, description, required, config }
 *   config بسته به نوع: { options:[{id,label}], min, max, step, minLabel, maxLabel, placeholder }
 * ============================================================================ */

export const SCHEMA_VERSION = 1;

// نوعِ سؤال‌های فاز ۱
export const QUESTION_TYPES = [
  { type: "short_text",   labelKey: "svQtShortText",   icon: "Type",        group: "text" },
  { type: "long_text",    labelKey: "svQtLongText",    icon: "AlignLeft",   group: "text" },
  { type: "single_choice",labelKey: "svQtSingle",      icon: "CircleDot",   group: "choice" },
  { type: "multi_choice", labelKey: "svQtMulti",       icon: "ListChecks",  group: "choice" },
  { type: "dropdown",     labelKey: "svQtDropdown",    icon: "ChevronDown", group: "choice" },
  { type: "yes_no",       labelKey: "svQtYesNo",       icon: "ToggleLeft",  group: "choice" },
  { type: "rating",       labelKey: "svQtRating",      icon: "Star",        group: "scale" },
  { type: "linear_scale", labelKey: "svQtScale",       icon: "SlidersHorizontal", group: "scale" },
  { type: "number",       labelKey: "svQtNumber",      icon: "Hash",        group: "text" },
  { type: "date",         labelKey: "svQtDate",        icon: "Calendar",    group: "text" },
  { type: "section",      labelKey: "svQtSection",     icon: "Heading",     group: "layout" },
];

export const CHOICE_TYPES = ["single_choice", "multi_choice", "dropdown"];
export const SCALE_TYPES = ["rating", "linear_scale"];
// نوع‌هایی که در «حالتِ آزمون» می‌توانند پاسخِ درست/نمره داشته باشند
export const SCORABLE_TYPES = ["single_choice", "multi_choice", "dropdown", "yes_no"];

let _n = 0;
function rid(prefix) {
  _n += 1;
  return `${prefix}_${Date.now().toString(36)}${_n.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newOption(label = "") {
  return { id: rid("opt"), label };
}

export function newQuestion(type) {
  const q = { id: rid("q"), type, title: "", description: "", required: false, config: {} };
  if (SCORABLE_TYPES.includes(type)) { q.config.points = 1; q.config.correct = []; }
  if (CHOICE_TYPES.includes(type)) {
    q.config.options = [newOption(""), newOption("")];
  } else if (type === "rating") {
    q.config = { max: 5 };
  } else if (type === "linear_scale") {
    q.config = { min: 0, max: 10, step: 1, minLabel: "", maxLabel: "" };
  } else if (type === "number") {
    q.config = { min: null, max: null };
  }
  return q;
}

export function newSurvey() {
  return {
    schemaVersion: SCHEMA_VERSION,
    title: "",
    description: "",
    status: "draft",
    questions: [],
    settings: {
      mode: "survey",              // survey | exam
      anonymous: true,
      collectName: false,
      collectUnit: false,
      thankYouText: "",
      startAt: "",
      endAt: "",
      maxResponses: null,
      onePerDevice: true,
      // فقط در حالتِ آزمون:
      passScore: 60,               // درصدِ قبولی
      showScoreToRespondent: true, // نمره بلافاصله به پاسخ‌دهنده نشان داده شود
      shuffleQuestions: false,
      timeLimitMin: null,          // محدودیتِ زمانی (دقیقه) — تهی = بدون محدودیت
    },
  };
}

/* ---------------- نمره‌دهیِ آزمون (خالص؛ نسخهٔ آینهٔ همین در Edge Function) ----------------
 * چندگزینه‌ای: تطبیقِ دقیقِ مجموعه (همهٔ درست‌ها انتخاب، هیچ غلطی نه).
 * تک‌گزینه/کشویی/بله‌خیر: پاسخ باید برابرِ اولین (تنها) گزینهٔ درست باشد.
 */
export function scoreExam(questions, answers, passScore = 60) {
  let score = 0;
  let maxScore = 0;
  (questions || []).forEach((q) => {
    if (!isAnswerable(q) || !SCORABLE_TYPES.includes(q.type)) return;
    const pts = Number(q.config?.points);
    const correct = Array.isArray(q.config?.correct) ? q.config.correct : [];
    if (!(pts > 0) || correct.length === 0) return;
    maxScore += pts;
    const a = answers?.[q.id];
    let right = false;
    if (q.type === "multi_choice") {
      const got = Array.isArray(a) ? a : [];
      right = got.length === correct.length && correct.every((c) => got.includes(c));
    } else {
      right = a != null && a === correct[0];
    }
    if (right) score += pts;
  });
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percent, passed: maxScore > 0 && percent >= passScore };
}

// آیا این آزمون اصلاً سؤالِ نمره‌دار دارد؟
export function examHasScorable(questions) {
  return (questions || []).some(
    (q) => SCORABLE_TYPES.includes(q.type) && Number(q.config?.points) > 0 && Array.isArray(q.config?.correct) && q.config.correct.length > 0,
  );
}

// آیا این سؤال «قابلِ پاسخ» است (بخش/توضیح نه)
export const isAnswerable = (q) => q && q.type !== "section";

// اعتبارسنجیِ یک پاسخ در برابرِ یک سؤال → پیامِ خطا یا "" (بدونِ خطا)
export function validateAnswer(q, value, t) {
  const tr = typeof t === "function" ? t : (k) => k;
  if (!isAnswerable(q)) return "";
  const empty =
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (q.required && empty) return tr("svErrRequired");
  if (empty) return "";

  if (q.type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return tr("svErrNumber");
    if (q.config?.min != null && n < q.config.min) return tr("svErrNumberMin");
    if (q.config?.max != null && n > q.config.max) return tr("svErrNumberMax");
  }
  if (q.type === "multi_choice" && !Array.isArray(value)) return tr("svErrBadValue");
  if (CHOICE_TYPES.includes(q.type)) {
    const ids = (q.config?.options || []).map((o) => o.id);
    const vals = Array.isArray(value) ? value : [value];
    if (!vals.every((v) => ids.includes(v))) return tr("svErrBadValue");
  }
  return "";
}

// اعتبارسنجیِ کلِ پاسخ‌ها → { ok, errors: { [qid]: msg } }
export function validateResponse(questions, answers, t) {
  const errors = {};
  (questions || []).forEach((q) => {
    const msg = validateAnswer(q, answers?.[q.id], t);
    if (msg) errors[q.id] = msg;
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

// شمارِ پاسخ‌ها به تفکیکِ روز (برای نمودارِ روند) — [{ day: "YYYY-MM-DD", count }]
export function responsesByDay(responses) {
  const map = {};
  (responses || []).forEach((r) => {
    const d = (r.submittedAt || "").slice(0, 10);
    if (!d) return;
    map[d] = (map[d] || 0) + 1;
  });
  return Object.keys(map).sort().map((day) => ({ day, count: map[day] }));
}

// توزیعِ نمرهٔ آزمون در ۵ سطل (۰–۲۰ … ۸۰–۱۰۰)
export function scoreBuckets(responses) {
  const b = [0, 0, 0, 0, 0];
  (responses || []).forEach((r) => {
    if (r.percent == null) return;
    const i = Math.min(4, Math.floor(r.percent / 20));
    b[i] += 1;
  });
  return b.map((count, i) => ({ label: `${i * 20}–${i * 20 + 20}`, count }));
}

// خلاصه‌ی یک سؤال برای تحلیل
export function summarizeQuestion(q, responses) {
  const vals = responses.map((r) => r.answers?.[q.id]).filter((v) => v != null && v !== "");
  if (CHOICE_TYPES.includes(q.type)) {
    const counts = {};
    (q.config?.options || []).forEach((o) => { counts[o.id] = 0; });
    vals.forEach((v) => {
      (Array.isArray(v) ? v : [v]).forEach((id) => { if (id in counts) counts[id] += 1; });
    });
    return { kind: "choice", counts, total: vals.length };
  }
  if (q.type === "yes_no") {
    const yes = vals.filter((v) => v === "yes").length;
    return { kind: "yesno", yes, no: vals.length - yes, total: vals.length };
  }
  if (SCALE_TYPES.includes(q.type) || q.type === "number") {
    const nums = vals.map(Number).filter((n) => !Number.isNaN(n));
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    return { kind: "numeric", avg, count: nums.length, min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null };
  }
  return { kind: "text", values: vals.slice(0, 200), total: vals.length };
}
