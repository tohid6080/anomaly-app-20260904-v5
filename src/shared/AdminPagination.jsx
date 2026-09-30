import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// کنترل‌های صفحه‌بندی/جستجویِ سمتِ سرور — مشترک بینِ SuperAdminPanel.jsx
// (CompaniesPage/TrialRequestsPage) و AccountManagement.jsx، چون این دو
// فایل نمی‌توانند مستقیم از هم import کنند (AccountManagement از قبل
// داخل SuperAdminPanel.jsx import می‌شود؛ برعکسش import حلقوی می‌سازد).

export const ADMIN_PAGE_SIZE = 20;

const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${THEME.border}`, fontSize: 12.5, fontFamily: THEME.font, boxSizing: "border-box" };
const btnStyle = (bg) => ({ padding: "7px 14px", borderRadius: 8, border: "none", background: bg || THEME.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font });

export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function PageNav({ page, totalPages, onChange }) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} style={{ ...btnStyle(THEME.navyMid), padding: "5px 10px", fontSize: 11, opacity: page <= 1 ? 0.4 : 1 }}>
        {t("commonPrevPage")}
      </button>
      <span style={{ fontSize: 11.5, color: THEME.text3, whiteSpace: "nowrap" }}>{t("commonPageOf", { page, total: totalPages })}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} style={{ ...btnStyle(THEME.navyMid), padding: "5px 10px", fontSize: 11, opacity: page >= totalPages ? 0.4 : 1 }}>
        {t("commonNextPage")}
      </button>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  const { dir } = useLanguage();
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 160, maxWidth: 260 }}>
      <Search size={13} color={THEME.text3} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", insetInlineStart: 10, pointerEvents: "none" }} />
      <input
        style={{ ...inputStyle, paddingInlineStart: 30 }}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir}
      />
    </div>
  );
}
