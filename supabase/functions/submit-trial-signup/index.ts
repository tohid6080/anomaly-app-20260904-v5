// supabase/functions/submit-trial-signup/index.ts
//
// عمومی و بدون نیاز به احراز هویت — جانشینِ خودسرویسِ submit-trial-request:
// به‌جای ثبتِ یک سرنخِ منتظرِ بررسیِ دستیِ SuperAdmin، همین‌جا و بلافاصله
// شرکت + حساب کارفرما + حساب پیمانکار (هر دو با نام‌کاربری/رمزِ انتخابیِ
// خودِ بازدیدکننده) ساخته می‌شود، دوره‌ی آزمایشیِ ۳۰روزه فعال، و تمامیِ
// ماژول‌های فعال (module_prices) + زیرماژول‌هایشان به شرکت اعطا می‌شود.
// یک ردیفِ trial_requests هم برایِ حفظِ تاریخچه/گزارش‌گیریِ SuperAdmin با
// status='approved' ثبت می‌شود (صفحه‌ی بررسیِ موجود دست‌نخورده می‌ماند،
// فقط دیگر چیزی «در انتظار» از این دکمه نمی‌آید).
//
// رمزِ عبور هرگز مستقیم در ستونِ password نوشته نمی‌شود — دقیقاً همان
// الگویِ manage-account: بعدِ INSERT، از طریقِ RPC های
// set_employer_password/set_contractor_password (که هش‌کردن را با
// pgcrypto داخلِ خودِ دیتابیس انجام می‌دهند) تنظیم می‌شود.
//
// CAPTCHA (Cloudflare Turnstile): قبل از هر کارِ دیگری، توکنِ ارسالی از
// کلاینت با TURNSTILE_SECRET_KEY نزدِ Cloudflare بررسی می‌شود — این
// secret را (نه site key که در src/shared.js عمومی است) باید یک‌بار با
// دستورِ زیر تنظیم کنید، وگرنه این تابع همیشه fail-closed رد می‌کند:
//   supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
//
// Deploy:
//   supabase functions deploy submit-trial-signup --no-verify-jwt

import { json, CORS_HEADERS, restFetch, callRpc } from "../_shared/supabaseAdmin.ts";

const TRIAL_DAYS = 30;
const DEFAULT_STORAGE_QUOTA_MB = 500;

// سه ساختارِ سازمانیِ قابل‌انتخاب هنگامِ ثبت‌نام — companies.org_structure_type
// همین سه مقدار را با یک CHECK constraint اجرا می‌کند (رجوع به migration
// 20260930120000). این فاز فقط یک برچسبِ ذخیره‌شده است؛ employer_contractor
// همان مدلِ فعلی/پیش‌فرضِ IHMS است و کاملاً دست‌نخورده می‌ماند.
const ORG_STRUCTURE_TYPES = ["standalone_no_project", "standalone_multi_project", "employer_contractor"];

// زیرماژول‌هایِ هر ماژول — کپیِ کلیدهایِ GATED_MODULE_SUBS از src/shared.js.
// Edge Function نمی‌تواند از src/ (باندلِ فرانت‌اند) import کند، پس فقط
// خودِ کلیدها (نه labelKeyهایِ نمایشی) این‌جا تکرار شده‌اند. اگر
// GATED_MODULE_SUBS در shared.js تغییر کرد، این‌جا هم باید هم‌گام شود.
const GATED_MODULE_SUB_KEYS: Record<string, string[]> = {
  anomalyReport: ["anomalyForm", "anomalyList", "correctiveActionsList"],
  riskAssessment: ["bowtieDashboard", "hcmsDashboard", "riskKnowledgeManagement"],
  personnelAccess: ["personnelForm", "personnelDashboard"],
  machineryManagement: ["machineryDashboard"],
  scaffoldManagement: ["scaffoldDashboard"],
  incidentManagement: ["incidentsList"],
  pssrManagement: ["pssrList"],
  archiveManagement: ["archivePersonnel", "archiveAnomaly", "archiveBowtie", "archiveMachinery", "archiveScaffold", "archiveHcms"],
  proactiveIndicators: ["accidentProneness", "hseClimate", "sbs"],
  quickTools: [
    "unit-converter", "ltifr", "trir", "noise", "crane-load", "sling-angle", "sling-angle-geo",
    "sling-tension", "shackle-load", "load-weight", "load-cg", "crane-radius-capacity",
    "ground-pressure", "jack-load", "lift-point-load", "rigging-wll-util", "lift-risk-checklist",
    "rad-zones", "rad-distance", "lifting-plan", "excavation-calculator", "energy-calculator", "fleet-fuel-calculator",
  ],
};

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidMobileFormat(phone: string) {
  return /^09\d{9}$/.test(phone);
}

