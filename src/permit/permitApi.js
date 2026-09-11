import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { SYSTEM_TEMPLATE, blankSchema } from "./permitModel.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const MODULE = "permitToWork";

/* ---------------- قالب‌ها ---------------- */
export function templateFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || null,
    permitType: r.permit_type || "general",
    name: r.name || "",
    version: Number(r.version) || 1,
    isActive: r.is_active !== false,
    schema: r.schema && typeof r.schema === "object" ? r.schema : {},
    workflow: r.workflow && typeof r.workflow === "object" ? r.workflow : {},
    branding: r.branding && typeof r.branding === "object" ? r.branding : {},
    isPublished: r.is_published === true,
    isSystem: !r.company_id,
    createdBy: r.created_by || "",
    updatedAt: r.updated_at,
  };
}

// قالب‌های در دسترس: سیستمی + اختصاصیِ شرکت. اگر شبکه چیزی نداد، دستِ‌کم
// قالبِ سیستمیِ داخلِ کد برگردانده می‌شود تا فرم قابلِ ساختن باشد.
export async function loadPermitTemplates() {
  const rows = await sb("permit_templates?is_active=eq.true&select=*&order=company_id.asc.nullsfirst,permit_type.asc,version.desc");
  const list = sbOk(rows) ? rows.map(templateFromRow) : [];
  if (!list.some((t) => t.isSystem)) list.unshift(SYSTEM_TEMPLATE);
  return list;
}

export async function loadPermitTemplate(id) {
  const rows = await sb(`permit_templates?id=eq.${id}&select=*`);
  if (sbOk(rows) && rows.length) return templateFromRow(rows[0]);
  return id === SYSTEM_TEMPLATE.id ? SYSTEM_TEMPLATE : null;
}

