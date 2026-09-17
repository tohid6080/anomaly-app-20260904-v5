import React, { useState, useEffect } from "react";
import { X, Copy, Send, KeyRound } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { isoToJalali } from "../personnel/jalaliDate.jsx";
import { resetAccountPassword } from "./superAdminApi.js";

const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${THEME.border}`, fontSize: 12.5, fontFamily: THEME.font, boxSizing: "border-box" };
const btnStyle = (bg) => ({ padding: "7px 14px", borderRadius: 8, border: "none", background: bg || THEME.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font });

const LANGS = ["fa", "en", "de"];
const LANG_LABEL = { fa: "فارسی", en: "English", de: "Deutsch" };

// این‌ها محتوای پیامِ سه‌زبانه‌اند (نه chrome رابط کاربری) — عمداً مستقل از
// translate()/t() نگه داشته شده‌اند، چون هر سه‌زبان همزمان قابل‌مشاهده و
// ویرایش‌اند (نه فقط زبانِ فعلیِ سایت).
const ROLE_LABELS = {
  fa: { employer: "کارفرما", hse_supervisor: "سرپرست/مدیر کارفرما", admin: "ادمین", contractor: "پیمانکار" },
  en: { employer: "Employer", hse_supervisor: "Employer Supervisor/Manager", admin: "Admin", contractor: "Contractor" },
  de: { employer: "Arbeitgeber", hse_supervisor: "Arbeitgeber-Aufsicht/Manager", admin: "Admin", contractor: "Auftragnehmer" },
};

const STRINGS = {
  fa: {
    greeting: "با سلام و احترام،",
    welcome: (name) => `به سامانه مدیریت یکپارچه HSE (IHMS) خوش آمدید.\nشرکت «${name}» با موفقیت در سامانه ثبت شد.`,
    trial: (days, start, end) => `دوره‌ی آزمایشی شما به مدت ${days} روز، از تاریخ ${start} تا ${end}، فعال است.`,
    credentialsTitle: "اطلاعات ورود به سامانه:",
    username: "نام کاربری",
    password: "رمز عبور",
    passwordExisting: "(نزد شما موجود است)",
    closing: "در صورت هرگونه سوال، در خدمت شما هستیم.\nبا احترام،\nتیم پشتیبانی IHMS",
  },
  en: {
    greeting: "Hello,",
    welcome: (name) => `Welcome to the Integrated HSE Management System (IHMS).\nThe company "${name}" has been successfully registered.`,
    trial: (days, start, end) => `Your trial period is active for ${days} days, from ${start} to ${end}.`,
    credentialsTitle: "Your login credentials:",
    username: "Username",
    password: "Password",
    passwordExisting: "(already provided to you)",
    closing: "If you have any questions, feel free to reach out.\nBest regards,\nIHMS Support Team",
  },
  de: {
    greeting: "Hallo,",
    welcome: (name) => `Willkommen beim Integrierten HSE-Managementsystem (IHMS).\nDas Unternehmen „${name}“ wurde erfolgreich registriert.`,
    trial: (days, start, end) => `Ihre Testphase ist für ${days} Tage aktiv, vom ${start} bis ${end}.`,
    credentialsTitle: "Ihre Anmeldedaten:",
    username: "Benutzername",
    password: "Passwort",
    passwordExisting: "(liegt Ihnen bereits vor)",
    closing: "Bei Fragen stehen wir Ihnen gerne zur Verfügung.\nMit freundlichen Grüßen,\nDas IHMS-Support-Team",
  },
};

// همیشه اول ۱۰ کاراکتر (YYYY-MM-DD) را جدا می‌کند — چون trial_start/end از
// دیتابیس معمولاً timestamptz کامل برمی‌گردند (نه فقط تاریخ خام)، و
// isoToJalali روی رشته‌ی کامل خطا می‌دهد (همان الگوی toJalaliSafe در
// jalaliDate.jsx، اما اینجا با lang صریح چون سه‌زبان همزمان لازم‌اند، نه
// فقط زبانِ فعلیِ سایت).
function formatDateForLang(value, lang) {
  if (!value) return "";
  const datePart = String(value).slice(0, 10);
  if (lang === "fa") {
    const p = isoToJalali(datePart);
    if (!p) return "";
    return `${p[0]}/${String(p[1]).padStart(2, "0")}/${String(p[2]).padStart(2, "0")}`;
  }
  return datePart;
}

function accountKey(a) { return `${a.type}-${a.id}`; }
// برای برچسبِ نمایشی نقشِ واقعیِ حساب (شاملِ "admin") حفظ می‌شود، اما برای
// صدازدنِ resetAccountPassword باید یکی از سه targetType معتبرِ
// manage-account باشد — "admin" جدولش هم employer_accounts است، پس روی
// "employer" نگاشت می‌شود (نگاه کنید به TABLE_BY_TYPE در manage-account/index.ts).
function roleKeyOf(a) {
  if (a.type === "contractor") return "contractor";
  if (a.role === "hse_supervisor") return "hse_supervisor";
  if (a.role === "admin") return "admin";
  return "employer";
}
function targetTypeOf(a) {
  const rk = roleKeyOf(a);
  return rk === "admin" ? "employer" : rk;
}

export default function WelcomeMessageModal({ company, accounts, onClose, onPasswordsChanged }) {
  const { t, dir } = useLanguage();
  const [activeLang, setActiveLang] = useState("fa");
  const [included, setIncluded] = useState(() => new Set(accounts.map(accountKey)));
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [knownPasswords, setKnownPasswords] = useState({});
  const [busyKey, setBusyKey] = useState("");
  const [errByKey, setErrByKey] = useState({});
  const [texts, setTexts] = useState({ fa: null, en: null, de: null });
  const [copiedLang, setCopiedLang] = useState("");

  const hasTrial = company.subscriptionType === "trial" && !!company.trialStart && !!company.trialEnd;
  const trialDays = hasTrial ? Math.max(0, Math.round((new Date(company.trialEnd) - new Date(company.trialStart)) / 86400000)) : 0;

  const composeMessage = (lang) => {
    const S = STRINGS[lang];
    const parts = [S.greeting, "", S.welcome(company.name)];
    if (hasTrial) {
      parts.push("", S.trial(trialDays, formatDateForLang(company.trialStart, lang), formatDateForLang(company.trialEnd, lang)));
    }
    const lines = accounts.filter((a) => included.has(accountKey(a))).map((a) => {
      const pass = knownPasswords[accountKey(a)];
      const roleLabel = ROLE_LABELS[lang][roleKeyOf(a)] || roleKeyOf(a);
      return `- ${a.name} (${roleLabel}) — ${S.username}: ${a.username} — ${S.password}: ${pass || S.passwordExisting}`;
    });
    if (lines.length > 0) parts.push("", S.credentialsTitle, lines.join("\n"));
    parts.push("", S.closing);
    return parts.join("\n");
  };

  const regenerate = (lang) => setTexts((prev) => ({ ...prev, [lang]: composeMessage(lang) }));

  // پیش‌نویسِ اولیه‌ی هر سه زبان فقط یک‌بار، هنگامِ باز شدنِ مودال، ساخته
  // می‌شود — بعد از آن فقط با کلیکِ صریحِ «بازسازی» عوض می‌شود، تا ویرایشِ
  // دستیِ ادمین در تکست‌باکس هرگز بی‌سروصدا از بین نرود.
  useEffect(() => {
    LANGS.forEach((l) => regenerate(l));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleIncluded = (a) => {
    const key = accountKey(a);
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSetPassword = async (a) => {
    const key = accountKey(a);
    const pass = passwordDrafts[key] || "";
    if (pass.length < 8) { setErrByKey((p) => ({ ...p, [key]: t("errPasswordMin8") })); return; }
    setBusyKey(key);
    setErrByKey((p) => ({ ...p, [key]: "" }));
    const result = await resetAccountPassword(targetTypeOf(a), a.id, pass);
    setBusyKey("");
    if (result?.__error) { setErrByKey((p) => ({ ...p, [key]: result.message })); return; }
    setKnownPasswords((p) => ({ ...p, [key]: pass }));
    setPasswordDrafts((p) => ({ ...p, [key]: "" }));
    onPasswordsChanged && onPasswordsChanged();
  };

  const handleCopy = (lang) => {
    navigator.clipboard?.writeText(texts[lang] || "").then(() => {
      setCopiedLang(lang);
      setTimeout(() => setCopiedLang(""), 2000);
    });
  };

  const primaryEmail = accounts.find((a) => roleKeyOf(a) === "employer" && a.email)?.email;
  const mailtoHref = primaryEmail
    ? `mailto:${primaryEmail}?subject=${encodeURIComponent(t("saWelcomeMessageEmailSubject", { name: company.name }))}&body=${encodeURIComponent(texts[activeLang] || "")}`
    : null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: THEME.surface, borderRadius: 14, padding: 20, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", direction: dir }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.heading, margin: 0 }}>{t("saWelcomeMessageTitle", { name: company.name })}</h4>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.text3 }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <h5 style={{ fontSize: 12, fontWeight: 700, color: THEME.heading, margin: "0 0 6px" }}>{t("saCompanyAccountsTitle")}</h5>
          <p style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 8, lineHeight: 1.8 }}>{t("saWelcomePasswordNote")}</p>
          {accounts.map((a) => {
            const key = accountKey(a);
            return (
              <div key={key} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${THEME.border}` }}>
                <input type="checkbox" checked={included.has(key)} onChange={() => toggleIncluded(a)} title={t("saIncludeInMessage")} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: THEME.text2 }}>{a.name}</span>
                <span style={{ fontSize: 11, direction: "ltr", color: THEME.text3 }}>({a.username})</span>
                {knownPasswords[key] && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: THEME.okBg, color: THEME.ok, fontWeight: 600 }}>{t("saPasswordSetOk")}</span>
                )}
                <div style={{ marginInlineStart: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="text" placeholder={t("saNewPasswordMin8")} dir="ltr"
                    value={passwordDrafts[key] || ""} onChange={(e) => setPasswordDrafts((p) => ({ ...p, [key]: e.target.value }))}
                    style={{ ...inputStyle, width: 170 }}
                  />
                  <button type="button" onClick={() => handleSetPassword(a)} disabled={busyKey === key} style={{ ...btnStyle(THEME.warn), display: "flex", alignItems: "center", gap: 4 }}>
                    <KeyRound size={11} /> {busyKey === key ? t("saSubmittingEllipsis") : t("saSetPasswordBtn")}
                  </button>
                </div>
                {errByKey[key] && <p style={{ width: "100%", fontSize: 10.5, color: THEME.danger, margin: "2px 0 0" }}>{errByKey[key]}</p>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 8 }}>
          {LANGS.map((l) => (
            <button key={l} type="button" onClick={() => setActiveLang(l)} style={{ ...btnStyle(l === activeLang ? THEME.navyDeep : THEME.navyMid), opacity: l === activeLang ? 1 : 0.75 }}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>

        <textarea
          value={texts[activeLang] || ""} onChange={(e) => setTexts((p) => ({ ...p, [activeLang]: e.target.value }))}
          dir={activeLang === "fa" ? "rtl" : "ltr"}
          style={{ ...inputStyle, minHeight: 220, resize: "vertical", lineHeight: 1.8 }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => regenerate(activeLang)} style={btnStyle(THEME.navyMid)}>{t("saRegenerateText")}</button>
          <button type="button" onClick={() => handleCopy(activeLang)} style={{ ...btnStyle(), display: "flex", alignItems: "center", gap: 6 }}>
            <Copy size={13} /> {copiedLang === activeLang ? t("saCopiedOk") : t("saCopyText")}
          </button>
          {mailtoHref ? (
            <a href={mailtoHref} style={{ ...btnStyle(THEME.ok), display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Send size={13} /> {t("saSendByEmail")}
            </a>
          ) : (
            <span style={{ fontSize: 10.5, color: THEME.text3 }}>{t("saNoEmployerEmail")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
