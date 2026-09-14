// supabase/functions/send-chat-push/index.ts
//
// بعد از ثبتِ موفقِ یک پیامِ چت، chatApi.js (notifyChatPush) این Edge
// Function را صدا می‌زند تا به بقیه‌ی اعضای مکالمه — به‌جز فرستنده — یک
// Push واقعی (FCM) بفرستد، حتی اگر اپ‌شان بسته باشد. توکنِ دستگاه‌ها از
// جدولِ chat_push_tokens (پر شده توسطِ registerPushToken سمتِ کلاینت پس از
// اجازه‌ی اعلانِ کاربر) خوانده می‌شود. دقیقاً طبق همان الگوی امنیتیِ
// zarinpal-payment/hse-assistant-ask: هیچ کلید/اعتبارنامه‌ای در
// Frontend/Repository نیست، فقط از Environment Variable خوانده می‌شود.
//
// Deploy:
//   supabase functions deploy send-chat-push
// Environment Variable لازم (در Supabase Dashboard → Edge Functions → Secrets):
//   FCM_SERVICE_ACCOUNT_JSON — کل محتوایِ JSONِ Service Account از
//   Firebase Console → Project Settings → Service Accounts → Generate new
//   private key (به‌صورتِ یک رشته‌ی JSON، نه فایل). بدونِ این Secret، این
//   تابع بی‌صدا موفق برمی‌گردد (Push فقط یک بهبودِ تکمیلی است، نبودش نباید
//   جریانِ اصلیِ چت را خراب کند).
//
// FCM HTTP v1 به یک OAuth Access Token نیاز دارد (نه یک کلیدِ ثابت مثلِ
// نسخه‌ی قدیمیِ Legacy) — این تابع خودش JWT را با RS256 (کلیدِ خصوصیِ
// همان Service Account) امضا می‌کند و آن را نزدِ گوگل با Access Token
// تاخت می‌زند؛ عمداً هیچ کتابخانه‌ی خارجی import نمی‌شود، دقیقاً هم‌الگویِ
// jwtUtils.ts (امضا با Web Crypto API استانداردِ خودِ Deno).

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { CORS_HEADERS, json, restFetch } from "../_shared/supabaseAdmin.ts";

const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlEncodeJson(obj: unknown): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(obj)));
}
function pemPrivateKeyToBytes(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(claims)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemPrivateKeyToBytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuf))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!tokenRes.ok) return null;
  const data = await tokenRes.json().catch(() => null);
  return data?.access_token || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims) return json({ error: "نشست نامعتبر است — لطفاً دوباره وارد شوید." }, 401);

  // بدونِ پیکربندیِ FCM، بی‌صدا موفق برمی‌گردد — طبقِ توضیحِ بالا.
  if (!FCM_SERVICE_ACCOUNT_JSON) return json({ ok: true, skipped: "not_configured" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "درخواست نامعتبر است" }, 400);
  }
  const conversationId = String(body.conversationId || "");
  const messageId = String(body.messageId || "");
  if (!conversationId || !messageId) return json({ error: "شناسه‌ی مکالمه/پیام لازم است" }, 400);

  // فرستنده باید واقعاً عضوِ همین مکالمه باشد — جلوگیری از سوءاستفاده برای
  // فرستادنِ Push به مکالماتی که کاربر عضوشان نیست.
  const callerCheck = await restFetch(`chat_participants?conversation_id=eq.${conversationId}&username=eq.${encodeURIComponent(String(claims.username || ""))}&select=id`);
  if (!callerCheck.ok || !(callerCheck.data || []).length) {
    return json({ error: "شما عضو این مکالمه نیستید" }, 403);
  }

  const msgRes = await restFetch(`chat_messages?id=eq.${messageId}&conversation_id=eq.${conversationId}&select=*`);
  const message = msgRes.ok && Array.isArray(msgRes.data) ? msgRes.data[0] : null;
  if (!message) return json({ ok: true, skipped: "message_not_found" });

  const partRes = await restFetch(`chat_participants?conversation_id=eq.${conversationId}&username=neq.${encodeURIComponent(message.sender_username || "")}&select=username`);
  const usernames: string[] = partRes.ok ? (partRes.data || []).map((p: any) => p.username) : [];
  if (usernames.length === 0) return json({ ok: true, skipped: "no_recipients" });

  const inList = usernames.map((u) => `"${u}"`).join(",");
  const tokenRes = await restFetch(`chat_push_tokens?username=in.(${inList})&select=token`);
  const tokens: string[] = tokenRes.ok ? (tokenRes.data || []).map((t: any) => t.token) : [];
  if (tokens.length === 0) return json({ ok: true, skipped: "no_tokens" });

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  } catch {
    return json({ error: "FCM_SERVICE_ACCOUNT_JSON نامعتبر است" }, 500);
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return json({ error: "FCM_SERVICE_ACCOUNT_JSON ناقص است" }, 500);
  }

  const accessToken = await getGoogleAccessToken(serviceAccount.client_email, serviceAccount.private_key);
  if (!accessToken) return json({ error: "دریافتِ Access Token از گوگل شکست خورد" }, 502);

  const title = message.sender_name || "پیام جدید";
  const preview = message.body ? String(message.body).slice(0, 120) : (message.attachment_url ? "📎 پیوست" : "");

  const results = await Promise.all(tokens.map(async (deviceToken) => {
    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title, body: preview },
            data: { conversationId, messageId },
            android: { priority: "high" },
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }));

  return json({ ok: true, sent: results.filter(Boolean).length, total: tokens.length });
});
