/* ============================================================================ *
 * ثابت‌های خالصِ ماژولِ PSSR — بدونِ React/فراخوانیِ شبکه.
 * ============================================================================ */

import { dirOf } from "../i18n/translations.js";

// ۹ چک‌لیستِ تخصصیِ فایلِ مرجع + Leader/Coordinator که چک‌لیستِ خاصِ خود را
// ندارند ولی عضوِ تیم‌اند.
export const PSSR_DISCIPLINES = [
  { value: "leader", labelKey: "pssrDiscLeader", hasChecklist: false },
  { value: "hse_fifi_env_health", labelKey: "pssrDiscHse", hasChecklist: true },
  { value: "piping_process", labelKey: "pssrDiscPiping", hasChecklist: true },
  { value: "instrument", labelKey: "pssrDiscInstrument", hasChecklist: true },
  { value: "electrical", labelKey: "pssrDiscElectrical", hasChecklist: true },
  { value: "telecom", labelKey: "pssrDiscTelecom", hasChecklist: true },
  { value: "control_system", labelKey: "pssrDiscControlSystem", hasChecklist: true },
  { value: "mechanic_fix", labelKey: "pssrDiscMechFix", hasChecklist: true },
  { value: "mechanic_rotary", labelKey: "pssrDiscMechRotary", hasChecklist: true },
  { value: "civil", labelKey: "pssrDiscCivil", hasChecklist: true },
  { value: "coordinator", labelKey: "pssrDiscCoordinator", hasChecklist: false },
];
export const disciplineLabel = (value, t) => {
  const d = PSSR_DISCIPLINES.find((x) => x.value === value);
  return d ? t(d.labelKey) : value;
};
export const CHECKLIST_DISCIPLINES = PSSR_DISCIPLINES.filter((d) => d.hasChecklist);

export const ORG_ROLES = [
  { value: "employer", labelKey: "pssrOrgEmployer" },
  { value: "contractor", labelKey: "pssrOrgContractor" },
  { value: "consultant", labelKey: "pssrOrgConsultant" },
];

export const CAT_TYPES = [
  { value: "CAT_A", labelKey: "pssrCatA", descKey: "pssrCatADesc", tone: "danger" },
  { value: "CAT_B", labelKey: "pssrCatB", descKey: "pssrCatBDesc", tone: "warn" },
  { value: "CAT_C", labelKey: "pssrCatC", descKey: "pssrCatCDesc", tone: "info" },
];
export const catLabel = (value, t) => {
  const c = CAT_TYPES.find((x) => x.value === value);
  return c ? t(c.labelKey) : value;
};

export const RESPONSE_STATUSES = ["yes", "no", "na"];

export const PSSR_STATUS_META = {
  draft: { key: "pssrStDraft", tone: "gray" },
  in_progress: { key: "pssrStInProgress", tone: "teal" },
  closed: { key: "pssrStClosed", tone: "ok" },
};

export const MEETING_STATUS_META = {
  open: { key: "pssrMeetingOpen", tone: "teal" },
  closed: { key: "pssrMeetingClosed", tone: "gray" },
};

export const ACTION_STATUS_META = {
  open: { key: "pssrActionOpen", tone: "warn" },
  in_progress: { key: "pssrActionInProgress", tone: "teal" },
  closed: { key: "pssrActionClosed", tone: "ok" },
};

// متنِ سه‌زبانه‌ی Requirementها: چک‌لیست‌های مرجعِ PSSR اصالتاً انگلیسی‌اند
// (از فایلِ اکسلِ رسمی)؛ بر اساسِ زبانِ فعلیِ سامانه (fa/de/en — همان سه‌تایی
// که LanguageContext پشتیبانی می‌کند)، ترجمه‌ی همان زبان نشان داده می‌شود.
// اگر ترجمه‌ی زبانِ فعلی برای آن ردیف خالی باشد (هنوز ترجمه نشده)، به متنِ
// انگلیسیِ مرجع سقوط می‌کند — هرگز خالی نمی‌ماند. جهتِ متن از همان dirOf
// سراسریِ سامانه گرفته می‌شود (فقط فارسی rtl است).
export function localizedText(textEn, textFa, textDe, lang) {
  const dir = dirOf(lang);
  if (lang === "fa" && textFa) return { text: textFa, dir };
  if (lang === "de" && textDe) return { text: textDe, dir };
  return { text: textEn || "", dir };
}
