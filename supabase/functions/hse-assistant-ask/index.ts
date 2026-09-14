// supabase/functions/hse-assistant-ask/index.ts
//
// پاسخ‌دهیِ واقعیِ «دستیار آموزشی HSE» با یک مدل زبانیِ واقعی (Google
// Gemini، لایه‌ی رایگان) — جایگزینِ موتورِ قانون‌محورِ محلیِ قبلی
// (hseLearningEngine.answerQuestion) که فقط یک پاسخِ ثابت به‌ازای هر ۵
// موضوع برمی‌گرداند و به همین دلیل اغلب به سؤالِ واقعیِ کاربر بی‌ربط بود.
// طبق درخواستِ صریحِ کاربر برای یک گزینه‌ی کاملاً رایگان (نه DeepSeek که
// بعد از سهمیه‌ی اولیه هزینه دارد) — لایه‌ی رایگانِ Gemini API نیازی به
// کارتِ اعتباری ندارد و یک محدودیتِ استاندارد (نه اعتبارِ یک‌بارمصرف) است.
// دقیقاً طبق همان الگوی امنیتیِ zarinpal-payment: کلید API هرگز در
// Frontend/Repository نیست، فقط از Environment Variable خوانده می‌شود.
//
// Deploy:
//   supabase functions deploy hse-assistant-ask
// Environment Variable لازم (در Supabase Dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY — کلید رایگان از https://aistudio.google.com/apikey (بدون کارت)
//
// نکته‌ی محدودیت: لایه‌ی رایگانِ Gemini سقفِ درخواست دارد (در زمانِ نوشتنِ
// این کد چیزی حدودِ ۱۵۰۰ درخواست در روز روی مدل‌های Flash — این عدد را
// گوگل بدونِ اطلاع‌رسانی تغییر می‌دهد، برای رقمِ دقیقِ لحظه‌ای به AI Studio
// نگاه کنید) و طبق قوانینِ لایه‌ی رایگانِ گوگل ممکن است محتوای درخواست‌ها
// برای بهبودِ مدل‌ها استفاده شود (برخلافِ لایه‌ی پولی). اگر GEMINI_API_KEY
// تنظیم نشده باشد یا این فراخوانی به هر دلیلی (از جمله رسیدن به سقفِ
// رایگان) شکست بخورد، کلاینت (HseLearningAssistantThread) خودش به‌طور
// خودکار به موتورِ محلیِ قدیمی سقوط می‌کند — دستیار هرگز کاملاً از کار
// نمی‌افتد.

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { CORS_HEADERS, json } from "../_shared/supabaseAdmin.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `تو «دستیار آموزشی HSE» هستی — بخشی از یک نرم‌افزارِ مدیریتِ ایمنی/بهداشت/محیط‌زیست (HSE) برای پیمانکارانِ پروژه‌های صنعتی/ساختمانی.
کارت پاسخ‌دادنِ کوتاه، دقیق و کاربردی (نه یک مقاله‌ی طولانی) به سؤالاتِ ایمنی، بهداشتِ شغلی و محیط‌زیست است: کار در ارتفاع، ایمنیِ برق، باربرداری/ریگینگ، PPE، داربست‌بندی، گزارشِ آنومالی/حادثه، مجوزِ کار (Permit to Work) و موضوعاتِ مشابه.
همیشه به فارسی و با لحنی حرفه‌ای و دوستانه پاسخ بده. اگر سؤال کاملاً بی‌ربط به HSE بود (مثلاً سیاست، سرگرمی)، مؤدبانه بگو که فقط در حوزه‌ی HSE می‌تونی کمک کنی.`;

type HistoryItem = { who?: string; text?: string };

function toGeminiContents(history: HistoryItem[], question: string) {
  const trimmed = (history || [])
    .filter((m) => m && m.text)
    .slice(-8)
    .map((m) => ({ role: m!.who === "mine" ? "user" : "model", parts: [{ text: String(m!.text) }] }));
  return [...trimmed, { role: "user", parts: [{ text: question }] }];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!GEMINI_API_KEY) {
    return json({ error: "GEMINI_API_KEY در Supabase Secrets تنظیم نشده است." }, 500);
  }

  const claims = await getCallerClaims(req);
  if (!claims) {
    return json({ error: "نشست نامعتبر است — لطفاً دوباره وارد شوید." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "درخواست نامعتبر است" }, 400);
  }

  const question = String(body.question || "").trim();
  if (!question) return json({ error: "سؤال خالی است" }, 400);
  if (question.length > 1500) return json({ error: "سؤال خیلی طولانی است" }, 400);
  const history = Array.isArray(body.history) ? (body.history as HistoryItem[]) : [];

  let geRes: Response;
  try {
    geRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: toGeminiContents(history, question),
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      }),
    });
  } catch {
    return json({ error: "خطا در برقراری ارتباط با سرویس هوش مصنوعی" }, 502);
  }

  const data = await geRes.json().catch(() => null);
  if (!geRes.ok) {
    return json({ error: data?.error?.message || "سرویس هوش مصنوعی خطا برگرداند (شاید سقفِ رایگانِ روزانه)" }, 502);
  }

  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!answer) return json({ error: "پاسخی از هوش مصنوعی دریافت نشد" }, 502);

  return json({ answer });
});
