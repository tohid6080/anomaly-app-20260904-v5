import React, { useState, useEffect } from "react";
import { CreditCard, Copy, Check, Clock, Globe, ImagePlus, X } from "lucide-react";
import { styles, THEME, resizeImageFile } from "../shared.js";
import { loadCardTransferSettings, submitCardTransferReceipt } from "../subscriptionApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { numLocale } from "../i18n/translations.js";

/**
 * بخش «روش‌های پرداخت» — زیر خلاصه‌ی خرید در صفحه‌ی انتخاب پلن
 * (SubscriptionGate → PlanSelectionScreen). دو روش:
 * ۱. کارت‌به‌کارت (فعال، پیش‌فرض) — نمایش شماره کارت/نام صاحب کارت +
 *    فرم ثبت رسید؛ بعد از ثبت، وضعیت «در انتظار تأیید مدیر سامانه» است.
 * ۲. پرداخت آنلاین (غیرفعال، «به‌زودی») — فقط UI؛ کد initiatePayment/
 *    verifyPayment در subscriptionApi.js دست‌نخورده باقی می‌ماند تا
 *    بعداً با اتصال Zarinpal واقعی دوباره فعال شود.
 */
export default function PaymentMethodsSection({ currentUser, selectedPlan, billingCycle, amount }) {
  const { t, lang, dir } = useLanguage();
  const [method, setMethod] = useState("card_transfer");
  const [settings, setSettings] = useState(undefined); // undefined = در حال بارگذاری
  const [copied, setCopied] = useState(false);

  const [payerName, setPayerName] = useState(currentUser?.name || "");
  const [payerPhone, setPayerPhone] = useState(currentUser?.phone || "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [receiptImage, setReceiptImage] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { loadCardTransferSettings().then(setSettings); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(settings?.cardNumber || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // بی‌اهمیت — مرورگر یا Context اجازه‌ی clipboard نداده؛ کاربر می‌تواند دستی انتخاب/کپی کند
    }
  };

  const handlePickReceipt = async (file) => {
    if (!file) return;
    setImageBusy(true);
    setError("");
    try {
      setReceiptImage(await resizeImageFile(file));
    } catch {
      setError(t("ctpErrReceiptImage"));
    }
    setImageBusy(false);
  };

  const handleSubmit = async () => {
    setError("");
    if (!payerName.trim() || !payerPhone.trim() || !trackingNumber.trim()) {
      setError(t("subErrReceiptFieldsRequired"));
      return;
    }
    setSaving(true);
    const result = await submitCardTransferReceipt(
      { planId: selectedPlan.id, billingCycle, amount, payerName, payerPhone, trackingNumber, receiptImage },
      currentUser?.username
    );
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "24px 10px" }}>
        <Clock size={40} color="#b45309" style={{ marginBottom: 12 }} />
        <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.navy, margin: "0 0 8px" }}>{t("ctpReceiptSubmitted")}</h4>
        <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, maxWidth: 320, margin: "0 auto" }}>
          {t("ctpReceiptSubmittedBody")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.navy, margin: "18px 0 10px" }}>{t("ctpPaymentMethods")}</h4>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button" onClick={() => setMethod("card_transfer")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontFamily: THEME.font,
            fontSize: 12.5, fontWeight: 700, flex: "1 1 160px", justifyContent: "center",
            border: `1.5px solid ${method === "card_transfer" ? THEME.teal : THEME.border}`,
            background: method === "card_transfer" ? THEME.tealSoft : "transparent",
            color: method === "card_transfer" ? THEME.tealDeep : THEME.text2,
          }}
        >
          <CreditCard size={14} /> {t("ctpCardTransfer")}
        </button>
        <button
          type="button" disabled
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, fontFamily: THEME.font,
            fontSize: 12.5, fontWeight: 700, flex: "1 1 160px", justifyContent: "center", cursor: "not-allowed",
            border: `1.5px solid ${THEME.border}`, background: THEME.bg, color: THEME.text3,
          }}
          title={t("ctpMethodUnavailable")}
        >
          <Globe size={14} /> {t("ctpOnlinePayment")}
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: THEME.border, color: THEME.text3 }}>{t("ctpComingSoon")}</span>
        </button>
      </div>

      {method === "card_transfer" && (
        <div>
          {settings === undefined && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 12 }}>{t("ctpLoadingPaymentInfo")}</p>}

          {settings && (
            <div style={{ background: THEME.tealSoft, border: `1px solid ${THEME.teal}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: THEME.text2, marginBottom: 4 }}>{t("ctpCardNumber")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.navy, letterSpacing: 1, direction: "ltr" }}>
                    {settings.cardNumber || "—"}
                  </span>
                  {settings.cardNumber && (
                    <button
                      type="button" onClick={handleCopy}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: THEME.font, fontSize: 11, fontWeight: 700, background: copied ? "#166534" : THEME.teal, color: "#fff" }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? t("ctpCopied") : t("ctpCopyCardNumber")}
                    </button>
                  )}
                </div>
              </div>
              {settings.holderName && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: THEME.text2, marginBottom: 2 }}>{t("ctpToTheNameOf")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>{settings.holderName}</div>
                </div>
              )}
              <div style={{ marginBottom: settings.description ? 10 : 0 }}>
                <div style={{ fontSize: 11, color: THEME.text2, marginBottom: 2 }}>{t("ctpPayableAmount")}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.teal }}>{t("saTomanAmount", { amount: (amount || 0).toLocaleString(numLocale(lang)) })}</div>
              </div>
              {settings.description && (
                <p style={{ fontSize: 11.5, color: THEME.text2, lineHeight: 1.9, margin: 0, whiteSpace: "pre-wrap" }}>{settings.description}</p>
              )}
            </div>
          )}

          <p style={{ fontSize: 12, fontWeight: 700, color: THEME.navy, margin: "0 0 10px" }}>{t("ctpEnterReceiptAfterTransfer")}</p>

          <label style={styles.label}>{t("ctpFullName")}</label>
          <input style={styles.input} value={payerName} onChange={(e) => setPayerName(e.target.value)} dir={dir} />

          <label style={styles.label}>{t("ctpMobileNumber")}</label>
          <input style={styles.input} value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} dir="ltr" placeholder="09xxxxxxxxx" />

          <label style={styles.label}>{t("ctpTransactionTrackingNumber")}</label>
          <input style={styles.input} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} dir="ltr" />

          <label style={styles.label}>{t("ctpReceiptImageOptional")}</label>
          {!receiptImage ? (
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 9,
                border: `1.5px dashed ${THEME.border}`, cursor: "pointer", fontSize: 12.5, color: THEME.text2, fontFamily: THEME.font,
              }}
            >
              <ImagePlus size={16} /> {imageBusy ? t("commonLoading") : t("ctpAddReceiptImage")}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={imageBusy} onChange={(e) => handlePickReceipt(e.target.files?.[0])} />
            </label>
          ) : (
            <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
              <img src={receiptImage} alt={t("ctpReceiptImageAlt")} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 9, border: `1px solid ${THEME.border}`, display: "block" }} />
              <button
                type="button" onClick={() => setReceiptImage("")}
                style={{ position: "absolute", top: -8, insetInlineEnd: -8, width: 24, height: 24, borderRadius: "50%", border: "none", background: THEME.danger, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button type="button" style={styles.button} onClick={handleSubmit} disabled={saving}>
            {saving ? t("saSubmittingEllipsis") : t("ctpSubmitReceipt")}
          </button>
        </div>
      )}
    </div>
  );
}
