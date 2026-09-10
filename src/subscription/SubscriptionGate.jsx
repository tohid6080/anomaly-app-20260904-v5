import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, LogOut, Loader2, Clock, X, LogIn } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import {
  computeSubscriptionAccess, loadMySubscriptionInfo, loadPurchasablePlans,
  verifyPayment, planBackupPeriodPrice,
} from "../subscriptionApi.js";
import { loadModulePrices, loadServices, computeCartTotal, applyModuleDeps } from "../pricingApi.js";
import PlanFeatureChips from "./PlanFeatureChips.jsx";
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

export function PlanSelectionScreen({ currentUser, company, access, onLogout, publicMode, onLogin, onStartFree }) {
  const { t, lang } = useLanguage();
  const [plans, setPlans] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [backupPeriod, setBackupPeriod] = useState("none");
  // انتخابِ ماژول به ماژول
  const [mode, setMode] = useState("plan");            // plan | modules
  const [modulePrices, setModulePrices] = useState(null);
  const [services, setServices] = useState([]);
  const [selMods, setSelMods] = useState([]);
  const [selSvc, setSelSvc] = useState([]);

  useEffect(() => { loadPurchasablePlans().then(setPlans); }, []);
  useEffect(() => {
    loadModulePrices().then((m) => {
      setModulePrices(m);
      setSelMods(m.filter((x) => x.isFree).map((x) => x.moduleKey));
    });
    loadServices().then(setServices);
  }, []);

  const ctx = purchaseContext(access, company, t);
  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
  const planAmount = selectedPlan ? (billingCycle === "monthly" ? selectedPlan.priceMonthly : selectedPlan.priceYearly) : 0;
  const backupAmount = planBackupPeriodPrice(selectedPlan, backupPeriod);
  const amount = planAmount + backupAmount;

  const handleSelectPlan = (p, cycle) => { setSelectedPlanId(p.id); setBillingCycle(cycle); };

  // سبدِ ماژولی
  const cart = (modulePrices && mode === "modules")
    ? computeCartTotal({
        selectedModuleKeys: selMods, selectedServiceIds: selSvc, chosenPlan: null,
        plans: plans || [], modulePrices, services, billingCycle,
      })
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
        <>
        {/* حالت: پلنِ آماده یا ماژول به ماژول */}
        <div style={{ display: "inline-flex", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 3, gap: 3, marginBottom: 18 }}>
          {[["plan", t("sgModePlans")], ["modules", t("sgModeModules")]].map(([m, lbl]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ border: "none", borderRadius: 8, padding: "7px 14px", fontFamily: THEME.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: mode === m ? THEME.teal : "transparent", color: mode === m ? "#fff" : THEME.text2 }}>
              {lbl}
            </button>
          ))}
        </div>

        {mode === "modules" && (
          <ModulePickerBlock
            modulePrices={modulePrices} services={services} selMods={selMods} selSvc={selSvc}
            setSelSvc={setSelSvc} toggleMod={toggleMod} priceOfMod={priceOfMod}
            billingCycle={billingCycle} setBillingCycle={setBillingCycle}
            cart={cart} currentUser={currentUser} lang={lang} t={t}
            publicMode={publicMode} onLogin={onLogin} onStartFree={onStartFree}
          />
        )}

        {mode === "plan" && plans === null && <p style={{ textAlign: "center", color: THEME.text3 }}>{t("sgLoadingPlans")}</p>}
        {mode === "plan" && (
        <>
        <p style={{ fontSize: 12.5, color: THEME.text3, margin: "0 0 14px" }}>{t("sgChoosePlanPrompt")}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
          {plans?.map((p) => {
            const hasMonthly = p.priceMonthly > 0;
            const hasYearly = p.priceYearly > 0;
            const isThisPlanSelected = selectedPlanId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: THEME.surface, border: `2px solid ${isThisPlanSelected ? THEME.teal : THEME.border}`, borderRadius: 14,
                  padding: 20, position: "relative", minWidth: 0, overflow: "hidden",
                }}
              >
                {isThisPlanSelected && <CheckCircle2 size={18} color={THEME.teal} style={{ position: "absolute", top: 14, insetInlineStart: 14 }} />}
                <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>{p.name}</h3>
                {p.description && (
                  <p style={{ fontSize: 11.5, color: THEME.text2, lineHeight: 1.9, margin: "0 0 12px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.description}</p>
                )}

                {/* هر دو قیمت (ماهانه و سالانه) با هم نمایش داده می‌شوند — نه پشت یک Toggle سراسری */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {hasMonthly && (
                    <button
                      type="button" onClick={() => handleSelectPlan(p, "monthly")}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                        padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontFamily: THEME.font, textAlign: "start",
                        border: `1.5px solid ${isThisPlanSelected && billingCycle === "monthly" ? THEME.teal : THEME.border}`,
                        background: isThisPlanSelected && billingCycle === "monthly" ? THEME.tealSoft : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: THEME.text2, fontWeight: 600 }}>{t("subTypeMonthly")}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("saTomanAmount", { amount: p.priceMonthly.toLocaleString(numLocale(lang)) })}</span>
                    </button>
                  )}
                  {hasYearly && (
                    <button
                      type="button" onClick={() => handleSelectPlan(p, "yearly")}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                        padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontFamily: THEME.font, textAlign: "start",
                        border: `1.5px solid ${isThisPlanSelected && billingCycle === "yearly" ? THEME.teal : THEME.border}`,
                        background: isThisPlanSelected && billingCycle === "yearly" ? THEME.tealSoft : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: THEME.text2, fontWeight: 600 }}>{t("subTypeYearly")}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("saTomanAmount", { amount: p.priceYearly.toLocaleString(numLocale(lang)) })}</span>
                    </button>
                  )}
                  {p.priceTotal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", borderRadius: 9, border: `1.5px dashed ${THEME.border}`, background: "transparent" }}>
                      <span style={{ fontSize: 11.5, color: THEME.text2, fontWeight: 600 }}>{t("sgTotalPriceOneOff")}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("saTomanAmount", { amount: p.priceTotal.toLocaleString(numLocale(lang)) })}</span>
                    </div>
                  )}
                  {!hasMonthly && !hasYearly && p.priceTotal <= 0 && <span style={{ fontSize: 12, color: THEME.text3 }}>{t("sgNoPriceDefined")}</span>}
                </div>

                {p.maxPersonnel && <p style={{ fontSize: 11.5, color: THEME.text2, margin: "0 0 4px" }}>{t("sgMaxPersonnelLine", { n: p.maxPersonnel.toLocaleString(numLocale(lang)) })}</p>}
                {p.maxUsers && <p style={{ fontSize: 11.5, color: THEME.text2, margin: "0 0 4px" }}>{t("sgMaxUsersLine", { n: p.maxUsers.toLocaleString(numLocale(lang)) })}</p>}
                <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>{t("sgActiveModulesCount", { n: p.features.length.toLocaleString(numLocale(lang)) })}</p>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: THEME.teal }}>{t("sgPlanIncludesToggle")}</summary>
                  <PlanFeatureChips features={p.features} />
                </details>
              </div>
            );
          })}
        </div>

        {selectedPlan && (
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20, maxWidth: 460, margin: "0 auto" }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, margin: "0 0 10px" }}>{t("sgPurchaseSummary")}</h4>
            <p style={{ fontSize: 12.5, color: THEME.text2, margin: "0 0 4px" }}>{t("sgPlanLabel")}<b>{selectedPlan.name}</b></p>
            <p style={{ fontSize: 12.5, color: THEME.text2, margin: "0 0 8px" }}>{t("sgCycleLabel")}<b>{billingCycle === "monthly" ? t("subTypeMonthly") : t("subTypeYearly")}</b></p>

            <div style={{ margin: "0 0 10px", padding: "8px 10px", background: THEME.bg, borderRadius: 9, border: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.heading, marginBottom: 2 }}>{t("sgPlanIncludesTitle")}</div>
              <PlanFeatureChips features={selectedPlan.features} />
            </div>

            <label style={{ fontSize: 11.5, color: THEME.text2, fontWeight: 700, display: "block", marginBottom: 6 }}>{t("backupBuyPeriodLabel")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {[
                { v: "none", label: t("backupTierNone"), price: 0 },
                { v: "weekly", label: t("backupTierWeekly"), price: selectedPlan.backupPriceWeekly || 0 },
                { v: "monthly", label: t("backupTierMonthly"), price: selectedPlan.backupPriceMonthly || 0 },
                { v: "yearly", label: t("backupTierYearly"), price: selectedPlan.backupPriceYearly || 0 },
              ].map((o) => (
                <label key={o.v} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="backupPeriod" checked={backupPeriod === o.v} onChange={() => setBackupPeriod(o.v)} />
                  <span>{o.label}</span>
                  <span style={{ color: THEME.text3, marginInlineStart: "auto" }}>
                    {o.v === "none" ? "—" : `+ ${o.price.toLocaleString(numLocale(lang))} ${t("currencyToman")}`}
                  </span>
                </label>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 8, fontSize: 12, color: THEME.text2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("sgPlanLabel").replace(":", "")}</span><span>{planAmount.toLocaleString(numLocale(lang))}</span></div>
              {backupAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: THEME.warn }}><span>{t("backupBuyLineLabel")}</span><span>+ {backupAmount.toLocaleString(numLocale(lang))}</span></div>}
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: THEME.teal, margin: "8px 0 10px" }}>{t("sgFinalAmount", { amount: amount.toLocaleString(numLocale(lang)) })}</p>
            {publicMode
              ? <PublicBuyCta onLogin={onLogin} onStartFree={onStartFree} />
              : <PaymentMethodsSection currentUser={currentUser} selectedPlan={selectedPlan} billingCycle={billingCycle} amount={amount} backupPeriod={backupPeriod} />}
          </div>
        )}
        </>
        )}
        </>
      </div>
    </div>
  );
}

