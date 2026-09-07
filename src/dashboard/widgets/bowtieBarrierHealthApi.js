import { loadBowties } from "../../bowtie/bowtieApi.js";
import { loadDashboardData } from "../../bowtie/dbeeEngine.js";
import { loadDegradedBarrierAlerts } from "../../bowtie/effectivenessApi.js";

/**
 * لایهٔ دادهٔ ویجت «بریرها و اثربخشی» (طرح D-007). توزیعِ ۵‌وضعیتیِ اثربخشیِ
 * بریرها + شمارشِ بریرِ بحرانی + فهرستِ بدترین بریرهای رو به افت. همه از
 * ماژولِ BowTie/DBEE که هست؛ هیچ محاسبهٔ DBEE بازنویسی نمی‌شود.
 */
export async function loadBowtieBarrierHealth({ role, currentUser } = {}) {
  const contractorScope = role === "CONTRACTOR" ? currentUser?.name || null : null;

  const [modelsRes, dashRes, degradedRes] = await Promise.allSettled([
    loadBowties(),
    loadDashboardData(),
    loadDegradedBarrierAlerts(contractorScope),
  ]);
  if (dashRes.status === "rejected") throw dashRes.reason;

  const barriers = (dashRes.value && dashRes.value.barriers) || [];
  const dist = { effective: 0, reducing: 0, weak: 0, failed: 0, not_assessed: 0 };
  barriers.forEach((b) => { if (dist[b.status] != null) dist[b.status] += 1; });

  const critical = barriers.filter(
    (b) => b.status === "failed" || (b.status === "weak" && b.criticality === "high")
  ).length;

  const total = barriers.length;
  return {
    modelCount: (modelsRes.status === "fulfilled" ? modelsRes.value : []).length,
    barrierTotal: total,
    dist,
    critical,
    assessedPct: total ? Math.round(((total - dist.not_assessed) / total) * 100) : null,
    degraded: (degradedRes.status === "fulfilled" ? degradedRes.value : []).slice(0, 5),
    degradedErrored: degradedRes.status === "rejected",
  };
}
