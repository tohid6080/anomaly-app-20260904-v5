import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, LogOut, Loader2, Clock, X, ImagePlus, Copy, Check } from "lucide-react";
import { styles, THEME, resizeImageFile } from "../shared.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { computeSubscriptionAccess, loadMySubscriptionInfo, verifyPayment, loadCardTransferSettings } from "../subscriptionApi.js";
import { loadModulePrices, loadServices, computeCartTotal, applyModuleDeps, servicePriceFor } from "../pricingApi.js";
import { submitGuestPurchaseRequest } from "../guestPurchaseApi.js";
import PaymentMethodsSection from "./CardTransferPayment.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { numLocale } from "../i18n/translations.js";

// عنوان/زیرعنوانِ صفحه‌ی خرید بر پایه‌ی این‌که «چطور به این صفحه رسیده»:
// خریدِ اولِ بدونِ آزمایشی / پایانِ آزمایشی / پایانِ اشتراکِ پولی / در انتظارِ
// تأیید / غیرفعال‌شده توسط ادمین.
function purchaseContext(access, company, t) {
  const hasTrial = !!(company && company.trialStart);
  const hasPaidBefore = !!(company && company.subscriptionStartDate);
  // بازدیدکننده‌ای که از صفحه‌ی اصلی «مشاهده پلن‌ها برای خرید» را زده —
  // هنوز وارد نشده، فقط دارد پلن‌ها را می‌بیند.
  if (access && access.status === "browse") return { titleKey: "sgCtxBrowseTitle", subKey: "sgCtxBrowseSub", allowBuy: true };
  // حسابِ غیرفعال‌شده توسطِ مدیرِ سامانه: پیامِ هشدار بالای صفحه نشان داده
  // می‌شود، ولی — طبقِ تصمیمِ صریحِ قبلی در setCompanyActive — کاربر همچنان
  // صفحه‌ی انتخابِ پلن/خرید را می‌بیند و می‌تواند خودش اشتراک بگیرد؛ به
  // بن‌بستِ «تماس با پشتیبانی» نمی‌خورد.
  if (access.status === "disabled") return { titleKey: "sgCtxDisabledTitle", subKey: "sgCtxDisabledSub", allowBuy: true };
  // «در انتظارِ تأیید» همچنان اجازه‌ی خرید دارد (اگر تلاشِ اول ناموفق بود) —
  // فقط پیامِ «در حالِ بررسی» بالای فرم نشان داده می‌شود.
  if (access.status === "pending_payment") return { titleKey: "sgCtxPendingTitle", subKey: "sgCtxPendingSub", allowBuy: true, warn: true };
  // پایانِ دوره‌ی آزمایشی — فقط وقتی واقعاً Trial داشته
  if (access.status === "trial_expired" && hasTrial) {
    return { titleKey: "sgCtxTrialEndedTitle", subKey: "sgCtxTrialEndedSub", allowBuy: true };
  }
  // پایانِ اشتراکِ پولی — تمدید
  if (access.status === "expired" && hasPaidBefore) {
    return { titleKey: "sgCtxRenewTitle", subKey: "sgCtxRenewSub", allowBuy: true };
  }
  // خریدِ اولِ بدونِ دوره‌ی آزمایشی (هیچ‌وقت Trial نداشته یا تازه ساخته شده)
  return { titleKey: "sgCtxFirstBuyTitle", subKey: "sgCtxFirstBuySub", allowBuy: true };
}

/**
 * گیت اشتراک — درست بعد از ورود موفق (و بیومتریک، اگر فعال باشد) و قبل
 * از رندر داشبورد اصلی قرار می‌گیرد. کاربر همیشه با موفقیت لاگین می‌کند
 * (طبق تصمیم تأییدشده) — فقط اگر Trial/اشتراک منقضی باشد، به‌جای
 * داشبورد، صفحه‌ی انتخاب پلن می‌بیند؛ نه یک داشبورد محدودشده‌ی موازی.
 *
 * همچنین بازگشت از درگاه زرین‌پال را همین‌جا مدیریت می‌کند — چون بعد از
 * ریدایرکت، اپ از صفر لود می‌شود و تنها نشانه‌ی «این یک بازگشت از پرداخت
 * است» همان Query String صفحه (?orderId=...&Authority=...) است.
 */
