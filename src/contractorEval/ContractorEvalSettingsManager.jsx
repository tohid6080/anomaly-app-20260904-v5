import React, { useState, useEffect, useCallback } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Award } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  DEFAULT_CATEGORIES, loadEffectiveCategories, loadEvalConfig, saveEvalConfig,
  saveCategoryWeight, addCustomField, loadCustomFields, loadEvalSettingsAudit,
} from "./contractorEvalApi.js";

const CADENCE_OPTIONS = [
  { value: "monthly", labelKey: "evalCadenceMonthly" },
  { value: "quarterly", labelKey: "evalCadenceQuarterly" },
  { value: "semiannual", labelKey: "evalCadenceSemiannual" },
  { value: "annual", labelKey: "evalCadenceAnnual" },
];

/**
 * زیرماژولِ «تنظیمات ارزیابی پیمانکار» — داخلِ «مدیریت سیستم» (نه SuperAdmin
 * سراسری)، دقیقاً هم‌شکل با DbeeWeightsManager/EffectivenessThresholdsManager
 * موجود. فقط سرپرست HSE (isSupervisor در App.jsx) این صفحه را می‌بیند —
 * طبق همان قاعده‌ی موجودِ کلِ «مدیریت سیستم»، نه یک استثنا برای این ماژول.
 */
