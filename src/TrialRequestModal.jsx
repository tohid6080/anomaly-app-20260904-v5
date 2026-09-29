import React, { useEffect, useRef, useState } from "react";
import { X, ClipboardList, Send, CheckCircle2 } from "lucide-react";
import { styles, THEME, TURNSTILE_SITE_KEY } from "./shared.js";
import { submitTrialSignup } from "./trialRequestApi.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// ویجتِ Cloudflare Turnstile را با API صریح (نه خودکار) رندر می‌کند — چون
// این مودال بارها باز/بسته می‌شود، رندرِ خودکار (پیش‌فرضِ اسکریپت) فقط در
// اولین بارِ لودشدنِ اسکریپت اجرا می‌شود و در بازکردن‌های بعدی هیچ ویجتی
// نشان نمی‌دهد. توکنِ حاصل یک‌بارمصرف است؛ resetTurnstile بعدِ هر تلاشِ
// ثبت‌نام (موفق یا ناموفق) یک چالشِ تازه می‌سازد.
function useTurnstile(onToken) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || !TURNSTILE_SITE_KEY) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => { if (!cancelled) onToken(token); },
        "expired-callback": () => { if (!cancelled) onToken(""); },
        "error-callback": () => { if (!cancelled) onToken(""); },
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (!script) {
        script = document.createElement("script");
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* بی‌اهمیت */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (widgetIdRef.current != null && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* بی‌اهمیت */ }
    }
  };

  return { containerRef, reset };
}

/**
 * فرم عمومی «درخواست ارزیابی و پلن آزمایشی» — از صفحه‌ی ورود (بدون نیاز
 * به حساب کاربری) باز می‌شود. ثبت از طریق Edge Function عمومی
 * submit-trial-signup انجام می‌شود؛ برخلافِ نسخه‌ی قبلی (صرفاً یک سرنخِ
 * منتظرِ بررسیِ دستی)، همین‌جا شرکت + حساب کارفرما (با همین نام‌کاربری/
 * رمز) + حساب پیمانکار (خودکار) + دورهٔ آزمایشیِ ۳۰روزه با همه‌ی ماژول‌ها
 * بلافاصله ساخته می‌شوند — بدونِ نیاز به فعال‌سازیِ دستیِ SuperAdmin.
 */
export default function TrialRequestModal({ onClose }) {
  const { t, dir } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [contractorUsername, setContractorUsername] = useState("");
  const [contractorPassword, setContractorPassword] = useState("");
  const [contractorConfirmPassword, setContractorConfirmPassword] = useState("");
  const [position, setPosition] = useState("");
  const [industry, setIndustry] = useState("");
  const [personnelCount, setPersonnelCount] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile(setTurnstileToken);

  const handleSubmit = async () => {
    setError("");
    if (!fullName.trim() || !phone.trim() || !companyName.trim() || !username.trim() || !password
      || !contractorName.trim() || !contractorUsername.trim() || !contractorPassword) {
      setError(t("trmErrRequiredFields"));
      return;
    }
    if (password.length < 8 || contractorPassword.length < 8) {
      setError(t("trmErrPasswordShort"));
      return;
    }
    if (password !== confirmPassword || contractorPassword !== contractorConfirmPassword) {
      setError(t("trmErrPasswordMismatch"));
      return;
    }
    if (username.trim() === contractorUsername.trim()) {
      setError(t("trmErrUsernamesMustDiffer"));
      return;
    }
    if (!turnstileToken) {
      setError(t("trmErrCaptchaRequired"));
      return;
    }
    setSaving(true);
    const res = await submitTrialSignup({
      fullName: fullName.trim(), phone: phone.trim(), companyName: companyName.trim(),
      username: username.trim(), password,
      contractorName: contractorName.trim(), contractorUsername: contractorUsername.trim(), contractorPassword,
      position: position.trim(), industry: industry.trim(),
      personnelCount: personnelCount ? Number(personnelCount) : null,
      projectName: projectName.trim(), projectCity: projectCity.trim(), email: email.trim(),
      description: description.trim(),
      turnstileToken,
    });
    setSaving(false);
    // توکنِ Turnstile یک‌بارمصرف است — چه موفق چه ناموفق، برای تلاشِ بعدی
    // باید یک چالشِ تازه حل شود.
    resetTurnstile();
    setTurnstileToken("");
    if (res?.__error) { setError(res.message); return; }
    setResult(res);
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
        {result ? (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <CheckCircle2 size={46} color={THEME.ok} style={{ marginBottom: 12 }} />
            <h3 style={{ color: THEME.heading, fontSize: 16, marginBottom: 8 }}>{t("trmDoneTitle")}</h3>
            <p style={{ fontSize: 12.5, color: THEME.text3, lineHeight: 1.9, marginBottom: 18 }}>
              {t("trmDoneBody")}
            </p>
            <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 24px" }} onClick={onClose}>{t("saClose")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, color: THEME.heading, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
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
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: THEME.heading, margin: "10px 0 4px" }}>{t("trmLoginSectionTitle")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
              <div>
                <label style={styles.label}>{t("trmUsernameReq")}</label>
                <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>{t("trmPasswordReq")}</label>
                <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>{t("trmConfirmPasswordReq")}</label>
                <input style={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" />
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: THEME.heading, margin: "10px 0 4px" }}>{t("trmContractorSectionTitle")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
              <div>
                <label style={styles.label}>{t("trmContractorNameReq")}</label>
                <input style={styles.input} value={contractorName} onChange={(e) => setContractorName(e.target.value)} dir={dir} />
              </div>
              <div>
                <label style={styles.label}>{t("trmContractorUsernameReq")}</label>
                <input style={styles.input} value={contractorUsername} onChange={(e) => setContractorUsername(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>{t("trmContractorPasswordReq")}</label>
                <input style={styles.input} type="password" value={contractorPassword} onChange={(e) => setContractorPassword(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>{t("trmContractorConfirmPasswordReq")}</label>
                <input style={styles.input} type="password" value={contractorConfirmPassword} onChange={(e) => setContractorConfirmPassword(e.target.value)} dir="ltr" />
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: THEME.heading, margin: "10px 0 4px" }}>{t("trmMoreInfoSectionTitle")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
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

            <label style={styles.label}>{t("trmNotes")}</label>
            <textarea style={{ ...styles.input, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} dir={dir} />

            <div ref={turnstileRef} style={{ margin: "14px 0 4px", display: "flex", justifyContent: "center" }} />

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
