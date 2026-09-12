import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
// همان دو لودرِ حساب‌های ثبت‌شده در SuperAdmin که برای «امضاهای مجاز» مجوز
// کار ساختیم — اینجا هم دقیقاً همان‌ها را برای انتخابِ اعضایِ تیمِ PSSR
// استفاده مجدد می‌کنیم (نه ورودیِ آزادِ نام).
export { loadContractorAccountsForSigning, loadEmployerAccountsForSigning } from "../permit/permitSignersApi.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const TABLE = "pssr_team_members";

function memberFromRow(r) {
  const accountType = r.employer_account_id ? "employer" : "contractor";
  const acc = accountType === "employer" ? r.employer_accounts || {} : r.contractors || {};
  return {
    id: r.id,
    pssrId: r.pssr_id,
    discipline: r.discipline,
    orgRole: r.org_role || "employer",
    accountType,
    contractorId: r.contractor_id || null,
    employerAccountId: r.employer_account_id || null,
    fullName: accountType === "employer" ? (acc.name || "") : (acc.contact_person_name || ""),
    companyName: accountType === "employer" ? tr("pmGroupEmployer") : (acc.name || ""),
    jobTitle: acc.job_positions?.title || "",
    isResponsible: !!r.is_responsible,
    createdAt: r.created_at,
  };
}

const SELECT = "*,contractors(name,contact_person_name,job_positions(title)),employer_accounts(name,job_positions(title))";

export async function loadTeamMembers(pssrId) {
  if (!pssrId) return [];
  const rows = await sb(`${TABLE}?pssr_id=eq.${pssrId}&select=${SELECT}&order=created_at.asc`);
  return sbOk(rows) ? rows.map(memberFromRow) : [];
}

export async function addTeamMember({ pssrId, discipline, orgRole, accountType, accountId, isResponsible }, createdBy) {
  const id = uid("psteam");
  const res = await offlineWrite({
    module: "pssrTeamMembers", table: TABLE, action: "insert", id,
    payload: {
      pssr_id: pssrId, company_id: getCurrentCompanyId(), discipline, org_role: orgRole || "employer",
      contractor_id: accountType === "contractor" ? accountId : null,
      employer_account_id: accountType === "employer" ? accountId : null,
      is_responsible: !!isResponsible,
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return { ok: true, id };
}

// چون هر Discipline فقط یک «مسئول» دارد (برای واگذاریِ خودکارِ Action Plan)،
// انتخابِ مسئولِ جدید باید بقیه‌ی اعضایِ همان Discipline را از حالتِ مسئول خارج کند.
export async function setResponsible(pssrId, discipline, memberId) {
  const members = await loadTeamMembers(pssrId);
  const sameDiscipline = members.filter((m) => m.discipline === discipline);
  await Promise.all(sameDiscipline.map((m) =>
    offlineWrite({ module: "pssrTeamMembers", table: TABLE, action: "update", id: m.id, payload: { is_responsible: m.id === memberId } })
  ));
  return { ok: true };
}

export async function removeTeamMember(id) {
  const res = await offlineWrite({ module: "pssrTeamMembers", table: TABLE, action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return { ok: true };
}

// عضوِ «مسئول» یک Discipline در تیمِ این PSSR — برای واگذاریِ خودکارِ Action Plan
export function findResponsibleMember(members, discipline) {
  return members.find((m) => m.discipline === discipline && m.isResponsible) || null;
}
