import React, { useState, useEffect } from "react";
import { Sliders, HelpCircle } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadCompanyWeights, saveCompanyWeight, factorLabel } from "./dbeeWeightsApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// راهنمای هر عامل — متنِ توضیحات در translations.js با کلیدهای
// dbeeGuide* نگهداری می‌شود؛ اینجا فقط نگاشت factorKey → کلیدِ ترجمه.
const FACTOR_GUIDE_KEYS = {
  frequency: "dbeeGuideFrequency", severity: "dbeeGuideSeverity", recurrence: "dbeeGuideRecurrence", criticality: "dbeeGuideCriticality", recency: "dbeeGuideRecency",
  source_anomaly: "dbeeGuideSrcAnomaly", source_capa: "dbeeGuideSrcCapa", source_incident: "dbeeGuideSrcIncident", source_tripod: "dbeeGuideSrcTripod", source_sbs: "dbeeGuideSrcSbs", source_hse_climate: "dbeeGuideSrcHseClimate", source_accident_proneness: "dbeeGuideSrcAccidentProneness",
};

const FACTOR_GROUPS = [
  { titleKey: "dbeeWmGroupMain", keys: ["frequency", "severity", "recurrence", "criticality", "recency"] },
  { titleKey: "dbeeWmGroupSources", keys: ["source_anomaly", "source_capa", "source_incident", "source_tripod", "source_sbs", "source_hse_climate", "source_accident_proneness"] },
];

/**
 * مدیریت Weight های DBEE — طبق خواسته‌ی صریح، هم Admin هم Employer
 * (کارفرما/سرپرست یا مدیر HSE) همان شرکت این صفحه را می‌بینند/ویرایش
 * می‌کنند (نه فقط Admin، و نه سوپرادمین). این خودِ الزام فنی «امتیاز
 * محاسباتی دستی قابل‌تغییر نباشد» را تضمین می‌کند: اینجا فقط ضریب هر
 * عامل تنظیم می‌شود (۰ تا ۲)، هرگز عدد نهایی هیچ Barrier ای.
 */
export default function DbeeWeightsManager({ currentUser, onBack }) {
  const { t } = useLanguage();
  const [weights, setWeights] = useState(null);
  const [saving, setSaving] = useState(null); // id در حال ذخیره
  const [message, setMessage] = useState("");
  const [openGuide, setOpenGuide] = useState(null); // کلید عاملی که راهنمایش باز است

  const load = () => loadCompanyWeights().then(setWeights);
  useEffect(() => { load(); }, []);

  const handleChange = async (id, value) => {
    setMessage("");
    const w = Number(value);
    if (Number.isNaN(w) || w < 0 || w > 2) return;
    setWeights((prev) => prev.map((x) => (x.id === id ? { ...x, weight: w } : x)));
    setSaving(id);
    const result = await saveCompanyWeight(id, w, currentUser?.name);
    setSaving(null);
    if (result?.__error) { setMessage(result.message); await load(); }
  };

  if (!weights) return <p style={{ color: THEME.text3, textAlign: "center", padding: 40 }}>{t("dbeeWmLoading")}</p>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>}
      <h2 style={{ fontSize: 18, color: THEME.navy, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
        <Sliders size={20} color={THEME.teal} /> {t("dbeeWmTitle")}
      </h2>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 18, lineHeight: 1.9 }}>
        {t("dbeeWmIntro")}
        {" "}{t("dbeeWmGuideHint")} <HelpCircle size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {t("dbeeWmGuideHint2")}
      </p>
      {message && <p style={styles.error}>{message}</p>}

      {FACTOR_GROUPS.map((group) => (
        <div key={group.title} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 12px" }}>{t(group.titleKey)}</h4>
          {group.keys.map((key) => {
            const w = weights.find((x) => x.factorKey === key);
            if (!w) return null;
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <label style={{ fontSize: 12.5, color: THEME.text2, fontWeight: 600 }}>{factorLabel(key)}</label>
                    <button
                      type="button" onClick={() => setOpenGuide(openGuide === key ? null : key)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      title={t("dbeeWmFactorGuideTitle")}
                    >
                      <HelpCircle size={13} color={openGuide === key ? THEME.teal : THEME.text3} />
                    </button>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.navy }}>{w.weight.toFixed(1)}×</span>
                </div>
                {openGuide === key && (
                  <p style={{ fontSize: 11.5, color: THEME.text2, background: THEME.bg, borderRadius: 8, padding: "8px 10px", margin: "0 0 8px", lineHeight: 1.9 }}>
                    {t(FACTOR_GUIDE_KEYS[key])}
                  </p>
                )}
                <input
                  type="range" min={0} max={2} step={0.1} value={w.weight} dir="ltr"
                  onChange={(e) => handleChange(w.id, e.target.value)}
                  style={{ width: "100%", accentColor: THEME.teal }}
                  disabled={saving === w.id}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
