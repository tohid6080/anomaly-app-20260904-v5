import React, { useEffect, useMemo, useState } from "react";
import { Copy, Check, Search, Send } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPersonnelList } from "../personnel/personnelApi.js";
import { buildSurveyLink, setSurveyRecipients } from "./surveyApi.js";

/**
 * فهرستِ پخش — پرسنلِ شرکت را نشان می‌دهد؛ مدیر پیامِ دعوت را برای هر نفر
 * کپی می‌کند و «ارسال شد» را علامت می‌زند (ردیابیِ پوششِ سمتِ مدیر — بدونِ
 * سامانهٔ پیامکِ داخلی).
 */
export default function SurveyDistribute({ survey, onBack, wide, onSaved }) {
  const { t, dir } = useLanguage();
  const [people, setPeople] = useState(null);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState(() => new Set(Array.isArray(survey.settings?.sentTo) ? survey.settings.sentTo : []));
  const [copiedId, setCopiedId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPersonnelList().then((list) => setPeople(list.filter((p) => (p.employmentStatus || "active") === "active"))); }, []);

  const link = buildSurveyLink(survey.publicToken);
  const message = `${survey.title || t("svUntitled")}\n${survey.settings?.mode === "exam" ? t("svDistMsgExam") : t("svDistMsgSurvey")}\n${link}`;

  const filtered = useMemo(() => {
    const list = people || [];
    if (!q.trim()) return list;
    const s = q.trim();
    return list.filter((p) => (p.fullName || "").includes(s) || (p.phone || "").includes(s) || (p.jobTitle || "").includes(s));
  }, [people, q]);

  const copyFor = (p) => {
    navigator.clipboard?.writeText(message + (p.fullName ? `\n(${p.fullName})` : ""));
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1500);
  };
  const copyLink = () => { navigator.clipboard?.writeText(message); setCopiedId("__all"); setTimeout(() => setCopiedId(null), 1500); };

  const toggleSent = (id) => setSent((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    setSaving(true);
    const res = await setSurveyRecipients(survey, Array.from(sent));
    setSaving(false);
    if (!res?.__error) onSaved && onSaved();
  };

  const dirty = useMemo(() => {
    const base = new Set(Array.isArray(survey.settings?.sentTo) ? survey.settings.sentTo : []);
    if (base.size !== sent.size) return true;
    for (const x of sent) if (!base.has(x)) return true;
    return false;
  }, [sent, survey]);

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 780, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <h3 style={{ margin: "0 0 4px", color: THEME.heading, fontSize: 15, fontWeight: 800 }}>{t("svDistTitle")}</h3>
      <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 12px", lineHeight: 1.8 }}>{t("svDistIntro")}</p>

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <label style={styles.label}>{t("svDistMessage")}</label>
        <textarea readOnly style={{ ...styles.input, minHeight: 68, resize: "vertical", direction: "ltr", fontSize: 12 }} value={message} />
        <button type="button" onClick={copyLink} style={{ ...styles.smallButton, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {copiedId === "__all" ? <Check size={13} /> : <Copy size={13} />} {t("svDistCopyMessage")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={13} style={{ position: "absolute", insetInlineStart: 9, top: 10, color: THEME.text3 }} />
          <input style={{ ...styles.input, paddingInlineStart: 28 }} placeholder={t("svDistSearch")} value={q} onChange={(e) => setQ(e.target.value)} dir={dir} />
        </div>
        <span style={{ fontSize: 11.5, color: THEME.text3 }}>{t("svDistSentCount", { sent: sent.size, total: (people || []).length })}</span>
        <button type="button" onClick={save} disabled={saving || !dirty} style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !dirty ? 0.55 : 1 }}>{t("svSave")}</button>
      </div>

      {people === null && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {people && filtered.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("svDistNoPeople")}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((p) => {
          const on = sent.has(p.id);
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: `1px solid ${on ? THEME.teal : THEME.border}`, background: on ? THEME.tealSoft : "transparent" }}>
              <input type="checkbox" checked={on} onChange={() => toggleSent(p.id)} style={{ width: 16, height: 16, accentColor: THEME.teal }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{p.fullName || "—"}</div>
                <div style={{ fontSize: 10.5, color: THEME.text3 }}>{[p.jobTitle, p.phone, p.contractorName].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <button type="button" onClick={() => copyFor(p)} style={{ ...styles.smallButton, fontSize: 11, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {copiedId === p.id ? <Check size={12} /> : <Send size={12} />} {t("svDistCopyOne")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
