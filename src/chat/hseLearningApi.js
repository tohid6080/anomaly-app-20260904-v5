import { sb, sbOk, getCurrentCompanyId } from "../shared.js";

/**
 * خواندنِ سبک و فقط-خواندنیِ آخرین آنومالی‌ها — فقط برای تشخیصِ موضوعِ
 * آموزشیِ مرتبط در «دستیار آموزشی HSE» لازم است. عمداً از تابعِ
 * loadAnomaliesOfflineFirst در App.jsx استفاده نمی‌کند (آن export نشده و
 * برای مسیرِ کاملِ آفلاین/کش طراحی شده)؛ این‌جا یک کوئریِ مستقیم و ساده
 * کافی است — نبودِ اتصال یعنی صرفاً پیشنهادی نمایش داده نمی‌شود، نه اینکه
 * چیزی خراب شود.
 */
export async function loadRecentAnomalyBrief({ days = 30, contractorName } = {}) {
  const companyId = getCurrentCompanyId();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  let query = `anomalies?select=category,format,description,area,contractor,date&date=gte.${cutoff}&order=date.desc&limit=200`;
  if (companyId) query += `&company_id=eq.${companyId}`;
  if (contractorName) query += `&contractor=eq.${encodeURIComponent(contractorName)}`;
  const rows = await sb(query);
  if (!sbOk(rows)) return [];
  return rows.map((r) => ({
    category: r.category || "",
    format: r.format || "",
    description: r.description || "",
    area: r.area || "",
    contractor: r.contractor || "",
    date: r.date || "",
  }));
}
