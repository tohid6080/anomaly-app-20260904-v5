import React, { useState, useEffect, useCallback } from "react";
import { Flame } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, WidgetError } from "./primitives.jsx";
import { loadContractorRiskHeatmap } from "./contractorRiskHeatmapApi.js";

const LEVEL_COLOR = { High: THEME.danger, Med: THEME.warn, Low: THEME.ok };

/**
 * ویجت «نقشهٔ حرارتیِ ریسکِ پیمانکاران» — هر ردیف یک پیمانکار، یک نوارِ
 * افقیِ سه‌رنگ متناسب با تعدادِ آنومالی‌های بازِ هر سطحِ ریسک (بالا/متوسط/کم)،
 * مرتب‌شده از پرریسک‌ترین به کم‌ریسک‌ترین. فقط کارفرما/سرپرست می‌بیند —
 * برای پیمانکار مقایسه‌ی بین‌پیمانکاری معنا ندارد.
 */
export default function ContractorRiskHeatmapWidget({ role, onNavigate }) {
  const { t } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    if (isContractor) return; // مقایسه‌ی بین‌پیمانکاری فقط برای کارفرما/سرپرست معنا و مجاز دارد
    setState({ status: "loading", data: null });
    loadContractorRiskHeatmap()
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [isContractor]);
  useEffect(() => { load(); }, [load]);

  const contractors = state.status === "ok" ? state.data.contractors : [];
  const maxTotal = Math.max(1, ...contractors.map((c) => c.total));

  if (isContractor) {
    return (
      <WidgetCard title={t("crhTitle")} icon={Flame}>
        <WidgetEmpty text={t("crhContractorNotApplicable")} />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title={t("crhTitle")} icon={Flame}>
      {state.status === "loading" && <WidgetSkeleton rows={5} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && contractors.length === 0 && <WidgetEmpty good text={t("crhEmpty")} />}
      {state.status === "ok" && contractors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, overflowY: "auto" }}>
          {contractors.slice(0, 8).map((c) => (
            <button
              key={c.name} type="button"
              onClick={() => onNavigate && onNavigate({ module: "anomaly", statusFilter: "not_closed", contractorFilter: c.name })}
              style={{ display: "flex", flexDirection: "column", gap: 3, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "start", fontFamily: THEME.font }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: THEME.heading, fontWeight: 600 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <span style={{ color: THEME.text3, flexShrink: 0, fontFamily: THEME.font }}>{t("crhOpenCount", { n: c.total })}</span>
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: THEME.borderSoft }}>
                {["High", "Med", "Low"].map((lvl) => (
                  c[lvl] > 0 ? (
                    <div key={lvl} style={{ width: `${(c[lvl] / maxTotal) * 100}%`, background: LEVEL_COLOR[lvl] }} title={`${lvl}: ${c[lvl]}`} />
                  ) : null
                ))}
              </div>
            </button>
          ))}
          <div style={{ display: "flex", gap: 12, fontSize: 9, color: THEME.text2, marginTop: 2 }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: THEME.danger, marginInlineEnd: 4 }} />{t("riskLevelHigh")}</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: THEME.warn, marginInlineEnd: 4 }} />{t("riskLevelMed")}</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: THEME.ok, marginInlineEnd: 4 }} />{t("riskLevelLow")}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
