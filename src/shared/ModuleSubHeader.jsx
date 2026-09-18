import React from "react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import BackLink from "./BackLink.jsx";

/**
 * Sub Headerِ کوچکِ زیرِ Header برای صفحاتِ وب — یک دکمهٔ «بازگشت»، عنوانِ
 * صفحه و یک خطِ توضیحِ کوتاه (مثلاً «این قسمت توسط کارفرما تکمیل می‌شود»).
 * کاملاً با Appearance Tokens و RTL ساخته شده.
 */
export default function ModuleSubHeader({ icon: Icon, title, note, onBack, backLabel, actions }) {
  const { dir } = useLanguage();
  return (
    <div style={{ direction: dir, margin: "0 0 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
        {onBack && (
          <BackLink onClick={onBack} style={{ marginBottom: 0, marginTop: 1, flexShrink: 0 }}>
            {backLabel}
          </BackLink>
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
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 1 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
