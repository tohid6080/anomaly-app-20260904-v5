import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Sub Headerِ کوچکِ زیرِ Header برای صفحاتِ وب — یک دکمهٔ «بازگشت»، عنوانِ
 * صفحه و یک خطِ توضیحِ کوتاه (مثلاً «این قسمت توسط کارفرما تکمیل می‌شود»).
 * کاملاً با Appearance Tokens و RTL ساخته شده.
 */
export default function ModuleSubHeader({ icon: Icon, title, note, onBack, backLabel }) {
  const { dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <div style={{ direction: dir, margin: "0 0 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
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
            marginTop: 1,
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
      {Icon && (
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            flexShrink: 0,
            marginTop: 1,
            background: THEME.tealSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={THEME.tealDeep} />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: THEME.heading, lineHeight: 1.35 }}>{title}</h2>
        {note && <p style={{ margin: "3px 0 0", fontSize: 12, color: THEME.text3, lineHeight: 1.6 }}>{note}</p>}
      </div>
    </div>
  );
}
