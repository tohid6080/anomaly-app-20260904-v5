import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, PlayCircle } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicSurvey, submitSurveyResponse } from "./surveyApi.js";
import { validateResponse } from "./surveyModel.js";
import SurveyRuntime from "./SurveyRuntime.jsx";

/**
 * صفحهٔ مستقلِ نظرسنجی/آزمون — با آدرسِ هشِ #survey/<token> باز می‌شود (نگاه
 * کنید به App.jsx). بدونِ نیاز به ورود؛ ساختار از Edge Function می‌آید و پاسخ
 * هم از طریقِ Edge Function ثبت می‌شود. در حالتِ آزمون، نمره سمتِ سرور حساب
 * می‌شود و کلیدِ پاسخ اصلاً به این صفحه فرستاده نمی‌شود.
 */
export default function PublicSurvey({ publicToken }) {
  const { t, dir } = useLanguage();
  const [info, setInfo] = useState(undefined); // undefined=loading, {__error}|survey
  const [answers, setAnswers] = useState({});
  const [meta, setMeta] = useState({ name: "", unit: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);       // { percent, passed } از سرور (حالتِ آزمون)
  const [remaining, setRemaining] = useState(null);  // ثانیه‌های باقی‌مانده (محدودیتِ زمانی)
  const [started, setStarted] = useState(false);     // برای آزمونِ زمان‌دار: تا زدنِ «شروعِ آزمون» زمان‌سنج فعال نمی‌شود
  const deadlineRef = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => { loadPublicSurvey(publicToken).then(setInfo); /* eslint-disable-next-line */ }, [publicToken]);

  const already = useMemo(() => {
    try { return info && !info.__error && localStorage.getItem(`ihms_survey_done_${publicToken}`) === "1"; }
    catch { return false; }
  }, [info, publicToken]);

  const isExam = !!(info && !info.__error && info.settings?.mode === "exam");

  // ترتیبِ سؤال‌ها: در حالتِ آزمونِ درهم‌ریخته، یک بار در بارگذاری قاطی می‌شود.
  const questions = useMemo(() => {
    if (!info || info.__error) return [];
    const qs = Array.isArray(info.questions) ? info.questions.slice() : [];
    if (isExam && info.settings?.shuffleQuestions) {
      for (let i = qs.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
    }
    return qs;
  }, [info, isExam]);

  const needsStartGate = isExam && !!info?.settings?.timeLimitMin;

  // محدودیتِ زمانی — برای آزمونِ زمان‌دار، فقط پس از زدنِ «شروعِ آزمون» شمارش آغاز می‌شود
  useEffect(() => {
    if (!isExam || !info?.settings?.timeLimitMin || done || already) return;
    if (needsStartGate && !started) return;
    deadlineRef.current = Date.now() + info.settings.timeLimitMin * 60000;
    const tick = () => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(id); submitRef.current && submitRef.current(true); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isExam, info, done, already, needsStartGate, started]);

  if (info === undefined) return <Center>{t("commonLoading")}</Center>;
  if (info?.__error) return <ErrScreen msg={info.message} />;

  const settings = info.settings || {};

  if (done || already) {
    const showScore = isExam && settings.showScoreToRespondent !== false && result && result.percent != null;
    return (
      <div style={wrap}>
        <div style={{ textAlign: "center", padding: "40px 16px", maxWidth: 420, margin: "0 auto" }}>
          {showScore ? (
            result.passed ? <CheckCircle2 size={46} color={THEME.ok} style={{ marginBottom: 12 }} /> : <XCircle size={46} color={THEME.danger} style={{ marginBottom: 12 }} />
          ) : (
            <CheckCircle2 size={44} color={THEME.ok} style={{ marginBottom: 12 }} />
          )}
          <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>
            {showScore ? (result.passed ? t("svExamPassed") : t("svExamFailed")) : t("svThankYouTitle")}
          </h2>
          {showScore && (
            <div style={{ fontSize: 30, fontWeight: 800, color: result.passed ? THEME.ok : THEME.danger, fontFamily: "monospace", margin: "6px 0" }}>
              {result.percent}%
            </div>
          )}
          {showScore && result.maxScore != null && (
            <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 8px" }}>{t("svExamScoreLine", { score: result.score, max: result.maxScore, pass: settings.passScore })}</p>
          )}
          <p style={{ fontSize: 13, color: THEME.text2, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {settings.thankYouText || t("svThankYouBody")}
          </p>
        </div>
      </div>
    );
  }

  if (needsStartGate && !started) {
    const nameErr = !settings.anonymous && settings.collectName && errors.__name;
    const tryStart = () => {
      if (!settings.anonymous && settings.collectName && !meta.name.trim()) { setErrors({ __name: t("svErrRequired") }); return; }
      setErrors({});
      setStarted(true);
    };
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px 60px", direction: dir }}>
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 22, textAlign: "center" }}>
            <PlayCircle size={40} color={THEME.teal} style={{ marginBottom: 10 }} />
            <h1 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, margin: "0 0 6px" }}>{info.title || t("svUntitled")}</h1>
            <p style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, margin: "0 0 10px" }}>{t("svWelcomeTitle")}</p>
            {info.description && <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{info.description}</p>}
            <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 6px" }}>{t("svExamIntro", { pass: settings.passScore })}</p>
            <p style={{ fontSize: 11.5, color: THEME.warn, background: THEME.warnBg, borderRadius: 9, padding: "8px 10px", margin: "0 0 16px", lineHeight: 1.9, textAlign: "start" }}>
              {t("svExamTimeLimitNote", { min: settings.timeLimitMin })}
            </p>

            {!settings.anonymous && (settings.collectName || settings.collectUnit) && (
              <div style={{ textAlign: "start", border: `1px solid ${nameErr ? THEME.danger : THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                {settings.collectName && (<><label style={styles.label}>{t("svRespName")}</label><input style={styles.input} value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} dir={dir} /></>)}
                {settings.collectUnit && (<><label style={styles.label}>{t("svRespUnit")}</label><input style={styles.input} value={meta.unit} onChange={(e) => setMeta((m) => ({ ...m, unit: e.target.value }))} dir={dir} /></>)}
                {nameErr && <p style={{ ...styles.error, marginTop: 6, marginBottom: 0 }}>{nameErr}</p>}
              </div>
            )}

            <button type="button" style={{ ...styles.button, width: "100%" }} onClick={tryStart}>{t("svStartExam")}</button>
          </div>
        </div>
      </div>
    );
  }

  const doSubmit = async (auto) => {
    setError("");
    const { ok, errors: errs } = validateResponse(questions, answers, t);
    if (!settings.anonymous && settings.collectName && !meta.name.trim()) errs.__name = t("svErrRequired");
    if (!auto && Object.keys(errs).length) {
      setErrors(errs);
      const firstQ = questions.find((q) => errs[q.id]);
      if (firstQ) document.getElementById(`sv-q-${firstQ.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!auto && !ok) return;
    setSaving(true);
    const respMeta = settings.anonymous ? {} : {
      ...(settings.collectName ? { name: meta.name.trim() } : {}),
      ...(settings.collectUnit ? { unit: meta.unit.trim() } : {}),
    };
    const res = await submitSurveyResponse(publicToken, answers, respMeta, "link");
    setSaving(false);
    if (res?.__error) { setError(res.message); return; }
    if (res.percent != null) setResult({ score: res.score, maxScore: res.maxScore, percent: res.percent, passed: res.passed });
    try { if (settings.onePerDevice) localStorage.setItem(`ihms_survey_done_${publicToken}`, "1"); } catch { /* ignore */ }
    setDone(true);
  };
  submitRef.current = doSubmit;

  const mmss = remaining != null ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}` : null;

  return (
    <div style={wrap}>
      {isExam && mmss && (
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: remaining <= 30 ? THEME.danger : THEME.navyMid, color: "#fff", textAlign: "center", padding: "8px", fontSize: 13, fontWeight: 800, fontFamily: "monospace", letterSpacing: 1 }}>
          <Clock size={13} style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />{mmss}
        </div>
      )}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 60px", direction: dir }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: THEME.heading, margin: 0 }}>{info.title || t("svUntitled")}</h1>
          {isExam && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: THEME.warnBg, color: THEME.warn }}>{t("svModeExam")}</span>}
        </div>
        {info.description && !needsStartGate && <p style={{ fontSize: 13, color: THEME.text2, lineHeight: 1.95, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{info.description}</p>}
        {isExam && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 14px" }}>{t("svExamIntro", { pass: settings.passScore })}</p>}
        {settings.anonymous && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 16px" }}>{t("svAnonymousNote")}</p>}

        {!needsStartGate && !settings.anonymous && (settings.collectName || settings.collectUnit) && (
          <div style={{ background: THEME.surface, border: `1px solid ${errors.__name ? THEME.danger : THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {settings.collectName && (<><label style={styles.label}>{t("svRespName")}</label><input style={styles.input} value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} dir={dir} /></>)}
            {settings.collectUnit && (<><label style={styles.label}>{t("svRespUnit")}</label><input style={styles.input} value={meta.unit} onChange={(e) => setMeta((m) => ({ ...m, unit: e.target.value }))} dir={dir} /></>)}
          </div>
        )}

        <SurveyRuntime
          questions={questions}
          answers={answers}
          errors={errors}
          onChange={(qid, v) => { setAnswers((a) => ({ ...a, [qid]: v })); setErrors((e) => (e[qid] ? { ...e, [qid]: undefined } : e)); }}
        />

        {error && <p style={{ ...styles.error, marginTop: 12 }}>{error}</p>}
        <button type="button" style={{ ...styles.button, marginTop: 18 }} onClick={() => doSubmit(false)} disabled={saving}>
          {saving ? t("svSubmitting") : (isExam ? t("svExamSubmit") : t("svSubmit"))}
        </button>
      </div>
    </div>
  );
}

const wrap = { minHeight: "100vh", background: THEME.bg, fontFamily: THEME.font };

function Center({ children }) {
  return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: THEME.text3 }}>{children}</p></div>;
}
function ErrScreen({ msg }) {
  return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <AlertTriangle size={40} color={THEME.danger} style={{ marginBottom: 12 }} />
        <p style={{ color: THEME.text2, fontSize: 14, lineHeight: 1.9 }}>{msg}</p>
      </div>
    </div>
  );
}