export default function ContractorEvalSettingsManager({ onBack, currentUser, wide }) {
  const { t, dir, lang } = useLanguage();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [config, setConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [newField, setNewField] = useState({ categoryKey: "anomaly", labelFa: "", type: "number", coefficient: "" });

  const reload = useCallback(async () => {
    const [cats, cfg, fields, auditRows] = await Promise.all([
      loadEffectiveCategories(), loadEvalConfig(), loadCustomFields(), loadEvalSettingsAudit(20),
    ]);
    setCategories(cats);
    setConfig(cfg);
    setCustomFields(fields);
    setAudit(auditRows);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const weightSum = categories.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  const updateWeight = (key, val) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, weight: val } : c)));
  };

  const handleSaveWeights = async () => {
    setError("");
    if (Math.round(weightSum) !== 100) { setError(t("evalErrWeightsMustBe100")); return; }
    setSaving(true);
    for (const c of categories) {
      await saveCategoryWeight(c.key, Number(c.weight) || 0, currentUser?.name);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    reload();
  };

  const handleSaveConfig = async (patch) => {
    const merged = { ...config, ...patch };
    setConfig(merged);
    await saveEvalConfig(patch, currentUser?.name);
    reload();
  };

  const handleAddField = async () => {
    if (!newField.labelFa.trim()) return;
    await addCustomField(newField.categoryKey, {
      key: `custom-${Date.now()}`, labelFa: newField.labelFa, labelEn: newField.labelFa, labelDe: newField.labelFa,
      type: newField.type, coefficient: Number(newField.coefficient) || 0,
    }, currentUser?.name);
    setNewField({ ...newField, labelFa: "", coefficient: "" });
    reload();
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 640, margin: "0 auto", padding: 24, direction: dir }}>
      {!wide && onBack && <BackLink onClick={onBack}>{t("rkBackToSystemManagement")}</BackLink>}
      {!wide && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Award size={20} color={THEME.teal} />
          <h2 style={{ margin: 0, fontSize: 19, color: THEME.heading, fontWeight: 700 }}>{t("evalSettingsTitle")}</h2>
        </div>
      )}

      {/* دوره‌بندی */}
      <div style={styles.cardWide}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: THEME.heading }}>{t("evalCadenceTitle")}</h3>
        <p style={{ fontSize: 12, color: THEME.text3, marginBottom: 12 }}>{t("evalCadenceDesc")}</p>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("evalCadenceLabel")}</label>
            <select style={styles.input} value={config?.cadence || "quarterly"} onChange={(e) => handleSaveConfig({ cadence: e.target.value })}>
              {CADENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>{t("evalHseDeadlineLabel")}</label>
            <input type="number" style={styles.input} value={config?.hseReviewDeadlineDays ?? 10}
              onChange={(e) => setConfig({ ...config, hseReviewDeadlineDays: Number(e.target.value) })}
              onBlur={(e) => handleSaveConfig({ hseReviewDeadlineDays: Number(e.target.value) })} dir="ltr" />
          </div>
          <div>
            <label style={styles.label}>{t("evalEmployerDeadlineLabel")}</label>
            <input type="number" style={styles.input} value={config?.employerApprovalDeadlineDays ?? 5}
              onChange={(e) => setConfig({ ...config, employerApprovalDeadlineDays: Number(e.target.value) })}
              onBlur={(e) => handleSaveConfig({ employerApprovalDeadlineDays: Number(e.target.value) })} dir="ltr" />
          </div>
        </div>
      </div>

      {/* حد نصاب سطوح عملکرد */}
      <div style={styles.cardWide}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: THEME.heading }}>{t("evalThresholdsTitle")}</h3>
        <p style={{ fontSize: 12, color: THEME.text3, marginBottom: 12 }}>{t("evalThresholdsDesc")}</p>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("evalThresholdExcellent")}</label>
            <input type="number" style={styles.input} value={config?.excellentMin ?? 85}
              onChange={(e) => setConfig({ ...config, excellentMin: Number(e.target.value) })}
              onBlur={(e) => handleSaveConfig({ excellentMin: Number(e.target.value) })} dir="ltr" />
          </div>
          <div>
            <label style={styles.label}>{t("evalThresholdGood")}</label>
            <input type="number" style={styles.input} value={config?.goodMin ?? 70}
              onChange={(e) => setConfig({ ...config, goodMin: Number(e.target.value) })}
              onBlur={(e) => handleSaveConfig({ goodMin: Number(e.target.value) })} dir="ltr" />
          </div>
          <div>
            <label style={styles.label}>{t("evalThresholdAcceptable")}</label>
            <input type="number" style={styles.input} value={config?.acceptableMin ?? 50}
              onChange={(e) => setConfig({ ...config, acceptableMin: Number(e.target.value) })}
              onBlur={(e) => handleSaveConfig({ acceptableMin: Number(e.target.value) })} dir="ltr" />
          </div>
          <div>
            <label style={styles.label}>{t("evalCalcMethodLabel")}</label>
            <select style={styles.input} value={config?.calcMethod || "redistribute"} onChange={(e) => handleSaveConfig({ calcMethod: e.target.value })}>
              <option value="redistribute">{t("evalCalcMethodRedistribute")}</option>
              <option value="full_score">{t("evalCalcMethodFullScore")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* وزن هر ماژول */}
      <div style={styles.cardWide}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: THEME.heading }}>{t("evalWeightsTitle")}</h3>
        <p style={{ fontSize: 12, color: THEME.text3, marginBottom: 12 }}>{t("evalWeightsDesc")}</p>
        {categories.map((c) => (
          <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.borderSoft}` }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.active ? THEME.text : THEME.text3 }}>
              {c.label[lang] || c.label.fa}{!c.active && ` (${t("evalCategoryInactive")})`}
            </span>
            <input type="range" min={0} max={40} value={c.weight} onChange={(e) => updateWeight(c.key, Number(e.target.value))} style={{ width: 160, accentColor: THEME.teal }} />
            <span style={{ width: 44, textAlign: "center", fontWeight: 700, fontFamily: "monospace" }}>{c.weight}%</span>
          </div>
        ))}
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 9, fontWeight: 700, fontSize: 13,
          background: Math.round(weightSum) === 100 ? THEME.okBg : THEME.dangerBg,
          color: Math.round(weightSum) === 100 ? THEME.ok : THEME.danger,
        }}>
          {t("evalWeightSumLabel", { sum: weightSum })}
        </div>
        {error && <p style={styles.error}>{error}</p>}
        {saved && <p style={{ color: THEME.ok, fontSize: 12.5, marginTop: 8 }}>{t("commonSavedDone")}</p>}
        <button type="button" style={{ ...styles.button, width: "auto", marginTop: 14, padding: "10px 22px" }} onClick={handleSaveWeights} disabled={saving}>
          {saving ? t("saSavingEllipsis") : t("saSaveChanges")}
        </button>
      </div>

      {/* شاخص سفارشی */}
      <div style={styles.cardWide}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: THEME.heading }}>{t("evalCustomFieldTitle")}</h3>
        <p style={{ fontSize: 12, color: THEME.text3, marginBottom: 12 }}>{t("evalCustomFieldDesc")}</p>
        <div style={styles.formGrid}>
          <select style={styles.input} value={newField.categoryKey} onChange={(e) => setNewField({ ...newField, categoryKey: e.target.value })}>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label[lang] || c.label.fa}</option>)}
          </select>
          <input style={styles.input} placeholder={t("evalCustomFieldLabelPh")} value={newField.labelFa} onChange={(e) => setNewField({ ...newField, labelFa: e.target.value })} />
          <input type="number" style={styles.input} placeholder={t("evalCustomFieldCoeffPh")} value={newField.coefficient} onChange={(e) => setNewField({ ...newField, coefficient: e.target.value })} dir="ltr" />
        </div>
        <button type="button" style={{ ...styles.smallButton, marginTop: 10 }} onClick={handleAddField}>{t("evalAddCustomField")}</button>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {customFields.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 10px", background: THEME.surface2, borderRadius: 8 }}>
              <span>{f.label_fa}</span>
              <span style={{ color: THEME.teal, fontWeight: 700 }}>{f.coefficient}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* تاریخچه تغییرات */}
      <div style={styles.cardWide}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: THEME.heading }}>{t("evalAuditTitle")}</h3>
        {audit.length === 0 && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("evalAuditEmpty")}</p>}
        {audit.map((a) => (
          <div key={a.id} style={{ fontSize: 12, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: THEME.text3, minWidth: 130 }}>{new Date(a.changed_at).toLocaleString(lang === "en" ? "en-US" : lang === "de" ? "de-DE" : "fa-IR")}</span>
            <span style={{ color: THEME.text3 }}>{a.changed_by || "—"}</span>
            <span style={{ flex: 1 }}>{a.field_changed}</span>
            <span style={{ color: THEME.text3 }}>{a.old_value}</span>
            <span>→</span>
            <span style={{ fontWeight: 700 }}>{a.new_value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
