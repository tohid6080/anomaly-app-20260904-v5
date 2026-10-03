// supabase/functions/_shared/companySafetyAggregates.ts
//
// منطقِ مشترکِ «چه‌آماری‌هایِ امن است نشان داده شود» — بینِ مایکروسایتِ
// عمومیِ ایمنیِ شرکت (public-safety-microsite-info) و حالتِ بازرسِ مهمان
// (guest-auditor-info) مشترک است، تا این تصمیم فقط یک‌بار تعریف شود، نه دوبار
// با ریسکِ ناهم‌خوانی. فقط شمارش/تجمیع برمی‌گرداند — هرگز نامِ شخص/پیمانکار.

import { restFetch } from "./supabaseAdmin.ts";

export async function computeSafetyAggregates(companyId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [anomaliesRes, actionsRes, permitsRes, incidentRes] = await Promise.all([
    restFetch(`anomalies?select=id&company_id=eq.${companyId}&status=neq.Closed`),
    restFetch(`corrective_actions?select=id,status,due_date&company_id=eq.${companyId}&due_date=not.is.null`),
    restFetch(`permits?select=id&company_id=eq.${companyId}&status=eq.active`),
    restFetch(`incidents?select=occurred_at&company_id=eq.${companyId}&order=occurred_at.desc&limit=1`),
  ]);

  const openAnomaliesCount = anomaliesRes.ok && Array.isArray(anomaliesRes.data) ? anomaliesRes.data.length : 0;

  const overdueCorrectiveActionsCount =
    actionsRes.ok && Array.isArray(actionsRes.data)
      ? actionsRes.data.filter((a: any) => a.status !== "closed" && a.status !== "expired" && a.due_date < today).length
      : 0;

  const activePermitsCount = permitsRes.ok && Array.isArray(permitsRes.data) ? permitsRes.data.length : 0;

  const lastIncidentAt = incidentRes.ok && Array.isArray(incidentRes.data) && incidentRes.data.length ? incidentRes.data[0].occurred_at : null;
  const daysSinceLastIncident = lastIncidentAt ? Math.floor((Date.now() - new Date(lastIncidentAt).getTime()) / 86400000) : null;

  return {
    openAnomaliesCount,
    overdueCorrectiveActionsCount,
    activePermitsCount,
    daysSinceLastIncident,
  };
}
