import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { THEME } from "../shared.js";
import { reviewAnswerLabel } from "./surveyModel.js";

/**
 * فهرستِ کارت‌هایِ بررسیِ سؤال‌به‌سؤالِ یک آزمون — پاسخِ پاسخ‌دهنده، برچسبِ
 * درست/نادرست، و پاسخِ درست در صورتِ اشتباه. هم در صفحه‌ی نتیجه‌یِ عمومی
 * (PublicSurvey.jsx) و هم در پیش‌نمایشِ داخلِ سازنده (SurveyBuilder.jsx)
 * استفاده می‌شود — دو جا، یک نگاه.
 */
export default function ExamReviewList({ review, questionsById, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {review.map((r, i) => {
        const q = questionsById[r.questionId];
        if (!q) return null;
        return (
          <div key={r.questionId} style={{ background: THEME.surface, border: `1px solid ${r.correct ? THEME.okBg : THEME.dangerBg}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading }}>{i + 1}. {q.title || q.id}</span>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999, background: r.correct ? THEME.okBg : THEME.dangerBg, color: r.correct ? THEME.ok : THEME.danger, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {r.correct ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {r.correct ? t("svAnswerCorrect") : t("svAnswerWrong")}
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.text2, margin: "0 0 3px" }}>
              {t("svYourAnswer")}: <b style={{ color: THEME.text }}>{reviewAnswerLabel(q, r.yourAnswer, t) ?? t("svNoAnswerGiven")}</b>
            </p>
            {!r.correct && (
              <p style={{ fontSize: 12, color: THEME.ok, margin: 0 }}>
                {t("svCorrectAnswer")}: <b>{reviewAnswerLabel(q, r.correctAnswer, t)}</b>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
