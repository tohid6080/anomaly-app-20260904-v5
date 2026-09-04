import React, { useState } from "react";
import { X, ClipboardList, Send, CheckCircle2 } from "lucide-react";
import { styles, THEME } from "./shared.js";
import { submitTrialRequest } from "./trialRequestApi.js";

// فهرست ساده و خواناست، فقط برای همین فرم سرنخ (Lead) — عمداً مستقل از
// HSE_MODULES/PLAN_FEATURES نگه داشته شده تا این کامپوننت عمومی (پیش از
// ورود) به کد داخلی App.jsx/SuperAdmin وابسته نشود.
const MODULE_OPTIONS = [
  "مدیریت عدم انطباق‌ها (آنومالی)",
  "مدیریت ارزیابی ریسک (BowTie / HCMS)",
  "مدیریت ورود و تردد پرسنل",
  "شاخص‌های Proactive HSE",
  "مدیریت حوادث",
  "مدیریت ماشین‌آلات",
  "مدیریت داربست",
  "داشبورد مدیریتی و گزارش‌های تحلیلی",
  "چت و آرشیو فایل‌ها",
];

/**
 * فرم عمومی «درخواست ارزیابی و پلن آزمایشی» — از صفحه‌ی ورود (بدون نیاز
 * به حساب کاربری) باز می‌شود. ثبت از طریق Edge Function عمومی
 * submit-trial-request انجام می‌شود؛ نتیجه فقط برای SuperAdmin (بخش
 * «درخواست‌های ارزیابی و پلن آزمایشی») قابل‌مشاهده است.
 */
export default function TrialRequestModal({ onClose }) {
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
      setError("نام و نام خانوادگی، موبایل و شرکت/سازمان الزامی است");
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
        style={{ background: THEME.surface, borderRadius: 16, padding: 22, maxWidth: 520, width: "100%", direction: "rtl", maxHeight: "92vh", overflowY: "auto", fontFamily: THEME.font }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <CheckCircle2 size={46} color="#166534" style={{ marginBottom: 12 }} />
            <h3 style={{ color: THEME.navy, fontSize: 16, marginBottom: 8 }}>درخواست شما ثبت شد</h3>
            <p style={{ fontSize: 12.5, color: THEME.text3, lineHeight: 1.9, marginBottom: 18 }}>
              کارشناسان ما درخواست شما را بررسی می‌کنند و برای فعال‌سازی پلن آزمایشی، از طریق همان شماره موبایل با شما تماس می‌گیرند.
            </p>
            <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 24px" }} onClick={onClose}>بستن</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, color: THEME.navy, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
                <ClipboardList size={17} color={THEME.teal} /> درخواست ارزیابی و پلن آزمایشی
              </h3>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={17} color={THEME.text3} />
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 14px", lineHeight: 1.8 }}>
              مشخصات زیر را تکمیل کنید تا برای ارزیابی رایگان و دریافت پلن آزمایشی سامانه با شما تماس بگیریم.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0 }}>
              <div>
                <label style={styles.label}>نام و نام خانوادگی *</label>
                <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} dir="rtl" />
              </div>
              <div>
                <label style={styles.label}>شماره موبایل *</label>
                <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09xxxxxxxxx" />
              </div>
              <div>
                <label style={styles.label}>شرکت / سازمان *</label>
                <input style={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} dir="rtl" />
              </div>
              <div>
                <label style={styles.label}>سمت</label>
                <input style={styles.input} value={position} onChange={(e) => setPosition(e.target.value)} dir="rtl" />
              </div>
              <div>
                <label style={styles.label}>حوزه فعالیت</label>
                <input style={styles.input} value={industry} onChange={(e) => setIndustry(e.target.value)} dir="rtl" placeholder="مثلاً پیمانکاری، نفت و گاز، ساختمانی" />
              </div>
              <div>
                <label style={styles.label}>تعداد پرسنل</label>
                <input style={styles.input} type="number" min="0" value={personnelCount} onChange={(e) => setPersonnelCount(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label style={styles.label}>نام پروژه</label>
                <input style={styles.input} value={projectName} onChange={(e) => setProjectName(e.target.value)} dir="rtl" />
              </div>
              <div>
                <label style={styles.label}>شهر / محل پروژه</label>
                <input style={styles.input} value={projectCity} onChange={(e) => setProjectCity(e.target.value)} dir="rtl" />
              </div>
              <div>
                <label style={styles.label}>ایمیل (اختیاری)</label>
                <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
            </div>

            <label style={styles.label}>ماژول‌های موردنظر</label>
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
                  {m}
                </label>
              ))}
            </div>

            <label style={styles.label}>توضیحات</label>
            <textarea style={{ ...styles.input, minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} dir="rtl" />

            {error && <p style={styles.error}>{error}</p>}

            <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleSubmit} disabled={saving}>
              <Send size={15} /> {saving ? "در حال ارسال..." : "ارسال درخواست"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
