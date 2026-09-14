import { sb, sbOk, getCurrentCompanyId, SUPABASE_URL, SUPABASE_ANON_KEY } from "../shared.js";
import { getSessionToken } from "../sessionToken.js";

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

// ---------- دستیارِ هوش مصنوعیِ واقعی (Google Gemini، از طریقِ Edge Function) ----------
// دقیقاً همان الگوی امنیتیِ callPaymentFunction در subscriptionApi.js: کلید
// Gemini هرگز اینجا نیست، فقط با توکنِ نشستِ معتبر، Edge Function صدا زده
// می‌شود. هرگز پرتاب نمی‌کند — فقط { __error: true } برمی‌گرداند تا فراخوان
// (HseLearningAssistantThread) بتواند به موتورِ محلیِ answerQuestion سقوط کند.
export async function askHseAssistant(question, history = []) {
  const token = getSessionToken("customer");
  if (!token) return { __error: true };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/hse-assistant-ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ question, history }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.answer) return { __error: true };
    return { answer: data.answer };
  } catch {
    return { __error: true };
  }
}
