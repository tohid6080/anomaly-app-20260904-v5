import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe, JalaliDateInput } from "./jalaliDate.jsx";
import { needsAccidentPronenessAssessment, isAccidentPronenessEnabledForCompany, loadLatestAccidentPronenessAssessment, accidentPronenessLevel } from "../proactiveIndicators/proactiveIndicatorsApi.js";
import { createCorrectiveAction, loadCorrectiveActionForAssessment, STATUS_META } from "../correctiveActions/correctiveActionsApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// نگاشتِ سطحِ فارسیِ برگشتی از accidentPronenessLevel به کلیدِ i18n
const AP_LEVEL_KEY = { "پایین": "apLevelLow", "متوسط": "apLevelMedium", "بالا": "apLevelHigh", "بسیار بالا": "apLevelVeryHigh" };

/**
 * وضعیت ارزیابی استعداد حادثه‌پذیری برای یک پرسنل خاص — سه حالت ممکن:
 * ۱. شغل بحرانی + هنوز ارزیابی‌نشده → بنر نارنجی «نیاز به ارزیابی»
 * ۲. ارزیابی‌شده، بدون اقدام اصلاحی مرتبط → نمایش نتیجه + (فقط برای
 *    کارفرما/ادمین) امکان صدور اقدام اصلاحی
 * ۳. ارزیابی‌شده، با اقدام اصلاحی مرتبط → نمایش نتیجه + وضعیت همان اقدام
 *    (که خودِ پیمانکار هم از همینجا و هم از ماژول اقدامات اصلاحی می‌بیندش)
 */