async function checkContactUniqueness(field: "email" | "phone", value: string) {
  const [empRes, conRes] = await Promise.all([
    restFetch(`employer_accounts?${field}=eq.${encodeURIComponent(value)}&select=id`),
    restFetch(`contractors?${field}=eq.${encodeURIComponent(value)}&select=id`),
  ]);
  const empMatches = empRes.ok && Array.isArray(empRes.data) ? empRes.data : [];
  const conMatches = conRes.ok && Array.isArray(conRes.data) ? conRes.data : [];
  return empMatches.length > 0 || conMatches.length > 0;
}

// یکتاییِ نام‌کاربری در هر دو جدول با هم چک می‌شود (نه فقط جدولِ مقصد):
// چون ورود (issue-session-token) اول employer_accounts و بعد contractors
// را امتحان می‌کند، اگر همین یک نام‌کاربری در هر دو جدول وجود داشته باشد،
// حسابِ پیمانکار هرگز قابلِ ورود نمی‌شود (همیشه رویِ حسابِ کارفرما می‌افتد).
async function checkUsernameUniqueness(value: string) {
  const [empRes, conRes] = await Promise.all([
    restFetch(`employer_accounts?username=eq.${encodeURIComponent(value)}&select=id`),
    restFetch(`contractors?username=eq.${encodeURIComponent(value)}&select=id`),
  ]);
  const empMatches = empRes.ok && Array.isArray(empRes.data) ? empRes.data : [];
  const conMatches = conRes.ok && Array.isArray(conRes.data) ? conRes.data : [];
  return empMatches.length > 0 || conMatches.length > 0;
}

