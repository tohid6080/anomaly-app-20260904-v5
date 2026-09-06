import React, { useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { THEME } from "../shared.js";
import { superAdminLogin } from "./superAdminApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function SuperAdminLogin({ onLogin }) {
  const { t, dir, lang, setLang } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await superAdminLogin(username, password);
    setLoading(false);
    if (result?.__error) { setError(result.message); return; }
    onLogin(result);
  };

  const langBtn = (value, label) => (
    <button
      type="button" onClick={() => setLang(value)}
      style={{
        padding: "5px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
        border: `1.5px solid ${lang === value ? THEME.teal : THEME.border}`,
        background: lang === value ? THEME.teal : "#fff", color: lang === value ? "#fff" : THEME.text2,
        fontFamily: THEME.font,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: THEME.navyDeep, fontFamily: THEME.font, padding: 20, direction: dir }}>
      <div style={{ background: THEME.surface, borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
          {langBtn("fa", "فارسی")}
          {langBtn("en", "English")}
        </div>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: THEME.navyDeep, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ShieldAlert size={26} color="#fff" />
        </div>
        <h2 style={{ fontSize: 17, color: THEME.navy, fontWeight: 700, margin: "0 0 4px" }}>Super Admin</h2>
        <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 24px" }}>{t("superAdminLoginTagline")}</p>

        <div style={{ textAlign: dir === "rtl" ? "right" : "left", marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 6 }}>{t("username")}</label>
          <input
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, fontSize: 14, fontFamily: THEME.font, boxSizing: "border-box" }}
            value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr"
          />
        </div>
        <div style={{ textAlign: dir === "rtl" ? "right" : "left", marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 6 }}>{t("password")}</label>
          <input
            type="password" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, fontSize: 14, fontFamily: THEME.font, boxSizing: "border-box" }}
            value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p style={{ color: THEME.danger, fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

        <button
          type="button" onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", background: THEME.navyDeep, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: THEME.font }}
        >
          <Lock size={14} /> {loading ? t("loggingIn") : t("loginButton")}
        </button>
      </div>
    </div>
  );
}