/* ---------------- انتخابِ ماژول به ماژول ---------------- */
function ModulePickerBlock({ modulePrices, services, selMods, selSvc, setSelSvc, toggleMod, priceOfMod, billingCycle, setBillingCycle, cart, currentUser, lang, t, publicMode, onLogin, onStartFree }) {
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
              const p = billingCycle === "monthly" ? s.priceMonthly : s.priceYearly;
              return (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${THEME.borderSoft}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => setSelSvc((c) => on ? c.filter((x) => x !== s.id) : [...c, s.id])} style={{ width: 16, height: 16, accentColor: THEME.teal }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: THEME.text }}>
                    {s.name}
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: THEME.tealSoft, color: THEME.tealDeep, marginInlineStart: 6 }}>
                      {s.period === "once" ? t("mpPeriodOnce") : t("mpPeriodMonthly")}
                    </span>
                    {s.description ? <span style={{ display: "block", fontSize: 10, color: THEME.text3 }}>{s.description}</span> : null}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text2, fontFamily: "monospace" }}>+ {money(p || s.priceMonthly)}</span>
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
        {cart && cart.suggestedPlan && (
          <div style={{ background: THEME.tealSoft, border: `1px solid ${THEME.teal}55`, borderRadius: 9, padding: "8px 10px", margin: "8px 0", fontSize: 11.5, color: THEME.tealDeep }}>
            {t("sgMatchedPlan", { name: cart.suggestedPlan.name })}
            {cart.discount > 0 ? " — " + t("sgBundleSaves", { amount: money(cart.discount) }) : ""}
          </div>
        )}
        <div style={{ borderTop: `2px solid ${THEME.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: THEME.text3 }}>{billingCycle === "monthly" ? t("sgFinalMonthly") : t("sgFinalYearly")}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: THEME.teal, fontFamily: "monospace" }}>{cart ? money(cart.grandTotal) : "0"}</span>
        </div>
        <p style={{ fontSize: 10, color: THEME.text3, margin: "8px 0 0", lineHeight: 1.8 }}>{t("sgModulesDisclaimer")}</p>
        {publicMode
          ? <PublicBuyCta onLogin={onLogin} onStartFree={onStartFree} />
          : (cart && cart.selReal.length > 0 && (
            <PaymentMethodsSection
              currentUser={currentUser}
              selectedPlan={cart.resolvedPlanId ? { id: cart.resolvedPlanId } : null}
              billingCycle={billingCycle}
              amount={cart.grandTotal}
              backupPeriod="none"
              selectedModules={selMods}
              selectedServices={selSvc}
              resolvedPlanId={cart.resolvedPlanId || ""}
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

/* در نمای عمومی (بازدیدکننده‌ی صفحه‌ی اصلی)، جای فرمِ پرداخت دکمه‌ی
 * «ورود برای خرید» / «شروعِ رایگان» نشان داده می‌شود. */
function PublicBuyCta({ onLogin, onStartFree }) {
  const { t } = useLanguage();
  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 12, color: THEME.text2, margin: "0 0 10px", lineHeight: 1.9 }}>{t("ppsBuyNote")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onLogin} style={{ ...styles.button, width: "auto", padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LogIn size={14} /> {t("ppsSignInToBuy")}
        </button>
        {onStartFree && (
          <button type="button" onClick={onStartFree}
            style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${THEME.teal}`, background: "transparent", color: THEME.tealDeep, fontFamily: THEME.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {t("ppsStartFree")}
          </button>
        )}
      </div>
    </div>
  );
}

