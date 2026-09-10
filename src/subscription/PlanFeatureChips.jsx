import React from "react";
import { CheckCircle2 } from "lucide-react";
import { THEME } from "../shared.js";
import { PLAN_FEATURES } from "../planFeatureCatalog.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { numLocale } from "../i18n/translations.js";

/* ماژول‌ها و امکاناتِ یک پلن — درختِ PLAN_FEATURES را با آرایه‌ی features پلن
 * تلاقی می‌دهد و سرِ ماژول‌های اصلیِ فعال را چیپ‌وار نشان می‌دهد؛ زیرماژول‌ها فقط
 * شمرده می‌شوند (نه فهرست). هم در صفحه‌ی خریدِ داخل اپ و هم در نمای عمومیِ
 * پلن‌ها استفاده می‌شود. */
export function planIncludedModules(features) {
  const set = new Set(Array.isArray(features) ? features : []);
  return PLAN_FEATURES
    .filter((m) => set.has(m.key))
    .map((m) => ({
      key: m.key,
      labelKey: m.labelKey,
      subCount: (m.sub || []).filter((s) => set.has(s.key)).length,
      subTotal: (m.sub || []).length,
    }));
}

export default function PlanFeatureChips({ features }) {
  const { t, lang } = useLanguage();
  const mods = planIncludedModules(features);
  if (!mods.length) return <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 0" }}>{t("sgPlanIncludesNone")}</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {mods.map((m) => (
        <span key={m.key} style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: THEME.tealSoft, color: THEME.tealDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CheckCircle2 size={11} />
          {t(m.labelKey)}
          {m.subTotal > 0 && m.subCount > 0 && <span style={{ opacity: 0.7 }}>({m.subCount.toLocaleString(numLocale(lang))})</span>}
        </span>
      ))}
    </div>
  );
}
