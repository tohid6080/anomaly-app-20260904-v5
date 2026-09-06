import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "./LanguageContext.jsx";
import { LANGUAGES } from "./translations.js";

/**
 * منوی انتخاب زبان (سه‌زبانه: فارسی / English / Deutsch).
 *
 * جایگزینِ دکمه‌های جدا‌جدای قبلی (LanguageToggle). یک Dropdown تمیز و
 * Responsive که در همه‌ی نقاط (Login، هدر صفحه‌ی خوش‌آمد/سامانه، Super Admin)
 * با همین ساختار استفاده می‌شود.
 *
 * props:
 *   variant: "light" (پیش‌فرض، روی سطح روشن مثل صفحه‌ی ورود) یا
 *            "dark" (روی هدرِ سرمه‌ای سامانه/سوپرادمین).
 *   compact: در موبایل/هدرِ تنگ فقط پرچم + فلش نشان بده (بدون متنِ نام زبان).
 *   align:   "end" (پیش‌فرض) یا "start" — لبه‌ای که منو با آن هم‌تراز می‌شود.
 */
export default function LanguageSelect({ variant = "light", compact = false, align = "end" }) {
  const { lang, setLang, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const dark = variant === "dark";

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  const btnStyle = {
    display: "inline-flex", alignItems: "center", gap: compact ? 4 : 7,
    padding: compact ? "6px 9px" : "6px 12px", borderRadius: 8, cursor: "pointer",
    fontSize: 12.5, fontWeight: 600, fontFamily: THEME.font, lineHeight: 1,
    border: `1.5px solid ${dark ? "rgba(255,255,255,0.28)" : THEME.border}`,
    background: dark ? "rgba(255,255,255,0.10)" : "#fff",
    color: dark ? "#fff" : THEME.text2,
    whiteSpace: "nowrap", maxWidth: "100%",
  };

  // منو نسبت به لبه‌ی start/end دکمه هم‌تراز می‌شود؛ در RTL و LTR خودکار درست است.
  const edge = align === "start" ? (dir === "rtl" ? { right: 0 } : { left: 0 })
                                 : (dir === "rtl" ? { left: 0 } : { right: 0 });

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={btnStyle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.label}
      >
        <span style={{ fontSize: 15 }} aria-hidden="true">{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <ChevronDown size={13} style={{ opacity: 0.75, flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 6px)", ...edge, zIndex: 60,
            minWidth: 168, background: "#fff", borderRadius: 10,
            border: `1px solid ${THEME.border}`,
            boxShadow: "0 6px 24px -6px rgba(15,42,63,0.22), 0 2px 6px rgba(15,42,63,0.08)",
            padding: 5, direction: dir,
          }}
        >
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setLang(l.code); close(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%",
                  padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: active ? THEME.tealSoft : "transparent",
                  color: active ? THEME.tealDeep : THEME.text2,
                  fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: THEME.font,
                  textAlign: dir === "rtl" ? "right" : "left",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f4f6f9"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16 }} aria-hidden="true">{l.flag}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
