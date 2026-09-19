import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { THEME } from "../shared.js";
import ChoiceReview from "./ChoiceReview.jsx";

/**
 * فهرستِ کارت‌هایِ بررسیِ سؤال‌به‌سؤالِ یک آزمون — عنوان + برچسبِ درست/نادرست
 * + فهرستِ گزینه‌ها (گزینه‌ی درست سبز، گزینه‌ی اشتباهِ انتخاب‌شده قرمز). هم در
 * صفحه‌ی نتیجه‌ی عمومی (PublicSurvey.jsx) و هم در پیش‌نمایشِ داخلِ سازنده
 * (SurveyBuilder.jsx) استفاده می‌شود — دو جا، یک نگاه.
 */
export default function ExamReviewList({ review, questionsById, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {review.map((r, i) => {
        const q = questionsById[r.questionId];
        if (!q) return null;
        return (
          <div key={r.questionId} style={{ background: THEME.surface, border: `1px solid ${r.correct ? THEME.okBg : THEME.dangerBg}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading }}>{i + 1}. {q.title || q.id}</span>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999, background: r.correct ? THEME.okBg : THEME.dangerBg, color: r.correct ? THEME.ok : THEME.danger, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {r.correct ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {r.correct ? t("svAnswerCorrect") : t("svAnswerWrong")}
              </span>
            </div>
            <ChoiceReview q={q} yourAnswer={r.yourAnswer} correctAnswer={r.correctAnswer} t={t} />
          </div>
        );
      })}
    </div>
  );
}
