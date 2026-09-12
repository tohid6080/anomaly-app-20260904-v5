import React, { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { THEME, styles, PUBLIC_APP_URL } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadLandingPageContent, saveLandingPageContent } from "../systemConfigApi.js";
import { LANDING_DEFAULTS } from "../LandingPage.jsx";

const CATS = ["safety", "health", "env", "management", "report"];
const FOOTER_LINK_HINTS = ["امکانات", "ماژول‌ها", "پلن‌ها", "درباره سامانه", "تماس با ما", "قوانین و حریم خصوصی", "شروع رایگان", "ورود کاربران"];

/**
 * «مدیریتِ صفحه اصلی سامانه» — متنِ صفحه‌ی فرودِ عمومیِ IHMS (LandingPage.jsx،
 * پیش از ورود)، دوزبانه (فا/en). روی همان system_settings ذخیره می‌شود
 * (کلیدِ landing_page_content) — نگاه کن به systemConfigApi.js. الگوی
 * استانداردِ سراسرِ پروژه: پیش‌نویسِ محلی، نوشتنِ واقعی فقط با «ذخیره».
 * تا وقتی چیزی ذخیره نشده، ویرایشگر با همان متنِ واقعیِ زنده‌ی کد
 * (LANDING_DEFAULTS) پر می‌شود — نه فیلدهای خالی.
 */
