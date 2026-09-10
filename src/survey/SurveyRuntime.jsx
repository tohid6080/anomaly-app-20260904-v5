import React from "react";
import { Star } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { isAnswerable } from "./surveyModel.js";

/**
 * اجرای فرمِ نظرسنجی — مشترک بینِ پیش‌نمایشِ سازنده و صفحهٔ عمومی.
 * props: questions, answers, onChange(qid, value), errors, readOnly
 */
export default function SurveyRuntime({ questions, answers, onChange, errors, readOnly }) {
  const { t, dir } = useLanguage();
  const ans = answers || {};
  const err = errors || {};
  const set = (qid, v) => { if (!readOnly && onChange) onChange(qid, v); };

  let idx = 0;
  return (
    <div style={{ direction: dir, display: "flex", flexDirection: "column", gap: 16 }}>
      {(questions || []).map((q) => {
        if (q.type === "section") {
          return (
            <div key={q.id} style={{ marginTop: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: 0 }}>{q.title || "—"}</h3>
              {q.description && <p style={{ fontSize: 12.5, color: THEME.text2, margin: "4px 0 0", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{q.description}</p>}
            </div>
          );
        }
        idx += 1;
        return (
          <div key={q.id} id={`sv-q-${q.id}`} style={{ background: THEME.surface, border: `1px solid ${err[q.id] ? THEME.danger : THEME.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.heading, marginBottom: q.description ? 2 : 8 }}>
              <span style={{ color: THEME.text3, fontFamily: "monospace", marginInlineEnd: 6 }}>{idx}.</span>
              {q.title || t("svUntitledQuestion")}
              {q.required && <span style={{ color: THEME.danger, marginInlineStart: 4 }}>*</span>}
            </div>
            {q.description && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 8px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{q.description}</p>}

            <QuestionInput q={q} value={ans[q.id]} onChange={(v) => set(q.id, v)} readOnly={readOnly} dir={dir} t={t} />

            {err[q.id] && <p style={{ ...styles.error, marginTop: 6, marginBottom: 0 }}>{err[q.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}

function QuestionInput({ q, value, onChange, readOnly, dir, t }) {
  const opts = q.config?.options || [];

  if (q.type === "short_text") {
    return <input style={styles.input} value={value || ""} disabled={readOnly} dir={dir} placeholder={q.config?.placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === "long_text") {
    return <textarea style={{ ...styles.input, minHeight: 84, resize: "vertical" }} value={value || ""} disabled={readOnly} dir={dir} placeholder={q.config?.placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === "number") {
    return <input type="number" style={styles.input} value={value ?? ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
  }
  if (q.type === "date") {
    return <input type="date" style={styles.input} value={value || ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === "dropdown") {
    return (
      <select style={styles.input} value={value || ""} disabled={readOnly} dir={dir} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("svSelectPlaceholder")}</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.label || "—"}</option>)}
      </select>
    );
  }
  if (q.type === "yes_no") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {[["yes", t("commonYes")], ["no", t("commonNo")]].map(([v, lbl]) => (
          <button key={v} type="button" disabled={readOnly} onClick={() => onChange(v)}
            style={pillStyle(value === v)}>{lbl}</button>
        ))}
      </div>
    );
  }
  if (q.type === "single_choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opts.map((o) => (
          <label key={o.id} style={optRowStyle(value === o.id)}>
            <input type="radio" name={q.id} checked={value === o.id} disabled={readOnly} onChange={() => onChange(o.id)} />
            <span style={{ fontSize: 12.5, color: THEME.text }}>{o.label || "—"}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "multi_choice") {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (id) => onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opts.map((o) => (
          <label key={o.id} style={optRowStyle(arr.includes(o.id))}>
            <input type="checkbox" checked={arr.includes(o.id)} disabled={readOnly} onChange={() => toggle(o.id)} />
            <span style={{ fontSize: 12.5, color: THEME.text }}>{o.label || "—"}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "rating") {
    const max = q.config?.max || 5;
    const cur = Number(value) || 0;
    return (
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" disabled={readOnly} onClick={() => onChange(n)} aria-label={String(n)}
            style={{ border: "none", background: "transparent", cursor: readOnly ? "default" : "pointer", padding: 2 }}>
            <Star size={24} fill={n <= cur ? THEME.warn : "none"} color={n <= cur ? THEME.warn : THEME.border} />
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "linear_scale") {
    const min = q.config?.min ?? 0;
    const max = q.config?.max ?? 10;
    const step = q.config?.step || 1;
    const nums = [];
    for (let n = min; n <= max; n += step) nums.push(n);
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {nums.map((n) => (
            <button key={n} type="button" disabled={readOnly} onClick={() => onChange(n)}
              style={{ ...pillStyle(Number(value) === n), minWidth: 38 }}>{n}</button>
          ))}
        </div>
        {(q.config?.minLabel || q.config?.maxLabel) && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: THEME.text3, marginTop: 4 }}>
            <span>{q.config?.minLabel}</span><span>{q.config?.maxLabel}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

const pillStyle = (on) => ({
  border: `1.5px solid ${on ? THEME.teal : THEME.border}`,
  background: on ? THEME.teal : "transparent",
  color: on ? "#fff" : THEME.text2,
  borderRadius: 9, padding: "8px 16px", fontFamily: THEME.font, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer",
});
const optRowStyle = (on) => ({
  display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  border: `1px solid ${on ? THEME.teal : THEME.border}`,
  background: on ? THEME.tealSoft : "transparent",
});

export { isAnswerable };
