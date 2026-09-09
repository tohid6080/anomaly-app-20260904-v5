import React, { useMemo, useState } from "react";
import { Search, X, Star, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { THEME, usePersistedState } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { QUICK_TOOLS, QT_CATEGORIES } from "./quickToolsData.jsx";

/* ================================================================== *
 * «ابزارهای سریع HSE» — گریدِ کارتیِ ابزارها با جست‌وجو، دسته‌بندی و
 * Favorite. Mobile-first، Responsive، بدونِ API. باز کردنِ هر کارت یک
 * پنلِ ابزار (ماشین‌حساب/جدولِ مرجع) را جای همین صفحه نشان می‌دهد.
 * افزودنِ ابزارِ جدید فقط در quickToolsData.jsx (آرایهٔ QUICK_TOOLS).
 * ================================================================== */

const QT_CSS = `
.qt-grid{display:grid;grid-template-columns:1fr;gap:12px}
@media (min-width:520px){.qt-grid{grid-template-columns:1fr 1fr}}
@media (min-width:900px){.qt-grid{grid-template-columns:repeat(3,1fr)}}
@media (min-width:1260px){.qt-grid{grid-template-columns:repeat(4,1fr)}}
.qt-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.qt-chips::-webkit-scrollbar{display:none}
.qt-card{transition:transform .15s ease,box-shadow .18s ease,border-color .15s ease}
.qt-card:hover{transform:translateY(-2px);box-shadow:0 16px 32px -22px rgba(0,0,0,.4)}
`;

export default function QuickToolsDashboard({ currentUser, onBack, wide }) {
  const { lang, dir } = useLanguage();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [active, setActive] = useState(null);
  const [fav, setFav] = usePersistedState("ihms_quicktools_fav_" + (currentUser?.username || "anon"), []);

  const tr = (o) => (o && (o[lang] || o.fa)) || "";
  const toggleFav = (id) => setFav((f) => (Array.isArray(f) && f.includes(id) ? f.filter((x) => x !== id) : [...(Array.isArray(f) ? f : []), id]));
  const favList = Array.isArray(fav) ? fav : [];
  const Fwd = dir === "rtl" ? ArrowLeft : ArrowRight;
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return QUICK_TOOLS
      .filter((t) => {
        if (cat === "fav") { if (!favList.includes(t.id)) return false; }
        else if (cat !== "all" && t.cat !== cat) return false;
        if (!ql) return true;
        return tr(t.title).toLowerCase().includes(ql) || tr(t.desc).toLowerCase().includes(ql);
      })
      .sort((a, b) => (favList.includes(b.id) ? 1 : 0) - (favList.includes(a.id) ? 1 : 0));
  }, [q, cat, favList, lang]);

  const T = {
    title: { fa: "ابزارهای سریع HSE", en: "HSE Quick Tools", de: "HSE-Schnellwerkzeuge" },
    sub: { fa: "ماشین‌حساب‌ها، جدول‌های مرجع و ابزارهای تصمیم‌گیریِ سریع — برای استفاده در سایت", en: "Calculators, reference tables and quick decision tools — for use on site", de: "Rechner, Referenztabellen und schnelle Entscheidungshilfen – für den Einsatz vor Ort" },
    search: { fa: "جست‌وجوی ابزار…", en: "Search a tool…", de: "Werkzeug suchen…" },
    all: { fa: "همه", en: "All", de: "Alle" },
    fav: { fa: "برگزیده‌ها", en: "Favorites", de: "Favoriten" },
    none: { fa: "ابزاری با این فیلتر پیدا نشد", en: "No tools match this filter", de: "Keine Werkzeuge für diesen Filter" },
    back: { fa: "بازگشت به ابزارها", en: "Back to tools", de: "Zurück zu den Werkzeugen" },
    disclaimer: { fa: "این ابزارها کمکِ سریع‌اند و جایگزینِ محاسبهٔ رسمی، استانداردِ محلی یا نظرِ کارشناسِ ذی‌صلاح نیستند.", en: "These tools are quick aids and do not replace formal calculation, local standards or a competent person's judgement.", de: "Diese Werkzeuge sind Schnellhilfen und ersetzen keine formale Berechnung, lokale Normen oder das Urteil einer befähigten Person." },
  };
  const tt = (k) => T[k][lang] || T[k].fa;

  // ---- پنلِ یک ابزار ----
  if (active) {
    const tool = QUICK_TOOLS.find((t) => t.id === active);
    if (!tool) { setActive(null); return null; }
    const Tool = tool.Tool;
    const isFav = favList.includes(tool.id);
    return (
      <div style={{ direction: dir, maxWidth: 620, margin: wide ? undefined : "0 auto" }}>
        <style>{QT_CSS}</style>
        <button type="button" onClick={() => setActive(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: THEME.text2, border: `1px solid ${THEME.border}`, background: "transparent", borderRadius: 9, padding: "7px 12px", cursor: "pointer", fontFamily: THEME.font, marginBottom: 14 }}>
          <Back size={14} /> {tt("back")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <tool.icon size={20} color={THEME.tealDeep} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.heading }}>{tr(tool.title)}</div>
            <div style={{ fontSize: 12, color: THEME.text3, marginTop: 2 }}>{tr(tool.desc)}</div>
          </div>
          <button type="button" onClick={() => toggleFav(tool.id)} aria-label="favorite"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isFav ? THEME.warn : THEME.text3, flexShrink: 0 }}>
            <Star size={18} fill={isFav ? THEME.warn : "none"} />
          </button>
        </div>
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "16px 16px 18px" }}>
          <Tool lang={lang} dir={dir} />
        </div>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 12, lineHeight: 1.8 }}>{tt("disclaimer")}</p>
      </div>
    );
  }

  // ---- گریدِ ابزارها ----
  return (
    <div style={{ direction: dir }}>
      <style>{QT_CSS}</style>

      {!wide && (
        <>
          {onBack && <div onClick={onBack} style={{ cursor: "pointer", color: THEME.text3, fontSize: 12, fontWeight: 600, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><Back size={13} /> {lang === "fa" ? "بازگشت" : lang === "de" ? "Zurück" : "Back"}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Zap size={20} color={THEME.teal} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.heading }}>{tt("title")}</h2>
          </div>
          <p style={{ color: THEME.text3, fontSize: 12, marginTop: 4, marginBottom: 14, lineHeight: 1.7 }}>{tt("sub")}</p>
        </>
      )}
      {wide && (
        <p style={{ color: THEME.text3, fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.7 }}>{tt("sub")}</p>
      )}

      {/* جست‌وجو */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 11, padding: "10px 13px", marginBottom: 12 }}>
        <Search size={15} color={THEME.text3} style={{ flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt("search")}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: THEME.text, fontSize: 13.5, fontFamily: THEME.font }} />
        {q && <X size={15} color={THEME.text3} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setQ("")} />}
      </div>

      {/* دسته‌بندی */}
      <div className="qt-chips" style={{ marginBottom: 16 }}>
        {[{ key: "all", label: tt("all"), icon: null }, { key: "fav", label: `★ ${tt("fav")}`, icon: null }, ...QT_CATEGORIES.map((c) => ({ key: c.key, label: tr(c.label), icon: c.icon }))].map((c) => {
          const on = cat === c.key;
          return (
            <button key={c.key} type="button" onClick={() => setCat(c.key)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontFamily: THEME.font, whiteSpace: "nowrap",
                border: `1px solid ${on ? THEME.teal : THEME.border}`, background: on ? THEME.teal : THEME.surface, color: on ? "#fff" : THEME.text2 }}>
              {c.icon && <c.icon size={13} />} {c.label}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <p style={{ fontSize: 12.5, color: THEME.text3, textAlign: "center", padding: "36px 10px" }}>{tt("none")}</p>
      ) : (
        <div className="qt-grid">
          {list.map((t) => {
            const isFav = favList.includes(t.id);
            return (
              <div key={t.id} className="qt-card" onClick={() => setActive(t.id)}
                style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 15, padding: 15, cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, position: "relative" }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFav(t.id); }} aria-label="favorite"
                  style={{ position: "absolute", top: 10, insetInlineEnd: 10, background: "none", border: "none", cursor: "pointer", padding: 3, color: isFav ? THEME.warn : THEME.text3 }}>
                  <Star size={15} fill={isFav ? THEME.warn : "none"} />
                </button>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <t.icon size={18} color={THEME.tealDeep} />
                </span>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.heading, paddingInlineEnd: 18 }}>{tr(t.title)}</div>
                <div style={{ fontSize: 11.5, color: THEME.text2, lineHeight: 1.7, flex: 1 }}>{tr(t.desc)}</div>
                <span style={{ fontSize: 11, fontWeight: 800, color: THEME.tealDeep, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {lang === "fa" ? "باز کردن" : lang === "de" ? "Öffnen" : "Open"} <Fwd size={12} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
