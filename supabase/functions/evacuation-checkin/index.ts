// supabase/functions/evacuation-checkin/index.ts
//
// عمومی و بدونِ احراز هویت — چک‌اینِ حضور در یک نقطه‌ی تجمعِ تمرینِ تخلیه با
// اسکنِ QR. action="info": اطلاعاتِ نقطه‌ی تجمع/تمرین را با checkin_token
// برمی‌گرداند. action="checkin": یک ردیف در evacuation_checkins درج می‌کند —
// company_id/drill_id همیشه از رویِ خودِ ردیفِ توکن خوانده می‌شوند، هرگز از
// بدنه‌ی کلاینت. محدودیتِ شناخته‌شده: چون این مسیر کاملاً بدونِ نشست است،
// از صفِ آفلاینِ offlineWrite/IndexedDB اپ عبور نمی‌کند — بدونِ اتصال، چک‌این
// ثبت نمی‌شود.
//
// Deploy:
//   supabase functions deploy evacuation-checkin --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const ACTIVE_DRILL_STATUSES = ["planned", "in_progress"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }

  const token = String(body?.token || "").trim();
  const action = String(body?.action || "info");
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const mpRes = await restFetch(
      `evacuation_muster_points?checkin_token=eq.${encodeURIComponent(token)}&select=id,name,drill_id,company_id,zone_id`,
    );
    const mp = mpRes.ok && Array.isArray(mpRes.data) && mpRes.data.length ? mpRes.data[0] : null;
    if (!mp) return json({ error: "این لینک معتبر نیست" }, 404);

    const drillRes = await restFetch(
      `evacuation_drills?id=eq.${encodeURIComponent(mp.drill_id)}&select=id,title,status,scheduled_at`,
    );
    const drill = drillRes.ok && Array.isArray(drillRes.data) && drillRes.data.length ? drillRes.data[0] : null;
    if (!drill) return json({ error: "این لینک معتبر نیست" }, 404);

    if (action === "info") {
      return json({
        musterPointName: mp.name || "",
        drillTitle: drill.title || "",
        drillStatus: drill.status,
        scheduledAt: drill.scheduled_at,
        canCheckin: ACTIVE_DRILL_STATUSES.includes(drill.status),
      });
    }

    if (action === "checkin") {
      if (!ACTIVE_DRILL_STATUSES.includes(drill.status)) {
        return json({ error: "این تمرین دیگر فعال نیست" }, 410);
      }
      const participantName = String(body?.participantName || "").trim().slice(0, 120);
      if (!participantName) return json({ error: "نام الزامی است" }, 400);

      const row = {
        id: crypto.randomUUID(),
        company_id: mp.company_id,
        drill_id: mp.drill_id,
        muster_point_id: mp.id,
        participant_name: participantName,
      };
      const inserted = await restFetch("evacuation_checkins", { method: "POST", body: JSON.stringify([row]) });
      if (!inserted.ok) return json({ error: "خطا در ثبتِ حضور" }, 500);

      return json({ ok: true, musterPointName: mp.name || "", drillTitle: drill.title || "" });
    }

    return json({ error: "عملیاتِ نامعتبر" }, 400);
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
