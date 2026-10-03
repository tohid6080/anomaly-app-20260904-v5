// supabase/functions/public-safety-microsite-info/index.ts
//
// عمومی و بدونِ احراز هویت — آماره‌هایِ ایمنیِ شرکت را با public_token
// برمی‌گرداند، فقط اگر enabled=true. هیچ داده‌یِ شخصی/پیمانکاری برنمی‌گردد —
// فقط شمارش‌هایِ تجمیعی از computeSafetyAggregates() (مشترک با
// guest-auditor-info). فیلترِ show_fields تعیین می‌کند کدام آماره‌ها واقعاً
// در پاسخ باشند.
//
// Deploy:
//   supabase functions deploy public-safety-microsite-info --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";
import { computeSafetyAggregates } from "../_shared/companySafetyAggregates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }

  const token = String(body?.token || "").trim();
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const res = await restFetch(
      `company_safety_microsites?public_token=eq.${encodeURIComponent(token)}&select=id,company_id,enabled,display_name,show_fields`,
    );
    const site = res.ok && Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    if (!site) return json({ error: "این لینک معتبر نیست" }, 404);
    if (!site.enabled) return json({ error: "این گزارش در حالِ حاضر منتشر نشده است" }, 404);

    let displayName = String(site.display_name || "").trim();
    if (!displayName) {
      const companyRes = await restFetch(`companies?select=name&id=eq.${site.company_id}`);
      displayName = companyRes.ok && Array.isArray(companyRes.data) && companyRes.data.length ? (companyRes.data[0].name || "") : "";
    }

    const agg = await computeSafetyAggregates(site.company_id);
    const show = site.show_fields || {};

    const out: Record<string, unknown> = { displayName };
    if (show.openAnomaliesCount) out.openAnomaliesCount = agg.openAnomaliesCount;
    if (show.overdueCorrectiveActionsCount) out.overdueCorrectiveActionsCount = agg.overdueCorrectiveActionsCount;
    if (show.activePermitsCount) out.activePermitsCount = agg.activePermitsCount;
    if (show.daysSinceLastIncident) out.daysSinceLastIncident = agg.daysSinceLastIncident;

    return json(out);
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