// کلونِ یک قالب به شرکتِ جاری (فاز ۱: فقط کلون/نام؛ فرم‌سازِ کامل = فاز ۲)
export async function cloneTemplateToCompany(srcId, name, createdBy) {
  const src = await loadPermitTemplate(srcId);
  if (!src) return { __error: true, message: tr("pmErrNotFound") };
  const id = uid("ptpl");
  const res = await offlineWrite({
    module: "permitTemplates", table: "permit_templates", action: "insert", id,
    payload: {
      company_id: getCurrentCompanyId(),
      permit_type: src.permitType,
      name: (name || src.name || "").trim() || tr("pmUntitledTemplate"),
      version: 1, is_active: true,
      schema: src.schema, workflow: src.workflow, branding: src.branding,
      created_by: createdBy || "", updated_at: new Date().toISOString(),
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true, id };
}

// قالبِ خالی برای شرکتِ جاری — فرم‌سازِ کامل (فازِ ۲)
export async function createBlankTemplate(name, permitType, createdBy) {
  const id = uid("ptpl");
  const res = await offlineWrite({
    module: "permitTemplates", table: "permit_templates", action: "insert", id,
    payload: {
      company_id: getCurrentCompanyId(),
      permit_type: (permitType || "general").trim() || "general",
      name: (name || "").trim() || tr("pmUntitledTemplate"),
      version: 1, is_active: true,
      schema: blankSchema(), workflow: {}, branding: {},
      created_by: createdBy || "", updated_at: new Date().toISOString(),
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true, id };
}

// ذخیره‌ی کاملِ قالب (متادیتا + اسکیمای پویا) — نسخه با هر ذخیره یکی جلو می‌رود
export async function saveTemplate(template) {
  if (!template?.id) return { __error: true, message: tr("pmErrSave") };
  const res = await offlineWrite({
    module: "permitTemplates", table: "permit_templates", action: "update", id: template.id,
    payload: {
      name: (template.name || "").trim() || tr("pmUntitledTemplate"),
      permit_type: (template.permitType || "general").trim() || "general",
      version: (Number(template.version) || 1) + 1,
      is_active: template.isActive !== false,
      schema: template.schema && typeof template.schema === "object" ? template.schema : {},
      workflow: template.workflow && typeof template.workflow === "object" ? template.workflow : {},
      branding: template.branding && typeof template.branding === "object" ? template.branding : {},
      updated_at: new Date().toISOString(),
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

export async function deleteCompanyTemplate(id) {
  const res = await offlineWrite({ module: "permitTemplates", table: "permit_templates", action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

// انتشار/لغوِ انتشارِ قالب — فقط پس از انتشار، پیمانکار آن را در فهرستِ
// انتخابِ قالب برایِ ثبتِ مجوزِ جدید می‌بیند.
export async function publishTemplate(id, publish) {
  const res = await offlineWrite({
    module: "permitTemplates", table: "permit_templates", action: "update", id,
    payload: { is_published: !!publish, updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

/* ---------------- مجوزها ---------------- */
export function permitFromRow(r) {
  return {
    id: r.id, companyId: r.company_id,
    permitNo: r.permit_no || "",
    templateId: r.template_id || "", templateVersion: r.template_version || null,
    permitType: r.permit_type || "general",
    title: r.title || "",
    workLocation: r.work_location || "",
    workDescription: r.work_description || "",
    applicantId: r.applicant_id || "", applicantName: r.applicant_name || "",
    issuerId: r.issuer_id || "", issuerName: r.issuer_name || "",
    performerId: r.performer_id || "", performerName: r.performer_name || "",
    startAt: r.start_at || "", endAt: r.end_at || "",
    riskRef: r.risk_ref || "",
    status: r.status || "draft",
    formData: r.form_data && typeof r.form_data === "object" ? r.form_data : {},
    workflowState: r.workflow_state && typeof r.workflow_state === "object" ? r.workflow_state : {},
    validUntil: r.valid_until || "",
    closedReason: r.closed_reason || "", closedAt: r.closed_at || "",
    createdBy: r.created_by || "", createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function permitToDb(rec) {
  return {
    company_id: rec.companyId || getCurrentCompanyId(),
    template_id: rec.templateId || null,
    template_version: rec.templateVersion || null,
    permit_type: rec.permitType || "general",
    title: (rec.title || "").trim(),
    work_location: (rec.workLocation || "").trim(),
    work_description: (rec.workDescription || "").trim(),
    applicant_id: rec.applicantId || "", applicant_name: (rec.applicantName || "").trim(),
    issuer_id: rec.issuerId || "", issuer_name: (rec.issuerName || "").trim(),
    performer_id: rec.performerId || "", performer_name: (rec.performerName || "").trim(),
    start_at: rec.startAt || null, end_at: rec.endAt || null,
    risk_ref: (rec.riskRef || "").trim(),
    form_data: rec.formData && typeof rec.formData === "object" ? rec.formData : {},
    updated_at: new Date().toISOString(),
  };
}

export async function loadPermits() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`permits?select=*&order=updated_at.desc${filter}`);
  return sbOk(rows) ? rows.map(permitFromRow) : [];
}
export async function loadPermit(id) {
  const rows = await sb(`permits?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length ? permitFromRow(rows[0]) : null;
}

async function logAudit(permitId, action, actor, detail) {
  try {
    await sb("permit_audit", { method: "POST", prefer: "return=minimal", body: JSON.stringify([{
      id: uid("paud"), permit_id: permitId, company_id: getCurrentCompanyId(),
      action, actor: actor || "", detail: detail || "",
    }]) });
  } catch { /* ممیزی نباید جریانِ اصلی را متوقف کند */ }
}
export async function loadPermitAudit(permitId) {
  const rows = await sb(`permit_audit?permit_id=eq.${permitId}&select=*&order=at.asc`);
  return sbOk(rows) ? rows.map((r) => ({ id: r.id, action: r.action, actor: r.actor, detail: r.detail, at: r.at })) : [];
}

export async function createPermit(partial, template, createdBy) {
  const id = uid("prm");
  const rec = {
    templateId: template?.id || "", templateVersion: template?.version || 1,
    permitType: template?.permitType || "general",
    title: "", workLocation: "", workDescription: "",
    applicantId: "", applicantName: createdBy || "",
    issuerId: "", issuerName: "", performerId: "", performerName: "",
    startAt: "", endAt: "", riskRef: "", formData: {},
    ...(partial || {}),
  };
  const res = await offlineWrite({
    module: MODULE, table: "permits", action: "insert", id,
    payload: { ...permitToDb(rec), status: "draft", created_by: createdBy || "" },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  await logAudit(id, "created", createdBy, "");
  return { ...rec, id, companyId: getCurrentCompanyId(), status: "draft" };
}

export async function savePermit(rec) {
  if (!rec?.id) return { __error: true, message: tr("pmErrSave") };
  const res = await offlineWrite({ module: MODULE, table: "permits", action: "update", id: rec.id, payload: permitToDb(rec) });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

// انتقالِ وضعیت + ثبتِ ممیزی. برخی انتقال‌ها فیلدهای جانبی هم می‌نویسند.
export async function transitionPermit(permit, to, actor, opts) {
  const o = opts || {};
  const patch = { status: to, updated_at: new Date().toISOString() };
  const wf = { ...(permit.workflowState || {}) };
  const now = new Date().toISOString();

  if (to === "under_review") wf.hse_review = { ...(wf.hse_review || {}), startedBy: actor, at: now };
  if (to === "rejected") wf.hse_review = { ...(wf.hse_review || {}), by: actor, at: now, decision: "rejected", note: o.note || "" };
  if (to === "issued") {
    wf.issue = { by: actor, at: now };
    patch.issuer_name = actor || permit.issuerName || "";
    // شماره‌ی مجوز به‌ازای شرکت (تابعِ امنِ دیتابیس)
    try {
      const seq = await sb("rpc/next_permit_no", { method: "POST", body: JSON.stringify({ p_company: getCurrentCompanyId() }) });
      const n = sbOk(seq) ? Number(seq) : (Array.isArray(seq) ? Number(seq[0]) : null);
      if (n) patch.permit_no = `WP-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
    } catch { /* بدونِ شماره هم صادر می‌شود؛ بعداً قابلِ اصلاح */ }
  }
  if (to === "active") patch.valid_until = o.validUntil || permit.validUntil || (permit.endAt ? String(permit.endAt).slice(0, 10) : null);
  if (to === "closed") { patch.closed_reason = o.reason || ""; patch.closed_at = now; }
  patch.workflow_state = wf;

  const res = await offlineWrite({ module: MODULE, table: "permits", action: "update", id: permit.id, payload: patch });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  await logAudit(permit.id, to, actor, o.note || o.reason || "");
  return { ok: true, permitNo: patch.permit_no };
}

/* ---------------- تمدیدِ روزانه ---------------- */
export async function loadRenewals(permitId) {
  const rows = await sb(`permit_renewals?permit_id=eq.${permitId}&select=*&order=day_no.asc`);
  return sbOk(rows) ? rows.map((r) => ({
    id: r.id, dayNo: r.day_no, renewedFor: r.renewed_for, renewedAt: r.renewed_at,
    contractorHse: r.contractor_hse || "", employerHse: r.employer_hse || "", note: r.note || "",
  })) : [];
}
export async function addRenewal(permit, { dayNo, renewedFor, contractorHse, employerHse, note }, actor) {
  const id = uid("prnw");
  const res = await offlineWrite({
    module: "permitRenewals", table: "permit_renewals", action: "insert", id,
    payload: {
      permit_id: permit.id, company_id: getCurrentCompanyId(),
      day_no: dayNo || 1, renewed_for: renewedFor || null,
      contractor_hse: contractorHse || "", employer_hse: employerHse || "", note: note || "",
      created_by: actor || "",
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  // valid_until را یک روز جلو ببر
  if (renewedFor) {
    await offlineWrite({ module: MODULE, table: "permits", action: "update", id: permit.id,
      payload: { valid_until: renewedFor, updated_at: new Date().toISOString() } });
  }
  await logAudit(permit.id, "renewed", actor, `روز ${dayNo || 1}`);
  return { ok: true };
}

export async function deletePermit(id) {
  const res = await offlineWrite({ module: MODULE, table: "permits", action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}
