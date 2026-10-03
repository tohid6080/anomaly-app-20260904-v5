import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Globe, Copy } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadMySafetyMicrosite, saveSafetyMicrosite, buildSafetyReportLink, SHOWABLE_FIELDS, DEFAULT_SHOW_FIELDS } from "./safetyMicrositeApi.js";

// تنظیماتِ مایکروسایتِ عمومیِ گزارشِ ایمنیِ شرکت — روشن/خاموش، نامِ نمایشی،
// انتخابِ آماره‌هایِ نمایش‌داده‌شده. الگویِ local-draft-سپس-commit: هیچ
// تغییری تا زدنِ «ذخیره» نوشته نمی‌شود.
export default function SafetyMicrositeSettingsPanel({ onBack, wide }) {
  const { t, dir } = useLanguage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftShowFields, setDraftShowFields] = useState(DEFAULT_SHOW_FIELDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadMySafetyMicrosite().then((rec) => {
      setRecord(rec);
      setDraftEnabled(rec?.enabled || false);
      setDraftDisplayName(rec?.displayName || "");
      setDraftShowFields(rec?.showFields || DEFAULT_SHOW_FIELDS);
      setLoading(false);
    });
  }, []);

  const baselineShowFields = record?.showFields || DEFAULT_SHOW_FIELDS;
  const dirty =
    draftEnabled !== (record?.enabled || false) ||
    draftDisplayName !== (record?.displayName || "") ||
    JSON.stringify(draftShowFields) !== JSON.stringify(baselineShowFields);

  const toggleField = (key) => setDraftShowFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setError("");
    setSaving(true);
    const res = await saveSafetyMicrosite({ id: record?.id, enabled: draftEnabled, displayName: draftDisplayName, showFields: draftShowFields });
    setSaving(false);
    if (res.__error) { setError(res.message); return; }
    const updated = await loadMySafetyMicrosite();
    setRecord(updated);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const copyLink = () => {
    if (!record?.publicToken) return;
    try {
      navigator.clipboard?.writeText(buildSafetyReportLink(record.publicToken)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }} dir={dir}>
        <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: wide ? 720 : 560, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <Globe size={17} color={THEME.heading} /> {t("smTitle")}
      </h2>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={draftEnabled} onChange={(e) => setDraftEnabled(e.target.checked)} />
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.heading }}>{t("smEnableLabel")}</span>
      </label>

      <div style={{ marginBottom: 14 }}>
        <label style={styles.label}>{t("smDisplayNameLabel")}</label>
        <input style={styles.input} value={draftDisplayName} onChange={(e) => setDraftDisplayName(e.target.value)} dir={dir} placeholder={t("smDisplayNamePlaceholder")} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>{t("smShowFieldsLabel")}</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {SHOWABLE_FIELDS.map((f) => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!draftShowFields[f.key]} onChange={() => toggleField(f.key)} />
              <span style={{ fontSize: 12.5, color: THEME.heading }}>{t(f.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 10 }}>{error}</p>}
      <button
        onClick={save} disabled={saving || !dirty}
        style={{
          padding: "10px 18px", borderRadius: 9, border: "none",
          background: dirty ? THEME.heading : THEME.surface2, color: dirty ? "#fff" : THEME.text3,
          fontWeight: 700, fontSize: 13, cursor: dirty ? "pointer" : "default",
        }}
      >
        {saving ? t("commonLoading") : savedMsg ? t("smSavedMsg") : t("commonSave")}
      </button>

      {record?.publicToken && (
        <div style={{ marginTop: 20, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12.5, color: THEME.text3, marginBottom: 8 }}>{t("smPublicLinkLabel")}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 11.5, direction: "ltr", wordBreak: "break-all", color: THEME.heading }}>{buildSafetyReportLink(record.publicToken)}</code>
            <button
              onClick={copyLink}
              style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: THEME.surface2, color: THEME.heading, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Copy size={12} /> {copied ? t("edCopiedLink") : t("edCopyLinkBtn")}
            </button>
          </div>
          {!draftEnabled && <p style={{ fontSize: 11, color: THEME.warn, marginTop: 8 }}>{t("smDisabledHint")}</p>}
        </div>
      )}
    </div>
  );
}
