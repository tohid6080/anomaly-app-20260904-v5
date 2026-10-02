// supabase/functions/set-permit-substitute/index.ts
//
// دروازه‌ی امنِ تعیینِ «جانشینِ تأییدِ مجوزِ کار» — فقط برایِ خودِ سرپرست،
// فقط برایِ شرکت‌هایِ «مستقل/بدونِ پروژه». دقیقاً همان الگویِ امنیتیِ
// manage-project-hse: company_id/role از خودِ توکنِ caller خوانده می‌شود،
// هرگز از بدنه‌ی کلاینت؛ manage-account دست‌نخورده می‌ماند.
//
// Deploy:
//   supabase functions deploy set-permit-substitute

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

async function logAudit(entry: Record<string, unknown>) {
  await restFetch("admin_audit_log", { method: "POST", body: JSON.stringify([entry]), headers: { Prefer: "return=minimal" } }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims || claims.app_role !== "hse_supervisor" || !claims.company_id) {
    return json({ error: "دسترسی غیرمجاز — این عملیات فقط برای سرپرستِ HSE همان شرکت مجاز است." }, 403);
  }
  const companyId = String(claims.company_id);
  const supervisorId = String(claims.sub || "");
  const performedBy = String(claims.username || "hse_supervisor");
  if (!supervisorId) return json({ error: "شناسه‌ی حسابِ سرپرست در نشست معتبر نیست." }, 400);

  const companyCheck = await restFetch(`companies?id=eq.${companyId}&select=org_structure_type`);
  const companyRow = companyCheck.ok && Array.isArray(companyCheck.data) ? companyCheck.data[0] : null;
  if (!companyRow || companyRow.org_structure_type !== "standalone_no_project") {
    return json({ error: "این عملیات فقط برای شرکت‌های مستقل/بدون پروژه مجاز است." }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const substituteId = body?.substituteAccountId ? String(body.substituteAccountId) : null;

  if (substituteId) {
    if (substituteId === supervisorId) {
      return json({ error: "جانشین نمی‌تواند خودِ شما باشید." }, 400);
    }
    const targetCheck = await restFetch(`employer_accounts?id=eq.${substituteId}&company_id=eq.${companyId}&select=id`);
    const belongs = targetCheck.ok && Array.isArray(targetCheck.data) && targetCheck.data.length > 0;
    if (!belongs) return json({ error: "این حساب به شرکتِ شما تعلق ندارد یا پیدا نشد." }, 404);
  }

  const updated = await restFetch(`employer_accounts?id=eq.${supervisorId}&company_id=eq.${companyId}`, {
    method: "PATCH",
    body: JSON.stringify({ permit_substitute_approver_id: substituteId }),
  });
  if (!updated.ok) return json({ error: "خطا در ذخیره‌ی جانشین" }, 500);

  await logAudit({
    action: substituteId ? "set_permit_substitute" : "clear_permit_substitute",
    target_type: "employer", target_id: supervisorId, performed_by: performedBy, performed_by_role: "hse_supervisor",
    note: substituteId ? `تعیینِ جانشینِ تأییدِ مجوز — ${substituteId}` : "حذفِ جانشینِ تأییدِ مجوز",
  });
  return json({ ok: true });
});
