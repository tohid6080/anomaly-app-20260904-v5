import { sb, sbOk, getCurrentCompanyId } from "../shared.js";

/**
 * خلاصه‌ی KPI صفحه‌ی اصلی دسکتاپ — فقط چهار عدد شمارشی نشان می‌دهد،
 * پس عمداً *فقط* ستون status هر جدول را می‌خواند (نه select=*، نه
 * توابع offline-first سنگین که هر ردیف را هم در IndexedDB می‌نویسند).
 * این تغییر صرفاً بهینه‌سازی کوئری است — منطق شمارش و خروجی نهایی
 * دقیقاً همان قبلی است، بدون هیچ تغییر رفتاری قابل‌مشاهده.
 */
export async function loadHomeKpiSummary() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";

  const [anomalyRows, personnelRows, caRows, incidentRows] = await Promise.all([
    sb(`anomalies?select=status${filter}`).catch(() => []),
    sb(`personnel?select=status${filter}`).catch(() => []),
    sb(`corrective_actions?select=status${filter}`).catch(() => []),
    sb(`incidents?select=id${filter}`).catch(() => []),
  ]);

  const anomalies = sbOk(anomalyRows) ? anomalyRows : [];
  const personnel = sbOk(personnelRows) ? personnelRows : [];
  const correctiveActions = sbOk(caRows) ? caRows : [];
  const incidents = sbOk(incidentRows) ? incidentRows : [];

  return {
    openAnomalies: anomalies.filter((a) => a.status !== "Closed").length,
    activePersonnel: personnel.filter((p) => p.status === "active").length,
    openCorrectiveActions: correctiveActions.filter((c) => c.status !== "closed").length,
    incidentsCount: incidents.length,
  };
}
