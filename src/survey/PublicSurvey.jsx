import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicSurvey, submitSurveyResponse } from "./surveyApi.js";
import { validateResponse } from "./surveyModel.js";
import SurveyRuntime from "./SurveyRuntime.jsx";

/**
 * صفحهٔ مستقلِ نظرسنجی — با آدرسِ هشِ #survey/<token> باز می‌شود (نگاه کنید به
 * App.jsx). بدونِ نیاز به ورود؛ ساختار از Edge Function می‌آید و پاسخ هم از
 * طریقِ Edge Function ثبت می‌شود (نه مستقیم به جدول).
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

  useEffect(() => {
    loadPublicSurvey(publicToken).then(setInfo);
    // eslint-disable-next-line
  }, [publicToken]);

  const already = useMemo(() => {
    try { return info && !info.__error && localStorage.getItem(`ihms_survey_done_${publicToken}`) === "1"; }
    catch { return false; }
  }, [info, publicToken]);

  if (info === undefined) return <Center>{t("commonLoading")}</Center>;
  if (info?.__error) return <ErrScreen msg={info.message} />;

  const s = info; // { title, description, questions, settings }
  const settings = s.settings || {};

  if (done || already) {
    return (
      <div style={wrap}>
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <CheckCircle2 size={44} color={THEME.ok} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>{t("svThankYouTitle")}</h2>
          <p style={{ fontSize: 13, color: THEME.text2, lineHeight: 1.9, maxWidth: 380, margin: "0 auto", whiteSpace: "pre-wrap" }}>
            {settings.thankYouText || t("svThankYouBody")}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError("");
    const { ok, errors: errs } = validateResponse(s.questions, answers, t);
    if (!settings.anonymous && settings.collectName && !meta.name.trim()) errs.__name = t("svErrRequired");
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstQ = s.questions.find((q) => errs[q.id]);
      if (firstQ) document.getElementById(`sv-q-${firstQ.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!ok) return;
    setSaving(true);
    const respMeta = settings.anonymous ? {} : {
      ...(settings.collectName ? { name: meta.name.trim() } : {}),
      ...(settings.collectUnit ? { unit: meta.unit.trim() } : {}),
    };
    const res = await submitSurveyResponse(publicToken, answers, respMeta, "link");
    setSaving(false);
    if (res?.__error) { setError(res.message); return; }
    try { if (settings.onePerDevice) localStorage.setItem(`ihms_survey_done_${publicToken}`, "1"); } catch { /* ignore */ }
    setDone(true);
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 60px", direction: dir }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: THEME.heading, margin: "0 0 6px" }}>{s.title || t("svUntitled")}</h1>
        {s.description && <p style={{ fontSize: 13, color: THEME.text2, lineHeight: 1.95, margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{s.description}</p>}
        {settings.anonymous && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 16px" }}>{t("svAnonymousNote")}</p>}

        {!settings.anonymous && (settings.collectName || settings.collectUnit) && (
          <div style={{ background: THEME.surface, border: `1px solid ${errors.__name ? THEME.danger : THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {settings.collectName && (
              <>
                <label style={styles.label}>{t("svRespName")}</label>
                <input style={styles.input} value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} dir={dir} />
              </>
            )}
            {settings.collectUnit && (
              <>
                <label style={styles.label}>{t("svRespUnit")}</label>
                <input style={styles.input} value={meta.unit} onChange={(e) => setMeta((m) => ({ ...m, unit: e.target.value }))} dir={dir} />
              </>
            )}
          </div>
        )}

        <SurveyRuntime
          questions={s.questions}
          answers={answers}
          errors={errors}
          onChange={(qid, v) => { setAnswers((a) => ({ ...a, [qid]: v })); setErrors((e) => (e[qid] ? { ...e, [qid]: undefined } : e)); }}
        />

        {error && <p style={{ ...styles.error, marginTop: 12 }}>{error}</p>}
        <button type="button" style={{ ...styles.button, marginTop: 18 }} onClick={handleSubmit} disabled={saving}>
          {saving ? t("svSubmitting") : t("svSubmit")}
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
