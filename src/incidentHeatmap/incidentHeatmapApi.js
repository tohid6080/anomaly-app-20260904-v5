import { sb, sbOk, getCurrentCompanyId } from "../shared.js";
import { loadSiteZones } from "../siteZones/siteZonesApi.js";

// نقشه‌یِ حرارتی — فقط رکوردهایی که کاربر صراحتاً به یک zone تگ کرده (چون
// هیچ فیلدِ مکانیِ ساختاریافته‌ای قبلاً وجود نداشت، rollout تدریجی است: هرچه
// بیشتر تگ شود، نقشه کامل‌تر می‌شود). شمارش در کدِ اپ، نه ستونِ تجمیعیِ
// دیتابیس — همان الگویِ summarizeQuestion/contractorRiskHeatmapApi.
export async function loadHeatmapData(siteMapId) {
  if (!siteMapId) return [];
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const [zones, anomalyRows, incidentRows] = await Promise.all([
    loadSiteZones(siteMapId),
    sb(`anomalies?select=zone_id&zone_id=not.is.null${filter}`),
    sb(`incidents?select=zone_id&zone_id=not.is.null${filter}`),
  ]);
  const anomalyCounts = new Map();
  if (sbOk(anomalyRows)) {
    for (const r of anomalyRows) anomalyCounts.set(r.zone_id, (anomalyCounts.get(r.zone_id) || 0) + 1);
  }
  const incidentCounts = new Map();
  if (sbOk(incidentRows)) {
    for (const r of incidentRows) incidentCounts.set(r.zone_id, (incidentCounts.get(r.zone_id) || 0) + 1);
  }
  return zones.map((z) => {
    const anomalyCount = anomalyCounts.get(z.id) || 0;
    const incidentCount = incidentCounts.get(z.id) || 0;
    return { ...z, anomalyCount, incidentCount, score: anomalyCount + incidentCount * 3 };
  });
}

export function heatLevel(score) {
  if (score === 0) return "none";
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  return "high";
}
