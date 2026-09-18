import React, { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { JalaliDateInput } from "../personnel/jalaliDate.jsx";
import { createPlatformSurvey, updatePlatformSurvey } from "./superAdminApi.js";

// کلیدهای بالادستیِ HSE_MODULES (App.jsx) — همان کلیدها/labelKeyها، نه
// اختراعی؛ import مستقیم از App.jsx نمی‌شود تا وابستگیِ حلقوی پیش نیاید
// (دقیقاً همان دلیلِ وجودِ GATED_MODULE_SUBS در shared.js).
const MODULE_LABEL_KEYS = {
  anomalyReport: "moduleAnomalyReport",
  riskAssessment: "moduleRiskAssessment",
  proactiveIndicators: "moduleProactiveIndicators",
  permitToWork: "modulePermitToWork",
  incidentManagement: "moduleIncidentManagement",
  machineryManagement: "moduleMachinery",
  scaffoldManagement: "moduleScaffold",
};

// هر ماژول فقط Eventهای واقعاً متصل‌شده‌ی خودش را دارد (طبقِ تحقیقِ کد، نه
// فهرستِ فریبنده) — دراپ‌داونِ «رویداد» با انتخابِ «ماژول» فیلتر می‌شود.
// افزودنِ Eventِ بعدی: یک entry اینجا (زیرِ ماژولِ درست) + یک فراخوانیِ
// checkEventSurvey در نقطهٔ اتصالِ جدید. ماژول‌هایی که هنوز هیچ Event
// واقعی‌ای ندارند (pssrManagement، personnelAccess، hseSurvey، ...) عمداً
// در این فهرست نیستند — تا دراپ‌داونِ «ماژول» هیچ‌وقت به یک دراپ‌داونِ
// «رویداد»ِ خالی/گمراه‌کننده ختم نشود.
const EVENTS_BY_MODULE = {
  permitToWork: [
    { value: "permit_closed", labelKey: "psEventPermitClosed" },
  ],
  anomalyReport: [
    { value: "anomaly_closed", labelKey: "psEventAnomalyClosed" },
    { value: "corrective_action_approved", labelKey: "psEventCorrectiveActionApproved" },
  ],
  machineryManagement: [
    { value: "machinery_approved", labelKey: "psEventMachineryApproved" },
  ],
  scaffoldManagement: [
    { value: "scaffold_tag_issued", labelKey: "psEventScaffoldTagIssued" },
    { value: "scaffold_removed", labelKey: "psEventScaffoldRemoved" },
  ],
  incidentManagement: [
    { value: "incident_investigation_approved", labelKey: "psEventIncidentInvestigationApproved" },
  ],
  riskAssessment: [
    { value: "hcms_assessment_approved", labelKey: "psEventHcmsAssessmentApproved" },
  ],
  proactiveIndicators: [
    { value: "accident_proneness_assessment_submitted", labelKey: "psEventAccidentPronenessSubmitted" },
    { value: "hse_climate_assessment_submitted", labelKey: "psEventHseClimateSubmitted" },
  ],
};
const MODULE_OPTIONS = Object.keys(EVENTS_BY_MODULE).map((key) => ({ key, labelKey: MODULE_LABEL_KEYS[key] }));

const QUESTION_TYPES = [
  { value: "single_choice", labelKey: "psQTypeSingleChoice", hasOptions: true },
  { value: "multi_choice", labelKey: "psQTypeMultiChoice", hasOptions: true },
  { value: "text", labelKey: "psQTypeText", hasOptions: false },
  { value: "yes_no", labelKey: "psQTypeYesNo", hasOptions: false },
  { value: "rating", labelKey: "psQTypeRating", hasOptions: false },
  { value: "dropdown", labelKey: "psQTypeDropdown", hasOptions: true },
];

const ROLE_OPTIONS = ["EMPLOYER", "HSE_SUPERVISOR", "CONTRACTOR"];
const ROLE_LABEL_KEYS = { EMPLOYER: "roleLabelEmployer", HSE_SUPERVISOR: "roleLabelHseSupervisor", CONTRACTOR: "roleLabelContractor" };

function newQuestion(order) {
  return { id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: "single_choice", label: "", options: [], required: false, order };
}

function toDateInputValue(iso) {
  return iso ? String(iso).slice(0, 10) : "";
}

/**
 * سازندهٔ نظرسنجی — سؤال‌ها و تنظیماتِ مخصوصِ kind به‌صورتِ پیش‌نویسِ محلی
 * نگه داشته می‌شوند؛ فقط با کلیکِ «ذخیره» یک‌جا نوشته می‌شوند (createPlatformSurvey/
 * updatePlatformSurvey) — طبقِ قراردادِ «local draft, explicit commit» پروژه.
 */
export default function PlatformSurveyBuilder({ kind, survey, currentAdmin, onSaved, onCancel }) {
  const { t, dir } = useLanguage();
  const isNew = !survey;
  const [title, setTitle] = useState(survey?.title || "");
  const [description, setDescription] = useState(survey?.description || "");
  const [questions, setQuestions] = useState(survey?.questions?.length ? survey.questions : []);
  const [triggerModule, setTriggerModule] = useState(survey?.triggerModule || "");
  const [triggerEvent, setTriggerEvent] = useState(survey?.triggerEvent || "");
  const [displayDelaySeconds, setDisplayDelaySeconds] = useState(survey?.displayDelaySeconds ?? 0);
  const [maxDisplayCount, setMaxDisplayCount] = useState(survey?.maxDisplayCount ?? 1);
  const [targetRoles, setTargetRoles] = useState(survey?.targetRoles || []);
  const [startDate, setStartDate] = useState(toDateInputValue(survey?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(survey?.endDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion(prev.length)]);
  const removeQuestion = (id) => setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })));
  const updateQuestion = (id, patch) => setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const moveQuestion = (id, delta) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const swapIdx = idx + delta;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((q, i) => ({ ...q, order: i }));
    });
  };
  const toggleRole = (role) => setTargetRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError(t("psErrTitleRequired")); return; }
    if (questions.length === 0) { setError(t("psErrNeedQuestion")); return; }
    for (const q of questions) {
      if (!q.label.trim()) { setError(t("psErrQuestionLabelRequired")); return; }
      const needsOptions = QUESTION_TYPES.find((qt) => qt.value === q.type)?.hasOptions;
      if (needsOptions && (q.options || []).filter((o) => o.trim()).length < 2) {
        setError(t("psErrOptionsMin2", { label: q.label }));
        return;
      }
    }
    if (kind === "event" && !triggerEvent) { setError(t("psErrEventRequired")); return; }

    const payload = {
      kind, title: title.trim(), description: description.trim(),
      questions: questions.map((q, i) => ({ ...q, order: i, options: (q.options || []).map((o) => o.trim()).filter(Boolean) })),
      triggerModule: kind === "event" ? triggerModule : "",
      triggerEvent: kind === "event" ? triggerEvent : "",
      displayDelaySeconds: kind === "event" ? Number(displayDelaySeconds) || 0 : 0,
      maxDisplayCount: kind === "event" ? Number(maxDisplayCount) || 1 : 1,
      targetRoles: kind !== "public" ? targetRoles : [],
      targetJobPositionIds: [],
      startDate: startDate ? new Date(startDate).toISOString() : "",
      endDate: endDate ? new Date(endDate).toISOString() : "",
      createdBy: currentAdmin?.fullName || currentAdmin?.username || "",
    };

    setSaving(true);
    const result = isNew ? await createPlatformSurvey(payload) : await updatePlatformSurvey(survey.id, payload);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    onSaved();
  };

  return (
    <div dir={dir}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: 0 }}>{isNew ? t("psNewSurvey") : t("commonEdit")}</h3>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.text3, display: "flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
          <X size={15} /> {t("commonCancel")}
        </button>
      </div>

      <div style={styles.formGridWide}>
        <div>
          <label style={styles.label}>{t("psFieldTitle")}</label>
          <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} dir={dir} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={styles.label}>{t("psFieldDescription")}</label>
          <textarea style={{ ...styles.input, minHeight: 60 }} value={description} onChange={(e) => setDescription(e.target.value)} dir={dir} />
        </div>

        {kind === "event" && (
          <>
            <div>
              <label style={styles.label}>{t("psFieldModule")}</label>
              <select style={styles.filterSelect} value={triggerModule} onChange={(e) => { setTriggerModule(e.target.value); setTriggerEvent(""); }} dir={dir}>
                <option value="">{t("psSelectPlaceholder")}</option>
                {MODULE_OPTIONS.map((m) => <option key={m.key} value={m.key}>{t(m.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>{t("psFieldEvent")}</label>
              <select style={styles.filterSelect} value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} dir={dir} disabled={!triggerModule}>
                <option value="">{t("psSelectPlaceholder")}</option>
                {(EVENTS_BY_MODULE[triggerModule] || []).map((ev) => <option key={ev.value} value={ev.value}>{t(ev.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>{t("psFieldDisplayDelay")}</label>
              <input type="number" min="0" style={styles.input} value={displayDelaySeconds} onChange={(e) => setDisplayDelaySeconds(e.target.value)} dir="ltr" />
            </div>
            <div>
              <label style={styles.label}>{t("psFieldMaxDisplayCount")}</label>
              <input type="number" min="1" style={styles.input} value={maxDisplayCount} onChange={(e) => setMaxDisplayCount(e.target.value)} dir="ltr" />
            </div>
          </>
        )}

        {(kind === "welcome" || kind === "event") && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>{t("psFieldTargetRoles")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ROLE_OPTIONS.map((role) => (
                <label key={role} style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "6px 10px", borderRadius: 999, cursor: "pointer",
                  background: targetRoles.includes(role) ? THEME.teal : THEME.bg,
                  color: targetRoles.includes(role) ? "#fff" : THEME.text2,
                  border: `1px solid ${targetRoles.includes(role) ? THEME.teal : THEME.border}`,
                }}>
                  <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => toggleRole(role)} style={{ display: "none" }} />
                  {t(ROLE_LABEL_KEYS[role])}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 6 }}>{t("psTargetRolesHint")}</p>
          </div>
        )}

        <div>
          <label style={styles.label}>{t("psFieldStartDate")}</label>
          <JalaliDateInput value={startDate} onChange={setStartDate} allowEmpty />
        </div>
        <div>
          <label style={styles.label}>{t("psFieldEndDate")}</label>
          <JalaliDateInput value={endDate} onChange={setEndDate} allowEmpty />
        </div>
      </div>

      <div style={{ marginTop: 22, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, margin: 0 }}>{t("psQuestionsTitle")}</h4>
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5 }} onClick={addQuestion}>
          <Plus size={13} /> {t("psAddQuestion")}
        </button>
      </div>

      {questions.length === 0 && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("psNoQuestionsYet")}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {questions.map((q, idx) => (
          <QuestionEditor
            key={q.id} question={q} index={idx} total={questions.length}
            onChange={(patch) => updateQuestion(q.id, patch)}
            onRemove={() => removeQuestion(q.id)}
            onMove={(d) => moveQuestion(q.id, d)}
            t={t} dir={dir}
          />
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, maxWidth: 220 }} onClick={handleSubmit} disabled={saving}>
        <Save size={15} /> {saving ? t("commonSaving") : t("commonSave")}
      </button>
    </div>
  );
}

function QuestionEditor({ question, index, total, onChange, onRemove, onMove, t, dir }) {
  const typeInfo = QUESTION_TYPES.find((qt) => qt.value === question.type) || QUESTION_TYPES[0];
  const options = question.options || [];

  const updateOption = (i, value) => {
    const next = [...options];
    next[i] = value;
    onChange({ options: next });
  };
  const addOption = () => onChange({ options: [...options, ""] });
  const removeOption = (i) => onChange({ options: options.filter((_, oi) => oi !== i) });

  return (
    <div style={{ ...styles.card, width: "100%", margin: 0, padding: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} style={{ background: "none", border: "none", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 1, color: THEME.text2 }}><ArrowUp size={14} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} style={{ background: "none", border: "none", cursor: index === total - 1 ? "default" : "pointer", opacity: index === total - 1 ? 0.3 : 1, color: THEME.text2 }}><ArrowDown size={14} /></button>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            style={{ ...styles.input, marginBottom: 8 }} placeholder={t("psQuestionLabelPlaceholder")}
            value={question.label} onChange={(e) => onChange({ label: e.target.value })} dir={dir}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select style={styles.filterSelect} value={question.type} onChange={(e) => onChange({ type: e.target.value, options: [] })} dir={dir}>
              {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{t(qt.labelKey)}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: THEME.text2, cursor: "pointer" }}>
              <input type="checkbox" checked={!!question.required} onChange={(e) => onChange({ required: e.target.checked })} />
              {t("psRequiredQuestion")}
            </label>
          </div>

          {typeInfo.hasOptions && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input style={{ ...styles.input, marginTop: 0 }} value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={t("psOptionPlaceholder", { n: i + 1 })} dir={dir} />
                  <button type="button" onClick={() => removeOption(i)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, flexShrink: 0 }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={addOption} style={{ ...styles.smallButton, background: THEME.navyMid, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5 }}>
                <Plus size={12} /> {t("psAddOption")}
              </button>
            </div>
          )}
        </div>

        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, flexShrink: 0 }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
