import React from "react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const LEVEL_META = {
  "پایین": { color: "#c92a2a", bg: "#fdecec", labelKey: "hseLevelLow" },
  "متوسط": { color: "#b45309", bg: "#fef3c7", labelKey: "hseLevelMedium" },
  "بالا": { color: "#166534", bg: "#dcfce7", labelKey: "hseLevelHigh" },
};

const cardStyle = { background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 16 };

// نمایش امتیاز ۹ بعد (هرکدام ۰..۱۰) و امتیاز کل (۰..۹۰) — بدون هیچ کتابخانه‌ی
// نموداری، فقط CSS، دقیقاً هم‌راستا با بقیه‌ی پروژه که وابستگی سنگین ندارد.
export default function DimensionResultView({ result }) {
  const { t, lang } = useLanguage();
  if (!result) return null;
  const totalMeta = LEVEL_META[result.level] || LEVEL_META["متوسط"];
  // عنوان بعد یا رشته‌ی ساده است (رکوردهای قدیمی) یا شیء {fa, en} (رکوردهای جدید)
  const dimTitle = (title) => (typeof title === "object" && title !== null ? (title[lang] || title.fa) : title);

  return (
    <div>
      <div style={{ ...cardStyle, textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 4 }}>{t("hseTotalScoreOf90")}</p>
        <div style={{ fontSize: 40, fontWeight: 800, color: THEME.teal }}>{result.totalScore}</div>
        <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 999, background: totalMeta.bg, color: totalMeta.color, fontWeight: 700 }}>
          {t("hseOverallLevel", { level: t(totalMeta.labelKey) })}
        </span>
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: THEME.navy, marginBottom: 10 }}>{t("hseDimensionScoreOf10")}</p>
      {result.dimensions.map((d) => {
        const meta = LEVEL_META[d.level] || LEVEL_META["متوسط"];
        const pct = Math.min(100, (d.score / 10) * 100);
        return (
          <div key={d.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: THEME.text2 }}>{dimTitle(d.title)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{d.score} — {t(meta.labelKey)}</span>
            </div>
            <div style={{ height: 8, background: "#eef1f5", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: meta.color, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
