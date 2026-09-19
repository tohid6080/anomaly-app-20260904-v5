import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicSurveyResponse } from "./surveyApi.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { formatDuration } from "./surveyModel.js";
import ChoiceReview from "./ChoiceReview.jsx";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const wrap = { minHeight: "100vh", background: THEME.bg, fontFamily: THEME.font };

/**
 * نتیجه‌ی یک پاسخِ مشخص — #survey-response/<responseId>. برایِ فرستادن به
 * خودِ همان شرکت‌کننده تا نتیجه‌ی خودش را ببیند (نه لیستِ همه مثلِ
 * PublicSurveyResults.jsx).
 */
export default function PublicSurveyResponse({ responseId }) {
  const { t, dir } = useLanguage();
  const [d, setD] = useState(undefined);

  useEffect(() => { loadPublicSurveyResponse(responseId).then(setD); }, [responseId]);

  if (d === undefined) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: THEME.text3 }}>{t("commonLoading")}</p></div>;
  if (d?.__error) {
    return (
      <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <AlertTriangle size={40} color={THEME.danger} style={{ marginBottom: 12 }} />
          <p style={{ color: THEME.text2, fontSize: 14, lineHeight: 1.9 }}>{d.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 60px", direction: dir }}>
        <div style={{ textAlign: "center", maxWidth: 420, margin: "0 auto 26px" }}>
          {d.passed ? <CheckCircle2 size={44} color={THEME.ok} style={{ marginBottom: 10 }} /> : <XCircle size={44} color={THEME.danger} style={{ marginBottom: 10 }} />}
          <h1 style={{ fontSize: 16, fontWeight: 700, color: THEME.text2, margin: "0 0 4px" }}>{d.title}</h1>
          {d.name && <p style={{ fontSize: 14, fontWeight: 700, color: THEME.heading, margin: "0 0 8px" }}>{d.name}</p>}
          <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "8px 0 4px" }}>{d.passed ? t("svExamPassed") : t("svExamFailed")}</h2>
          <div style={{ fontSize: 30, fontWeight: 800, color: d.passed ? THEME.ok : THEME.danger, fontFamily: MONO, margin: "6px 0" }}>{d.percent}%</div>
          {d.maxScore != null && <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 4px" }}>{t("svExamScoreLine", { score: d.score, max: d.maxScore, pass: d.passScore })}</p>}
          <p style={{ fontSize: 11, color: THEME.text3 }}>
            {toJalaliSafe(d.submittedAt)}
            {formatDuration(d.durationSeconds) && ` · ${t("svDurationLabel")}: ${formatDuration(d.durationSeconds)}`}
          </p>
        </div>

        {d.review && d.review.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {d.review.map((rv, i) => (
              <div key={rv.questionId}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading, marginBottom: 4 }}>{i + 1}. {rv.title || rv.questionId}</div>
                <ChoiceReview q={rv} yourAnswer={rv.yourAnswer} correctAnswer={rv.correctAnswer} t={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
