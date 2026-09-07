import { sb, sbOk, getCurrentCompanyId } from "../../shared.js";
import { isoToJalali, JALALI_MONTHS } from "../../personnel/jalaliDate.jsx";

/**
 * لایهٔ دادهٔ ویجت «روند آنومالی» (طرح D-005). تعداد آنومالیِ ثبت‌شده در هر
 * ماهِ جلالی + سهمِ بسته‌شده، برای window ماهِ اخیر. برخلاف ویجتِ قدیمیِ
 * anomalyTrend که با iso.slice(0,7) بر پایهٔ ماهِ میلادی سطل‌بندی می‌کرد،
 * اینجا ماهِ جلالی مبناست تا با بقیهٔ برنامه هم‌خوان باشد.
 */
function jkey(iso) {
  const p = isoToJalali(String(iso || "").slice(0, 10));
  return p ? `${p[0]}-${p[1]}` : null;
}

export async function loadAnomalyTrend({ window = 6, role, currentUser } = {}) {
  const companyId = getCurrentCompanyId();
  const companyFilter = companyId ? `&company_id=eq.${companyId}` : "";
  const mine = role === "CONTRACTOR" && currentUser?.name
    ? `&contractor=eq.${encodeURIComponent(currentUser.name)}` : "";
  const sinceISO = new Date(Date.now() - (window + 1) * 31 * 86400000).toISOString().slice(0, 10);

  const rows = await sb(
    `anomalies?select=date,created_at,status&or=(date.gte.${sinceISO},created_at.gte.${sinceISO})` +
    companyFilter + mine
  );
  const list = sbOk(rows) ? rows : [];

  const today = isoToJalali(new Date().toISOString().slice(0, 10)) || [1400, 1];
  const buckets = [];
  let jy = today[0], jm = today[1];
  for (let i = 0; i < window; i++) {
    buckets.unshift({ key: `${jy}-${jm}`, label: JALALI_MONTHS[jm - 1], registered: 0, closed: 0 });
    jm -= 1;
    if (jm === 0) { jm = 12; jy -= 1; }
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  list.forEach((r) => {
    const b = byKey[jkey(r.date || r.created_at)];
    if (!b) return;
    b.registered += 1;
    if (r.status === "Closed") b.closed += 1;
  });

  const totalReg = buckets.reduce((s, b) => s + b.registered, 0);
  const totalClosed = buckets.reduce((s, b) => s + b.closed, 0);
  return {
    series: buckets,
    totalRegistered: totalReg,
    closeRate: totalReg ? Math.round((totalClosed / totalReg) * 100) : null,
    monthlyAvg: totalReg ? +(totalReg / window).toFixed(1) : 0,
    hasEnough: buckets.filter((b) => b.registered > 0).length >= 2,
  };
}
