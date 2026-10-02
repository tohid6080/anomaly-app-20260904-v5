// supabase/functions/manage-project-hse/index.ts
//
// دروازه‌ی امن مدیریتِ «HSE پروژه» (ردیف‌های contractors که در شرکت‌های
// مستقل/چندپروژه نقشِ فردِ HSE یک پروژه را دارند، نه پیمانکار واقعی) —
// برایِ خودِ سرپرست (HSE_SUPERVISOR)، نه فقط Super Admin.
//
// manage-account عمداً دست‌نخورده می‌ماند (مرزِ امنیتی‌اش فقط Super Admin
// است و نباید شل شود) — این یک دروازه‌ی کاملاً جدا و مضیق‌تر است:
//   ۱. caller باید یک نشستِ معتبر با app_role==='hse_supervisor' باشد.
//   ۲. company_id هدف همیشه از خودِ claims توکن گرفته می‌شود، هرگز از
//      بدنه‌ی کلاینت — و هر عملیات (PATCH/DELETE) با همین company_id هم
//      فیلتر می‌شود، نه فقط id، تا حتی اگر id از شرکتِ دیگری فرستاده شود
//      عملیات رویِ صفر ردیف اجرا شود.
//   ۳. دفاع در عمق: شرکتِ caller باید واقعاً org_structure_type =
//      'standalone_multi_project' باشد.
//
// Deploy:
//   supabase functions deploy manage-project-hse

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, callRpc, restFetch } from "../_shared/supabaseAdmin.ts";

function auditNote(action: string) {
  return `عملیات ${action} — از طریق خودسرویسِ سرپرست (HSE پروژه)`;
}

async function logAudit(entry: Record<string, unknown>) {
  await restFetch("admin_audit_log", { method: "POST", body: JSON.stringify([entry]), headers: { Prefer: "return=minimal" } }).catch(() => {});
}

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidMobileFormat(phone: string) {
  return /^09\d{9}$/.test(phone);
}

// دقیقاً همان دلیل/الگویِ manage-account: username/email/phone باید در کل
// پلتفرم (هم employer_accounts هم contractors) یکتا باشند، وگرنه
// issue-session-token (که اول employer_accounts را امتحان می‌کند) حساب
// دومی که همان مقدار را دارد را هرگز قابل‌ورود نمی‌کند.
async function checkContactUniqueness(field: "email" | "phone", value: string, excludeId: string | null) {
  const [empRes, conRes] = await Promise.all([
    restFetch(`employer_accounts?${field}=eq.${encodeURIComponent(value)}&select=id`),
    restFetch(`contractors?${field}=eq.${encodeURIComponent(value)}&select=id`),
  ]);
  const empMatches = empRes.ok && Array.isArray(empRes.data) ? empRes.data : [];
  const conMatches = conRes.ok && Array.isArray(conRes.data) ? conRes.data : [];
  const isSelf = (id: string) => excludeId && id === excludeId;
  return empMatches.some((r: any) => !isSelf(r.id)) || conMatches.some((r: any) => !isSelf(r.id));
}

