import { loadPermits } from "../../permit/permitApi.js";
import { loadMachineryListOfflineFirst } from "../../machinery/machineryApi.js";
import { loadPersonnelList } from "../../personnel/personnelApi.js";
import { loadOpenActionsForResponsible } from "../../pssr/pssrMeetingsApi.js";

/**
 * لایهٔ دادهٔ ویجت «تقویم یکپارچهٔ HSE» — چهار منبعِ واقعیِ موجود را که
 * هرکدام از قبل تاریخِ سررسید/انقضا دارند یکجا جمع می‌کند: انقضای مجوزِ
 * کار، انقضای بیمه/بازرسیِ ماشین‌آلات، مهلتِ معاینات شغلیِ پرسنل، و
 * سررسیدِ اقداماتِ باز PSSR. هیچ جدول یا ستونِ جدیدی لازم نبود — همان
 * تاریخ‌هایی که زنگولهٔ اعلان هم از آن‌ها استفاده می‌کند، فقط این‌بار
 * به‌صورتِ یک فهرستِ زمانیِ تک‌تک (نه شمارشِ تجمیعی).
 * فقط خواندن؛ هیچ نوشتنی. شکستِ یک منبع بقیه را از کار نمی‌اندازد.
 */

const norm = (s) => (s || "").trim().toLowerCase();

function daysFromToday(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (isNaN(target.getTime())) return null;
  const today = new Date(new Date().toDateString());
  return Math.round((target - today) / 86400000);
}

export async function loadHseCalendarEvents({ role, currentUser } = {}) {
  const isContractor = role === "CONTRACTOR";
  const myName = norm(currentUser?.name);

  const [permitsRes, machineryRes, personnelRes, pssrRes] = await Promise.allSettled([
    loadPermits(),
    loadMachineryListOfflineFirst(),
    loadPersonnelList(),
    loadOpenActionsForResponsible(isContractor ? "contractor" : "employer", currentUser?.id),
  ]);

  const events = [];

  // --- انقضای مجوزِ کار ---
  if (permitsRes.status === "fulfilled") {
    let permits = permitsRes.value.filter((p) => p.status === "active" && p.validUntil);
    if (isContractor && myName) {
      permits = permits.filter((p) => norm(p.applicantName) === myName || norm(p.performerName) === myName);
    }
    for (const p of permits) {
      events.push({
        id: `permit-${p.id}`, kind: "permit", title: p.title || "مجوز کار",
        date: p.validUntil, nav: { module: "permitToWork" },
      });
    }
  }

  // --- انقضای بیمه/بازرسیِ ماشین‌آلات ---
  if (machineryRes.status === "fulfilled") {
    let machinery = machineryRes.value;
    if (isContractor && myName) machinery = machinery.filter((m) => norm(m.contractorName) === myName);
    for (const m of machinery) {
      if (m.insuranceExpiry) events.push({ id: `mach-ins-${m.id}`, kind: "machinery", title: `${m.machineName || "ماشین"} — بیمه`, date: m.insuranceExpiry, nav: { module: "machinery" } });
      if (m.inspectionExpiry) events.push({ id: `mach-insp-${m.id}`, kind: "machinery", title: `${m.machineName || "ماشین"} — بازرسی`, date: m.inspectionExpiry, nav: { module: "machinery" } });
    }
  }

  // --- مهلتِ معایناتِ شغلیِ پرسنل ---
  if (personnelRes.status === "fulfilled") {
    let personnel = personnelRes.value;
    if (isContractor && myName) personnel = personnel.filter((p) => norm(p.contractorName) === myName);
    for (const p of personnel) {
      if (p.occHealthExpiry) events.push({ id: `pers-exp-${p.id}`, kind: "personnel", title: `${p.fullName || "پرسنل"} — معاینهٔ شغلی`, date: p.occHealthExpiry, nav: { module: "personnel" } });
      if (p.status === "pending_health_visit" && p.occHealthVisitDeadline) events.push({ id: `pers-visit-${p.id}`, kind: "personnel", title: `${p.fullName || "پرسنل"} — نوبتِ معاینه`, date: p.occHealthVisitDeadline, nav: { module: "personnel", statusFilter: "pending_health_visit" } });
      if (p.status === "pending_health_result" && p.occHealthResultDeadline) events.push({ id: `pers-result-${p.id}`, kind: "personnel", title: `${p.fullName || "پرسنل"} — نتیجهٔ معاینه`, date: p.occHealthResultDeadline, nav: { module: "personnel", statusFilter: "pending_health_result" } });
    }
  }

  // --- سررسیدِ اقداماتِ باز PSSR ---
  if (pssrRes.status === "fulfilled") {
    for (const a of pssrRes.value) {
      if (a.dueDate) events.push({ id: `pssr-${a.id}`, kind: "pssr", title: `اقدامِ PSSR — ${a.pssrReportNo || a.pssrId || ""}`, date: a.dueDate, nav: { module: "pssr" } });
    }
  }

  const withDays = events
    .map((e) => ({ ...e, daysUntil: daysFromToday(e.date) }))
    .filter((e) => e.daysUntil !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    events: withDays,
    overdueCount: withDays.filter((e) => e.daysUntil < 0).length,
    errors: {
      permit: permitsRes.status === "rejected",
      machinery: machineryRes.status === "rejected",
      personnel: personnelRes.status === "rejected",
      pssr: pssrRes.status === "rejected",
    },
  };
}
