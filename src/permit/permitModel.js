/* ============================================================================ *
 * مدلِ خالصِ «صدور مجوز کار» — بدونِ React.
 * لایه‌ی استاندارد (وضعیت‌ها، ماشینِ حالت، فیلدهای هویتی) ثابت است؛
 * لایه‌ی پویا از permit_templates.schema می‌آید (Section → Row → Cell → Field).
 * ============================================================================ */

// ---------- ماشینِ حالت ----------
export const PERMIT_STATUSES = ["draft", "submitted", "under_review", "rejected", "issued", "active", "suspended", "closed", "expired"];

export const STATUS_META = {
  draft:        { key: "pmStDraft",       tone: "gray" },
  submitted:    { key: "pmStSubmitted",   tone: "teal" },
  under_review: { key: "pmStUnderReview", tone: "teal" },
  rejected:     { key: "pmStRejected",    tone: "danger" },
  issued:       { key: "pmStIssued",      tone: "warn" },
  active:       { key: "pmStActive",      tone: "ok" },
  suspended:    { key: "pmStSuspended",   tone: "warn" },
  closed:       { key: "pmStClosed",      tone: "gray" },
  expired:      { key: "pmStExpired",     tone: "danger" },
};

// انتقال‌های مجاز
export const TRANSITIONS = {
  draft:        ["submitted"],
  submitted:    ["under_review", "draft"],
  under_review: ["issued", "rejected"],
  rejected:     ["draft"],
  issued:       ["active", "suspended", "closed"],
  active:       ["suspended", "closed", "expired"],
  suspended:    ["active", "closed"],
  closed:       [],
  expired:      [],
};
export const canTransition = (from, to) => (TRANSITIONS[from] || []).indexOf(to) > -1;

// ---------- انواعِ فیلدِ پویا ----------
export const FIELD_TYPES = [
  "text", "long_text", "number", "date", "daterange",
  "select", "radio", "checkgroup", "yes_no",
  "table", "signature", "approval", "terms", "person",
];
export const isInput = (t) => t !== "terms" && t !== "approval" && t !== "signature";

// ---------- گردآوریِ فیلدهای یک اسکیما ----------
export function schemaFields(schema) {
  const out = [];
  (schema?.sections || []).forEach((s) => {
    (s.rows || []).forEach((r) => {
      (r.cells || []).forEach((c) => { if (c.kind === "field" && c.field) out.push(c.field); });
    });
  });
  return out;
}

// فیلدهایی که schema با bindTo به لایه‌ی استاندارد نگاشت کرده — مقدارشان
// هنگامِ ذخیره به ستون‌های استانداردِ permits کپی می‌شود، نه داخلِ form_data.
export const BIND_KEYS = ["title", "workLocation", "workDescription", "riskRef"];
export function collectBinds(schema, formData) {
  const out = {};
  schemaFields(schema).forEach((f) => {
    if (f.bindTo && BIND_KEYS.indexOf(f.bindTo) > -1) {
      const val = formData?.[f.id];
      if (val != null) out[f.bindTo] = typeof val === "string" ? val : val;
    }
  });
  return out;
}

