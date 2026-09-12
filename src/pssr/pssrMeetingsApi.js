import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { loadTeamMembers, findResponsibleMember } from "./pssrTeamApi.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);

/* ============================================================================ *
 * جلسات
 * ============================================================================ */
function meetingFromRow(r) {
  return {
    id: r.id, pssrId: r.pssr_id, meetingNo: r.meeting_no, meetingDate: r.meeting_date || "",
    notes: r.notes || "", status: r.status || "open", createdBy: r.created_by || "", createdAt: r.created_at,
  };
}

export async function loadMeetings(pssrId) {
  if (!pssrId) return [];
  const rows = await sb(`pssr_meetings?pssr_id=eq.${pssrId}&select=*&order=meeting_no.asc`);
  return sbOk(rows) ? rows.map(meetingFromRow) : [];
}

export async function createMeeting(pssrId, meetingDate, notes, createdBy) {
  const existing = await loadMeetings(pssrId);
  const nextNo = existing.length > 0 ? Math.max(...existing.map((m) => m.meetingNo)) + 1 : 1;
  const id = uid("psmtg");
  const res = await offlineWrite({
    module: "pssrMeetings", table: "pssr_meetings", action: "insert", id,
    payload: {
      pssr_id: pssrId, company_id: getCurrentCompanyId(), meeting_no: nextNo,
      meeting_date: meetingDate || null, notes: notes || "", status: "open", created_by: createdBy || "",
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return meetingFromRow(res.record);
}

export async function closeMeeting(id) {
  const res = await offlineWrite({ module: "pssrMeetings", table: "pssr_meetings", action: "update", id, payload: { status: "closed" } });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return { ok: true };
}

/* ============================================================================ *
 * پاسخ‌های چک‌لیست — append-only. برای هر Requirement، «آخرین پاسخ» (در هر
 * جلسه‌ای که بوده) هم برای پیش‌نمایشِ «قبلاً خیر بوده» و هم برای دانستنِ
 * وضعیتِ فعلی لازم است.
 * ============================================================================ */
function responseFromRow(r) {
  return {
    id: r.id, meetingId: r.meeting_id, requirementTemplateId: r.requirement_template_id,
    status: r.status, comment: r.comment || "", actionByText: r.action_by_text || "",
    cat: r.cat || "", deadline: r.deadline || "", createdBy: r.created_by || "", createdAt: r.created_at,
  };
}

export async function loadResponsesForMeeting(meetingId) {
  if (!meetingId) return [];
  const rows = await sb(`pssr_checklist_responses?meeting_id=eq.${meetingId}&select=*`);
  return sbOk(rows) ? rows.map(responseFromRow) : [];
}

// آخرین پاسخِ هر Requirement در کل تاریخچه‌ی این PSSR (برای نشانه‌ی «قبلاً
// خیر بوده» هنگام باز کردنِ یک جلسه‌ی جدید)
export async function loadLatestResponsePerRequirement(pssrId) {
  const rows = await sb(`pssr_checklist_responses?pssr_id=eq.${pssrId}&select=*,pssr_meetings(meeting_no)&order=created_at.desc`);
  if (!sbOk(rows)) return {};
  const map = {};
  rows.forEach((r) => {
    if (!map[r.requirement_template_id]) {
      map[r.requirement_template_id] = { ...responseFromRow(r), meetingNo: r.pssr_meetings?.meeting_no || null };
    }
  });
  return map;
}

/* ============================================================================ *
 * ثبتِ نتایجِ یک جلسه — «پیش‌نویسِ محلی، ثبتِ صریح»: همه‌ی ردیف‌های ویرایش‌شده
 * (در حافظه‌ی کامپوننت) یک‌جا اینجا commit می‌شوند. منطقِ اصلیِ ماژول:
 *   - No  → Action Plan ساخته/به‌روزرسانی می‌شود (بدون تکرار، بندِ ۹)
 *   - Yes/N.A روی Requirementی که Action بازِ قبلی دارد → Action بسته می‌شود
 * entries: [{ requirementTemplateId, discipline, reqNo, requirementText, status, comment, actionByText, cat, deadline }]
 * ============================================================================ */
export async function submitMeetingResponses(pssrId, meetingId, entries, performedBy) {
  if (!entries || entries.length === 0) return { ok: true, actionsCreated: 0, actionsUpdated: 0, actionsClosed: 0 };

  const teamMembers = await loadTeamMembers(pssrId);
  let actionsCreated = 0, actionsUpdated = 0, actionsClosed = 0;

  for (const e of entries) {
    // ۱) ثبتِ append-only پاسخِ همین جلسه
    await offlineWrite({
      module: "pssrChecklistResponses", table: "pssr_checklist_responses", action: "insert", id: uid("psresp"),
      payload: {
        pssr_id: pssrId, meeting_id: meetingId, requirement_template_id: e.requirementTemplateId,
        company_id: getCurrentCompanyId(), status: e.status, comment: e.comment || "",
        action_by_text: e.actionByText || "", cat: e.status === "no" ? (e.cat || null) : null,
        deadline: e.status === "no" ? (e.deadline || null) : null, created_by: performedBy || "",
      },
    });

    // ۲) خواندنِ Action Plan فعلیِ همین Requirement در همین PSSR (اگر باشد)
    const existingRows = await sb(`pssr_action_items?pssr_id=eq.${pssrId}&requirement_template_id=eq.${e.requirementTemplateId}&select=*`);
    const existing = sbOk(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (e.status === "no") {
      if (existing) {
        await offlineWrite({
          module: "pssrActionItems", table: "pssr_action_items", action: "update", id: existing.id,
          payload: {
            cat: e.cat || existing.cat, action_comment: e.comment || existing.action_comment,
            due_date: e.deadline || existing.due_date, status: "in_progress", last_meeting_id: meetingId,
            updated_at: new Date().toISOString(),
          },
        });
        await logActionHistory(existing.id, meetingId, existing.status, "in_progress", e.cat || existing.cat, e.comment, performedBy);
        actionsUpdated++;
      } else {
        const responsible = findResponsibleMember(teamMembers, e.discipline);
        const newId = uid("psact");
        await offlineWrite({
          module: "pssrActionItems", table: "pssr_action_items", action: "insert", id: newId,
          payload: {
            pssr_id: pssrId, requirement_template_id: e.requirementTemplateId, company_id: getCurrentCompanyId(),
            discipline: e.discipline, req_no: e.reqNo || "", requirement_text: e.requirementText || "",
            cat: e.cat || null, action_comment: e.comment || "",
            responsible_account_type: responsible?.accountType || null,
            responsible_contractor_id: responsible?.accountType === "contractor" ? responsible.contractorId : null,
            responsible_employer_account_id: responsible?.accountType === "employer" ? responsible.employerAccountId : null,
            due_date: e.deadline || null, status: "open", origin_meeting_id: meetingId, last_meeting_id: meetingId,
          },
        });
        await logActionHistory(newId, meetingId, "", "open", e.cat, e.comment, performedBy);
        if (responsible) await notifyResponsible(pssrId, meetingId, newId, responsible, "pssrNotifActionCreated", e.requirementText);
        actionsCreated++;
      }
    } else if (existing && (existing.status === "open" || existing.status === "in_progress")) {
      // Yes / N.A روی Requirementی که Action بازِ قبلی داشت → بسته می‌شود
      await offlineWrite({
        module: "pssrActionItems", table: "pssr_action_items", action: "update", id: existing.id,
        payload: { status: "closed", closed_at: new Date().toISOString(), last_meeting_id: meetingId, updated_at: new Date().toISOString() },
      });
      await logActionHistory(existing.id, meetingId, existing.status, "closed", existing.cat, e.comment, performedBy);
      const responsible = findResponsibleMember(teamMembers, e.discipline);
      if (responsible) await notifyResponsible(pssrId, meetingId, existing.id, responsible, "pssrNotifActionClosed", e.requirementText);
      actionsClosed++;
    }
  }

  return { ok: true, actionsCreated, actionsUpdated, actionsClosed };
}

async function logActionHistory(actionItemId, meetingId, previousStatus, newStatus, cat, comment, person) {
  await offlineWrite({
    module: "pssrActionHistory", table: "pssr_action_history", action: "insert", id: uid("psahist"),
    payload: {
      action_item_id: actionItemId, meeting_id: meetingId, company_id: getCurrentCompanyId(),
      previous_status: previousStatus || "", new_status: newStatus || "", cat: cat || null,
      comment: comment || "", person: person || "",
    },
  });
}

async function notifyResponsible(pssrId, meetingId, actionItemId, responsible, typeKey, requirementText) {
  await offlineWrite({
    module: "pssrNotifications", table: "pssr_notifications", action: "insert", id: uid("psnotif"),
    payload: {
      company_id: getCurrentCompanyId(), pssr_id: pssrId, meeting_id: meetingId, action_item_id: actionItemId,
      recipient_account_type: responsible.accountType,
      recipient_contractor_id: responsible.accountType === "contractor" ? responsible.contractorId : null,
      recipient_employer_account_id: responsible.accountType === "employer" ? responsible.employerAccountId : null,
      type: typeKey, message: requirementText || "", is_read: false,
    },
  });
}

/* ============================================================================ *
 * Action Plan + تاریخچه — خواندن
 * ============================================================================ */
function actionItemFromRow(r) {
  return {
    id: r.id, pssrId: r.pssr_id, requirementTemplateId: r.requirement_template_id,
    discipline: r.discipline, reqNo: r.req_no || "", requirementText: r.requirement_text || "",
    cat: r.cat || "", actionComment: r.action_comment || "",
    responsibleAccountType: r.responsible_account_type || "",
    responsibleName: r.responsible_account_type === "employer" ? (r.employer_accounts?.name || "") : (r.contractors?.contact_person_name || ""),
    accountable: r.accountable || "", informed: r.informed || "", dueDate: r.due_date || "",
    status: r.status, originMeetingId: r.origin_meeting_id, lastMeetingId: r.last_meeting_id,
    closedAt: r.closed_at, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function loadActionItems(pssrId) {
  if (!pssrId) return [];
  const rows = await sb(`pssr_action_items?pssr_id=eq.${pssrId}&select=*,contractors(contact_person_name),employer_accounts(name)&order=created_at.asc`);
  return sbOk(rows) ? rows.map(actionItemFromRow) : [];
}

function historyFromRow(r) {
  return {
    id: r.id, actionItemId: r.action_item_id, meetingId: r.meeting_id,
    previousStatus: r.previous_status || "", newStatus: r.new_status || "", cat: r.cat || "",
    comment: r.comment || "", person: r.person || "", createdAt: r.created_at,
  };
}
export async function loadActionHistory(actionItemId) {
  if (!actionItemId) return [];
  const rows = await sb(`pssr_action_history?action_item_id=eq.${actionItemId}&select=*,pssr_meetings(meeting_no,meeting_date)&order=created_at.asc`);
  return sbOk(rows) ? rows.map((r) => ({ ...historyFromRow(r), meetingNo: r.pssr_meetings?.meeting_no || null, meetingDate: r.pssr_meetings?.meeting_date || "" })) : [];
}
