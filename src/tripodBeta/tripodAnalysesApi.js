import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { getIncidentForTripod, computeTripodCandidateFlag } from "./incidentSource.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * پورت وفادار از routes/analyses.py + services/workflow.py + services/tree.py.
 * هیچ منطقی (گردش‌کار، فیلتر آبشاری گروه، آستانه‌های خروجی علل ریشه‌ای)
 * تغییر نکرده — فقط از SQLite/Flask به Supabase/React منتقل شده.
 */

const PATH_COUNT = 4;

// ---------- گردش‌کار — عیناً از services/workflow.py ----------

export const TRANSITIONS = {
  "NOT_REQUIRED|request": "REQUESTED",
  "CANDIDATE|request": "REQUESTED",
  "REQUESTED|start": "IN_PROGRESS",
  "IN_PROGRESS|submit": "SUBMITTED",
  "SUBMITTED|_auto_forward": "EMPLOYER_REVIEW",
  "EMPLOYER_REVIEW|approve": "APPROVED",
  "EMPLOYER_REVIEW|reject": "REJECTED",
  "REJECTED|revise": "IN_PROGRESS",
  "APPROVED|_auto_finalize": "FINAL",
};
export const ACTION_REQUIRED_ROLE = { request: "EMPLOYER", start: "CONTRACTOR", submit: "CONTRACTOR", approve: "EMPLOYER", reject: "EMPLOYER", revise: "CONTRACTOR" };
export const EDITABLE_STATUSES = new Set(["NOT_REQUIRED", "CANDIDATE", "REQUESTED", "IN_PROGRESS"]);
// نگاشتِ وضعیت → کلیدِ ترجمه (منبع واحد: translations.js). مصرف‌کننده‌ها
// با t()/tr() مقدار نهایی را می‌گیرند تا با زبان فعلی کاربر هماهنگ باشد.
export const TRIPOD_STATUS_LABELS = {
  NOT_REQUIRED: "tpStatusNotRequired", CANDIDATE: "tpStatusCandidate", REQUESTED: "tpStatusRequested",
  IN_PROGRESS: "tpStatusInProgress", SUBMITTED: "tpStatusSubmitted", EMPLOYER_REVIEW: "tpStatusEmployerReview",
  APPROVED: "tpStatusApproved", REJECTED: "tpStatusRejected", FINAL: "tpStatusFinal",
};
export const tripodStatusLabel = (status) => tr(TRIPOD_STATUS_LABELS[status] || status);

function analysisFromRow(r) {
  return {
    id: r.id,
    incidentId: r.incident_id,
    status: r.status,
    isLocked: !!r.is_locked,
    eventDescription: r.event_description || "",
    hazardDescription: r.hazard_description || "",
    requestedBy: r.requested_by || "",
    requestedAt: r.requested_at,
    contractorOrg: r.contractor_org || "",
    submittedBy: r.submitted_by || "",
    submittedAt: r.submitted_at,
    employerReviewedBy: r.employer_reviewed_by || "",
    employerReviewedAt: r.employer_reviewed_at,
    rejectionReason: r.rejection_reason || "",
    approvedBy: r.approved_by || "",
    approvedAt: r.approved_at,
    createdAt: r.created_at,
  };
}

export async function loadAnalysisForIncident(incidentId) {
  const rows = await sb(`tripod_analyses?incident_id=eq.${incidentId}&select=*`);
  return sbOk(rows) && rows.length > 0 ? analysisFromRow(rows[0]) : null;
}

export async function loadAnalysisById(analysisId) {
  const rows = await sb(`tripod_analyses?id=eq.${analysisId}&select=*`);
  return sbOk(rows) && rows.length > 0 ? analysisFromRow(rows[0]) : null;
}