export default function SubscriptionGate({ currentUser, onLogout, children }) {
  const { t, lang } = useLanguage();
  const [info, setInfo] = useState(undefined); // undefined = در حال بارگذاری
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [verifying, setVerifying] = useState(() => !!new URLSearchParams(window.location.search).get("orderId"));
  const [verifyResult, setVerifyResult] = useState(null);

  const load = () => loadMySubscriptionInfo().then(setInfo);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const orderId = params.get("orderId");
    if (!orderId) return;
    const authority = params.get("Authority") || "";
    verifyPayment(authority, orderId).then((result) => {
      setVerifyResult(result);
      setVerifying(false);
      // پاک‌کردن Query String از URL — اگر کاربر صفحه را Refresh کند، دیگر
      // دوباره Verify صدا زده نشود (idempotency سمت Frontend؛ سمت Backend
      // هم مستقل و قطعی همین را تضمین می‌کند).
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verifying) {
    return (
      <div style={styles.centerScreen}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={32} color={THEME.teal} />
          <p style={{ marginTop: 16, color: THEME.text2, fontSize: 13.5 }}>{t("sgVerifyingPayment")}</p>
        </div>
      </div>
    );
  }

  if (verifyResult) {
    return <PaymentResultScreen result={verifyResult} onContinue={() => setVerifyResult(null)} onLogout={onLogout} />;
  }

  if (info === undefined) {
    return <div style={styles.centerScreen}><p style={{ color: THEME.text3 }}>{t("commonLoading")}</p></div>;
  }

  const access = computeSubscriptionAccess(info);

  if (access.isLocked) {
    return <PlanSelectionScreen currentUser={currentUser} company={info} access={access} onLogout={onLogout} />;
  }

  return (
    <>
      {access.status === "trial_active" && (access.daysLeft === undefined || access.daysLeft <= 3) && <TrialWarningBanner access={access} />}
      {children}
    </>
  );
}

function TrialWarningBanner({ access }) {
  const { t, lang } = useLanguage();
  return (
    <div style={{ background: THEME.warnBg, borderBottom: "1px solid #f59e0b", padding: "8px 20px", textAlign: "center", fontSize: 12.5, color: THEME.warn, fontWeight: 600 }}>
      <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 5 }} />
      {access.label}
      {access.trialEnd && <span style={{ fontWeight: 500 }}>{t("sgTrialEndSuffix", { date: toJalaliDateTime(access.trialEnd) })}</span>}
    </div>
  );
}

function PaymentResultScreen({ result, onContinue, onLogout }) {
  const { t, lang } = useLanguage();
  const success = result?.activated;
  return (
    <div style={styles.centerScreen}>
      <div style={{ ...styles.card, width: 380, textAlign: "center" }}>
        {success ? (
          <>
            <CheckCircle2 size={48} color={THEME.ok} style={{ margin: "0 auto 14px" }} />
            <h2 style={{ fontSize: 17, color: THEME.heading, fontWeight: 800, margin: "0 0 8px" }}>{t("sgPaymentSuccess")}</h2>
            <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, marginBottom: 6 }}>{t("sgPaymentSuccessBody")}</p>
            {result.refId && <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 18 }}>{t("sgRefCode", { ref: result.refId })}</p>}
          </>
        ) : (
          <>
            <XCircle size={48} color={THEME.danger} style={{ margin: "0 auto 14px" }} />
            <h2 style={{ fontSize: 17, color: THEME.heading, fontWeight: 800, margin: "0 0 8px" }}>{t("sgPaymentFailed")}</h2>
            <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, marginBottom: 18 }}>{result.error || t("sgPaymentFailedBody")}</p>
          </>
        )}
        <button type="button" style={styles.button} onClick={onContinue}>{success ? t("sgContinue") : t("sgBackToPlans")}</button>
      </div>
    </div>
  );
}

