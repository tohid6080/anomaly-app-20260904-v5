// supabase/functions/_shared/notify.ts
//
// اعلانِ تلگرام/ایمیل برایِ رویدادهایِ عمومی (مثلاً سرنخِ تازهٔ پرپوزال).
// هر دو کانال کاملاً اختیاری‌اند — اگر secret مربوطه تنظیم نشده باشد،
// همان کانال بی‌صدا رد می‌شود (نه خطا)، چون نبودِ اعلان نباید باعثِ
// ناموفق‌نشان‌دادنِ درخواستِ اصلیِ کاربر (مثلاً ثبتِ سرنخ) شود — سرنخ از
// قبل با موفقیت در دیتابیس ثبت شده است.

export async function sendTelegramNotification(text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) console.error("Telegram notify failed:", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("Telegram notify error:", String((e as Error)?.message || e));
  }
}

export async function sendEmailNotification(subject: string, text: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const to = Deno.env.get("NOTIFY_EMAIL_TO") || "";
  const from = Deno.env.get("NOTIFY_EMAIL_FROM") || "IHMS <onboarding@resend.dev>";
  if (!apiKey || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) console.error("Email notify failed:", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("Email notify error:", String((e as Error)?.message || e));
  }
}
