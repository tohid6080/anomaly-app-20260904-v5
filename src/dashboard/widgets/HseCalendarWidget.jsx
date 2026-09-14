import React, { useState, useEffect, useCallback } from "react";
import { CalendarClock, FileText, Truck, HeartPulse, ListChecks } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { toJalaliSafe } from "../../personnel/jalaliDate.jsx";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, WidgetError } from "./primitives.jsx";
import { loadHseCalendarEvents } from "./hseCalendarApi.js";

const KIND_ICON = { permit: FileText, machinery: Truck, personnel: HeartPulse, pssr: ListChecks };

/**
 * ویجت «تقویم یکپارچهٔ HSE» — یک فهرستِ زمانیِ واحد از سررسیدهای واقعیِ
 * موجود در سامانه (انقضای مجوز کار، بیمه/بازرسیِ ماشین‌آلات، معایناتِ
 * شغلیِ پرسنل، اقداماتِ باز PSSR)، دسته‌بندی‌شده بر اساسِ فوریت. داده از
 * hseCalendarApi.js می‌آید — هیچ جدول/ستونِ جدیدی در دیتابیس لازم نبود.
 */
function Chip({ overdue, daysUntil }) {
  const { t } = useLanguage();
  if (overdue) {
    return <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", background: THEME.dangerBg, color: THEME.danger, fontFamily: THEME.font }}>{t("hcalOverdue", { n: Math.abs(daysUntil) })}</span>;
  }
  if (daysUntil <= 1) {
    return <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", background: THEME.warnBg, color: THEME.warn, fontFamily: THEME.font }}>{daysUntil === 0 ? t("hcalToday") : t("hcalTomorrow")}</span>;
  }
  return <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", background: THEME.surface2, color: THEME.text3, fontFamily: THEME.font }}>{t("hcalInDays", { n: daysUntil })}</span>;
}

function bucketize(events) {
  const overdue = events.filter((e) => e.daysUntil < 0);
  const soon = events.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 7);
  const month = events.filter((e) => e.daysUntil > 7 && e.daysUntil <= 30);
  const later = events.filter((e) => e.daysUntil > 30);
  return [
    { key: "overdue", labelKey: "hcalGroupOverdue", rows: overdue },
    { key: "soon", labelKey: "hcalGroupSoon", rows: soon },
    { key: "month", labelKey: "hcalGroupMonth", rows: month },
    { key: "later", labelKey: "hcalGroupLater", rows: later },
  ].filter((g) => g.rows.length > 0);
}

export default function HseCalendarWidget({ role, currentUser, onNavigate }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadHseCalendarEvents({ role, currentUser })
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [role, currentUser]);

  useEffect(() => { load(); }, [load]);

  const groups = state.status === "ok" ? bucketize(state.data.events) : [];
  const tools = state.status === "ok" && state.data.overdueCount > 0
    ? <span style={{ fontSize: 8.5, fontWeight: 700, color: THEME.danger, fontFamily: THEME.font }}>{t("hcalOverdueBadge", { n: state.data.overdueCount })}</span>
    : null;

  return (
    <WidgetCard title={t("hcalTitle")} icon={CalendarClock} tools={tools}>
      {state.status === "loading" && <WidgetSkeleton rows={4} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && state.data.events.length === 0 && <WidgetEmpty good text={t("hcalEmptyAll")} />}
      {state.status === "ok" && state.data.events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {groups.map((g) => (
            <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text2 }}>{t(g.labelKey, { n: g.rows.length })}</div>
              {g.rows.slice(0, 5).map((e) => {
                const Icon = KIND_ICON[e.kind] || CalendarClock;
                return (
                  <button
                    key={e.id} type="button"
                    onClick={() => onNavigate && onNavigate(e.nav)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8,
                      background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, cursor: "pointer", width: "100%",
                      textAlign: "start", fontFamily: THEME.font,
                    }}
                  >
                    <Icon size={13} color={THEME.text3} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: THEME.heading, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                    <span style={{ fontSize: 9, color: THEME.text3, flexShrink: 0 }}>{toJalaliSafe(e.date)}</span>
                    <Chip overdue={e.daysUntil < 0} daysUntil={e.daysUntil} />
                  </button>
                );
              })}
              {g.rows.length > 5 && (
                <div style={{ fontSize: 9.5, color: THEME.text3, padding: "2px 2px" }}>{t("hcalMoreInGroup", { n: g.rows.length - 5 })}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