export default function AccidentPronenessSection({ personnel, role, currentUser, onNavigateToAssessment }) {
  const { t, dir } = useLanguage();
  const [apEnabled, setApEnabled] = useState(true); // پیش‌فرض true تا رفتار قبلی حفظ شود؛ بررسی واقعی async زیر
  const [assessment, setAssessment] = useState(undefined); // undefined = هنوز لود نشده
  const [correctiveAction, setCorrectiveAction] = useState(null);
  const [showCaForm, setShowCaForm] = useState(false);
  const [caDescription, setCaDescription] = useState("");
  const [caPriority, setCaPriority] = useState("medium");
  const [caDueDate, setCaDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    isAccidentPronenessEnabledForCompany().then(setApEnabled);
    loadLatestAccidentPronenessAssessment(personnel.id).then((a) => {
      setAssessment(a || null);
      if (a) loadCorrectiveActionForAssessment(a.id).then(setCorrectiveAction);
    });
  }, [personnel.id]);

  if (!apEnabled) return null;

  // هنوز در حال بارگذاری — چیزی نمایش نده تا از چشمک‌زدن بنر جلوگیری شود
  if (assessment === undefined) return null;

  // حالت ۱: هنوز ارزیابی‌نشده — فقط اگر شغل بحرانی باشد
  if (assessment === null) {
    if (!needsAccidentPronenessAssessment(personnel.jobTitle)) return null;
    return (
      <div style={{ ...styles.card, width: "auto", background: "#fff7ed", border: "1px solid #fdba74" }}>
        <h3 style={{ fontSize: 13, color: "#7c2d12", margin: "0 0 6px", fontWeight: 700 }}>{t("apNeedsAssessmentTitle")}</h3>
        <p style={{ fontSize: 12, color: "#7c2d12", margin: "0 0 10px", lineHeight: 1.8 }}>
          {t("apCriticalJobNote", { job: personnel.jobTitle })}
        </p>
        <button
          type="button"
          style={{ ...styles.smallButton, background: "#c2410c" }}
          onClick={() => onNavigateToAssessment && onNavigateToAssessment({ personnelId: personnel.id, jobTitle: personnel.jobTitle, personnelName: personnel.name })}
        >
          {t("apEnterAssessmentForm")}
        </button>
      </div>
    );
  }

  // حالت ۲/۳: ارزیابی موجود است — نتیجه را نشان بده
  const canIssueCorrectiveAction = (role === "EMPLOYER" || role === "ADMIN") && !correctiveAction;
  const levelInfo = accidentPronenessLevel(assessment.finalScore);
  // طبق آستانه‌ی درخواستی: از سطح «متوسط» به بالا، لازم است اقدام اصلاحی
  // برای پیمانکار صادر شود — اینجا فقط با یک هشدار برجسته پیشنهاد می‌شود؛
  // صدور نهایی همچنان با تأیید صریح کارفرما/ادمین (زدن دکمه) انجام می‌شود.
  const suggestsCorrectiveAction = levelInfo.level !== "پایین";
  const levelLabel = t(AP_LEVEL_KEY[levelInfo.level] || "apLevelMedium");

  const handleSendCorrectiveAction = async () => {
    if (!caDescription.trim()) { setError(t("apActionDescriptionRequired")); return; }
    setError("");
    setSaving(true);
    const result = await createCorrectiveAction({
      source: "proactive_indicator",
      nonconformanceDescription: t("apNonconformanceDescription", { name: personnel.name, job: personnel.jobTitle, score: assessment.finalScore, level: levelLabel }),
      actionDescription: caDescription.trim(),
      responsibleContractorId: personnel.contractorId || "",
      responsibleContractorName: personnel.contractorName || "",
      priority: caPriority,
      dueDate: caDueDate || "",
      status: "open",
      linkedAssessmentId: assessment.id,
    }, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setCorrectiveAction(result);
    setShowCaForm(false);
  };

  return (
    <div style={{ ...styles.card, width: "auto", background: levelInfo.bg, border: `1px solid ${levelInfo.color}` }}>
      <h3 style={{ fontSize: 13, color: "#1f2937", margin: "0 0 6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <CheckCircle2 size={15} color={levelInfo.color} /> {t("apResultTitle")}
      </h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#1f2937", marginBottom: 10 }}>
        <span>{t("apFinalScore")} <b style={{ fontSize: 17 }}>{assessment.finalScore}</b></span>
        <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 999, background: "#fff", color: levelInfo.color, fontWeight: 700, border: `1px solid ${levelInfo.color}` }}>
          {t("apLevelLabel", { level: levelLabel })}
        </span>
        <span>{t("apDateLabel", { date: toJalaliSafe(assessment.assessmentDate) })}</span>
        <span>{t("apAssessorLabel", { name: assessment.assessorName })}</span>
      </div>

      {suggestsCorrectiveAction && canIssueCorrectiveAction && !showCaForm && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fff", border: `1px solid ${levelInfo.color}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <AlertTriangle size={16} color={levelInfo.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#1f2937", margin: 0 }}>
            {t("apRecommendCorrectiveAction", { level: levelLabel })}
          </p>
        </div>
      )}

      {correctiveAction && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 10, marginBottom: canIssueCorrectiveAction ? 0 : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.navy }}>{correctiveAction.actionNumber}</span>
            <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: STATUS_META[correctiveAction.status]?.bg || "#eef1f5", color: STATUS_META[correctiveAction.status]?.color || THEME.text3, fontWeight: 600 }}>
              {STATUS_META[correctiveAction.status] ? t(STATUS_META[correctiveAction.status].labelKey) : correctiveAction.status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: THEME.text2, margin: 0 }}>{correctiveAction.actionDescription}</p>
          {correctiveAction.dueDate && <p style={{ fontSize: 11, color: THEME.text3, margin: "4px 0 0" }}>{t("apDueDateLabel", { date: toJalaliSafe(correctiveAction.dueDate) })}</p>}
          {role === "CONTRACTOR" && (
            <p style={{ fontSize: 11, color: "#92400e", margin: "6px 0 0" }}>{t("apContractorFollowUpNote")}</p>
          )}
        </div>
      )}

      {canIssueCorrectiveAction && !showCaForm && (
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowCaForm(true)}>
          <Send size={13} /> {t("apSendCorrectiveAction")}
        </button>
      )}

      {canIssueCorrectiveAction && showCaForm && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 10 }}>
          <label style={styles.label}>{t("apActionDescriptionLabel")}</label>
          <textarea style={{ ...styles.input, minHeight: 60 }} value={caDescription} onChange={(e) => setCaDescription(e.target.value)} dir={dir} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select style={{ ...styles.input, flex: 1 }} value={caPriority} onChange={(e) => setCaPriority(e.target.value)} dir={dir}>
              <option value="low">{t("apPriorityLow")}</option>
              <option value="medium">{t("apPriorityMedium")}</option>
              <option value="high">{t("apPriorityHigh")}</option>
              <option value="critical">{t("apPriorityCritical")}</option>
            </select>
            <JalaliDateInput value={caDueDate} onChange={setCaDueDate} allowEmpty style={{ flex: 1 }} />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={styles.smallButton} onClick={handleSendCorrectiveAction} disabled={saving}>
              {saving ? t("apSendingEllipsis") : t("apSendToContractor")}
            </button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowCaForm(false)}>{t("apCancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