// تأییدِ CAPTCHA سمتِ سرور — توکنِ Cloudflare Turnstile که کلاینت فرستاده را
// با secret key (فقط سمتِ سرور، از طریقِ `supabase secrets set
// TURNSTILE_SECRET_KEY=...` تنظیم می‌شود، هرگز در کدِ فرانت‌اند نیست) نزدِ
// خودِ Cloudflare بررسی می‌کند. اگر TURNSTILE_SECRET_KEY تنظیم نشده باشد،
// این تابع fail-closed رفتار می‌کند (رد می‌کند، نه رد کردنِ بی‌صدا) — تا
// از حالتِ «CAPTCHA خاموش بدونِ اطلاع» جلوگیری شود.
async function verifyTurnstileToken(token: string, remoteIp: string | null) {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (!secretKey) return { ok: false, reason: "TURNSTILE_SECRET_KEY تنظیم نشده است" };
  if (!token) return { ok: false, reason: "توکنِ CAPTCHA ارسال نشده است" };
  try {
    const form = new URLSearchParams();
    form.set("secret", secretKey);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => null);
    if (data?.success === true) return { ok: true };
    return { ok: false, reason: Array.isArray(data?.["error-codes"]) ? data["error-codes"].join(",") : "verify_failed" };
  } catch (e) {
    return { ok: false, reason: String((e as Error)?.message || e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const turnstileToken = String(body?.turnstileToken || "");
  const remoteIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
  const captcha = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!captcha.ok) {
    console.error("Turnstile verification failed:", captcha.reason);
    return json({ error: "تأییدِ ربات‌نبودن ناموفق بود — لطفاً دوباره تلاش کنید" }, 403);
  }

  const fullName = String(body?.fullName || "").trim();
  const phone = String(body?.phone || "").trim();
  const companyName = String(body?.companyName || "").trim();
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const email = String(body?.email || "").trim();
  const contractorName = String(body?.contractorName || "").trim();
  const contractorContactPersonName = String(body?.contractorContactPersonName || "").trim();
  const contractorUsername = String(body?.contractorUsername || "").trim();
  const contractorPassword = String(body?.contractorPassword || "");
  const orgStructureType = String(body?.orgStructureType || "");
  const firstProjectName = String(body?.firstProjectName || "").trim();

  if (!ORG_STRUCTURE_TYPES.includes(orgStructureType)) {
    return json({ error: "لطفاً ساختار سازمانی شرکت را انتخاب کنید" }, 400);
  }
  // اطلاعاتِ پیمانکار فقط برایِ نوعِ «کارفرما/چند پیمانکار» لازم است؛ نامِ
  // پروژه فقط برایِ نوعِ «مستقل/چند پروژه» — نوعِ «مستقل/بدونِ پروژه» هیچ‌کدام
  // را لازم ندارد.
  const isEmployerContractor = orgStructureType === "employer_contractor";
  const isMultiProject = orgStructureType === "standalone_multi_project";

  if (!fullName || !phone || !companyName || !username || !password) {
    return json({ error: "همه‌ی فیلدهای اجباری باید تکمیل شوند" }, 400);
  }
  if (isEmployerContractor && (!contractorName || !contractorContactPersonName || !contractorUsername || !contractorPassword)) {
    return json({ error: "همه‌ی فیلدهای اجباری (شامل اطلاعاتِ پیمانکار) باید تکمیل شوند" }, 400);
  }
  if (isMultiProject && !firstProjectName) {
    return json({ error: "نامِ پروژه الزامی است" }, 400);
  }
  if (!isValidMobileFormat(phone)) {
    return json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, 400);
  }
  if (email && !isValidEmailFormat(email)) {
    return json({ error: "فرمت ایمیل نامعتبر است" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "رمز عبورِ سرپرست باید حداقل ۸ کاراکتر باشد" }, 400);
  }
  if (isEmployerContractor) {
    if (contractorPassword.length < 8) {
      return json({ error: "رمز عبورِ پیمانکار باید حداقل ۸ کاراکتر باشد" }, 400);
    }
    if (contractorUsername === username) {
      return json({ error: "نام‌کاربریِ پیمانکار باید با نام‌کاربریِ کارفرما متفاوت باشد" }, 400);
    }
  }

  try {
    // ---------- یکتاییِ نام‌کاربری/شرکت/تماس ----------
    if (await checkUsernameUniqueness(username)) {
      return json({ error: "این نام‌کاربری (کارفرما) قبلاً استفاده شده است" }, 409);
    }
    if (isEmployerContractor && await checkUsernameUniqueness(contractorUsername)) {
      return json({ error: "این نام‌کاربری (پیمانکار) قبلاً استفاده شده است" }, 409);
    }
    if (email && (await checkContactUniqueness("email", email))) {
      return json({ error: "این ایمیل قبلاً برای حساب دیگری استفاده شده است" }, 409);
    }
    if (await checkContactUniqueness("phone", phone)) {
      return json({ error: "این شماره موبایل قبلاً برای حساب دیگری استفاده شده است" }, 409);
    }
    const companyCheck = await restFetch(`companies?name=ilike.${encodeURIComponent(companyName)}&select=id`);
    if (companyCheck.ok && Array.isArray(companyCheck.data) && companyCheck.data.length > 0) {
      return json({ error: "شرکتی با همین نام قبلاً ثبت شده است — لطفاً با پشتیبانی تماس بگیرید" }, 409);
    }

    // ---------- ساختِ شرکت (آزمایشی، ۳۰ روزه، فعال) ----------
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const trialEndIso = trialEnd.toISOString();
    const companyRes = await restFetch("companies", {
      method: "POST",
      body: JSON.stringify([{
        name: companyName,
        subscription_type: "trial",
        subscription_status: "active",
        subscription_start_date: nowIso,
        subscription_end_date: trialEndIso,
        trial_start: nowIso,
        trial_end: trialEndIso,
        storage_quota_mb: DEFAULT_STORAGE_QUOTA_MB,
        org_structure_type: orgStructureType,
      }]),
    });
    if (!companyRes.ok || !Array.isArray(companyRes.data) || companyRes.data.length === 0) {
      return json({ error: "خطا در ثبتِ شرکت — لطفاً بعداً دوباره تلاش کنید" }, 500);
    }
    const companyId = companyRes.data[0].id;

    // ---------- حساب کارفرما (نام‌کاربری/رمزِ خودِ بازدیدکننده) ----------
    // role عمداً hse_supervisor است، نه employer ساده — طبقِ قراردادِ
    // شرکت‌های آزمایشی در این پروژه: فقط یک حسابِ «سرپرست کارفرما» ساخته
    // می‌شود، نه یک حساب کارفرمایِ عادی.
    const employerRes = await restFetch("employer_accounts", {
      method: "POST",
      body: JSON.stringify([{
        name: fullName, username, company_id: companyId, job_position_id: null,
        role: "hse_supervisor", can_edit: true, phone, email,
      }]),
    });
    if (!employerRes.ok || !Array.isArray(employerRes.data) || employerRes.data.length === 0) {
      return json({ error: "خطا در ساختِ حساب کارفرما" }, 500);
    }
    const employerId = employerRes.data[0].id;
    const employerPwRes = await callRpc("set_employer_password", { p_id: employerId, p_new_password: password });
    if (!employerPwRes.ok) {
      return json({ error: "شرکت ساخته شد ولی تنظیمِ رمزِ عبورِ کارفرما با خطا مواجه شد — لطفاً با پشتیبانی تماس بگیرید" }, 500);
    }

    // ---------- حساب پیمانکار (فقط برایِ نوعِ «کارفرما/چند پیمانکار») ----------
    if (isEmployerContractor) {
      const contractorRes = await restFetch("contractors", {
        method: "POST",
        body: JSON.stringify([{
          name: contractorName, username: contractorUsername, company_id: companyId, job_position_id: null,
          contact_person_name: contractorContactPersonName, start_date: null, contract_details: "", phone: "", email: "",
        }]),
      });
      if (!contractorRes.ok || !Array.isArray(contractorRes.data) || contractorRes.data.length === 0) {
        return json({ error: "شرکت و حسابِ کارفرما ساخته شد ولی ساختِ حسابِ پیمانکار با خطا مواجه شد — لطفاً با پشتیبانی تماس بگیرید" }, 500);
      }
      const contractorId = contractorRes.data[0].id;
      const contractorPwRes = await callRpc("set_contractor_password", { p_id: contractorId, p_new_password: contractorPassword });
      if (!contractorPwRes.ok) {
        return json({ error: "همه‌چیز ساخته شد ولی تنظیمِ رمزِ عبورِ پیمانکار با خطا مواجه شد — لطفاً با پشتیبانی تماس بگیرید" }, 500);
      }
    }

    // ---------- پروژه‌ی اول (فقط برایِ نوعِ «مستقل/چند پروژه») ----------
    // همان جدولِ contractor_companies (فهرستِ نام‌های زیرمجموعه‌ی هر شرکت)
    // این‌جا با نامِ «پروژه» پر می‌شود — چون از نظرِ ساختاریِ داده دقیقاً
    // همان چیزی‌ست که لازم است: یک نامِ گروه‌بندیِ زیرِ company_id که بعداً
    // چند حسابِ «contractors» (این‌جا: افرادِ HSE) با آن نام تگ می‌شوند. هیچ
    // جدول/ستونِ جدیدی لازم نبود.
    if (isMultiProject) {
      const projectRes = await restFetch("contractor_companies", {
        method: "POST",
        body: JSON.stringify([{ company_id: companyId, name: firstProjectName, created_by: "سیستم (ثبت‌نامِ خودسرویس)" }]),
      });
      if (!projectRes.ok || !Array.isArray(projectRes.data) || projectRes.data.length === 0) {
        return json({ error: "شرکت و حسابِ سرپرست ساخته شد ولی ثبتِ پروژه با خطا مواجه شد — لطفاً با پشتیبانی تماس بگیرید" }, 500);
      }
    }

    // ---------- اعطایِ همه‌ی ماژول‌هایِ فعال + زیرماژول‌هایشان ----------
    const catalogRes = await restFetch("module_prices?is_active=eq.true&select=module_key,price_monthly,price_yearly");
    const catalog: any[] = catalogRes.ok && Array.isArray(catalogRes.data) ? catalogRes.data : [];
    const priceFor = (key: string) => catalog.find((m) => m.module_key === key) || null;

    const moduleKeysToGrant = new Set<string>();
    for (const row of catalog) moduleKeysToGrant.add(row.module_key);
    for (const key of moduleKeysToGrant) {
      for (const subKey of GATED_MODULE_SUB_KEYS[key] || []) moduleKeysToGrant.add(subKey);
    }

    for (const moduleKey of moduleKeysToGrant) {
      const priceRow = priceFor(moduleKey);
      await restFetch("company_modules?on_conflict=company_id,module_key", {
        method: "POST",
        body: JSON.stringify([{
          company_id: companyId, module_key: moduleKey, is_active: true,
          starts_at: nowIso, ends_at: trialEndIso,
          price_monthly: Number(priceRow?.price_monthly) || 0, price_yearly: Number(priceRow?.price_yearly) || 0,
          source: "admin_grant", created_by: "سیستم (ثبت‌نام خودکار)",
        }]),
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      });
    }

    // ---------- ردیفِ trial_requests برایِ تاریخچه/گزارش‌گیریِ SuperAdmin ----------
    const personnelCountRaw = body?.personnelCount;
    const personnelCount = personnelCountRaw !== undefined && personnelCountRaw !== null && personnelCountRaw !== ""
      ? Number(personnelCountRaw)
      : null;
    await restFetch("trial_requests", {
      method: "POST",
      body: JSON.stringify([{
        full_name: fullName, phone, company_name: companyName,
        position: String(body?.position || "").trim(), industry: String(body?.industry || "").trim(),
        personnel_count: personnelCount != null && Number.isFinite(personnelCount) ? personnelCount : null,
        project_name: String(body?.projectName || "").trim(), project_city: String(body?.projectCity || "").trim(),
        email, desired_modules: [], description: String(body?.description || "").trim(),
        status: "approved", approved_trial_days: TRIAL_DAYS,
        admin_note: "ثبت‌نام خودکار خودسرویس — شرکت و حساب‌ها بلافاصله ساخته شدند",
        reviewed_by: "سیستم (خودسرویس)", reviewed_at: nowIso,
      }]),
      headers: { Prefer: "return=minimal" },
    }).catch(() => {});

    return json({
      ok: true,
      companyName,
      employerUsername: username,
      contractorUsername: isEmployerContractor ? contractorUsername : null,
      firstProjectName: isMultiProject ? firstProjectName : null,
      trialEnd: trialEndIso,
    });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
