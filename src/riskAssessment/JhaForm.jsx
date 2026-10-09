import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Plus, Trash2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadJhaAssessmentById, loadJhaSteps, addJhaStep, deleteJhaStep } from "./jhaApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const RISK_LEVELS = ["کم", "متوسط", "بالا", "بسیار بالا"];

function emptyStep() {
  return { stepDescription: "", hazards: "", existingControls: "", riskLevel: RISK_LEVELS[0], additionalControls: "", responsible: "" };
}

export default function JhaForm({ jhaId, currentUser, readOnly, onBack }) {
  const { t, dir } = useLanguage();
  const [jha, setJha] = useState(undefined);
  const [steps, setSteps] = useState([]);
  const [draft, setDraft] = useState(emptyStep());
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [j, s] = await Promise.all([loadJhaAssessmentById(jhaId), loadJhaSteps(jhaId)]);
    setJha(j);
    setSteps(s);
  };
  useEffect(() => { load(); }, [jhaId]);

  if (jha === undefined) return <p style={{ color: THEME.text3, textAlign: "center", padding: 40 }}>{t("commonLoading")}</p>;
  if (!jha) return <p style={{ color: THEME.danger, textAlign: "center", padding: 40 }}>{t("jhaNotFound")}</p>;

  const handleAddStep = async () => {
    if (!draft.stepDescription.trim() || !draft.hazards.trim()) { setError(t("jhaErrStepRequired")); return; }
    setSaving(true);
    setError("");
    const result = await addJhaStep(jhaId, { ...draft, seq: steps.length });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDraft(emptyStep());
    setShowAdd(false);
    await load();
  };

  const handleDeleteStep = async (id) => {
    if (!confirm(t("jhaDeleteStepConfirm"))) return;
    await deleteJhaStep(id);
    await load();
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      <BackLink onClick={onBack}>{t("commonBackPlain")}</BackLink>
      <h2 style={{ fontSize: 18, color: THEME.heading, fontWeight: 800, margin: "0 0 4px" }}>{jha.title}</h2>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 18 }}>{jha.workActivity} {jha.contractorName ? `— ${jha.contractorName}` : ""}</p>

      {steps.map((s, idx) => (
        <div key={s.id} style={{ ...styles.card, width: "auto", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: THEME.text3, marginBottom: 4 }}>{t("jhaStepNo", { n: idx + 1 })}</div>
              <div style={{ fontWeight: 700, color: THEME.heading, fontSize: 13, marginBottom: 6 }}>{s.stepDescription}</div>
              <div style={{ fontSize: 12, color: THEME.text, marginBottom: 4 }}><b>{t("jhaFieldHazards")}:</b> {s.hazards}</div>
              {s.existingControls && <div style={{ fontSize: 12, color: THEME.text2, marginBottom: 4 }}><b>{t("jhaFieldExistingControls")}:</b> {s.existingControls}</div>}
              {s.riskLevel && <span style={{ ...styles.badge, color: THEME.warn, background: THEME.warnBg }}>{s.riskLevel}</span>}
              {s.additionalControls && <div style={{ fontSize: 12, color: THEME.text2, marginTop: 6 }}><b>{t("jhaFieldAdditionalControls")}:</b> {s.additionalControls}</div>}
              {s.responsible && <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 4 }}>{t("jhaFieldResponsible")}: {s.responsible}</div>}
            </div>
            {!readOnly && (
              <button type="button" onClick={() => handleDeleteStep(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Trash2 size={14} color={THEME.danger} />
              </button>
            )}
          </div>
        </div>
      ))}

      {steps.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("jhaNoStepsYet")}</p>}

      {!readOnly && !showAdd && (
        <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => setShowAdd(true)}>
          <Plus size={15} /> {t("jhaAddStepBtn")}
        </button>
      )}

      {!readOnly && showAdd && (
        <div style={{ ...styles.card, width: "auto" }}>
          <div style={styles.formGrid}>
            <textarea style={{ ...styles.input, minHeight: 50 }} placeholder={t("jhaFieldStepDescription")} value={draft.stepDescription} onChange={(e) => setDraft({ ...draft, stepDescription: e.target.value })} dir={dir} />
            <textarea style={{ ...styles.input, minHeight: 50 }} placeholder={t("jhaFieldHazards")} value={draft.hazards} onChange={(e) => setDraft({ ...draft, hazards: e.target.value })} dir={dir} />
            <textarea style={{ ...styles.input, minHeight: 50 }} placeholder={t("jhaFieldExistingControls")} value={draft.existingControls} onChange={(e) => setDraft({ ...draft, existingControls: e.target.value })} dir={dir} />
            <select style={styles.input} value={draft.riskLevel} onChange={(e) => setDraft({ ...draft, riskLevel: e.target.value })} dir={dir}>
              {RISK_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
            <textarea style={{ ...styles.input, minHeight: 50 }} placeholder={t("jhaFieldAdditionalControls")} value={draft.additionalControls} onChange={(e) => setDraft({ ...draft, additionalControls: e.target.value })} dir={dir} />
            <input style={styles.input} placeholder={t("jhaFieldResponsible")} value={draft.responsible} onChange={(e) => setDraft({ ...draft, responsible: e.target.value })} dir={dir} />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={styles.button} onClick={handleAddStep} disabled={saving}>{saving ? t("saSubmittingEllipsis") : t("commonSave")}</button>
            <button type="button" style={{ ...styles.button, background: THEME.text3 }} onClick={() => { setShowAdd(false); setDraft(emptyStep()); }}>{t("commonCancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