export default function LandingPageManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [activeLang, setActiveLang] = useState("fa");
  const [baseline, setBaseline] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);

  const load = async () => {
    const saved = await loadLandingPageContent();
    const merged = {
      fa: { ...LANDING_DEFAULTS.fa, ...(saved?.fa || {}) },
      en: { ...LANDING_DEFAULTS.en, ...(saved?.en || {}) },
      de: { ...LANDING_DEFAULTS.de, ...(saved?.de || {}) },
    };
    setBaseline(merged);
    setDraft(JSON.parse(JSON.stringify(merged)));
  };
  useEffect(() => { load(); }, []);

  if (!draft) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>;

  const d = draft[activeLang];
  // جهتِ فیلدهایِ متنی از زبانِ محتوایی که در حالِ ویرایش‌اش هستیم می‌آید
  // (نه زبانِ خودِ پنلِ سوپرادمین) — آلمانی/انگلیسی همیشه LTR تایپ می‌شوند.
  const contentDir = activeLang === "fa" ? "rtl" : "ltr";
  const setField = (patch) => setDraft((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], ...patch } }));
  const setItem = (key, idx, value) => setField({ [key]: d[key].map((x, i) => (i === idx ? value : x)) });
  const removeItem = (key, idx) => setField({ [key]: d[key].filter((_, i) => i !== idx) });
  const addItem = (key, blank) => setField({ [key]: [...d[key], blank] });

  const isDirty = JSON.stringify(baseline) !== JSON.stringify(draft);

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const res = await saveLandingPageContent(draft, currentAdmin?.fullName);
    setSaving(false);
    setMsgErr(!!res?.__error);
    setMessage(res?.__error ? res.message : t("lpSaved"));
    if (!res?.__error) await load();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <p style={{ fontSize: 11.5, color: THEME.text3, lineHeight: 1.9, flex: "1 1 420px", margin: 0 }}>{t("lpIntro")}</p>
        <a href={PUBLIC_APP_URL} target="_blank" rel="noopener noreferrer"
          style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}>
          <ExternalLink size={13} /> {t("lpPreviewLive")}
        </a>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "inline-flex", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: 3, gap: 3 }}>
          {["fa", "en", "de"].map((l) => (
            <button key={l} type="button" onClick={() => setActiveLang(l)}
              style={{ border: "none", borderRadius: 7, padding: "6px 16px", fontFamily: THEME.font, fontSize: 12, fontWeight: 800, cursor: "pointer",
                background: activeLang === l ? THEME.teal : "transparent", color: activeLang === l ? "#fff" : THEME.text2 }}>{l.toUpperCase()}</button>
          ))}
        </div>
        <span style={{ fontSize: 10.5, color: THEME.text3 }}>{t("lpLangNote")}</span>
      </div>

      {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : THEME.ok, marginBottom: 10 }}>{message}</p>}

      <Section title={t("lpSecHero")}>
        <Field label={t("lpHeroEyebrow")} value={d.heroEyebrow} onChange={(v) => setField({ heroEyebrow: v })} dir={contentDir} />
        <Row>
          <Field label={t("lpHeroH1a")} value={d.heroH1a} onChange={(v) => setField({ heroH1a: v })} dir={contentDir} />
          <Field label={t("lpHeroH1b")} value={d.heroH1b} onChange={(v) => setField({ heroH1b: v })} dir={contentDir} />
        </Row>
        <Field label={t("lpHeroLede")} value={d.heroLede} onChange={(v) => setField({ heroLede: v })} dir={contentDir} textarea />
        <Row>
          <Field label={t("lpCtaPrimary")} value={d.ctaPrimary} onChange={(v) => setField({ ctaPrimary: v })} dir={contentDir} />
          <Field label={t("lpCtaPlans")} value={d.ctaPlans} onChange={(v) => setField({ ctaPlans: v })} dir={contentDir} />
          <Field label={t("lpCtaSecondary")} value={d.ctaSecondary} onChange={(v) => setField({ ctaSecondary: v })} dir={contentDir} />
        </Row>
        <StringListEditor label={t("lpTicks")} items={d.ticks} dir={contentDir} t={t}
          onChange={(i, v) => setItem("ticks", i, v)} onRemove={(i) => removeItem("ticks", i)} onAdd={() => addItem("ticks", "")} />
      </Section>

      <Section title={t("lpSecWhy")} countLabel={`${d.why.length}`}>
        <TupleListEditor items={d.why} dir={contentDir} t={t}
          onChange={(i, v) => setItem("why", i, v)} onRemove={(i) => removeItem("why", i)} onAdd={() => addItem("why", ["", ""])} />
      </Section>

      <Section title={t("lpSecFlow")} countLabel={`${d.flow.length}`}>
        <TupleListEditor items={d.flow} dir={contentDir} t={t}
          onChange={(i, v) => setItem("flow", i, v)} onRemove={(i) => removeItem("flow", i)} onAdd={() => addItem("flow", ["", ""])} />
      </Section>

      <Section title={t("lpSecModules")} countLabel={`${d.mods.length}`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
          {d.mods.map((m, i) => (
            <div key={i} style={{ background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: 9 }}>
              <input style={{ ...styles.input, fontWeight: 700, marginBottom: 6 }} value={m.title} dir={contentDir}
                onChange={(e) => setItem("mods", i, { ...m, title: e.target.value })} placeholder={t("lpFieldTitle")} />
              <textarea style={{ ...styles.input, minHeight: 46, resize: "vertical", fontSize: 12 }} value={m.desc} dir={contentDir}
                onChange={(e) => setItem("mods", i, { ...m, desc: e.target.value })} placeholder={t("lpFieldDesc")} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <select style={{ ...styles.filterSelect, fontSize: 11, padding: "5px 7px" }} value={m.category} dir={dir}
                  onChange={(e) => setItem("mods", i, { ...m, category: e.target.value })}>
                  {CATS.map((c) => <option key={c} value={c}>{t("lpCat_" + c)}</option>)}
                </select>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: THEME.text3, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!m.soon} onChange={(e) => setItem("mods", i, { ...m, soon: e.target.checked })} /> {t("lpModSoon")}
                </label>
                <button type="button" onClick={() => removeItem("mods", i)} style={{ marginInlineStart: "auto", border: "none", background: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => addItem("mods", { title: "", desc: "", category: "management", soon: false })}
          style={{ ...styles.smallButton, marginTop: 8, background: THEME.tealSoft, color: THEME.teal, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} /> {t("lpAdd")}
        </button>
      </Section>

      <Section title={t("lpSecTools")} countLabel={`${d.qtList.length}`}>
        <StringListEditor items={d.qtList} dir={contentDir} t={t} chips
          onChange={(i, v) => setItem("qtList", i, v)} onRemove={(i) => removeItem("qtList", i)} onAdd={() => addItem("qtList", "")} />
      </Section>

      <Section title={t("lpSecShowcase")}>
        <Field label={t("lpScTitle")} value={d.scH2} onChange={(v) => setField({ scH2: v })} dir={contentDir} />
        <Field label={t("lpScDesc")} value={d.scPara} onChange={(v) => setField({ scPara: v })} dir={contentDir} textarea />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.text3, margin: "8px 0 4px" }}>{t("lpScFeatures")}</div>
        <TupleListEditor items={d.scFeat} dir={contentDir} t={t}
          onChange={(i, v) => setItem("scFeat", i, v)} onRemove={(i) => removeItem("scFeat", i)} onAdd={() => addItem("scFeat", ["", ""])} />
      </Section>

      <Section title={t("lpSecMobile")}>
        <Field label={t("lpScTitle")} value={d.mbH2} onChange={(v) => setField({ mbH2: v })} dir={contentDir} />
        <Field label={t("lpScDesc")} value={d.mbPara} onChange={(v) => setField({ mbPara: v })} dir={contentDir} textarea />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.text3, margin: "8px 0 4px" }}>{t("lpScFeatures")}</div>
        <TupleListEditor items={d.mbFeat} dir={contentDir} t={t}
          onChange={(i, v) => setItem("mbFeat", i, v)} onRemove={(i) => removeItem("mbFeat", i)} onAdd={() => addItem("mbFeat", ["", ""])} />
        <Field label={t("lpMbTag")} value={d.mbTag} onChange={(v) => setField({ mbTag: v })} dir={contentDir} />
      </Section>

      <Section title={t("lpSecTrust")} countLabel={`${d.trust.length}`}>
        <StringListEditor items={d.trust} dir={contentDir} t={t}
          onChange={(i, v) => setItem("trust", i, v)} onRemove={(i) => removeItem("trust", i)} onAdd={() => addItem("trust", "")} />
      </Section>

      <Section title={t("lpSecFinal")}>
        <Field label={t("lpScTitle")} value={d.fH2} onChange={(v) => setField({ fH2: v })} dir={contentDir} />
        <Field label={t("lpScDesc")} value={d.fP} onChange={(v) => setField({ fP: v })} dir={contentDir} textarea />
        <Field label={t("lpFinalSub")} value={d.fSub} onChange={(v) => setField({ fSub: v })} dir={contentDir} />
      </Section>

      <Section title={t("lpSecFooter")}>
        <Field label={t("lpFooterBlurb")} value={d.ftBlurb} onChange={(v) => setField({ ftBlurb: v })} dir={contentDir} textarea />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.text3, margin: "8px 0 4px" }}>{t("lpFooterLinks")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 }}>
          {d.ftLinks.map((lnk, i) => (
            <input key={i} style={styles.input} value={lnk} dir={contentDir} placeholder={FOOTER_LINK_HINTS[i] || ""}
              onChange={(e) => setItem("ftLinks", i, e.target.value)} />
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, paddingTop: 14, borderTop: `1px solid ${THEME.borderSoft}` }}>
        <button type="button" onClick={handleSave} disabled={saving || !isDirty} style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !isDirty ? 0.55 : 1 }}>{t("pmSave")}</button>
        {isDirty && <span style={{ fontSize: 10.5, color: THEME.warn, fontWeight: 600 }}>●</span>}
      </div>
    </div>
  );
}

