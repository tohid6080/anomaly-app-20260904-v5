import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Key, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  AI_PROVIDERS, getProviderMeta, getAiSettings, isRememberedOnDevice,
  saveAiSettings, clearAiSettings, testAiConnection, setLastVerifiedStatus,
} from "./aiAssistantSettings.js";

// تنظیماتِ هوشِ مصنوعیِ شخصیِ کاربر برایِ «دستیار آموزشی HSE». الگویِ
// local-draft-سپس-commit مشابهِ SafetyMicrositeSettingsPanel.jsx: چیزی تا
// زدنِ «ذخیره» نوشته نمی‌شود. کلید هرگز به سمتِ سرورِ IHMS ارسال نمی‌شود —
// فقط مستقیماً به سرویسِ ارائه‌دهنده (برایِ تستِ اتصال/دریافتِ پاسخ).
export default function AiAssistantSettingsPanel({ currentUser, onBack }) {
  const { t, dir } = useLanguage();
  const username = currentUser?.username;

  const existing = getAiSettings(username);
  const [draftProvider, setDraftProvider] = useState(existing?.provider || AI_PROVIDERS[0].key);
  const [draftApiKey, setDraftApiKey] = useState(existing?.apiKey || "");
  const [draftRemember, setDraftRemember] = useState(isRememberedOnDevice(username));
  const [showKey, setShowKey] = useState(false);

  const [status, setStatus] = useState(existing?.apiKey ? "checking" : "notSet");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const meta = getProviderMeta(draftProvider);

  const runTest = async (provider, apiKey) => {
    if (!apiKey || !apiKey.trim()) {
      setStatus("notSet");
      setStatusMessage("");
      return;
    }
    setStatus("checking");
    setStatusMessage("");
    const res = await testAiConnection({ provider, apiKey });
    if (res.ok) {
      setStatus("connected");
      setStatusMessage("");
    } else {
      setStatus("error");
      setStatusMessage(describeAiErrorKind(res.kind, t));
    }
    setLastVerifiedStatus(username, res.ok ? "connected" : "error");
  };

  // در بازشدنِ این صفحه، اگر کلیدی از قبل ذخیره شده، یک تستِ واقعی خودکار
  // اجرا می‌شود — طبقِ قاعده: «صرفِ ذخیره‌شدنِ کلید به‌معنیِ اتصالِ موفق نیست».
  useEffect(() => {
    if (existing?.apiKey) runTest(existing.provider, existing.apiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = draftApiKey !== (existing?.apiKey || "") || draftProvider !== (existing?.provider || AI_PROVIDERS[0].key) || draftRemember !== isRememberedOnDevice(username);

  const handleTestClick = () => runTest(draftProvider, draftApiKey);

  const handleSave = async () => {
    setSaving(true);
    saveAiSettings(username, { provider: draftProvider, apiKey: draftApiKey.trim(), remember: draftRemember });
    await runTest(draftProvider, draftApiKey.trim());
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleRemove = () => {
    if (!window.confirm(t("aiRemoveConfirm"))) return;
    clearAiSettings(username);
    setDraftApiKey("");
    setDraftRemember(false);
    setStatus("notSet");
    setStatusMessage("");
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 6px" }}>
        <Key size={17} color={THEME.heading} /> {t("aiSettingsTitle")}
      </h2>
      <p style={{ fontSize: 12, color: THEME.text3, lineHeight: 1.8, margin: "0 0 18px" }}>{t("aiSettingsIntro")}</p>

      <div style={{ marginBottom: 14 }}>
        <label style={styles.label}>{t("aiProviderLabel")}</label>
        <select
          style={styles.input} value={draftProvider} dir={dir}
          onChange={(e) => setDraftProvider(e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.key} value={p.key}>{t(p.nameKey)}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={styles.label}>{t("aiApiKeyLabel")}</label>
        <div style={{ position: "relative" }}>
          <input
            type={showKey ? "text" : "password"} style={{ ...styles.input, paddingInlineEnd: 42, fontFamily: "monospace", direction: "ltr" }}
            value={draftApiKey} placeholder={t("aiApiKeyPlaceholder")} autoComplete="off" spellCheck={false}
            onChange={(e) => setDraftApiKey(e.target.value)}
          />
          <button
            type="button" onClick={() => setShowKey((v) => !v)} title={showKey ? t("aiHideKey") : t("aiShowKey")}
            style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: THEME.text3, display: "flex" }}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <a href={meta.getKeyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: THEME.teal, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 4, textDecoration: "none" }}>
        <ExternalLink size={12} /> {t("aiGetKeyLinkText")}
      </a>
      <p style={{ fontSize: 11, color: THEME.text3, lineHeight: 1.8, margin: "0 0 16px" }}>{t(meta.guideKey)}</p>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, cursor: "pointer" }}>
        <input type="checkbox" checked={draftRemember} onChange={(e) => setDraftRemember(e.target.checked)} style={{ marginTop: 3 }} />
        <span>
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.heading, display: "block" }}>{t("aiRememberLabel")}</span>
          <span style={{ fontSize: 11, color: THEME.text3, lineHeight: 1.7 }}>{t("aiRememberHint")}</span>
        </span>
      </label>

      <StatusRow status={status} message={statusMessage} t={t} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button" onClick={handleTestClick} disabled={!draftApiKey.trim() || status === "checking"}
          style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.heading, border: `1px solid ${THEME.border}`, opacity: !draftApiKey.trim() ? 0.5 : 1 }}
        >
          {status === "checking" ? <Loader2 size={13} style={{ marginInlineEnd: 6, animation: "ihms-spin 1s linear infinite" }} /> : null}
          {t("aiTestBtn")}
        </button>
        <button
          type="button" onClick={handleSave} disabled={saving || !dirty || !draftApiKey.trim()}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: dirty && draftApiKey.trim() ? THEME.heading : THEME.surface2, color: dirty && draftApiKey.trim() ? "#fff" : THEME.text3, fontWeight: 700, fontSize: 13, cursor: dirty ? "pointer" : "default" }}
        >
          {saving ? t("commonLoading") : savedMsg ? t("aiSavedMsg") : t("commonSave")}
        </button>
        {existing?.apiKey && (
          <button
            type="button" onClick={handleRemove}
            style={{ ...styles.smallButton, background: THEME.dangerBg || "rgba(239,68,68,.1)", color: THEME.danger, border: `1px solid ${THEME.danger}`, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Trash2 size={13} /> {t("aiRemoveBtn")}
          </button>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: THEME.text3, lineHeight: 1.8, marginTop: 22, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
        {t("aiPrivacyNote")}
      </p>
      <style>{`@keyframes ihms-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatusRow({ status, message, t }) {
  const map = {
    notSet: { icon: <XCircle size={14} color={THEME.text3} />, label: t("aiStatusNotSet"), color: THEME.text3 },
    checking: { icon: <Loader2 size={14} color={THEME.warn} style={{ animation: "ihms-spin 1s linear infinite" }} />, label: t("aiStatusChecking"), color: THEME.warn },
    connected: { icon: <CheckCircle2 size={14} color={THEME.ok} />, label: t("aiStatusConnected"), color: THEME.ok },
    error: { icon: <XCircle size={14} color={THEME.danger} />, label: t("aiStatusError"), color: THEME.danger },
  };
  const s = map[status] || map.notSet;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: s.color, marginTop: 10 }}>
      {s.icon} {s.label}
      {message && <span style={{ fontWeight: 400, color: THEME.text3 }}>— {message}</span>}
    </div>
  );
}

export function describeAiErrorKind(kind, t) {
  if (kind === "invalid_key") return t("aiErrInvalidKey");
  if (kind === "quota") return t("aiErrQuota");
  if (kind === "network") return t("aiErrNetwork");
  return t("aiErrUnknown");
}
