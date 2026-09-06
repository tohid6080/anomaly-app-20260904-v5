import { sb, sbOk } from "../shared.js";
import { getCurrentLang } from "../i18n/translations.js";

// جداول مرجع سراسری (نه به‌ازای شرکت) — همان ۱۱ گروه، ۵۵ پیش‌شرط، ۱۴۰
// اشکال پنهان، ۱۱ دسته BRF، ۴ دسته هدف که در فاز اول seed شدند.
// متنِ هر ردیف دوزبانه است (text_fa / text_en, title_fa / title_en). در
// حالت انگلیسی متنِ انگلیسی و در حالت فارسی متنِ فارسی نمایش داده می‌شود؛
// اگر ترجمه‌ی انگلیسی خالی باشد، به فارسی برمی‌گردد.
const pickLang = (fa, en) => (getCurrentLang() !== "fa" && en ? en : (fa || ""));

export async function loadReferenceGroups() {
  const [groupsRes, precondsRes, hiddensRes] = await Promise.all([
    sb("tripod_ref_checklist_group?select=*&order=group_no.asc"),
    sb("tripod_ref_precondition?select=*&order=code.asc"),
    sb("tripod_ref_hidden_failure?select=*&order=code.asc"),
  ]);
  const groups = sbOk(groupsRes) ? groupsRes : [];
  const preconds = sbOk(precondsRes) ? precondsRes : [];
  const hiddens = sbOk(hiddensRes) ? hiddensRes : [];

  return groups.map((g) => ({
    groupNo: g.group_no,
    titleFa: g.title_fa,
    titleEn: g.title_en || "",
    title: pickLang(g.title_fa, g.title_en),
    preconditions: preconds.filter((p) => p.group_no === g.group_no).map((p) => ({
      id: p.id, code: p.code, groupNo: p.group_no,
      textFa: p.text_fa, textEn: p.text_en || "", text: pickLang(p.text_fa, p.text_en),
    })),
    hiddenFailures: hiddens.filter((h) => h.group_no === g.group_no).map((h) => ({
      id: h.id, code: h.code, groupNo: h.group_no, brfCode: h.brf_code,
      textFa: h.text_fa, textEn: h.text_en || "", text: pickLang(h.text_fa, h.text_en),
    })),
  }));
}

export async function loadTargetCategories() {
  const rows = await sb("tripod_ref_target_category?select=*");
  return sbOk(rows) ? rows.map((r) => ({
    code: r.code,
    titleFa: r.title_fa, titleEn: r.title_en || "", title: pickLang(r.title_fa, r.title_en),
    potentialDamageFa: r.potential_damage_fa || "",
    potentialDamage: pickLang(r.potential_damage_fa, r.potential_damage_en),
  })) : [];
}

// مسطح‌کردن گروه‌ها برای انتخابگر جست‌وجوپذیر — دقیقاً معادل flattenChecklist در checklist-picker.js
export function flattenChecklist(groups, kind) {
  const out = [];
  groups.forEach((g) => {
    const items = kind === "precondition" ? g.preconditions : g.hiddenFailures;
    items.forEach((it) => out.push({ ...it, groupTitle: g.title }));
  });
  return out;
}