export function PlanSelectionScreen({ currentUser, company, access, onLogout, publicMode }) {
  const { t, lang } = useLanguage();
  const [billingCycle, setBillingCycle] = useState("yearly");
  // انتخابِ ماژول به ماژول — تنها روشِ خرید (Module-Based)
  const [modulePrices, setModulePrices] = useState(null);
  const [services, setServices] = useState([]);
  const [selMods, setSelMods] = useState([]);
  const [selSvc, setSelSvc] = useState([]);

  useEffect(() => {
    loadModulePrices().then((m) => {
      setModulePrices(m);
      setSelMods(m.filter((x) => x.isFree).map((x) => x.moduleKey));
    });
    loadServices().then(setServices);
  }, []);

  const ctx = purchaseContext(access, company, t);

  const cart = modulePrices
    ? computeCartTotal({ selectedModuleKeys: selMods, selectedServiceIds: selSvc, modulePrices, services, billingCycle })
    : null;
  const toggleMod = (k) => setSelMods((cur) => {
    const has = cur.indexOf(k) > -1;
    let next = has ? cur.filter((x) => x !== k) : [...cur, k];
    if (!has) next = applyModuleDeps(next, modulePrices);
    return next;
  });
  const priceOfMod = (m) => (billingCycle === "monthly" ? m.priceMonthly : m.priceYearly) || m.priceMonthly || 0;

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, padding: "40px 20px", fontFamily: THEME.font }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: THEME.heading, margin: "0 0 6px" }}>{t(ctx.titleKey)}</h1>
            {access.trialStart && access.trialEnd && (
              <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 6px" }}>
                {t("saFromTo", { start: toJalaliDateTime(access.trialStart), end: toJalaliDateTime(access.trialEnd) })}
              </p>
            )}
            {access.subscriptionEndDate && (
              <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 6px" }}>{t("sgSubEnd", { date: toJalaliDateTime(access.subscriptionEndDate) })}</p>
            )}
            <p style={{ fontSize: 13, color: THEME.text2, margin: 0 }}>{t(ctx.subKey)}</p>
          </div>
          <button type="button" onClick={onLogout} style={{ ...styles.smallButton, background: THEME.text3, display: "flex", alignItems: "center", gap: 6 }}>
            {publicMode ? <X size={13} /> : <LogOut size={13} />} {publicMode ? t("commonClose") : t("saLogout")}
          </button>
        </div>

        {ctx.warn && (
          <div style={{ background: THEME.warnBg, border: `1px solid ${THEME.warn}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: THEME.warn, fontWeight: 700, maxWidth: 640 }}>
            {t(ctx.subKey)}
          </div>
        )}

        <ModulePickerBlock
          modulePrices={modulePrices} services={services} selMods={selMods} selSvc={selSvc}
          setSelSvc={setSelSvc} toggleMod={toggleMod} priceOfMod={priceOfMod}
          billingCycle={billingCycle} setBillingCycle={setBillingCycle}
          cart={cart} currentUser={currentUser} lang={lang} t={t}
          publicMode={publicMode}
        />
      </div>
    </div>
  );
}

/* ---------------- انتخابِ ماژول به ماژول ---------------- */
function ModulePickerBlock({ modulePrices, services, selMods, selSvc, setSelSvc, toggleMod, priceOfMod, billingCycle, setBillingCycle, cart, currentUser, lang, t, publicMode }) {
  if (modulePrices === null) return <p style={{ textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</p>;
  const money = (n) => (n || 0).toLocaleString(numLocale(lang));
  const paidMods = modulePrices.filter((m) => !m.isFree);
  const freeMods = modulePrices.filter((m) => m.isFree);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
      <div>
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("sgPickModules")}</b>
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "3px 0 10px" }}>{t("sgPickModulesHint")}</p>
          {paidMods.map((m) => {
            const on = selMods.indexOf(m.moduleKey) > -1;
            return (
              <label key={m.moduleKey} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${THEME.borderSoft}`, cursor: "pointer" }}>
                <input type="checkbox" checked={on} onChange={() => toggleMod(m.moduleKey)} style={{ width: 16, height: 16, accentColor: THEME.teal }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: THEME.text }}>{m.label || m.moduleKey}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text2, fontFamily: "monospace" }}>
                  {priceOfMod(m) > 0 ? `+ ${money(priceOfMod(m))}` : "—"}
                </span>
              </label>
            );
          })}
          {freeMods.length > 0 && (
            <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8 }}>
              {t("sgFreeModulesLine", { list: freeMods.map((m) => m.label || m.moduleKey).join("، ") })}
            </p>
          )}
        </div>

        {services.length > 0 && (
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16 }}>
            <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("sgServicesTitle")}</b>
            {services.map((s) => {
              const on = selSvc.indexOf(s.id) > -1;
              const p = servicePriceFor(s);
              const periodLabelKey = s.period === "weekly" ? "mpPeriodWeekly" : s.period === "yearly" ? "mpPeriodYearly" : s.period === "once" ? "mpPeriodOnce" : "mpPeriodMonthly";
              return (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${THEME.borderSoft}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => setSelSvc((c) => on ? c.filter((x) => x !== s.id) : [...c, s.id])} style={{ width: 16, height: 16, accentColor: THEME.teal }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: THEME.text }}>
                    {s.name}
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: THEME.tealSoft, color: THEME.tealDeep, marginInlineStart: 6 }}>
                      {t(periodLabelKey)}
                    </span>
                    {s.description ? <span style={{ display: "block", fontSize: 10, color: THEME.text3 }}>{s.description}</span> : null}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text2, fontFamily: "monospace" }}>+ {money(p)}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* خلاصه */}
      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 18, position: "sticky", top: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, margin: "0 0 10px" }}>{t("sgPurchaseSummary")}</h4>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {[["yearly", t("subTypeYearly")], ["monthly", t("subTypeMonthly")]].map(([c, lbl]) => (
            <button key={c} type="button" onClick={() => setBillingCycle(c)}
              style={{ flex: 1, border: `1px solid ${billingCycle === c ? THEME.teal : THEME.border}`, background: billingCycle === c ? THEME.tealSoft : "transparent", color: billingCycle === c ? THEME.tealDeep : THEME.text2, borderRadius: 8, padding: "6px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font }}>
              {lbl}
            </button>
          ))}
        </div>
        <Row k={t("sgSumModules")} v={cart ? cart.selReal.length.toLocaleString(numLocale(lang)) : "0"} />
        <Row k={t("sgSumModulesPrice")} v={cart ? money(cart.sumAllModules) : "0"} />
        <Row k={t("sgSumServices")} v={cart ? money(cart.svcRecurring + cart.svcOnce) : "0"} />
        <div style={{ borderTop: `2px solid ${THEME.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: THEME.text3 }}>{billingCycle === "monthly" ? t("sgFinalMonthly") : t("sgFinalYearly")}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: THEME.teal, fontFamily: "monospace" }}>{cart ? money(cart.grandTotal) : "0"}</span>
        </div>
        <p style={{ fontSize: 10, color: THEME.text3, margin: "8px 0 0", lineHeight: 1.8 }}>{t("sgModulesDisclaimer")}</p>
        {publicMode
          ? <PublicPurchaseForm selMods={selMods} selSvc={selSvc} billingCycle={billingCycle} cart={cart} />
          : (cart && cart.selReal.length > 0 && (
            <PaymentMethodsSection
              currentUser={currentUser}
              selectedPlan={null}
              billingCycle={billingCycle}
              amount={cart.grandTotal}
              backupPeriod="none"
              selectedModules={selMods}
              selectedServices={selSvc}
              resolvedPlanId=""
            />
          ))}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: `1px dashed ${THEME.borderSoft}`, fontSize: 12 }}>
      <span style={{ color: THEME.text3 }}>{k}</span>
      <span style={{ fontWeight: 700, fontFamily: "monospace", color: THEME.text }}>{v}</span>
    </div>
  );
}

/* در نمای عمومی (بازدیدکننده‌ی صفحه‌ی اصلی)، جای دکمه‌ی «ورود برای خرید»/
 * «شروعِ رایگان»، همان تجربه‌ی واقعیِ صفحه‌ی «اشتراک شما به پایان رسیده»
 * نشان داده می‌شود: فرمِ واقعیِ پرداختِ کارت‌به‌کارت (دقیقاً همان UI/فیلدهای
 * CardTransferPayment.jsx) به‌علاوه‌ی اطلاعاتِ شرکت/تماس — چون هنوز هیچ
 * شرکتی وجود ندارد و submitCardTransferReceipt به company_id نیاز دارد.
 * ثبت از طریق Edge Function عمومیِ submit-guest-purchase-request می‌رود؛
 * SuperAdmin («خرید مستقیمِ بازدیدکنندگان») شرکت/حساب را می‌سازد و رسید را
 * تأیید می‌کند. */
function PublicPurchaseForm({ selMods, selSvc, billingCycle, cart }) {
  const { t, lang, dir } = useLanguage();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [receiptImage, setReceiptImage] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [settings, setSettings] = useState(undefined);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { loadCardTransferSettings().then(setSettings); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(settings?.cardNumber || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* بی‌اهمیت — کاربر می‌تواند دستی انتخاب/کپی کند */ }
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
    if (!companyName.trim() || !fullName.trim()) { setError(t("gprErrCompanyContactRequired")); return; }
    if (!/^09\d{9}$/.test(phone.trim())) { setError(t("ctpErrPhoneFormat")); return; }
    if (!cart || cart.selReal.length === 0) { setError(t("gprErrNoModulesSelected")); return; }
    if (!payerName.trim()) { setError(t("subErrReceiptFieldsRequired")); return; }
    if (!/^09\d{9}$/.test(payerPhone.trim())) { setError(t("ctpErrPhoneFormat")); return; }
    if (!receiptImage) { setError(t("ctpErrReceiptRequired")); return; }
    setSaving(true);
    const result = await submitGuestPurchaseRequest({
      fullName: fullName.trim(), phone: phone.trim(), companyName: companyName.trim(), email: email.trim(),
      selectedModules: selMods, selectedServices: selSvc, billingCycle, amount: cart.grandTotal,
      payerName: payerName.trim(), payerPhone: payerPhone.trim(), trackingNumber: trackingNumber.trim(), receiptImage,
    });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ marginTop: 6, textAlign: "center", padding: "14px 2px" }}>
        <Clock size={32} color={THEME.warn} style={{ marginBottom: 10 }} />
        <h4 style={{ fontSize: 13.5, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>{t("gprSubmittedTitle")}</h4>
        <p style={{ fontSize: 12, color: THEME.text2, lineHeight: 1.9 }}>{t("gprSubmittedBody")}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 11.5, color: THEME.text2, margin: "0 0 10px", lineHeight: 1.9 }}>{t("gprIntro")}</p>

      <label style={styles.label}>{t("gprCompanyName")}</label>
      <input style={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} dir={dir} />
      <label style={styles.label}>{t("gprContactFullName")}</label>
      <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} dir={dir} />
      <label style={styles.label}>{t("ctpMobileNumber")}</label>
      <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))} dir="ltr" inputMode="numeric" maxLength={11} placeholder="09xxxxxxxxx" />
      <label style={styles.label}>{t("gprEmailOptional")}</label>
      <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />

      {settings === undefined && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 12 }}>{t("ctpLoadingPaymentInfo")}</p>}
      {settings && (
        <div style={{ background: THEME.tealSoft, border: `1px solid ${THEME.teal}`, borderRadius: 12, padding: 14, margin: "12px 0" }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: THEME.text2, marginBottom: 4 }}>{t("ctpCardNumber")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, letterSpacing: 1, direction: "ltr" }}>{settings.cardNumber || "—"}</span>
              {settings.cardNumber && (
                <button type="button" onClick={handleCopy}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: THEME.font, fontSize: 10.5, fontWeight: 700, background: copied ? THEME.ok : THEME.teal, color: "#fff" }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? t("ctpCopied") : t("ctpCopyCardNumber")}
                </button>
              )}
            </div>
          </div>
          {settings.holderName && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: THEME.text2, marginBottom: 2 }}>{t("ctpToTheNameOf")}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading }}>{settings.holderName}</div>
            </div>
          )}
          <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.teal }}>
            {t("saTomanAmount", { amount: (cart?.grandTotal || 0).toLocaleString(numLocale(lang)) })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, fontWeight: 700, color: THEME.heading, margin: "4px 0 8px" }}>{t("ctpEnterReceiptAfterTransfer")}</p>
      <label style={styles.label}>{t("ctpFullName")}</label>
      <input style={styles.input} value={payerName} onChange={(e) => setPayerName(e.target.value)} dir={dir} />
      <label style={styles.label}>{t("ctpMobileNumber")}</label>
      <input style={styles.input} value={payerPhone} onChange={(e) => setPayerPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))} dir="ltr" inputMode="numeric" maxLength={11} placeholder="09xxxxxxxxx" />
      <label style={styles.label}>{t("ctpTransactionTrackingNumberOptional")}</label>
      <input style={styles.input} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} dir="ltr" />

      <label style={styles.label}>{t("ctpReceiptImageRequired")}</label>
      {!receiptImage ? (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 9, border: `1.5px dashed ${THEME.border}`, cursor: "pointer", fontSize: 12, color: THEME.text2, fontFamily: THEME.font }}>
          <ImagePlus size={15} /> {imageBusy ? t("commonLoading") : t("ctpAddReceiptImage")}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={imageBusy} onChange={(e) => handlePickReceipt(e.target.files?.[0])} />
        </label>
      ) : (
        <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
          <img src={receiptImage} alt={t("ctpReceiptImageAlt")} style={{ maxWidth: 140, maxHeight: 140, borderRadius: 9, border: `1px solid ${THEME.border}`, display: "block" }} />
          <button type="button" onClick={() => setReceiptImage("")}
            style={{ position: "absolute", top: -8, insetInlineEnd: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: THEME.danger, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} />
          </button>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      <button type="button" style={{ ...styles.button, marginTop: 12 }} onClick={handleSubmit} disabled={saving}>
        {saving ? t("saSubmittingEllipsis") : t("gprSubmit")}
      </button>
    </div>
  );
}