// اعتبارسنجیِ مقادیرِ پویا → { ok, errors: { fieldId: msg } }
export function validateForm(schema, formData, t) {
  const tr = typeof t === "function" ? t : (k) => k;
  const errors = {};
  schemaFields(schema).forEach((f) => {
    if (!f.required || !isInput(f.type)) return;
    const v = formData?.[f.id];
    const empty = v == null || v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (f.type === "table" && (!Array.isArray(v) || v.length === 0));
    if (empty) errors[f.id] = tr("pmErrRequired");
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

// ---------- کارخانه‌ی عناصرِ اسکیما — برای فرم‌سازِ گرید/جدولی (فازِ ۲) ----------
const genId = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const BIND_TARGETS = ["title", "workLocation", "workDescription", "riskRef"];

export function defaultConfigFor(type) {
  if (type === "select" || type === "radio" || type === "checkgroup") return { options: [] };
  if (type === "table") return { columns: [] };
  if (type === "terms") return { text: "" };
  return {};
}
export function newField(type) {
  return { id: genId("f"), type: type || "text", label: "", required: false, config: defaultConfigFor(type || "text") };
}
export function newCell(kind) {
  return kind === "label" ? { span: 12, kind: "label", label: "" } : { span: 12, kind: "field", field: newField("text") };
}
export function newRow() { return { id: genId("r"), cells: [newCell("field")] }; }
export function newSection() { return { id: genId("s"), title: "", locked: false, rows: [newRow()] }; }
export function blankSchema() { return { sections: [newSection()] }; }

// جابه‌جاییِ یک عنصر در آرایه (i → i+dir)، بدونِ تغییرِ آرایه‌ی ورودی
export function arrMove(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  return out;
}

// ---------- قالبِ سیستمیِ پیش‌فرض (آینه‌ی seedِ migration؛ fallback آفلاین) ----------
export const SYSTEM_TEMPLATE = {
  id: "ptpl-system-general-v1",
  permitType: "general",
  name: "مجوز کار عمومی",
  version: 1,
  schema: {
    sections: [
      { id: "s_work", title: "شرح کار", rows: [
        { id: "r1", cells: [
          { span: 4, kind: "field", field: { id: "work_type", type: "checkgroup", label: "نوع عملیات", required: true, config: { options: ["ساختمان", "مکانیک", "برق", "ابزاردقیق", "تست و بازرسی", "راه‌اندازی"] } } },
          { span: 5, kind: "field", field: { id: "work_location", type: "text", label: "محل انجام عملیات", required: true, bindTo: "workLocation" } },
          { span: 3, kind: "field", field: { id: "risk_ref", type: "text", label: "شماره ارزیابی ریسک مرتبط", bindTo: "riskRef" } },
        ] },
        { id: "r2", cells: [
          { span: 12, kind: "field", field: { id: "work_description", type: "long_text", label: "شرح عملیات", required: true, bindTo: "workDescription" } },
        ] },
      ] },
      { id: "s_people", title: "نفرات و تجهیزات", rows: [
        { id: "r1", cells: [
          { span: 12, kind: "field", field: { id: "key_people", type: "table", label: "فهرست نفرات کلیدی", required: true, config: { columns: [{ id: "c1", label: "نام و نام خانوادگی" }, { id: "c2", label: "سمت" }, { id: "c3", label: "کد پرسنلی" }] } } },
        ] },
        { id: "r2", cells: [
          { span: 12, kind: "field", field: { id: "equipment", type: "table", label: "ماشین‌آلات و تجهیزات", config: { columns: [{ id: "c1", label: "عنوان" }, { id: "c2", label: "کد / پلاک" }, { id: "c3", label: "گواهی معتبر" }] } } },
        ] },
      ] },
      { id: "s_hse", title: "کنترل‌های ویژه HSE", rows: [
        { id: "r1", cells: [
          { span: 12, kind: "field", field: { id: "special_hse", type: "checkgroup", label: "مجوزها و کنترل‌های ویژه", config: { options: ["پرتونگاری", "داربست‌بندی", "گودبرداری", "جابجایی / باربرداری سنگین", "کار در فضای محدود (کنترل گازها)", "ایزولاسیون الکتریکی / مکانیکی", "کار در ارتفاع", "کار گرم"] } } },
        ] },
        { id: "r2", cells: [
          { span: 12, kind: "field", field: { id: "hse_note", type: "long_text", label: "کنترل ریسک‌های HSE در حد قابل قبول است — توضیحات" } },
        ] },
      ] },
      { id: "s_sign", title: "امضاها", rows: [
        { id: "r1", cells: [
          { span: 4, kind: "field", field: { id: "sig_performer", type: "signature", label: "امضای مجری" } },
          { span: 4, kind: "field", field: { id: "sig_hse", type: "signature", label: "امضای سرپرست HSE" } },
          { span: 4, kind: "field", field: { id: "sig_issuer", type: "signature", label: "امضای صادرکننده" } },
        ] },
      ] },
      { id: "s_terms", title: "توضیحات", rows: [
        { id: "r1", cells: [
          { span: 12, kind: "field", field: { id: "terms", type: "terms", label: "شرایط و توضیحات", config: { text: "۱- این مجوز باید تا خاتمه‌ی فعالیت همراه مسئول اجراکننده در محل باشد و همه‌ی افراد درگیر از آن مطلع باشند.\n۲- مجوز باید فاقد هرگونه خط‌خوردگی باشد؛ در صورت عودت، مجوز جدید با شماره‌ی جدید صادر شود.\n۳- مسئولیت عواقب ناشی از عدم رعایت الزامات HSE بر عهده‌ی پیمانکار اجرایی است.\n۴- تمدید این مجوز روزانه است و باید پیش از شروع کارِ هر روز امضا شود." } } },
        ] },
      ] },
    ],
  },
  workflow: {
    parties: [
      { id: "requester", name: "درخواست‌کننده", steps: [{ id: "request", role: "performer", action: "request" }] },
      { id: "hse", name: "HSE", steps: [{ id: "hse_review", role: "hse", action: "review" }] },
      { id: "issuer", name: "صادرکننده", steps: [{ id: "issue", role: "issuer", action: "issue" }, { id: "close", role: "issuer", action: "close" }] },
    ],
  },
  branding: {},
};
