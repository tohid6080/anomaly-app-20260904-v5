import React, { useState } from "react";
import { X, ClipboardList, Send, CheckCircle2 } from "lucide-react";
import { styles, THEME } from "./shared.js";
import { submitTrialRequest, TRIAL_MODULE_LABEL_KEYS } from "./trialRequestApi.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";

// فهرست ساده و خواناست، فقط برای همین فرم سرنخ (Lead) — عمداً مستقل از
// HSE_MODULES/PLAN_FEATURES نگه داشته شده تا این کامپوننت عمومی (پیش از
// ورود) به کد داخلی App.jsx/SuperAdmin وابسته نشود.
const MODULE_OPTIONS = ["anomaly", "risk", "personnel", "proactive", "incident", "machinery", "scaffold", "dashboard", "chat_archive"];

/**
 * فرم عمومی «درخواست ارزیابی و پلن آزمایشی» — از صفحه‌ی ورود (بدون نیاز
 * به حساب کاربری) باز می‌شود. ثبت از طریق Edge Function عمومی
 * submit-trial-request انجام می‌شود؛ نتیجه فقط برای SuperAdmin (بخش
 * «درخواست‌های ارزیابی و پلن آزمایشی») قابل‌مشاهده است.
 */
export default function TrialRequestModal({ onClose }) {
  const { t, dir } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [industry, setIndustry] = useState("");
  const [personnelCount, setPersonnelCount] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [email, setEmail] = useState("");
  const [desiredModules, setDesiredModules] = useState([]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const toggleModule = (m) => {
    setDesiredModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleSubmit = async () => {
    setError("");
    if (!fullName.trim() || !phone.trim() || !companyName.trim()) {
      setError(t("trmErrRequiredFields"));
      return;
    }
    setSaving(true);
    const result = await submitTrialRequest({
      fullName: fullName.trim(), phone: phone.trim(), companyName: companyName.trim(),
      position: position.trim(), industry: industry.trim(),
      personnelCount: personnelCount ? Number(personnelCount) : null,
      projectName: projectName.trim(), projectCity: projectCity.trim(), email: email.trim(),
      desiredModules, description: description.trim(),
    });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDone(true);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: THEME.surface, borderRadius: 16, padding: 22, maxWidth: 520, width: "100%", direction: dir, maxHeight: "92vh", overflowY: "auto", fontFamily: THEME.font }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <CheckCircle2 size={46} color="#166534" style={{ marginBottom: 12 }} />
            <h3 style={{ color: THEME.navy, fontSize: 16, marginBottom: 8 }}>{t("trmDoneTitle")}</h3>
            <p style={{ fontSize: 12.5, color: THEME.text3, lineHeight: 1.9, marginBottom: 18 }}>
              {t("trmDoneBody")}
            </p>
            <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 24px" }} onClick={onClose}>{t("saClose")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, color: THEME.navy, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
                <ClipboardList size={17} color={THEME.teal} /> {t("trmTitle")}
              </h3>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={17} color={THEME.text3} />
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 14px", lineHeight: 1.8 }}>
              {t("trmIntro")}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
              <div>
                <label style={styles.label}>{t("trmFullNameReq")}</label>
                <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmPhoneReq")}</label>
                <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09xxxxxxxxx" />
              </div>
              <div>
                <label style={styles.label}>{t("trmCompanyReq")}</label>
                <input style={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmPosition")}</label>
                <input style={styles.input} value={position} onChange={(e) => setPosition(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmIndustry")}</label>
                <input style={styles.input} value={industry} onChange={(e) => setIndustry(e.target.value)} dir={dir} placeholder={t("trmIndustryPlaceholder")} />
              </div>
              <div>
                <label style={styles.label}>{t("trmPersonnelCount")}</label>
                <input style={styles.input} type="number" min="0" value={personnelCount} onChange={(e) => setPersonnelCount(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>{t("trmProjectName")}</label>
                <input style={styles.input} value={projectName} onChange={(e) => setProjectName(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmProjectCity")}</label>
                <input style={styles.input} value={projectCity} onChange={(e) => setProjectCity(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmEmailOptional")}</label>
                <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
            </div>

            <label style={styles.label}>{t("trmDesiredModules")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
              {MODULE_OPTIONS.map((m) => (
                <label
                  key={m}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "6px 10px", borderRadius: 999, cursor: "pointer",
                    background: desiredModules.includes(m) ? THEME.teal : THEME.bg,
                    color: desiredModules.includes(m) ? "#fff" : THEME.text2,
                    border: `1px solid ${desiredModules.includes(m) ? THEME.teal : THEME.border}`,
                  }}
                >
                  <input type="checkbox" checked={desiredModules.includes(m)} onChange={() => toggleModule(m)} style={{ display: "none" }} />
                  {t(TRIAL_MODULE_LABEL_KEYS[m] || m)}
                </label>
              ))}
            </div>

            <label style={styles.label}>{t("trmNotes")}</label>
            <textarea style={{ ...styles.input, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} dir={dir} />

            {error && <p style={styles.error}>{error}</p>}

            <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleSubmit} disabled={saving}>
              <Send size={15} /> {saving ? t("sbsSending") : t("trmSubmit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
