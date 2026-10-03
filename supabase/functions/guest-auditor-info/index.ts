// supabase/functions/guest-auditor-info/index.ts
//
// عمومی و بدونِ احراز هویت — دسترسیِ موقتِ فقط‌خواندنیِ یک «بازرسِ مهمان».
// کاملاً جدا از issue-session-token/sessionToken.js/نقش‌هایِ JWT.
//
// action="summary": همان computeSafetyAggregates() مشترک (مایکروسایتِ عمومی).
// action="list": listKey باید دقیقاً یکی از سه مقدارِ سخت‌کدشده‌یِ زیر باشد —
// نه از ورودیِ کلاینت مشتق، بلکه خودِ کد تعیین می‌کند کدام ستون‌ها خوانده
// شوند؛ هرگز نامِ شخص/پیمانکار در خروجی نیست.
//
// Deploy:
//   supabase functions deploy guest-auditor-info --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";
import { computeSafetyAggregates } from "../_shared/companySafetyAggregates.ts";

const LIST_QUERIES: Record<string, (companyId: string) => Promise<any[]>> = {
  openCorrectiveActions: async (companyId) => {
    const res = await restFetch(
      `corrective_actions?select=action_number,due_date,status,priority&company_id=eq.${companyId}&status=neq.closed&status=neq.expired&order=due_date.asc&limit=50`,
    );
    return res.ok && Array.isArray(res.data) ? res.data : [];
  },
  activePermits: async (companyId) => {
    const res = await restFetch(
      `permits?select=title,valid_until,status&company_id=eq.${companyId}&status=eq.active&order=valid_until.asc&limit=50`,
    );
    return res.ok && Array.isArray(res.data) ? res.data : [];
  },
  recentAnomalies: async (companyId) => {
    const res = await restFetch(
      `anomalies?select=tracking_number,area,risk_level,status,created_at&company_id=eq.${companyId}&order=created_at.desc&limit=20`,
    );
    return res.ok && Array.isArray(res.data) ? res.data : [];
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }

  const token = String(body?.token || "").trim();
  const action = String(body?.action || "summary");
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const res = await restFetch(
      `guest_auditor_links?token=eq.${encodeURIComponent(token)}&select=id,company_id,label,status,expires_at,revoked_at,access_count`,
    );
    const link = res.ok && Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    if (!link) return json({ error: "این لینک معتبر نیست" }, 404);

    if (link.status !== "active" || link.revoked_at || new Date(link.expires_at).getTime() < Date.now()) {
      return json({ error: "این لینک منقضی یا لغو شده است" }, 403);
    }

    try {
      await restFetch(`guest_auditor_links?id=eq.${link.id}`, {
        method: "PATCH",
        body: JSON.stringify({ last_accessed_at: new Date().toISOString(), access_count: (Number(link.access_count) || 0) + 1 }),
      });
    } catch { /* شکستِ این آپدیتِ آماری نباید پاسخِ اصلی را خراب کند */ }

    if (action === "summary") {
      const agg = await computeSafetyAggregates(link.company_id);
      return json({ label: link.label || "", ...agg });
    }

    if (action === "list") {
      const listKey = String(body?.listKey || "");
      const handler = LIST_QUERIES[listKey];
      if (!handler) return json({ error: "عملیاتِ نامعتبر" }, 400);
      const rows = await handler(link.company_id);
      return json({ label: link.label || "", listKey, rows });
    }

    return json({ error: "عملیاتِ نامعتبر" }, 400);
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
