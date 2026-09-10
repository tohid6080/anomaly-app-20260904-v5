import React, { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * آیکونِ کوچکِ «؟» کنارِ یک فیلد — با کلیک، یک توضیحِ کوتاه باز می‌شود؛
 * با کلیک بیرون یا Escape بسته می‌شود. برای فیلدهایی که معنا/اثرشان
 * (مثلاً در محاسبات ایمنی) شاید برای هر کاربری روشن نباشد.
 */
export default function InfoHint({ text }) {
  const { dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="?"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
      >
        <HelpCircle size={13} color={open ? THEME.teal : THEME.text3} />
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute", top: "calc(100% + 6px)", ...(dir === "rtl" ? { right: 0 } : { left: 0 }),
            zIndex: 50, width: 220, background: THEME.surface, border: `1px solid ${THEME.border}`,
            borderRadius: 9, boxShadow: "0 8px 22px -8px rgba(0,0,0,.3)", padding: "9px 11px",
            fontSize: 11.5, fontWeight: 500, color: THEME.text2, lineHeight: 1.8, fontFamily: THEME.font, direction: dir,
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
