// supabase/functions/track-landing-event/index.ts
//
// عمومی و بدون نیاز به احراز هویت — تنها راه نوشتن در landing_page_stats
// (که RLS اش عمداً هیچ policy ای برای anon/authenticated ندارد، دقیقاً
// همان الگوی submit-trial-request). صفحه‌ی اصلی سایت (بازدید + کلیکِ
// دکمه‌های اصلی) این تابع را صدا می‌زند. metricKey عمداً به یک فهرستِ
// ثابت محدود شده تا یک بازدیدکننده‌ی مخرب نتواند با مقادیرِ دلخواه جدول
// را با ردیف‌های بی‌معنا پر کند.
//
// Deploy:
//   supabase functions deploy track-landing-event --no-verify-jwt

import { json, CORS_HEADERS, callRpc } from "../_shared/supabaseAdmin.ts";

const ALLOWED_METRIC_KEYS = [
  "page_view",
  "cta_start_free",
  "cta_view_plans",
  "cta_login",
  "cta_live_demo",
  "cta_share_demo",
  "cta_download_app",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const metricKey = String(body?.metricKey || "");
  if (!ALLOWED_METRIC_KEYS.includes(metricKey)) {
    return json({ error: "metricKey نامعتبر است" }, 400);
  }

  try {
    const result = await callRpc("increment_landing_stat", { p_metric_key: metricKey });
    if (!result.ok) return json({ error: "خطا در ثبت آمار" }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
