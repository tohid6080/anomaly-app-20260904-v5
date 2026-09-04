// supabase/functions/submit-trial-request/index.ts
//
// عمومی و بدون نیاز به احراز هویت — تنها راه نوشتن در trial_requests
// (که RLS اش عمداً هیچ policy ای برای anon/authenticated ندارد، دقیقاً
// همان الگوی submit-hse-climate-response). فرم «درخواست ارزیابی و پلن
// آزمایشی» در صفحه‌ی ورود این تابع را صدا می‌زند.
//
// Deploy:
//   supabase functions deploy submit-trial-request --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const fullName = String(body?.fullName || "").trim();
  const phone = String(body?.phone || "").trim();
  const companyName = String(body?.companyName || "").trim();
  if (!fullName || !phone || !companyName) {
    return json({ error: "نام و نام خانوادگی، موبایل و شرکت/سازمان الزامی است" }, 400);
  }

  const personnelCountRaw = body?.personnelCount;
  const personnelCount = personnelCountRaw !== undefined && personnelCountRaw !== null && personnelCountRaw !== ""
    ? Number(personnelCountRaw)
    : null;

  const payload = {
    full_name: fullName,
    phone,
    company_name: companyName,
    position: String(body?.position || "").trim(),
    industry: String(body?.industry || "").trim(),
    personnel_count: personnelCount != null && Number.isFinite(personnelCount) ? personnelCount : null,
    project_name: String(body?.projectName || "").trim(),
    project_city: String(body?.projectCity || "").trim(),
    email: String(body?.email || "").trim(),
    desired_modules: Array.isArray(body?.desiredModules) ? body.desiredModules.map((m: unknown) => String(m)) : [],
    description: String(body?.description || "").trim(),
    status: "pending",
  };

  try {
    const inserted = await restFetch("trial_requests", { method: "POST", body: JSON.stringify([payload]) });
    if (!inserted.ok) return json({ error: "خطا در ثبت درخواست — لطفاً بعداً دوباره تلاش کنید" }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
