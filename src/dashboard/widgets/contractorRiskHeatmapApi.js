import { sb, sbOk, getCurrentCompanyId } from "../../shared.js";

/**
 * لایهٔ دادهٔ ویجت «نقشهٔ حرارتیِ ریسکِ پیمانکاران». عمداً بر پایهٔ سطحِ
 * ریسکِ آنومالی‌های بازِ هر پیمانکار است، نه BowTie/HCMS — چون بریرهای
 * BowTie فیلدِ پیمانکار ندارند (فقط owner آزاد) و رکوردهای HCMS بر اساسِ
 * «واحد» گروه‌بندی می‌شوند نه «پیمانکار»؛ سطحِ ریسکِ آنومالیِ باز، تنها
 * بُعدی است که واقعاً و مستقیم به هر پیمانکار وصل است. یک کوئریِ سبک،
 * بدونِ N+1.
 */
export async function loadContractorRiskHeatmap() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`anomalies?select=contractor,risk_level,status&status=neq.Closed${filter}`);
  if (!sbOk(rows)) return { contractors: [] };

  const byContractor = {};
  for (const r of rows) {
    const name = (r.contractor || "").trim();
    if (!name) continue;
    if (!byContractor[name]) byContractor[name] = { name, High: 0, Med: 0, Low: 0 };
    const lvl = ["High", "Med", "Low"].includes(r.risk_level) ? r.risk_level : "Med";
    byContractor[name][lvl] += 1;
  }

  const contractors = Object.values(byContractor)
    .map((c) => ({ ...c, total: c.High + c.Med + c.Low, score: c.High * 3 + c.Med * 2 + c.Low }))
    .sort((a, b) => b.score - a.score);

  return { contractors };
}
