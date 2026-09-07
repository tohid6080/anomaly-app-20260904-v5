import React, { useState, useEffect, useCallback } from "react";
import { ClipboardCheck } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { toJalaliSafe } from "../../personnel/jalaliDate.jsx";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, WidgetError } from "./primitives.jsx";
import { loadMyTaskQueue } from "./myTaskQueueApi.js";

/**
 * ویجت «کارتابل فوری من» — طرح D-004. سه بخشِ HSE Gate / اقدامات اصلاحیِ من /
 * آنومالی‌های بحرانی، هر ردیف کاربر را مستقیم به همان رکورد می‌بَرد.
 */
function Chip({ chip }) {
  const { t } = useLanguage();
  if (!chip) return null;
  const map = {
    overdue: { bg: THEME.dangerBg, fg: THEME.danger, text: t("wtqChipOverdue", { n: chip.days }) },
    due: { bg: THEME.surface2, fg: THEME.text3, text: toJalaliSafe(chip.date) },
    queueAge: { bg: THEME.surface2, fg: THEME.text3, text: t("wtqChipQueueAge", { n: chip.days }) },
    risk: { bg: THEME.dangerBg, fg: THEME.danger, text: t("wtqChipHighRisk") },
  };
  const s = map[chip.type] || map.due;
  return (
    <span style={{ fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", background: s.bg, color: s.fg, fontFamily: THEME.font }}>
      {s.text}
    </span>
  );
}

const actVerb = { gate: "wtqActReview", ca: "wtqActAct", anomaly: "wtqActFollow" };

export default function MyTaskQueueWidget({ role, currentUser, onNavigate }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadMyTaskQueue({ role, currentUser })
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [role, currentUser]);

  useEffect(() => { load(); }, [load]);

  const tools = state.status === "ok" && state.data.overdueTotal > 0
    ? <span style={{ fontSize: 8.5, fontWeight: 700, color: THEME.danger, fontFamily: THEME.font }}>{t("wtqOverdueBadge", { n: state.data.overdueTotal })}</span>
    : null;

  return (
    <WidgetCard title={t("wtqTitle")} icon={ClipboardCheck} tools={tools} style={{ gridColumn: "span 2" }}>
      {state.status === "loading" && <WidgetSkeleton rows={4} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && state.data.total === 0 && (
        <WidgetEmpty good text={t("wtqEmptyAll")} />
      )}
      {state.status === "ok" && state.data.total > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {state.data.errors.gate || state.data.errors.ca || state.data.errors.anomaly ? (
            <div style={{ fontSize: 9, color: THEME.warn, background: THEME.warnBg, borderRadius: 6, padding: "4px 8px" }}>
              {t("wtqPartialError", { group: "" })}
              <button type="button" onClick={load} style={{ marginInlineStart: 6, fontWeight: 700, color: THEME.tealDeep, background: "none", border: "none", cursor: "pointer", fontFamily: THEME.font }}>{t("wtqRetry")}</button>
            </div>
          ) : null}

          {state.data.groups.map((g) => (
            <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text2, display: "flex", alignItems: "center", gap: 6 }}>
                {t(g.labelKey)}
                <span style={{ fontFamily: THEME.font, fontSize: 8.5, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: g.overdueCount > 0 ? THEME.dangerBg : THEME.surface2, color: g.overdueCount > 0 ? THEME.danger : THEME.text3 }}>
                  {g.overdueCount > 0 ? t("wtqOverdueBadge", { n: g.overdueCount }) : g.total}
                </span>
              </div>
              {g.rows.length === 0 && <div style={{ fontSize: 9, color: THEME.text3 }}>{t("wtqGroupEmpty")}</div>}
              {g.rows.map((row) => (
                <button
                  key={row.id} type="button"
                  onClick={() => onNavigate && onNavigate(row.nav)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8,
                    background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, cursor: "pointer", width: "100%",
                    textAlign: "start", fontFamily: THEME.font,
                  }}
                >
                  <span style={{ fontFamily: THEME.font, fontSize: 9, color: THEME.text3, minWidth: 78, flexShrink: 0 }}>{row.code}</span>
                  <span style={{ fontSize: 11, color: THEME.navy, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</span>
                  <Chip chip={row.chip} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: THEME.tealDeep, flexShrink: 0 }}>{t(actVerb[row.kind])} ›</span>
                </button>
              ))}
              {g.total > g.rows.length && (
                <button
                  type="button" onClick={() => onNavigate && onNavigate(g.rows[0]?.nav ? { module: g.rows[0].nav.module } : {})}
                  style={{ fontSize: 9.5, fontWeight: 700, color: THEME.tealDeep, background: "none", border: "none", cursor: "pointer", textAlign: "start", fontFamily: THEME.font, padding: "2px 0" }}
                >
                  {t("wtqSeeAll", { n: g.total })} ›
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
