import React, { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { HSE_CLIMATE_QUESTIONS, HSE_CLIMATE_OPTIONS } from "./hseClimateData.js";
import { submitHseClimateAssessment } from "./proactiveIndicatorsApi.js";
import DimensionResultView from "./DimensionResultView.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function HseClimateAssessmentForm({ currentUser, onBack, onSaved }) {
  const { t, dir, lang } = useLanguage();
  const [answers, setAnswers] = useState({});
  const [assessorName, setAssessorName] = useState(currentUser?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const unanswered = HSE_CLIMATE_QUESTIONS.filter((q) => !answers[q.id]);

  const handleSubmit = async () => {
    setError("");
    if (!assessorName.trim()) { setError(t("errAssessorNameRequired")); return; }
    if (unanswered.length > 0) {
      setError(t("errAllQuestionsRequiredFrom", { count: unanswered.length, num: unanswered[0].id }));
      return;
    }
    setSaving(true);
    const res = await submitHseClimateAssessment(answers, assessorName.trim(), currentUser?.name);
    setSaving(false);
    if (res?.__error) { setError(res.message); return; }
    setResult(res.result);
  };

  if (result) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, direction: dir }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <CheckCircle2 size={40} color="#166534" style={{ marginBottom: 8 }} />
          <h3 style={{ color: THEME.navy, marginBottom: 4 }}>{t("hseAssessmentSubmitted")}</h3>
        </div>
        <DimensionResultView result={result} />
        <button type="button" style={{ ...styles.button, marginTop: 16 }} onClick={onSaved}>{t("commonBack")}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, direction: dir }}>
      <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>
      <h3 style={{ marginBottom: 4, color: THEME.navy }}>{t("hseSurveyTitle")}</h3>
      <p style={{ color: THEME.text3, fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        {t("hseFormDesc", { count: HSE_CLIMATE_QUESTIONS.length })}
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>{t("hseAssessorName")}</label>
        <input style={styles.input} value={assessorName} onChange={(e) => setAssessorName(e.target.value)} dir={dir} />
      </div>

      {HSE_CLIMATE_QUESTIONS.map((q) => (
        <div key={q.id} style={{ ...styles.card, width: "auto", marginBottom: 10, border: !answers[q.id] ? `1.5px solid ${THEME.border}` : `1.5px solid ${THEME.teal}` }}>
          <p style={{ fontSize: 13, color: THEME.navy, fontWeight: 600, marginBottom: 10, lineHeight: 1.8 }}>
            {q.id}. {q.text[lang] || q.text.fa}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HSE_CLIMATE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                  background: answers[q.id] === opt.value ? THEME.teal : THEME.bg,
                  color: answers[q.id] === opt.value ? "#fff" : THEME.text2,
                  border: `1px solid ${answers[q.id] === opt.value ? THEME.teal : THEME.border}`,
                }}
              >
                <input type="radio" name={`hse-climate-${q.id}`} checked={answers[q.id] === opt.value} onChange={() => handleAnswer(q.id, opt.value)} style={{ display: "none" }} />
                {opt.label[lang] || opt.label.fa}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <AlertTriangle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "#92400e", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ position: "sticky", bottom: 0, background: THEME.surface, padding: "12px 0", borderTop: `1px solid ${THEME.border}` }}>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 8 }}>
          {t("hseAnsweredCount", { answered: HSE_CLIMATE_QUESTIONS.length - unanswered.length, total: HSE_CLIMATE_QUESTIONS.length })}
        </p>
        <button type="button" style={styles.button} onClick={handleSubmit} disabled={saving}>
          {saving ? t("trainingSubmitting") : t("hseSubmitFinalAssessment")}
        </button>
      </div>
    </div>
  );
}
