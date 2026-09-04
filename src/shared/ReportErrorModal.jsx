import React, { useState } from "react";
import { X, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { submitErrorReport } from "../errorReportsApi.js";

/**
 * قابلیت عمومی «گزارش خطا» — از هر جای سامانه (هدر داشبورد، یا صفحه‌ی
 * خطای ErrorBoundary) قابل بازکردن است. کاربر فقط شرح خطا را می‌نویسد؛
 * کاربر، زمان، ماژول/صفحه و اطلاعات فنی (در صورت وجود) خودکار همراه
 * گزارش به SuperAdmin ارسال می‌شود.
 */
export default function ReportErrorModal({ currentUser, moduleKey, pageLabel, technicalMessage, technicalStack, onClose }) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) { setError("شرح خطا الزامی است"); return; }
    setError("");
    setSaving(true);
    const result = await submitErrorReport({
      currentUser, moduleKey: moduleKey || "", pageLabel: pageLabel || "",
      description, technicalMessage: technicalMessage || "", technicalStack: technicalStack || "",
    });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDone(true);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,0.55)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div style={{ background: THEME.surface, borderRadius: 14, padding: 20, maxWidth: 440, width: "100%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <CheckCircle2 size={40} color="#166534" style={{ marginBottom: 10 }} />
            <h3 style={{ color: THEME.navy, fontSize: 14, marginBottom: 6 }}>گزارش شما ثبت شد</h3>
            <p style={{ fontSize: 12, color: THEME.text3, marginBottom: 16 }}>این مورد برای بررسی به مدیر سامانه (SuperAdmin) ارسال شد.</p>
            <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 24px" }} onClick={onClose}>بستن</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 14, color: THEME.navy, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={16} color="#b45309" /> گزارش خطا به مدیر سامانه
              </h3>
              <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} color={THEME.text3} />
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 12px", lineHeight: 1.8 }}>
              لطفاً توضیح دهید چه اتفاقی افتاد. کاربر، زمان و صفحه‌ای که در آن بودید خودکار همراه گزارش ارسال می‌شود.
            </p>
            <label style={{ ...styles.label, marginTop: 0 }}>شرح خطا</label>
            <textarea
              style={{ ...styles.input, minHeight: 90 }} value={description}
              onChange={(e) => setDescription(e.target.value)} dir="rtl"
              placeholder="مثلاً: هنگام ثبت آنومالی جدید، صفحه خطا داد و ذخیره نشد"
            />
            {technicalMessage && (
              <div style={{ marginTop: 8, fontSize: 10.5, color: THEME.text3, background: THEME.bg, borderRadius: 8, padding: 8, maxHeight: 70, overflow: "auto", fontFamily: "monospace", direction: "ltr", textAlign: "left" }}>
                {technicalMessage}
              </div>
            )}
            {error && <p style={styles.error}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" style={{ ...styles.button, width: "auto", marginTop: 0, padding: "9px 18px", display: "flex", alignItems: "center", gap: 6 }} onClick={handleSubmit} disabled={saving}>
                <Send size={13} /> {saving ? "در حال ارسال..." : "ارسال گزارش"}
              </button>
              <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={onClose}>انصراف</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
