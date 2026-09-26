import React from "react";
import { THEME } from "../shared.js";

/* ============================================================================ *
 * اجزای نمایشیِ خالصِ پنلِ «محاسبات و ایمنیِ لحظه‌ای» — از LiftingPlanWorkspace.jsx
 * استخراج شده تا هم خودِ Workspace و هم نمونه‌ی آموزشی (LiftingPlanSample.jsx)
 * دقیقاً همان ظاهر را از یک منبع بسازند؛ بدونِ کپی/دوباره‌نویسیِ استایل‌ها.
 * ============================================================================ */

export function fmtN(n, d = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export const fmtKg = (n) => fmtN(n, 0);

export function CalcRow({ k, v, tone, strong }) {
  const color = tone === "bad" ? THEME.danger : tone === "warn" ? THEME.warn : tone === "ok" ? THEME.ok : THEME.text;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 11.5 }}>
      <span style={{ color: THEME.text3 }}>{k}</span>
      <span style={{ fontWeight: strong ? 800 : 700, color, fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}

export function Verdict({ worst, pct, t }) {
  const map = {
    ok: { c: THEME.ok, bg: THEME.okBg, txt: t("lpVerdictOk") },
    warn: { c: THEME.warn, bg: THEME.warnBg, txt: t("lpVerdictWarn") },
    fail: { c: THEME.danger, bg: THEME.dangerBg, txt: t("lpVerdictFail") },
  };
  const m = map[worst] || map.ok;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 9, background: m.bg, color: m.c, fontWeight: 800, fontSize: 12.5, marginBottom: 8 }}>
      <span>{m.txt}</span>
      <span style={{ marginInlineStart: "auto", fontVariantNumeric: "tabular-nums" }}>{pct == null ? "—" : `${fmtN(pct, 1)}٪`}</span>
    </div>
  );
}

export function Gauge({ pct, warn = 75, max = 85 }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div>
      <div style={{ position: "relative", height: 10, borderRadius: 6, overflow: "hidden", background: `linear-gradient(90deg, ${THEME.ok} 0 ${warn}%, ${THEME.warn} ${warn}% ${max}%, ${THEME.danger} ${max}% 100%)` }}>
        <div style={{ position: "absolute", inset: 0, background: THEME.surface, opacity: 0.55 }} />
        <div style={{ position: "absolute", insetBlock: 0, insetInlineStart: 0, width: `${p}%`, borderInlineEnd: `2.5px solid ${THEME.text}` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: THEME.text3, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
        <span>۰</span><span>{fmtN(warn)}</span><span>{fmtN(max)}</span><span>۱۰۰</span>
      </div>
    </div>
  );
}
