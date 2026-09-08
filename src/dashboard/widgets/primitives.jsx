import React from "react";
import { THEME } from "../../shared.js";
import { TIcon } from "../../shared/Icon.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

/**
 * اجزای مشترکِ ویجت‌های داشبورد — طبق «سیستم طراحی» (D-008/D-011):
 * سه قالبِ Counter / Donut / MiniBar روی همان منطقِ نمودارِ دست‌سازِ
 * HomeDashboard، به‌علاوهٔ پوستهٔ WidgetCard و حالت‌های استاندارد
 * (بارگذاری / خالی / خطا). هیچ کتابخانهٔ نمودار یا CSS جدیدی — استایل
 * inline از THEME.
 */

const cardStyle = {
  background: THEME.widgetBg, border: `1px solid ${THEME.widgetBorder}`, borderRadius: THEME.radiusCard,
  padding: "12px 13px", display: "flex", flexDirection: "column", gap: 9,
  height: "100%", boxSizing: "border-box", boxShadow: THEME.elev1,
};

export function WidgetCard({ title, icon: Icon, tone, tools, children, style }) {
  const barColor = tone === "bad" ? THEME.danger : tone === "warn" ? THEME.warn : tone === "ok" ? THEME.ok : null;
  return (
    <div style={{ ...cardStyle, ...style, position: "relative", overflow: "hidden" }}>
      {barColor && <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: barColor }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {Icon && <TIcon icon={Icon} color={THEME.teal} />}
        <h3 style={{ fontSize: THEME.fsCard, color: THEME.heading, fontWeight: THEME.fwCard, margin: 0 }}>{title}</h3>
        {tools && <span style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6 }}>{tools}</span>}
      </div>
      {children}
    </div>
  );
}

export function WidgetSkeleton({ rows = 3 }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ height: 12, width: "45%", borderRadius: 5, background: THEME.borderSoft }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 26, borderRadius: 7, background: THEME.surface2 }} />
      ))}
    </div>
  );
}

export function WidgetEmpty({ text, good }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "18px 8px", textAlign: "center" }}>
      {good && <span style={{ color: THEME.ok, fontSize: 15, lineHeight: 1 }}>✓</span>}
      <span style={{ fontSize: 11, color: THEME.text3 }}>{text}</span>
    </div>
  );
}

export function WidgetError({ onRetry }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "18px 8px", textAlign: "center" }}>
      <span style={{ fontSize: 11, color: THEME.text2 }}>{t("wgLoadFailed")}</span>
      {onRetry && (
        <button
          type="button" onClick={onRetry}
          style={{ fontSize: 10.5, fontWeight: 700, color: THEME.tealDeep, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "3px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}
        >
          {t("wgRetry")}
        </button>
      )}
    </div>
  );
}

/* ---------- Counter ---------- */
export function CounterWidget({ title, icon, value, sub, tone, onClick }) {
  return (
    <WidgetCard title={title} icon={icon} tone={tone}>
      <div
        onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
        style={{ cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 2 }}
      >
        <div style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums",
          color: tone === "bad" ? THEME.danger : tone === "warn" ? THEME.warn : tone === "ok" ? THEME.ok : THEME.heading,
        }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 9.5, color: THEME.text3, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </WidgetCard>
  );
}

/* ---------- Donut (SVG خام، مثل MiniDonut) ---------- */
export function DonutWidget({ title, icon, data, onSegmentClick }) {
  const { t } = useLanguage();
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 34, cx = 40, cy = 40, circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <WidgetCard title={title} icon={icon}>
      {total === 0 ? (
        <WidgetEmpty text={t("commonNoData")} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="78" height="78" viewBox="0 0 80 80" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join("، ")} style={{ flexShrink: 0 }}>
            {data.filter((d) => d.value > 0).map((d, i) => {
              const dash = (d.value / total) * circumference;
              const seg = (
                <circle
                  key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="12"
                  strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              );
              offset += dash;
              return seg;
            })}
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            {data.map((d) => (
              <div
                key={d.label}
                onClick={onSegmentClick ? () => onSegmentClick(d) : undefined}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: THEME.text2, marginBottom: 3, cursor: onSegmentClick ? "pointer" : "default" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
                <span style={{ marginInlineStart: "auto", fontWeight: 700, fontFamily: THEME.font }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

/* ---------- MiniBar (فهرست برچسب/عدد/میله، مثل MiniBarChart) ---------- */
export function MiniBarWidget({ title, icon, data, suffix = "" }) {
  const { t } = useLanguage();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <WidgetCard title={title} icon={icon}>
      {data.length === 0 ? (
        <WidgetEmpty text={t("commonNoData")} />
      ) : (
        <div>
          {data.map((d) => (
            <div key={d.label} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: THEME.text2, marginBottom: 2 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{d.label}</span>
                <span style={{ fontWeight: 700, fontFamily: THEME.font }}>{d.value}{suffix}</span>
              </div>
              <div style={{ background: THEME.borderSoft, borderRadius: 4, height: 5, overflow: "hidden" }}>
                <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: d.color || THEME.teal, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
