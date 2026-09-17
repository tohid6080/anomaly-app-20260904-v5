// supabase/functions/chat-visitor/index.ts
//
// عمومی و بدون نیاز به احراز هویت — تنها راهِ خواندن/نوشتنِ بازدیدکننده در
// chat_visitor_conversations/chat_visitor_messages (که RLSشان عمداً هیچ
// policy ای برای anon/authenticated ندارد، دقیقاً همان الگویِ
// submit-trial-request). ویجتِ گفتگویِ زنده (LiveChatWidget.jsx) این تابع
// را با یکی از چهار action زیر صدا می‌زند. مالکیتِ هر گفتگو با visitor_token
// (تصادفی، بازگردانده‌شده در action=start و از آن پس در localStorage
// مرورگرِ بازدیدکننده نگه‌داشته‌شده) تأیید می‌شود — نه با هیچ نشستِ
// احرازهویت‌شده‌ای.
//
// Deploy:
//   supabase functions deploy chat-visitor --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const MAX_BODY_LEN = 4000;

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidMobileFormat(phone: string) {
  return /^09\d{9}$/.test(phone);
}

function msgOut(r: any) {
  return { id: r.id, sender: r.sender, senderName: r.sender_name || "", body: r.body, createdAt: r.created_at };
}

// گفتگو را با شناسه+توکن پیدا می‌کند — اگر تطبیق نکرد null، یعنی «مجاز نیست».
// visitor_last_read_at هم برمی‌گردد چون هم poll (بعد از دیدن) و هم status
// (بدون دیدن) به آن نیاز دارند.
async function findOwnedConversation(conversationId: string, visitorToken: string) {
  const res = await restFetch(
    `chat_visitor_conversations?id=eq.${conversationId}&visitor_token=eq.${encodeURIComponent(visitorToken)}&select=id,visitor_last_read_at`
  );
  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) return null;
  return res.data[0];
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

  const action = String(body?.action || "");

  // ---------- شروعِ گفتگویِ جدید ----------
  if (action === "start") {
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim();
    if (!name) return json({ error: "نام و نام خانوادگی را وارد کنید" }, 400);
    if (!email || !isValidEmailFormat(email)) return json({ error: "ایمیل معتبر نیست" }, 400);
    if (!phone || !isValidMobileFormat(phone)) return json({ error: "شماره موبایل معتبر نیست" }, 400);

    const visitorToken = crypto.randomUUID();
    const convRes = await restFetch("chat_visitor_conversations", {
      method: "POST",
      body: JSON.stringify([{ visitor_name: name, visitor_email: email, visitor_phone: phone, visitor_token: visitorToken }]),
    });
    if (!convRes.ok || !Array.isArray(convRes.data) || convRes.data.length === 0) {
      return json({ error: "خطا در شروع گفتگو — لطفاً بعداً دوباره تلاش کنید" }, 500);
    }
    const conversationId = convRes.data[0].id;

    const firstName = name.split(/\s+/)[0];
    const welcomeText =
      `سلام ${firstName} عزیز، به پشتیبانیِ سامانه‌ی IHMS خوش آمدید. پیام شما دریافت شد و همکاران ما به‌زودی پاسخ می‌دهند.`;
    const msgRes = await restFetch("chat_visitor_messages", {
      method: "POST",
      body: JSON.stringify([{ conversation_id: conversationId, sender: "admin", sender_name: "", body: welcomeText }]),
    });
    const messages = msgRes.ok && Array.isArray(msgRes.data) ? msgRes.data.map(msgOut) : [];

    return json({ conversationId, visitorToken, messages });
  }

  // ---------- ارسالِ پیام توسطِ بازدیدکننده ----------
  if (action === "send") {
    const conversationId = String(body?.conversationId || "");
    const visitorToken = String(body?.visitorToken || "");
    const text = String(body?.body || "").trim();
    if (!conversationId || !visitorToken) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);
    if (!text) return json({ error: "متنِ پیام خالی است" }, 400);
    if (text.length > MAX_BODY_LEN) return json({ error: "متنِ پیام خیلی طولانی است" }, 400);

    const owned = await findOwnedConversation(conversationId, visitorToken);
    if (!owned) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);

    const msgRes = await restFetch("chat_visitor_messages", {
      method: "POST",
      body: JSON.stringify([{ conversation_id: conversationId, sender: "visitor", sender_name: "", body: text }]),
    });
    if (!msgRes.ok || !Array.isArray(msgRes.data) || msgRes.data.length === 0) {
      return json({ error: "خطا در ارسالِ پیام" }, 500);
    }
    await restFetch(`chat_visitor_conversations?id=eq.${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ last_message_at: new Date().toISOString() }),
      headers: { Prefer: "return=minimal" },
    });

    return json({ message: msgOut(msgRes.data[0]) });
  }

  // ---------- دریافتِ پیام‌ها (برای poll دوره‌ای وقتی پنل باز است) ----------
  // چون بازدیدکننده واقعاً دارد ترد را می‌بیند، visitor_last_read_at هم
  // به‌روز می‌شود — یعنی پیام‌های ادمین از این پس «خوانده‌شده» حساب می‌شوند.
  if (action === "poll") {
    const conversationId = String(body?.conversationId || "");
    const visitorToken = String(body?.visitorToken || "");
    if (!conversationId || !visitorToken) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);

    const owned = await findOwnedConversation(conversationId, visitorToken);
    if (!owned) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);

    const res = await restFetch(`chat_visitor_messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`);
    const messages = res.ok && Array.isArray(res.data) ? res.data.map(msgOut) : [];
    await restFetch(`chat_visitor_conversations?id=eq.${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ visitor_last_read_at: new Date().toISOString() }),
      headers: { Prefer: "return=minimal" },
    });
    return json({ messages });
  }

  // ---------- شمارشِ خوانده‌نشده (برای poll سبک وقتی پنل بسته است) ----------
  // بدونِ اثرِ جانبی — visitor_last_read_at را دست نمی‌زند، وگرنه پیام‌ها
  // بدونِ اینکه واقعاً دیده شوند «خوانده‌شده» می‌شدند.
  if (action === "status") {
    const conversationId = String(body?.conversationId || "");
    const visitorToken = String(body?.visitorToken || "");
    if (!conversationId || !visitorToken) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);

    const owned = await findOwnedConversation(conversationId, visitorToken);
    if (!owned) return json({ error: "نشستِ گفتگو نامعتبر است" }, 403);

    const since = owned.visitor_last_read_at || "-infinity";
    const res = await restFetch(
      `chat_visitor_messages?conversation_id=eq.${conversationId}&sender=eq.admin&created_at=gt.${encodeURIComponent(since)}&select=id`
    );
    const unreadCount = res.ok && Array.isArray(res.data) ? res.data.length : 0;
    return json({ unreadCount });
  }

  return json({ error: "عملیات نامعتبر است" }, 400);
});
