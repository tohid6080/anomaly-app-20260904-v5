import React, { createContext, useContext, useRef, useCallback, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * PageBar — نوارِ ثابتِ زیرِ هدر که در هر ماژول یک ردیفِ مرتب و یک‌دست
 * می‌سازد: سمتِ راست (شروعِ RTL) دکمهٔ «بازگشت» + مسیر/عنوانِ صفحه، سمتِ
 * چپ (پایانِ RTL) دکمه‌های اقدامِ همان صفحه (مثلاً «ویرایش داشبورد»).
 *
 * ماژول‌ها با هوکِ usePageBar عنوان/آیکون/اکشن‌های خودشان را می‌دهند؛ اگر
 * ماژولی چیزی ندهد، Shell خودش یک نوارِ پیش‌فرض با «بازگشت + نامِ ماژول»
 * نشان می‌دهد. تنها Shell این کامپوننت را رندر می‌کند (یک نوار در صفحه).
 */

export const PageBarContext = createContext(null);

/** ماژول‌ها این را صدا می‌زنند تا محتوای PageBar را تعیین کنند.
 *  نکته: `actions` را در سمتِ فراخواننده با useMemo پایدار کن تا حلقهٔ
 *  رندر ایجاد نشود (وابسته به همان چیزهایی که واقعاً اکشن‌ها را عوض می‌کنند). */
export function usePageBar({ title, crumb, actions, onBack, icon } = {}) {
  const ctx = useContext(PageBarContext);
  const set = ctx && ctx.set;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const stableBack = useCallback(() => {
    if (onBackRef.current) onBackRef.current();
  }, []);
  const hasBack = !!onBack;

  useEffect(() => {
    if (!set) return undefined;
    set({ title, crumb, actions, icon, onBack: hasBack ? stableBack : undefined });
    return () => set(null);
  }, [set, title, crumb, actions, icon, hasBack, stableBack]);
}

export default function PageBar({ icon: Icon, title, crumb, onBack, backLabel, actions }) {
  const { dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 15,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        minHeight: 54,
        padding: "9px clamp(14px, 2.4vw, 28px)",
        background: `linear-gradient(180deg, ${THEME.surface}, ${THEME.surface2})`,
        borderBottom: `1px solid ${THEME.border}`,
        boxShadow: "0 6px 16px -14px rgba(0,0,0,0.55)",
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 9,
            flexShrink: 0,
            border: `1px solid ${THEME.border}`,
            background: THEME.surface,
            color: THEME.text2,
            cursor: "pointer",
          }}
        >
          <BackIcon size={16} />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: "1 1 auto" }}>
        {Icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              flexShrink: 0,
              background: THEME.tealSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={15} color={THEME.tealDeep} />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          {crumb && (
            <div
              style={{
                fontSize: title ? 10.5 : 13,
                fontWeight: title ? 600 : 700,
                color: title ? THEME.text3 : THEME.text2,
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {crumb}
            </div>
          )}
          {title && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: THEME.heading,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
