import React, { useState } from "react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * دکمه‌ی استانداردِ «بازگشت/انصراف» — جایگزینِ سراسریِ لینکِ متنیِ کوچکِ قبلی
 * (styles.backLink، که برایِ یکی‌دو موردِ غیرِ ناوبری مثل «پاک‌کردنِ فیلتر
 * تاریخ» دست‌نخورده باقی مانده، چون این کامپوننت فقط برایِ کنش‌هایِ واقعاً
 * بازگشتی/انصرافی است). خودش سبک/آیکون را مستقل نگه می‌دارد، از
 * styles.backLink مشتق نمی‌شود.
 */
export default function BackLink({ onClick, children, style }) {
  const { dir } = useLanguage();
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        color: THEME.text, fontSize: 13, fontWeight: 600, fontFamily: THEME.font,
        background: hover ? THEME.navyMid : THEME.surface2,
        border: `1px solid ${hover ? THEME.teal : THEME.borderStrong}`,
        padding: "8px 16px", borderRadius: 999, cursor: "pointer",
        marginBottom: 12, boxSizing: "border-box",
        transition: "background .15s ease, border-color .15s ease, transform .15s ease",
        transform: hover ? "translateY(-1px)" : "none",
        ...style,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0, transform: dir === "rtl" ? "none" : "scaleX(-1)" }}>
        <path d="M8 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {children}
    </div>
  );
}
