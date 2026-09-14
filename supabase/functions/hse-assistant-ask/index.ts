// supabase/functions/hse-assistant-ask/index.ts
//
// پاسخ‌دهیِ واقعیِ «دستیار آموزشی HSE» با یک مدل زبانیِ واقعی (DeepSeek) —
// جایگزینِ موتورِ قانون‌محورِ محلیِ قبلی (hseLearningEngine.answerQuestion)
// که فقط یک پاسخِ ثابت به‌ازای هر ۵ موضوع برمی‌گرداند و به همین دلیل اغلب
// به سؤالِ واقعیِ کاربر بی‌ربط بود. دقیقاً طبق همان الگوی امنیتیِ
// zarinpal-payment: کلید API هرگز در Frontend/Repository نیست، فقط از
// Environment Variable خوانده می‌شود.
//
// Deploy:
//   supabase functions deploy hse-assistant-ask
// Environment Variable لازم (در Supabase Dashboard → Edge Functions → Secrets):
//   DEEPSEEK_API_KEY — کلید API از https://platform.deepseek.com
//
// نکته‌ی هزینه: DeepSeek API رایگانِ نامحدود نیست (فقط سهمیه‌ی رایگانِ
// اولیه برای حساب‌های تازه، بعدش به‌ازای توکن هزینه دارد). اگر
// DEEPSEEK_API_KEY تنظیم نشده باشد یا این فراخوانی به هر دلیلی شکست
// بخورد، کلاینت (HseLearningAssistantThread) خودش به‌طور خودکار به موتورِ
// محلیِ قدیمی سقوط می‌کند — دستیار هرگز کاملاً از کار نمی‌افتد.

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { CORS_HEADERS, json } from "../_shared/supabaseAdmin.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `تو «دستیار آموزشی HSE» هستی — بخشی از یک نرم‌افزارِ مدیریتِ ایمنی/بهداشت/محیط‌زیست (HSE) برای پیمانکارانِ پروژه‌های صنعتی/ساختمانی.
کارت پاسخ‌دادنِ کوتاه، دقیق و کاربردی (نه یک مقاله‌ی طولانی) به سؤالاتِ ایمنی، بهداشتِ شغلی و محیط‌زیست است: کار در ارتفاع، ایمنیِ برق، باربرداری/ریگینگ، PPE، داربست‌بندی، گزارشِ آنومالی/حادثه، مجوزِ کار (Permit to Work) و موضوعاتِ مشابه.
همیشه به فارسی و با لحنی حرفه‌ای و دوستانه پاسخ بده. اگر سؤال کاملاً بی‌ربط به HSE بود (مثلاً سیاست، سرگرمی)، مؤدبانه بگو که فقط در حوزه‌ی HSE می‌تونی کمک کنی.`;

type HistoryItem = { who?: string; text?: string };

function toDeepSeekMessages(history: HistoryItem[], question: string) {
  const trimmed = (history || [])
    .filter((m) => m && m.text)
    .slice(-8)
    .map((m) => ({ role: m!.who === "mine" ? "user" : "assistant", content: String(m!.text) }));
  return [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed, { role: "user", content: question }];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!DEEPSEEK_API_KEY) {
    return json({ error: "DEEPSEEK_API_KEY در Supabase Secrets تنظیم نشده است." }, 500);
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

  let dsRes: Response;
  try {
    dsRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: toDeepSeekMessages(history, question),
        temperature: 0.4,
        max_tokens: 600,
      }),
    });
  } catch {
    return json({ error: "خطا در برقراری ارتباط با سرویس هوش مصنوعی" }, 502);
  }

  const data = await dsRes.json().catch(() => null);
  if (!dsRes.ok) {
    return json({ error: data?.error?.message || "سرویس هوش مصنوعی خطا برگرداند" }, 502);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) return json({ error: "پاسخی از هوش مصنوعی دریافت نشد" }, 502);

  return json({ answer });
});
