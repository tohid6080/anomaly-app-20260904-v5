import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

const STORAGE_KEY = "ihms_livechat_session";

/**
 * ویجتِ گفتگویِ زنده با بازدیدکنندگانِ سایت — بدون حساب/ورود. تمامِ عملیات
 * (شروع/ارسال/دریافت) از طریقِ Edge Function عمومیِ chat-visitor انجام
 * می‌شود (دقیقاً همان الگوی امنیتیِ trialRequestApi.js) چون
 * chat_visitor_conversations/messages هیچ RLS policy ای برایِ
 * anon/authenticated ندارند. مالکیتِ گفتگو با visitorToken (بازگردانده‌شده
 * در startLiveChat) تأیید می‌شود — در localStorage نگه داشته می‌شود تا
 * بازدیدکننده با رفرشِ صفحه یا رفتن به صفحه‌ی دیگر، گفتگویش را از دست ندهد.
 */

function callChatVisitor(action, params) {
  return fetch(`${SUPABASE_URL}/functions/v1/chat-visitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ action, ...params }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      // ۴۰۳ یعنی conversationId/visitorToken دیگر معتبر نیست (مثلاً نشستِ
      // localStorage قدیمی است) — نه یک خطای موقتِ شبکه؛ فراخوان (widget)
      // این پرچم را برای پاک‌کردنِ نشست و بازگشت به فرم استفاده می‌کند.
      if (!res.ok) return { __error: true, invalidSession: res.status === 403, message: data?.error || tr("lcErrGeneric") };
      return data;
    })
    .catch(() => ({ __error: true, message: tr("saErrServerConn") }));
}

function msgFromApi(m) {
  return { id: m.id, sender: m.sender, senderName: m.senderName || "", body: m.body, createdAt: m.createdAt };
}

export function loadLiveChatSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLiveChatSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // بی‌اهمیت اگر localStorage در دسترس نبود (حالتِ خصوصیِ مرورگر)
  }
}

export function clearLiveChatSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // بی‌اهمیت — همان استدلالِ بالا
  }
}

export async function startLiveChat(name, email, phone) {
  const result = await callChatVisitor("start", { name, email, phone });
  if (result?.__error) return result;
  const session = { conversationId: result.conversationId, visitorToken: result.visitorToken };
  saveLiveChatSession(session);
  return { ok: true, session, messages: (result.messages || []).map(msgFromApi) };
}

export async function sendLiveChatVisitorMessage(session, body) {
  const result = await callChatVisitor("send", { conversationId: session.conversationId, visitorToken: session.visitorToken, body });
  if (result?.__error) return result;
  return { ok: true, message: msgFromApi(result.message) };
}

export async function pollLiveChatMessages(session) {
  const result = await callChatVisitor("poll", { conversationId: session.conversationId, visitorToken: session.visitorToken });
  if (result?.__error) return result;
  return { ok: true, messages: (result.messages || []).map(msgFromApi) };
}
