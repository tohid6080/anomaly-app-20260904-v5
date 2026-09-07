import {
  loadActiveIndicators, loadHseClimateHistory, loadAllAssessments, accidentPronenessLevel,
} from "../../proactiveIndicators/proactiveIndicatorsApi.js";
import { getHseClimateTotalLevel, getHseClimateLevel } from "../../proactiveIndicators/hseClimateScoring.js";
import { loadHseClimateAggregate } from "../../proactiveIndicators/hseClimateCampaignsApi.js";
import { loadSbsObservations, computeSbsAnalysis } from "../../proactiveIndicators/sbsApi.js";

/**
 * لایهٔ دادهٔ ویجت «شاخص‌های پیشرو» (طرح D-009). یک ردیف برای هر زیرشاخصِ
 * فعال در پلن: جوّ ایمنی (۹ بُعد) / استعداد حادثه / SBS. فقط خواندن.
 */
export async function loadProactiveIndicatorsSummary() {
  const active = await loadActiveIndicators();
  const on = new Set((active || []).map((i) => i.key));
  if (on.size === 0) return { anyEnabled: false };

  const [histRes, aggRes, apRes, sbsRes] = await Promise.allSettled([
    on.has("hse_climate") ? loadHseClimateHistory() : Promise.resolve(null),
    on.has("hse_climate") ? loadHseClimateAggregate() : Promise.resolve(null),
    on.has("accident_proneness") ? loadAllAssessments("accident_proneness") : Promise.resolve(null),
    on.has("sbs") ? loadSbsObservations() : Promise.resolve(null),
  ]);

  const out = { anyEnabled: true, climate: null, accidentProneness: null, sbs: null };

  if (on.has("hse_climate")) {
    const hist = histRes.status === "fulfilled" && Array.isArray(histRes.value) ? histRes.value : [];
    const latest = hist[0] || null;
    const agg = aggRes.status === "fulfilled" ? aggRes.value : null;
    const dimsSrc = (agg && agg.dimensionAverages && agg.dimensionAverages.length)
      ? agg.dimensionAverages
      : (latest && Array.isArray(latest.dimensionScores) ? latest.dimensionScores : []);
    const dims = dimsSrc.map((dd) => {
      const score = Number(dd.score != null ? dd.score : dd.average != null ? dd.average : 0);
      return { title: dd.title || dd.id || "", score, level: getHseClimateLevel(score) };
    });
    out.climate = latest
      ? {
          total: latest.totalScore,
          level: getHseClimateTotalLevel(latest.totalScore || 0),
          dims,
          weakest: [...dims].sort((a, b) => a.score - b.score).slice(0, 2),
          responseCount: agg ? agg.responseCount : null,
        }
      : { errored: histRes.status === "rejected", empty: true };
  }

  if (on.has("accident_proneness")) {
    const list = apRes.status === "fulfilled" && Array.isArray(apRes.value) ? apRes.value : [];
    const byLevel = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    let sum = 0, n = 0;
    list.forEach((a) => {
      const s = Number(a.finalScore);
      if (!s) return;
      sum += s; n += 1;
      const code = accidentPronenessLevel(s).levelCode;
      if (byLevel[code] != null) byLevel[code] += 1;
    });
    out.accidentProneness = { total: n, avg: n ? Math.round(sum / n) : null, byLevel, atRisk: byLevel.high + byLevel.veryHigh };
  }

  if (on.has("sbs")) {
    const obs = sbsRes.status === "fulfilled" && Array.isArray(sbsRes.value) ? sbsRes.value : [];
    const a = computeSbsAnalysis(obs);
    out.sbs = { total: a.total, unsafe: a.unsafe, unsafePct: Math.round(a.unsafePct || 0) };
  }

  return out;
}
