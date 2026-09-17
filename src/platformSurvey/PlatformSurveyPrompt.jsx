import React, { useEffect, useState } from "react";
import { ClipboardList, X, Send, CheckCircle2, Star } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadActivePublicSurvey, loadActiveWelcomeSurvey, dismissSurvey, submitSurveyResponse } from "./platformSurveyApi.js";

/**
 * کامپوننتِ مشترکِ نمایشِ نظرسنجی‌هایِ پلتفرم — سه‌جا نصب می‌شود:
 * - kind="public": App.jsx/LoginScreen — بدونِ survey، خودش
 *   loadActivePublicSurvey() را صدا می‌زند.
 * - kind="welcome": App.jsx/WelcomeScreen — با currentUser، خودش
 *   loadActiveWelcomeSurvey(currentUser) را صدا می‌زند.
 * - kind="event": PermitWorkspace.jsx و CorrectiveActionsDashboard.jsx —
 *   والد خودش checkEventSurvey() را صدا زده، نتیجه را با prop `survey`
 *   پاس می‌دهد (این کامپوننت در این حالت چیزی بار نمی‌کند/دوباره
 *   recordImpression نمی‌زند — آن فراخوانی از قبل داخلِ checkEventSurvey
 *   انجام شده).
 *
 * هر سه حالت: کارتِ شناورِ کوچک → کلیک → مودالِ مرکزیِ پاسخ‌دهی (همان
 * الگویِ TrialRequestModal.jsx). بستنِ کارت یا مودال بدونِ پاسخ = ردِ
 * دائمیِ همین نظرسنجی (dismissSurvey) — دیگر نشان داده نمی‌شود.
 */
export default function PlatformSurveyPrompt({ kind, currentUser, survey: externalSurvey, onDismiss, corner = "right" }) {
  const { t, dir } = useLanguage();
  const [survey, setSurvey] = useState(externalSurvey || null);
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (externalSurvey) { setSurvey(externalSurvey); return; }
    let cancelled = false;
    const loader = kind === "public" ? loadActivePublicSurvey : kind === "welcome" ? () => loadActiveWelcomeSurvey(currentUser) : null;
    if (!loader) return;
    loader().then((r) => { if (!cancelled) setSurvey(r); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, externalSurvey]);

  if (!survey || closed) return null;

  const username = currentUser?.username || "";
  const sideStyle = corner === "left" ? { left: 20 } : { right: 20 };

  const dismissForGood = () => {
    setClosed(true);
    dismissSurvey(survey.id, username);
    onDismiss && onDismiss();
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 20, ...sideStyle, zIndex: 3400, width: 260, cursor: "pointer",
          background: THEME.surface, border: `1px solid ${THEME.borderStrong}`, borderRadius: 14,
          boxShadow: "0 12px 30px rgba(0,0,0,0.4)", padding: "12px 14px", direction: dir, fontFamily: THEME.font,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
          <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={16} color={THEME.teal} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{survey.title}</div>
            <div style={{ fontSize: 11, color: THEME.text3 }}>{t("psCardCta")}</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismissForGood(); }}
            aria-label={t("psCloseAria")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
          >
            <X size={14} color={THEME.text3} />
          </button>
        </div>
      </div>

      {open && (
        <PlatformSurveyModal
          survey={survey}
          currentUser={currentUser}
          onSubmitted={() => { setOpen(false); setClosed(true); onDismiss && onDismiss(); }}
          onClose={() => { setOpen(false); dismissForGood(); }}
        />
      )}
    </>
  );
}

function PlatformSurveyModal({ survey, currentUser, onSubmitted, onClose }) {
  const { t, dir } = useLanguage();
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const setAnswer = (qId, value) => setAnswers((prev) => ({ ...prev, [qId]: value }));
  const toggleMulti = (qId, opt) => {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qId]) ? prev[qId] : [];
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      return { ...prev, [qId]: next };
    });
  };

  const questions = [...survey.questions].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleSubmit = async () => {
    setError("");
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) { setError(t("psErrRequiredQuestion", { label: q.label })); return; }
    }
    setSaving(true);
    const respondent = currentUser?.username
      ? { username: currentUser.username, role: currentUser.role, companyId: currentUser.companyId }
      : {};
    const result = await submitSurveyResponse(survey.id, answers, respondent);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDone(true);
  };

  const handleOverlayOrClose = () => {
    if (done) onSubmitted();
    else onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,0.6)", zIndex: 4100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={handleOverlayOrClose}
    >
      <div
        style={{ background: THEME.surface, borderRadius: 16, padding: 22, maxWidth: 480, width: "100%", direction: dir, maxHeight: "88vh", overflowY: "auto", fontFamily: THEME.font }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <CheckCircle2 size={46} color={THEME.ok} style={{ marginBottom: 12 }} />
            <h3 style={{ color: THEME.heading, fontSize: 16, marginBottom: 8 }}>{t("psDoneTitle")}</h3>
            <p style={{ fontSize: 12.5, color: THEME.text3, lineHeight: 1.9, marginBottom: 18 }}>{t("psDoneBody")}</p>
            <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 24px" }} onClick={onSubmitted}>{t("saClose")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, color: THEME.heading, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
                <ClipboardList size={17} color={THEME.teal} /> {survey.title}
              </h3>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={17} color={THEME.text3} />
              </button>
            </div>
            {survey.description && (
              <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 14px", lineHeight: 1.8 }}>{survey.description}</p>
            )}

            {questions.map((q) => (
              <div key={q.id} style={{ marginBottom: 16 }}>
                <label style={{ ...styles.label, marginTop: 0 }}>
                  {q.label}{q.required && <span style={{ color: THEME.danger }}> *</span>}
                </label>
                <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} onToggleMulti={(opt) => toggleMulti(q.id, opt)} dir={dir} t={t} />
              </div>
            ))}

            {error && <p style={styles.error}>{error}</p>}

            <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleSubmit} disabled={saving}>
              <Send size={15} /> {saving ? t("sbsSending") : t("psSubmit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange, onToggleMulti, dir, t }) {
  const options = Array.isArray(question.options) ? question.options : [];

  if (question.type === "text") {
    return <textarea style={{ ...styles.input, minHeight: 70 }} value={value || ""} onChange={(e) => onChange(e.target.value)} dir={dir} />;
  }

  if (question.type === "yes_no") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {[{ v: "yes", l: t("psYes") }, { v: "no", l: t("psNo") }].map((opt) => (
          <button
            key={opt.v} type="button" onClick={() => onChange(opt.v)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              border: `1.5px solid ${value === opt.v ? THEME.teal : THEME.border}`,
              background: value === opt.v ? THEME.teal : "transparent", color: value === opt.v ? "#fff" : THEME.text2,
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" onClick={() => onChange(n)} aria-label={String(n)}
            style={{
              width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${Number(value) >= n ? THEME.warn : THEME.border}`,
              background: Number(value) >= n ? THEME.warnBg : "transparent",
            }}
          >
            <Star size={16} color={Number(value) >= n ? THEME.warn : THEME.text3} fill={Number(value) >= n ? THEME.warn : "none"} />
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <select style={styles.filterSelect} value={value || ""} onChange={(e) => onChange(e.target.value)} dir={dir}>
        <option value="">{t("psSelectPlaceholder")}</option>
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (question.type === "multi_choice") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: THEME.text2, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggleMulti(opt)} />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  // single_choice (پیش‌فرض)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map((opt, i) => (
        <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: THEME.text2, cursor: "pointer" }}>
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}