async function checkUsernameUniqueness(value: string) {
  const [empRes, conRes] = await Promise.all([
    restFetch(`employer_accounts?username=eq.${encodeURIComponent(value)}&select=id`),
    restFetch(`contractors?username=eq.${encodeURIComponent(value)}&select=id`),
  ]);
  const empMatches = empRes.ok && Array.isArray(empRes.data) ? empRes.data : [];
  const conMatches = conRes.ok && Array.isArray(conRes.data) ? conRes.data : [];
  return empMatches.length > 0 || conMatches.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  // ---------- مرز امنیتی اصلی: فقط سرپرستِ واردشده، برایِ شرکتِ خودش ----------
  if (!claims || claims.app_role !== "hse_supervisor" || !claims.company_id) {
    return json({ error: "دسترسی غیرمجاز — این عملیات فقط برای سرپرستِ HSE همان شرکت مجاز است." }, 403);
  }
  const companyId = String(claims.company_id);
  const performedBy = String(claims.username || "hse_supervisor");

  // دفاع در عمق: این مسیر فقط برایِ شرکت‌هایِ «مستقل/چندپروژه» معنا دارد
  const companyCheck = await restFetch(`companies?id=eq.${companyId}&select=org_structure_type`);
  const companyRow = companyCheck.ok && Array.isArray(companyCheck.data) ? companyCheck.data[0] : null;
  if (!companyRow || companyRow.org_structure_type !== "standalone_multi_project") {
    return json({ error: "این عملیات فقط برای شرکت‌های مستقل/چندپروژه مجاز است." }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const action = String(body?.action || "");

  try {
    // ---------- ایجاد حساب «HSE پروژه» ----------
    if (action === "create") {
      const f = body.fields || {};
      if (!f.name?.trim() || !f.username?.trim() || !f.password) {
        return json({ error: "نام پروژه، نام‌کاربری و رمز عبور الزامی است" }, 400);
      }
      if (f.password.length < 8) return json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, 400);
      if (f.email && !isValidEmailFormat(f.email)) return json({ error: "فرمت ایمیل نامعتبر است" }, 400);
      if (f.phone && !isValidMobileFormat(f.phone)) return json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, 400);

      // نامِ پروژه باید واقعاً یکی از پروژه‌هایِ همینِ شرکت باشد — همان
      // محافظتی که خودِ contractor_companies برایِ آن ساخته شده (جلوگیری
      // از تایپی که یک «پروژه»ی ناموجود/غلط بسازد).
      const projectCheck = await restFetch(`contractor_companies?company_id=eq.${companyId}&name=eq.${encodeURIComponent(f.name.trim())}&select=id&limit=1`);
      const projectExists = projectCheck.ok && Array.isArray(projectCheck.data) && projectCheck.data.length > 0;
      if (!projectExists) {
        return json({ error: "این نام با هیچ‌کدام از پروژه‌های ثبت‌شده‌ی شرکت مطابقت ندارد." }, 400);
      }

      if (f.email && await checkContactUniqueness("email", f.email, null)) {
        return json({ error: "این ایمیل قبلاً برای حساب دیگری استفاده شده است" }, 409);
      }
      if (f.phone && await checkContactUniqueness("phone", f.phone, null)) {
        return json({ error: "این شماره موبایل قبلاً برای حساب دیگری استفاده شده است" }, 409);
      }
      if (await checkUsernameUniqueness(f.username.trim())) {
        return json({ error: "این نام‌کاربری قبلاً استفاده شده است" }, 409);
      }

      const payload = {
        name: f.name.trim(), username: f.username.trim(), company_id: companyId,
        job_position_id: f.jobPositionId || null, contact_person_name: f.contactPersonName || "",
        start_date: f.startDate || null, contract_details: f.contractDetails || "",
        phone: f.phone || "", email: f.email || "",
      };
      const created = await restFetch("contractors", { method: "POST", body: JSON.stringify([payload]) });
      if (!created.ok || !Array.isArray(created.data) || created.data.length === 0) {
        return json({ error: "خطا در ایجاد حساب" }, 500);
      }
      const newId = created.data[0].id;
      await callRpc("set_contractor_password", { p_id: newId, p_new_password: f.password });

      await logAudit({ action: "create_account", target_type: "contractor", target_id: newId, target_username: f.username.trim(), performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote("ایجاد حساب HSE پروژه") });
      return json({ ok: true, id: newId });
    }

    const targetId = String(body?.targetId || "");
    if (!targetId) return json({ error: "شناسه‌ی حساب مقصد الزامی است" }, 400);

    // هر عملیات غیر از create، فقط رویِ ردیفی از همین شرکت اثر می‌کند —
    // اول تأیید می‌شود که targetId واقعاً به همین companyId تعلق دارد.
    const ownershipCheck = await restFetch(`contractors?id=eq.${targetId}&company_id=eq.${companyId}&select=id`);
    const owns = ownershipCheck.ok && Array.isArray(ownershipCheck.data) && ownershipCheck.data.length > 0;
    if (!owns) return json({ error: "این حساب به شرکتِ شما تعلق ندارد یا پیدا نشد." }, 404);

    // ---------- ویرایش ----------
    if (action === "update") {
      const f = body.fields || {};
      if (f.email && !isValidEmailFormat(f.email)) return json({ error: "فرمت ایمیل نامعتبر است" }, 400);
      if (f.phone && !isValidMobileFormat(f.phone)) return json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, 400);
      if (f.email && await checkContactUniqueness("email", f.email, targetId)) {
        return json({ error: "این ایمیل قبلاً برای حساب دیگری استفاده شده است" }, 409);
      }
      if (f.phone && await checkContactUniqueness("phone", f.phone, targetId)) {
        return json({ error: "این شماره موبایل قبلاً برای حساب دیگری استفاده شده است" }, 409);
      }
      const payload: Record<string, unknown> = {};
      if ("name" in f) payload.name = f.name;
      if ("jobPositionId" in f) payload.job_position_id = f.jobPositionId || null;
      if ("phone" in f) payload.phone = f.phone || "";
      if ("email" in f) payload.email = f.email || "";
      if ("contactPersonName" in f) payload.contact_person_name = f.contactPersonName;
      if ("startDate" in f) payload.start_date = f.startDate || null;
      if ("contractDetails" in f) payload.contract_details = f.contractDetails;
      const updated = await restFetch(`contractors?id=eq.${targetId}&company_id=eq.${companyId}`, { method: "PATCH", body: JSON.stringify(payload) });
      if (!updated.ok) return json({ error: "خطا در ویرایش حساب" }, 500);
      await logAudit({ action: "update_account", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote("ویرایش حساب HSE پروژه") });
      return json({ ok: true });
    }

    // ---------- فعال/غیرفعال ----------
    if (action === "deactivate" || action === "reactivate") {
      const active = action === "reactivate";
      const updated = await restFetch(`contractors?id=eq.${targetId}&company_id=eq.${companyId}`, { method: "PATCH", body: JSON.stringify({ is_active: active }) });
      if (!updated.ok) return json({ error: "خطا در تغییر وضعیت حساب" }, 500);
      await logAudit({ action: action === "reactivate" ? "reactivate_account" : "deactivate_account", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote(active ? "فعال‌سازی" : "غیرفعال‌سازی") });
      return json({ ok: true });
    }

    // ---------- بازنشانی رمز عبور ----------
    if (action === "reset_password") {
      const newPassword = String(body?.newPassword || "");
      if (newPassword.length < 8) return json({ error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد" }, 400);
      const result = await callRpc("set_contractor_password", { p_id: targetId, p_new_password: newPassword });
      if (!result.ok) return json({ error: "خطا در بازنشانی رمز عبور" }, 500);
      await logAudit({ action: "reset_password", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote("بازنشانی رمز عبور") });
      return json({ ok: true });
    }

    // ---------- حذف ----------
    if (action === "delete") {
      // دقیقاً همان بررسیِ وابستگیِ manage-account — چون شخصِ «HSE پروژه»
      // می‌تواند دقیقاً مثلِ یک پیمانکارِ واقعی از طریقِ همین contractor_id
      // به پرسنل/ماشین‌آلات/اقدام اصلاحی وصل باشد.
      const [personnelCheck, machineryCheck, correctiveCheck] = await Promise.all([
        restFetch(`personnel?contractor_id=eq.${targetId}&select=id&limit=1`),
        restFetch(`machinery?contractor_id=eq.${targetId}&select=id&limit=1`),
        restFetch(`corrective_actions?responsible_contractor_id=eq.${targetId}&select=id&limit=1`),
      ]);
      const hasPersonnel = personnelCheck.ok && Array.isArray(personnelCheck.data) && personnelCheck.data.length > 0;
      const hasMachinery = machineryCheck.ok && Array.isArray(machineryCheck.data) && machineryCheck.data.length > 0;
      const hasCorrective = correctiveCheck.ok && Array.isArray(correctiveCheck.data) && correctiveCheck.data.length > 0;
      if (hasPersonnel || hasMachinery || hasCorrective) {
        const transferToId = String(body?.transferToContractorId || "").trim();
        const forceUnassign = body?.forceUnassign === true;
        if (!transferToId && !forceUnassign) {
          const parts = [];
          if (hasPersonnel) parts.push("پرسنل");
          if (hasMachinery) parts.push("ماشین‌آلات");
          if (hasCorrective) parts.push("اقدام اصلاحی");
          return json({
            error: `این حساب هنوز به رکوردهایی در ${parts.join("، ")} وصل است — این رکوردها را به پروژه‌ی دیگری در همان شرکت منتقل کنید تا حذف ادامه یابد.`,
            needsTransfer: true,
          }, 409);
        }
        if (transferToId) {
          if (transferToId === targetId) return json({ error: "مقصدِ انتقال نمی‌تواند همان حسابِ حذف‌شونده باشد" }, 400);
          const destRes = await restFetch(`contractors?id=eq.${transferToId}&company_id=eq.${companyId}&select=id,name`);
          const dest = destRes.ok && Array.isArray(destRes.data) ? destRes.data[0] : null;
          if (!dest) return json({ error: "مقصدِ انتقال در این شرکت پیدا نشد" }, 404);
          const [pRes, mRes, cRes] = await Promise.all([
            hasPersonnel ? restFetch(`personnel?contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ contractor_id: transferToId, contractor_name: dest.name }) }) : Promise.resolve({ ok: true }),
            hasMachinery ? restFetch(`machinery?contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ contractor_id: transferToId, contractor_name: dest.name }) }) : Promise.resolve({ ok: true }),
            hasCorrective ? restFetch(`corrective_actions?responsible_contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ responsible_contractor_id: transferToId, responsible_contractor_name: dest.name }) }) : Promise.resolve({ ok: true }),
          ]);
          if (!pRes.ok || !mRes.ok || !cRes.ok) return json({ error: "خطا در انتقالِ رکوردها" }, 500);
          await logAudit({ action: "transfer_contractor_records", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote(`انتقالِ رکوردها به «${dest.name}» پیش از حذف`) });
        } else {
          const [pRes, mRes, cRes] = await Promise.all([
            hasPersonnel ? restFetch(`personnel?contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ contractor_id: null, contractor_name: null }) }) : Promise.resolve({ ok: true }),
            hasMachinery ? restFetch(`machinery?contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ contractor_id: null, contractor_name: null }) }) : Promise.resolve({ ok: true }),
            hasCorrective ? restFetch(`corrective_actions?responsible_contractor_id=eq.${targetId}`, { method: "PATCH", body: JSON.stringify({ responsible_contractor_id: null, responsible_contractor_name: null }) }) : Promise.resolve({ ok: true }),
          ]);
          if (!pRes.ok || !mRes.ok || !cRes.ok) return json({ error: "خطا در آزادسازیِ رکوردها" }, 500);
          await logAudit({ action: "unassign_contractor_records", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote("آزادسازیِ رکوردها پیش از حذف") });
        }
      }

      const deleted = await restFetch(`contractors?id=eq.${targetId}&company_id=eq.${companyId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (!deleted.ok) return json({ error: "خطا در حذف حساب" }, 500);
      await logAudit({ action: "delete_account", target_type: "contractor", target_id: targetId, performed_by: performedBy, performed_by_role: "hse_supervisor", note: auditNote("حذف حساب HSE پروژه") });
      return json({ ok: true });
    }

    return json({ error: "action نامعتبر است" }, 400);
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
