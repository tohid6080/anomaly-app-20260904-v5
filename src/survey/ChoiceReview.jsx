import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { THEME } from "../shared.js";

/**
 * فهرستِ گزینه‌هایِ یک سؤالِ نمره‌دار برایِ بررسیِ یک پاسخِ مشخص — گزینه‌ی
 * درست همیشه سبز، گزینه‌ای که پاسخ‌دهنده اشتباه انتخاب کرده قرمز. سه‌جا
 * استفاده می‌شود: صفحه‌ی بعد از خودِ آزمون، پیش‌نمایشِ سازنده، صفحه‌ی نتایجِ
 * عمومی (تجمیعی + تک‌تکِ شرکت‌کنندگان) و لینکِ نتیجه‌ی یک نفر.
 *
 * q می‌تواند گزینه‌ها را در q.config.options (سؤالِ خام) یا q.options (شکلِ
 * خلاصه‌شده‌ی سمتِ سرور) داشته باشد؛ correctAnswer را همیشه جداگانه می‌گیرد
 * (نه از پیش روی خودِ گزینه‌ها) تا در هر سه جا یکسان کار کند.
 */
export default function ChoiceReview({ q, yourAnswer, correctAnswer, t }) {
  const opts = q.type === "yes_no"
    ? [{ id: "yes", label: t("commonYes") }, { id: "no", label: t("commonNo") }]
    : (q.config?.options || q.options || []);
  const correctIds = new Set(Array.isArray(correctAnswer) ? correctAnswer : correctAnswer != null ? [correctAnswer] : []);
  const pickedIds = new Set(Array.isArray(yourAnswer) ? yourAnswer : yourAnswer != null ? [yourAnswer] : []);
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {opts.map((o) => {
          const isCorrect = correctIds.has(o.id);
          const isPicked = pickedIds.has(o.id);
          const isWrongPick = isPicked && !isCorrect;
          return (
            <div key={o.id} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "5px 9px", borderRadius: 7,
              background: isCorrect ? THEME.okBg : isWrongPick ? THEME.dangerBg : THEME.surface2,
              color: isCorrect ? THEME.ok : isWrongPick ? THEME.danger : THEME.text2,
              fontWeight: isCorrect || isWrongPick ? 700 : 500,
            }}>
              {isCorrect ? <CheckCircle2 size={12} /> : isWrongPick ? <XCircle size={12} /> : <span style={{ width: 12, flexShrink: 0 }} />}
              <span>{o.label || "—"}</span>
            </div>
          );
        })}
      </div>
      {yourAnswer == null && <p style={{ fontSize: 10.5, color: THEME.text3, margin: "4px 0 0" }}>{t("svNoAnswerGiven")}</p>}
    </div>
  );
}