function Section({ title, countLabel, children }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <b style={{ fontSize: 12.5, color: THEME.heading }}>{title}</b>
        {countLabel && <span style={{ fontSize: 10, color: THEME.text3 }}>· {countLabel}</span>}
      </div>
      {children}
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>{children}</div>;
}
function Field({ label, value, onChange, dir, textarea }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={styles.label}>{label}</label>
      {textarea
        ? <textarea style={{ ...styles.input, minHeight: 56, resize: "vertical" }} value={value || ""} dir={dir} onChange={(e) => onChange(e.target.value)} />
        : <input style={styles.input} value={value || ""} dir={dir} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
function StringListEditor({ items, onChange, onRemove, onAdd, dir, t, chips }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, borderRadius: chips ? 999 : 8, padding: chips ? "3px 4px 3px 10px" : "4px 4px 4px 8px", flex: chips ? "0 0 auto" : "1 1 200px" }}>
            <input style={{ border: "none", background: "none", color: THEME.text, fontSize: 12, fontFamily: THEME.font, outline: "none", width: chips ? 120 : "100%" }}
              value={v} dir={dir} onChange={(e) => onChange(i, e.target.value)} />
            <button type="button" onClick={() => onRemove(i)} style={{ border: "none", background: THEME.surface, color: THEME.text3, width: 18, height: 18, borderRadius: "50%", cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} style={{ ...styles.smallButton, marginTop: 8, background: THEME.tealSoft, color: THEME.teal, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Plus size={12} /> {t("lpAdd")}
      </button>
    </div>
  );
}
function TupleListEditor({ items, onChange, onRemove, onAdd, dir, t }) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(([title, desc], i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, borderRadius: 8, padding: 7 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <input style={{ ...styles.input, fontWeight: 700 }} value={title} dir={dir} placeholder={t("lpFieldTitle")} onChange={(e) => onChange(i, [e.target.value, desc])} />
              <input style={styles.input} value={desc} dir={dir} placeholder={t("lpFieldDesc")} onChange={(e) => onChange(i, [title, e.target.value])} />
            </div>
            <button type="button" onClick={() => onRemove(i)} style={{ border: "none", background: "none", color: THEME.danger, cursor: "pointer", flexShrink: 0, marginTop: 6 }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} style={{ ...styles.smallButton, marginTop: 8, background: THEME.tealSoft, color: THEME.teal, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Plus size={12} /> {t("lpAdd")}
      </button>
    </div>
  );
}
