import React from "react";
import { THEME, styles } from "../shared.js";

/**
 * قطعاتِ UI مشترکِ ماژولِ PSSR — تا در همه‌ی پنل‌ها (تیم/جلسات/Action Plan)
 * یک ظاهرِ یکسان و بدونِ تکرارِ کد داشته باشیم.
 */

export function toneColor(tone) {
  switch (tone) {
    case "danger": return { fg: THEME.danger, bg: THEME.dangerBg };
    case "warn": return { fg: THEME.warn, bg: THEME.warnBg };
    case "ok": return { fg: THEME.ok, bg: THEME.okBg };
    case "teal": return { fg: THEME.teal, bg: THEME.tealSoft };
    case "info": return { fg: THEME.teal, bg: THEME.tealSoft };
    default: return { fg: THEME.text2, bg: THEME.surface2 };
  }
}

export function StatusBadge({ tone, children }) {
  const c = toneColor(tone);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function FormSection({ title, children, right }) {
  return (
    <div style={{ borderTop: `1px solid ${THEME.borderSoft}`, paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <b style={{ fontSize: 12.5, color: THEME.heading }}>{title}</b>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 10 }}>{children}</div>;
}

export function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

// دکمه‌های بله/خیر/- (Yes/No/N.A) برایِ هر Requirement
export function YnaToggle({ value, onChange, t }) {
  const opts = [
    { v: "yes", label: t("pssrYes"), fg: THEME.ok, bg: THEME.okBg },
    { v: "no", label: t("pssrNo"), fg: THEME.danger, bg: THEME.dangerBg },
    { v: "na", label: t("pssrNa"), fg: THEME.text2, bg: THEME.surface2 },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            style={{
              width: 40, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: THEME.font,
              fontSize: 11.5, fontWeight: 800, border: `1.5px solid ${on ? o.fg : THEME.border}`,
              background: on ? o.bg : "transparent", color: on ? o.fg : THEME.text2,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// انتخابِ CAT A/B/C — فقط وقتی وضعیت «خیر» است نمایش داده می‌شود
export function CatPicker({ value, onChange, t }) {
  const opts = [
    { v: "CAT_A", fg: THEME.danger, bg: THEME.dangerBg },
    { v: "CAT_B", fg: THEME.warn, bg: THEME.warnBg },
    { v: "CAT_C", fg: THEME.teal, bg: THEME.tealSoft },
  ];
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <div key={o.v} onClick={() => onChange(o.v)} title={t(`pssrCat${o.v.slice(-1)}Desc`)}
            style={{
              flex: 1, borderRadius: 7, border: `1.5px solid ${on ? o.fg : THEME.border}`, padding: "6px 4px",
              textAlign: "center", cursor: "pointer", fontSize: 10.5, fontWeight: 800,
              background: on ? o.bg : "transparent", color: on ? o.fg : THEME.text2,
            }}>
            {t(`pssrCat${o.v.slice(-1)}`)}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyHint({ children }) {
  return <div style={{ fontSize: 12.5, color: THEME.text3, padding: "22px 10px", textAlign: "center" }}>{children}</div>;
}