// معادل create_analysis
export async function createOrGetAnalysis(incidentId) {
  const existing = await loadAnalysisForIncident(incidentId);
  if (existing) return existing;

  const incident = await getIncidentForTripod(incidentId);
  if (!incident) return { __error: true, message: tr("tpErrIncidentNotFound") };

  const companyId = getCurrentCompanyId();
  const status = computeTripodCandidateFlag(incident) ? "CANDIDATE" : "NOT_REQUIRED";
  const analysisId = uid("tripod");

  const payload = {
    id: analysisId, incident_id: incidentId, company_id: companyId, status,
    event_description: incident.description || null, contractor_org: incident.contractorOrg || null,
  };
  const rows = await sb("tripod_analyses", { method: "POST", body: JSON.stringify([payload]) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrCreateAnalysis") };

  const branchPayload = Array.from({ length: PATH_COUNT }, (_, i) => ({
    id: uid("branch"), analysis_id: analysisId, company_id: companyId, path_no: i + 1,
  }));
  await sb("tripod_branches", { method: "POST", body: JSON.stringify(branchPayload), prefer: "return=minimal" });

  await logHistory(analysisId, null, status, null, tr("tpHistAutoCreate"));
  return analysisFromRow(rows[0]);
}

async function logHistory(analysisId, fromStatus, toStatus, changedBy, note) {
  await sb("tripod_status_history", {
    method: "POST",
    body: JSON.stringify([{ id: uid("hist"), analysis_id: analysisId, company_id: getCurrentCompanyId(), from_status: fromStatus, to_status: toStatus, changed_by: changedBy || "", note: note || null }]),
    prefer: "return=minimal",
  });
}

// ---------- انتقال‌های گردش‌کار — عیناً از _do_transition در routes/analyses.py ----------

export async function transitionAnalysis(analysisId, action, role, actorName, reason) {
  const current = await loadAnalysisById(analysisId);
  if (!current) return { __error: true, message: tr("tpErrAnalysisNotFound") };

  const requiredRole = ACTION_REQUIRED_ROLE[action];
  if (requiredRole && role !== requiredRole && role !== "ADMIN") {
    return { __error: true, message: tr("tpErrActionRoleOnly", { role: requiredRole === "EMPLOYER" ? tr("tpRoleEmployer") : tr("tpRoleContractor") }) };
  }
  const toStatus = TRANSITIONS[`${current.status}|${action}`];
  if (!toStatus) {
    return { __error: true, message: tr("tpErrInvalidTransition", { status: tr(TRIPOD_STATUS_LABELS[current.status] || current.status) }) };
  }
  if (action === "reject" && !reason) {
    return { __error: true, message: tr("tpErrRejectReasonRequired") };
  }

  const nowIso = new Date().toISOString();
  const updates = { status: toStatus, updated_at: nowIso };
  if (action === "request") { updates.requested_by = actorName; updates.requested_at = nowIso; }
  else if (action === "submit") { updates.submitted_by = actorName; updates.submitted_at = nowIso; }
  else if (action === "approve") { updates.employer_reviewed_by = actorName; updates.employer_reviewed_at = nowIso; updates.approved_by = actorName; updates.approved_at = nowIso; updates.is_locked = true; }
  else if (action === "reject") { updates.employer_reviewed_by = actorName; updates.employer_reviewed_at = nowIso; updates.rejection_reason = reason; }

  const rows = await sb(`tripod_analyses?id=eq.${analysisId}`, { method: "PATCH", body: JSON.stringify(updates) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrGenericOp") };
  await logHistory(analysisId, current.status, toStatus, actorName);

  // پرش‌های خودکار — دقیقاً مثل نسخه‌ی اصلی
  if (toStatus === "SUBMITTED") {
    const auto = TRANSITIONS["SUBMITTED|_auto_forward"];
    await sb(`tripod_analyses?id=eq.${analysisId}`, { method: "PATCH", body: JSON.stringify({ status: auto, updated_at: new Date().toISOString() }) });
    await logHistory(analysisId, "SUBMITTED", auto, null, tr("tpHistAutoForward"));
    return loadAnalysisById(analysisId);
  }
  if (toStatus === "APPROVED") {
    const auto = TRANSITIONS["APPROVED|_auto_finalize"];
    await sb(`tripod_analyses?id=eq.${analysisId}`, { method: "PATCH", body: JSON.stringify({ status: auto, is_locked: true, updated_at: new Date().toISOString() }) });
    await logHistory(analysisId, "APPROVED", auto, actorName, tr("tpHistAutoFinalize"));
    return loadAnalysisById(analysisId);
  }
  return loadAnalysisById(analysisId);
}

export async function loadHistory(analysisId) {
  const rows = await sb(`tripod_status_history?analysis_id=eq.${analysisId}&select=*&order=changed_at.asc`);
  return sbOk(rows) ? rows.map((r) => ({ id: r.id, fromStatus: r.from_status, toStatus: r.to_status, changedBy: r.changed_by || "", changedAt: r.changed_at, note: r.note || "" })) : [];
}

// ---------- ویرایش رویداد/خطر ----------

export async function updateAnalysisFields(analysisId, fields) {
  const rows = await sb(`tripod_analyses?id=eq.${analysisId}`, { method: "PATCH", body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrSave") };
  return analysisFromRow(rows[0]);
}

// ---------- اهداف (Targets) ----------

export async function loadTargets(analysisId) {
  const rows = await sb(`tripod_targets?analysis_id=eq.${analysisId}&select=*,tripod_ref_target_category(title_fa)`);
  return sbOk(rows) ? rows.map((r) => ({ id: r.id, categoryCode: r.category_code, categoryTitle: r.tripod_ref_target_category?.title_fa || r.category_code, description: r.description || "" })) : [];
}
export async function addTarget(analysisId, categoryCode, description) {
  const rows = await sb("tripod_targets", { method: "POST", body: JSON.stringify([{ id: uid("target"), analysis_id: analysisId, company_id: getCurrentCompanyId(), category_code: categoryCode, description: description || null }]) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrAddTarget") };
  return { ok: true };
}
export async function deleteTarget(targetId) {
  await sb(`tripod_targets?id=eq.${targetId}`, { method: "DELETE", prefer: "return=minimal" });
  return { ok: true };
}

// ---------- مسیرها (Branches) — همیشه دقیقاً ۴ عدد، فقط ویرایش می‌شوند ----------

export async function loadBranchesWithDetails(analysisId) {
  const branches = await sb(`tripod_branches?analysis_id=eq.${analysisId}&select=*&order=path_no.asc`);
  if (!sbOk(branches)) return [];
  const result = [];
  for (const b of branches) {
    const preconds = await sb(`tripod_branch_preconditions?branch_id=eq.${b.id}&select=*,tripod_ref_precondition(code,text_fa,group_no)`);
    const preList = sbOk(preconds) ? preconds.map((p) => ({
      id: p.id, preconditionId: p.precondition_id, note: p.note || "",
      code: p.tripod_ref_precondition?.code, text: p.tripod_ref_precondition?.text_fa, groupNo: p.tripod_ref_precondition?.group_no,
    })) : [];

    const hiddens = await sb(`tripod_branch_hidden_failures?branch_id=eq.${b.id}&select=*,tripod_ref_hidden_failure(code,text_fa,group_no,brf_code)`);
    const hidList = sbOk(hiddens) ? hiddens.map((h) => ({
      id: h.id, hiddenFailureId: h.hidden_failure_id, preconditionLinkId: h.precondition_link_id, note: h.note || "",
      code: h.tripod_ref_hidden_failure?.code, text: h.tripod_ref_hidden_failure?.text_fa, groupNo: h.tripod_ref_hidden_failure?.group_no, brfCode: h.tripod_ref_hidden_failure?.brf_code,
    })) : [];

    for (const p of preList) p.hiddenFailures = hidList.filter((h) => h.preconditionLinkId === p.id);

    result.push({
      id: b.id, pathNo: b.path_no, surfaceFailureType: b.surface_failure_type || "", surfaceFailureText: b.surface_failure_text || "",
      preconditions: preList,
    });
  }
  return result;
}

export async function updateBranch(branchId, fields) {
  const payload = {};
  if ("surfaceFailureType" in fields) payload.surface_failure_type = fields.surfaceFailureType || null;
  if ("surfaceFailureText" in fields) payload.surface_failure_text = fields.surfaceFailureText || null;
  const rows = await sb(`tripod_branches?id=eq.${branchId}`, { method: "PATCH", body: JSON.stringify(payload) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrSaveBranch") };
  return { ok: true };
}

export async function addBranchPrecondition(branchId, preconditionId, note) {
  const rows = await sb("tripod_branch_preconditions", { method: "POST", body: JSON.stringify([{ id: uid("bp"), branch_id: branchId, company_id: getCurrentCompanyId(), precondition_id: preconditionId, note: note || null }]) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrAddPrecondition") };
  return { ok: true };
}
export async function deleteBranchPrecondition(bpId) {
  await sb(`tripod_branch_preconditions?id=eq.${bpId}`, { method: "DELETE", prefer: "return=minimal" });
  return { ok: true };
}

// معادل add_hidden_failure_for_precondition — قید هم‌گروه‌بودن سمت
// کلاینت هم چک می‌شود (سمت UI اصلاً گزینه‌ی گروه دیگر را نشان نمی‌دهد)،
// ولی همین‌جا هم دوباره صریح چک می‌شود تا از هر مسیر ارسال داده‌ی نامعتبر جلوگیری شود.
export async function addBranchHiddenFailure(branchId, preconditionLinkId, hiddenFailureId, preconditionGroupNo, hiddenFailureGroupNo, note) {
  if (preconditionGroupNo !== hiddenFailureGroupNo) {
    return { __error: true, message: tr("tpErrHiddenFailureSameGroup") };
  }
  const rows = await sb("tripod_branch_hidden_failures", {
    method: "POST",
    body: JSON.stringify([{ id: uid("bhf"), branch_id: branchId, company_id: getCurrentCompanyId(), hidden_failure_id: hiddenFailureId, precondition_link_id: preconditionLinkId, note: note || null }]),
  });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrAddHiddenFailure") };
  return { ok: true };
}
export async function deleteBranchHiddenFailure(bhfId) {
  await sb(`tripod_branch_hidden_failures?id=eq.${bhfId}`, { method: "DELETE", prefer: "return=minimal" });
  return { ok: true };
}

// ---------- خروجی‌های علل ریشه‌ای — عیناً از services/tree.py::root_cause_summary ----------

export async function loadRootCauseSummary(analysisId) {
  const branches = await loadBranchesWithDetails(analysisId);
  // شمارش تعداد مسیرهای مستقلی که هر کد اشکال پنهان در آن‌ها تکرار شده
  const codeCount = new Map(); // code -> {text, brfCode, groupNo, branchIds:Set}
  const brfCount = new Map(); // brfCode -> {count, nameEn}

  for (const b of branches) {
    for (const p of b.preconditions) {
      for (const h of p.hiddenFailures) {
        if (!codeCount.has(h.code)) codeCount.set(h.code, { text: h.text, brfCode: h.brfCode, groupNo: h.groupNo, branchIds: new Set() });
        codeCount.get(h.code).branchIds.add(b.id);

        const brf = h.brfCode || null;
        if (!brfCount.has(brf)) brfCount.set(brf, 0);
        brfCount.set(brf, brfCount.get(brf) + 1);
      }
    }
  }

  // خروجی ۲: فقط کدهایی که در >=۲ مسیر مستقل تکرار شده‌اند
  const byHiddenFailureCode = [];
  for (const [code, info] of codeCount.entries()) {
    const branchCount = info.branchIds.size;
    if (branchCount < 2) continue;
    const classification = branchCount >= 4 ? "root_cause" : branchCount === 3 ? "major_issue" : "hidden_issue";
    const classificationFa = tr({ root_cause: "tpClassRootCause", major_issue: "tpClassMajorIssue", hidden_issue: "tpClassHiddenIssue" }[classification]);
    byHiddenFailureCode.push({ code, textFa: info.text, brfCode: info.brfCode, groupNo: info.groupNo, branchCount, classification, classificationFa });
  }
  byHiddenFailureCode.sort((a, b) => b.branchCount - a.branchCount || a.code.localeCompare(b.code));

  // خروجی ۱: مجموع تکرار هر دسته BRF — مستقل از خروجی ۲
  const brfRefRows = await sb("tripod_ref_brf_category?select=*");
  const brfMap = sbOk(brfRefRows) ? Object.fromEntries(brfRefRows.map((r) => [r.code, r])) : {};
  const byBrfCategory = [...brfCount.entries()]
    .map(([code, occurrences]) => ({ brfCode: code, occurrences, brfNameFa: brfMap[code]?.name_fa || code, brfNameEn: brfMap[code]?.name_en || "" }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return { byHiddenFailureCode, byBrfCategory };
}

// ---------- اقدام اصلاحی مخصوص همین تحلیل (snapshot) — عیناً از routes/corrective_actions.py ----------

export async function loadTripodCorrectiveActions(analysisId) {
  const rows = await sb(`tripod_corrective_actions?analysis_id=eq.${analysisId}&select=*&order=created_at.desc`);
  return sbOk(rows) ? rows.map((r) => ({
    id: r.id, sourceType: r.source_type, brfCode: r.brf_code || "", hiddenFailureCode: r.hidden_failure_code || "",
    titleFa: r.title_fa, repeatCount: r.repeat_count, classification: r.classification || "",
    description: r.description, responsiblePerson: r.responsible_person, dueDate: r.due_date, status: r.status, createdAt: r.created_at,
    responsibleContractorId: r.responsible_contractor_id || "", responsibleContractorName: r.responsible_contractor_name || "",
  })) : [];
}

export async function createTripodCorrectiveAction(analysisId, rec, createdBy) {
  if (!rec.description?.trim() || !rec.responsiblePerson?.trim()) {
    return { __error: true, message: tr("tpErrActionAndOwnerRequired") };
  }
  const payload = {
    id: uid("tca"), analysis_id: analysisId, company_id: getCurrentCompanyId(),
    source_type: rec.sourceType, brf_code: rec.brfCode || null, hidden_failure_code: rec.hiddenFailureCode || null,
    title_fa: rec.titleFa, repeat_count: rec.repeatCount, classification: rec.classification || null,
    description: rec.description.trim(), responsible_person: rec.responsiblePerson.trim(),
    due_date: rec.dueDate || null, status: "OPEN", created_by: createdBy || "",
  };
  const rows = await sb("tripod_corrective_actions", { method: "POST", body: JSON.stringify([payload]) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrCreateCorrectiveAction") };
  return { ok: true };
}

export async function updateTripodCorrectiveActionStatus(caId, status) {
  const rows = await sb(`tripod_corrective_actions?id=eq.${caId}`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrUpdateStatus") };
  return { ok: true };
}

// ارجاع اقدام اصلاحی Tripod Beta به یک شرکت/پیمانکار مشخص جهت پیگیری —
// contractorId=null یعنی لغو ارجاع (بدون‌مسئول)
export async function assignTripodCorrectiveActionContractor(caId, contractorId, contractorName) {
  const payload = {
    responsible_contractor_id: contractorId || null,
    responsible_contractor_name: contractorId ? (contractorName || "") : null,
    updated_at: new Date().toISOString(),
  };
  const rows = await sb(`tripod_corrective_actions?id=eq.${caId}`, { method: "PATCH", body: JSON.stringify(payload) });
  if (!sbOk(rows)) return { __error: true, message: tr("tpErrAssignContractor") };
  return { ok: true };
}

export const CA_STATUS_LABELS = { OPEN: "tpCaStatusOpen", IN_PROGRESS: "tpCaStatusInProgress", DONE: "tpCaStatusDone", CANCELLED: "tpCaStatusCancelled" };
export const caStatusLabel = (status) => tr(CA_STATUS_LABELS[status] || status);

// ---------- خلاصه‌ی سراسریِ اقدامات اصلاحیِ Tripod Beta برای کل شرکت ----------
// برخلاف loadTripodCorrectiveActions (مخصوص یک تحلیل)، این تابع همه‌ی
// اقدامات اصلاحی Tripod Beta شرکت را می‌خواند تا در ماژول «مدیریت عدم
// انطباق‌ها ← لیست اقدامات اصلاحی» هم دیده شوند. برای هر ردیف شماره‌ی
// حادثه/محل را هم (با دو کوئری دسته‌ای، بدون N+1) ضمیمه می‌کند.
export async function loadTripodCorrectiveActionsForCompany() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`tripod_corrective_actions?select=*&order=created_at.desc${filter}`);
  if (!sbOk(rows) || rows.length === 0) return [];

  const analysisIds = [...new Set(rows.map((r) => r.analysis_id).filter(Boolean))];
  const analysisToIncident = {};
  if (analysisIds.length > 0) {
    const idList = analysisIds.map((id) => `"${id}"`).join(",");
    const analysisRows = await sb(`tripod_analyses?id=in.(${idList})&select=id,incident_id`);
    if (sbOk(analysisRows)) analysisRows.forEach((a) => { analysisToIncident[a.id] = a.incident_id; });
  }

  const incidentIds = [...new Set(Object.values(analysisToIncident).filter(Boolean))];
  let incidentById = {};
  if (incidentIds.length > 0) {
    const idList = incidentIds.map((id) => `"${id}"`).join(",");
    const incidentRows = await sb(`incidents?id=in.(${idList})&select=id,incident_no,location`);
    if (sbOk(incidentRows)) incidentById = Object.fromEntries(incidentRows.map((i) => [i.id, i]));
  }

  return rows.map((r) => {
    const incidentId = analysisToIncident[r.analysis_id] || null;
    const incident = incidentId ? incidentById[incidentId] : null;
    return {
      id: r.id,
      analysisId: r.analysis_id,
      incidentId,
      incidentNo: incident?.incident_no || "",
      incidentLocation: incident?.location || "",
      titleFa: r.title_fa || "",
      description: r.description || "",
      responsiblePerson: r.responsible_person || "",
      responsibleContractorId: r.responsible_contractor_id || "",
      responsibleContractorName: r.responsible_contractor_name || "",
      dueDate: r.due_date || "",
      status: r.status || "OPEN",
      createdAt: r.created_at,
    };
  });
}

// معادل تابع قدیمی «درخواست» — نگه داشته شده برای سازگاری با صفحه‌ی جزئیات حادثه
export async function requestTripodAnalysis(analysisId, requestedBy) {
  return transitionAnalysis(analysisId, "request", "EMPLOYER", requestedBy);
}
