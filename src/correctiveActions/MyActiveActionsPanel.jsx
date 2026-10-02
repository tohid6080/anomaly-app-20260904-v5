import React, { useState, useEffect } from "react";
import { CheckCircle2, ThumbsUp, ThumbsDown, ListChecks } from "lucide-react";
import { THEME, useOrgStructureType } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import {
  loadMyActiveCorrectiveActions, loadPendingReviewCorrectiveActions,
  updateCorrectiveAction, approveCorrectiveAction, rejectCorrectiveAction,
  isOverdue, STATUS_META,
} from "./correctiveActionsApi.js";
import { loadHomeKpiSummary } from "../dashboard/homeKpiApi.js";

// پنلِ «کارهایِ در دستِ اقدام» — فقط برایِ شرکت‌هایِ «مستقل/بدون پروژه» و
// «مستقل/چند پروژه» (EmployerDashboard از قبل isStandaloneCompany را
// بررسی کرده و فقط در آن حالت این کامپوننت را mount می‌کند). طبقِ خواستهٔ
// صریح: فقط اقدام‌هایِ واقعاً «در دستِ اقدام» (باز/درحال‌انجام/منتظرِ
// تأیید) این‌جا دیده می‌شوند — نه موارد «بسته‌شده»/تکمیل‌شده؛ آن‌ها
// دیگر نیازی به توجه ندارند و باید در صفحه‌یِ اصلیِ اقدام‌هایِ اصلاحی
// دیده شوند، نه این‌جا.
//
// هیچ جدول/مفهومِ جدیدی اضافه نشده: همان corrective_actions موجود، همان
// گردش‌کار/وضعیت‌هایِ موجود (STATUS_META)، همان approveCorrectiveAction
// موجود — فقط یک نمایِ گروه‌بندی‌شده و اقدام‌محورِ تازه رویِ همان داده.
export default function MyActiveActionsPanel({ currentUser, onOpenModule }) {
  const { t, dir } = useLanguage();
  const orgStructureType = useOrgStructureType(currentUser?.companyId);
  const isStandaloneCompany = orgStructureType === "standalone_no_project" || orgStructureType === "standalone_multi_project";
  const isSupervisor = currentUser?.role === "HSE_SUPERVISOR";
  const accountType = currentUser?.role === "CONTRACTOR" ? "contractor" : "employer";
  const [myActions, setMyActions] = useState([]);
  const [pendingReview, setPendingReview] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const [mine, review, kpiSummary] = await Promise.all([
      loadMyActiveCorrectiveActions(accountType, currentUser?.id),
      isSupervisor ? loadPendingReviewCorrectiveActions() : Promise.resolve([]),
      loadHomeKpiSummary().catch(() => null),
    ]);
    setMyActions(mine);
    setPendingReview(review);
    setKpis(kpiSummary);
    setLoading(false);
  };
  // orgStructureType ابتدا "" است (هنوز نیامده) — تا وقتی مشخص نشود این
  // شرکت واقعاً مستقل است، هیچ کوئری‌ای زده نمی‌شود (اکثرِ شرکت‌ها
  // کارفرما/چندپیمانکارند و این پنل اصلاً برایشان دیده نمی‌شود).
  useEffect(() => {
    if (!isStandaloneCompany) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isSupervisor, isStandaloneCompany]);

  const act = async (fn, actionId) => {
    setBusyId(actionId);
    await fn();
    setBusyId(null);
    load();
  };
  const markDone = (a) => act(() => updateCorrectiveAction(a.id, { status: "done_pending_approval", completedAt: new Date().toISOString() }), a.id);
  const approve = (a) => act(() => approveCorrectiveAction(a.id, currentUser?.name || currentUser?.username || ""), a.id);
  const reject = (a) => act(() => rejectCorrectiveAction(a.id, ""), a.id);

  if (!isStandaloneCompany || loading) return null;

  const todayStr = new Date().toDateString();
  const overdue = myActions.filter(isOverdue);
  const dueToday = myActions.filter((a) => !isOverdue(a) && a.dueDate && new Date(a.dueDate).toDateString() === todayStr);
  const otherActive = myActions.filter((a) => !overdue.includes(a) && !dueToday.includes(a));
  const nothingToShow = overdue.length === 0 && dueToday.length === 0 && pendingReview.length === 0 && otherActive.length === 0;

  const Row = ({ a, sevColor, children }) => (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10, background: THEME.surface, border: `1px solid ${THEME.border}`,
        borderInlineStart: `3px solid ${sevColor}`, borderRadius: 10, padding: "9px 11px", marginBottom: 7, flexWrap: "wrap", cursor: onOpenModule ? "pointer" : "default",
      }}
      onClick={() => onOpenModule && onOpenModule()}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading }}>{a.actionNumber ? `${a.actionNumber} — ` : ""}{(a.nonconformanceDescription || a.actionDescription || "—").slice(0, 90)}</div>
        <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {a.dueDate && <span>{t("maapDueLabel")} {toJalaliSafe(a.dueDate)}</span>}
          {isSupervisor && (a.responsibleEmployerAccountName || a.responsibleContractorName) && (
            <span>{t("maapAssigneeLabel")} {a.responsibleEmployerAccountName || a.responsibleContractorName}</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0, background: STATUS_META[a.status]?.bg, color: STATUS_META[a.status]?.color }}>
        {t(STATUS_META[a.status]?.labelKey || "caStatusOpen")}
      </span>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, flexShrink: 0 }}>{children}</div>
    </div>
  );

  const quickBtn = (bg, color, border) => ({ border: `1px solid ${border}`, background: bg, color, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" });

  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: THEME.heading, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 6 }}>
        <ListChecks size={15} color={THEME.teal} /> {isSupervisor ? t("maapTitleSupervisor") : t("maapTitleExpert")}
      </h3>
      <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 12px" }}>{t("maapSubtitle")}</p>

      {nothingToShow ? (
        <p style={{ fontSize: 12, color: THEME.ok, textAlign: "center", padding: "14px 0" }}>{t("maapAllClear")}</p>
      ) : (
        <>
          {overdue.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.danger, marginBottom: 6 }}>{t("maapGroupOverdue")} ({overdue.length})</div>
              {overdue.map((a) => (
                <Row key={a.id} a={a} sevColor={THEME.danger}>
                  <button type="button" style={quickBtn(THEME.teal, "#06231f", THEME.teal)} disabled={busyId === a.id} onClick={() => markDone(a)} title={t("maapMarkDone")}><CheckCircle2 size={12} /></button>
                </Row>
              ))}
            </div>
          )}

          {dueToday.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.warn, marginBottom: 6 }}>{t("maapGroupDueToday")} ({dueToday.length})</div>
              {dueToday.map((a) => (
                <Row key={a.id} a={a} sevColor={THEME.warn}>
                  <button type="button" style={quickBtn(THEME.teal, "#06231f", THEME.teal)} disabled={busyId === a.id} onClick={() => markDone(a)} title={t("maapMarkDone")}><CheckCircle2 size={12} /></button>
                </Row>
              ))}
            </div>
          )}

          {isSupervisor && pendingReview.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308", marginBottom: 6 }}>{t("maapGroupPendingReview")} ({pendingReview.length})</div>
              {pendingReview.map((a) => (
                <Row key={a.id} a={a} sevColor="#eab308">
                  <button type="button" style={quickBtn(THEME.okBg, THEME.ok, THEME.ok)} disabled={busyId === a.id} onClick={() => approve(a)} title={t("maapApprove")}><ThumbsUp size={12} /></button>
                  <button type="button" style={quickBtn(THEME.dangerBg, THEME.danger, THEME.danger)} disabled={busyId === a.id} onClick={() => reject(a)} title={t("maapReject")}><ThumbsDown size={12} /></button>
                </Row>
              ))}
            </div>
          )}

          {otherActive.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text3, marginBottom: 6 }}>{t("maapGroupOther")} ({otherActive.length})</div>
              {otherActive.map((a) => (
                <Row key={a.id} a={a} sevColor={THEME.border}>
                  <button type="button" style={quickBtn(THEME.teal, "#06231f", THEME.teal)} disabled={busyId === a.id} onClick={() => markDone(a)} title={t("maapMarkDone")}><CheckCircle2 size={12} /></button>
                </Row>
              ))}
            </div>
          )}
        </>
      )}

      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${THEME.border}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.heading }}>{kpis.openCorrectiveActions}</div>
            <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOpenActions")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.danger }}>{kpis.overdueCorrectiveActions}</div>
            <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOverdue")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.warn }}>{kpis.openAnomalies}</div>
            <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOpenAnomalies")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#eab308" }}>{kpis.pendingReviewCorrectiveActions}</div>
            <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiPendingReview")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
