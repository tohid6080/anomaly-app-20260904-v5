import React, { useEffect, useMemo, useState } from "react";
import { X, LogIn, Sparkles, CheckCircle2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadPurchasablePlans } from "../subscriptionApi.js";
import { loadModulePrices, loadServices } from "../pricingApi.js";
import PlanFeatureChips from "./PlanFeatureChips.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { numLocale } from "../i18n/translations.js";

/**
 * نمای عمومیِ «پلن‌ها برای خرید» — بدونِ نیاز به ورود. بازدیدکننده پلن‌ها،
 * قیمت‌ها، ماژول‌های هر پلن و قیمتِ تک‌تکِ ماژول‌ها/خدمات را می‌بیند؛ برای
 * تکمیلِ خرید (پرداخت) باید وارد شود یا حسابِ آزمایشی بگیرد. داده‌ها همان
 * منبعِ صفحه‌ی خریدِ داخلِ اپ است (منتشرشده توسطِ کنسولِ قیمت‌گذاری).
 */
export default function PublicPlansScreen({ logoUrl, onClose, onLogin, onStartFree }) {
  const { t, lang, dir } = useLanguage();
  const [plans, setPlans] = useState(null);
  const [mp, setMp] = useState([]);
  const [svc, setSvc] = useState([]);
  const [cycle, setCycle] = useState("yearly");

  useEffect(() => {
    loadPurchasablePlans().then(setPlans);
    loadModulePrices().then(setMp);
    loadServices().then(setSvc);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const money = (n) => Number(n || 0).toLocaleString(numLocale(lang));
  const paidMods = useMemo(() => mp.filter((m) => !m.isFree), [mp]);
  const freeMods = useMemo(() => mp.filter((m) => m.isFree), [mp]);
  const priceOfMod = (m) => (cycle === "monthly" ? m.priceMonthly : m.priceYearly) || m.priceMonthly || 0;
  const priceOfSvc = (s) => (cycle === "monthly" ? s.priceMonthly : s.priceYearly) || s.priceMonthly || 0;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(6,18,27,0.72)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 14px", overflowY: "auto", direction: dir, fontFamily: THEME.font }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 960, maxWidth: "100%", background: THEME.bg, borderRadius: 18, border: `1px solid ${THEME.border}`, boxShadow: "0 40px 100px -40px rgba(0,0,0,0.6)", overflow: "hidden" }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${THEME.border}`, background: THEME.surface }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ height: 30, width: "auto" }} /> : <Sparkles size={20} color={THEME.teal} />}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.heading }}>{t("ppsTitle")}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: THEME.text3 }}>{t("ppsSubtitle")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("commonClose")} style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: THEME.text3, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "18px 20px 22px" }}>
          {/* billing cycle */}
          <div style={{ display: "inline-flex", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 3, gap: 3, marginBottom: 18 }}>
            {[["yearly", t("subTypeYearly")], ["monthly", t("subTypeMonthly")]].map(([c, lbl]) => (
              <button key={c} type="button" onClick={() => setCycle(c)}
                style={{ border: "none", borderRadius: 8, padding: "7px 16px", fontFamily: THEME.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  background: cycle === c ? THEME.teal : "transparent", color: cycle === c ? "#fff" : THEME.text2 }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* plan cards */}
          {plans === null && <p style={{ color: THEME.text3, fontSize: 13 }}>{t("sgLoadingPlans")}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14, marginBottom: 26 }}>
            {(plans || []).map((p) => {
              const amount = cycle === "monthly" ? p.priceMonthly : p.priceYearly;
              return (
                <div key={p.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 18 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: "0 0 6px" }}>{p.name}</h3>
                  {p.description && <p style={{ fontSize: 11.5, color: THEME.text2, lineHeight: 1.9, margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{p.description}</p>}
                  <div style={{ fontSize: 18, fontWeight: 800, color: THEME.teal, marginBottom: 2 }}>
                    {amount > 0 ? t("saTomanAmount", { amount: money(amount) }) : (p.priceTotal > 0 ? t("saTomanAmount", { amount: money(p.priceTotal) }) : t("sgNoPriceDefined"))}
                    {amount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: THEME.text3 }}> / {cycle === "monthly" ? t("subTypeMonthly") : t("subTypeYearly")}</span>}
                  </div>
                  {p.priceTotal > 0 && amount > 0 && <div style={{ fontSize: 11, color: THEME.text3, marginBottom: 8 }}>{t("sgTotalPriceOneOff")}: {money(p.priceTotal)}</div>}
                  <div style={{ borderTop: `1px solid ${THEME.borderSoft}`, margin: "10px 0", paddingTop: 8 }}>
                    {p.maxPersonnel && <p style={{ fontSize: 11.5, color: THEME.text2, margin: "0 0 3px" }}>{t("sgMaxPersonnelLine", { n: p.maxPersonnel.toLocaleString(numLocale(lang)) })}</p>}
                    {p.maxUsers && <p style={{ fontSize: 11.5, color: THEME.text2, margin: "0 0 3px" }}>{t("sgMaxUsersLine", { n: p.maxUsers.toLocaleString(numLocale(lang)) })}</p>}
                    <p style={{ fontSize: 11.5, color: THEME.text3, margin: "4px 0 0", fontWeight: 700 }}>{t("sgPlanIncludesTitle")}</p>
                    <PlanFeatureChips features={p.features} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* per-module prices */}
          {paidMods.length > 0 && (
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("ppsModulePrices")}</b>
              <p style={{ fontSize: 10.5, color: THEME.text3, margin: "3px 0 10px" }}>{t("ppsModulePricesHint")}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "4px 14px" }}>
                {paidMods.map((m) => (
                  <div key={m.moduleKey} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
                    <span style={{ color: THEME.text2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label || m.moduleKey}</span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace", color: THEME.text }}>{priceOfMod(m) > 0 ? money(priceOfMod(m)) : "—"}</span>
                  </div>
                ))}
              </div>
              {freeMods.length > 0 && (
                <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8 }}>
                  {t("sgFreeModulesLine", { list: freeMods.map((m) => m.label || m.moduleKey).join("، ") })}
                </p>
              )}
            </div>
          )}

          {/* services */}
          {svc.length > 0 && (
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("sgServicesTitle")}</b>
              <div style={{ marginTop: 8 }}>
                {svc.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
                    <span style={{ color: THEME.text2 }}>
                      {s.name}
                      {s.description ? <span style={{ display: "block", fontSize: 10, color: THEME.text3 }}>{s.description}</span> : null}
                    </span>
                    <span style={{ fontWeight: 700, fontFamily: "monospace", color: THEME.text, whiteSpace: "nowrap" }}>
                      {money(priceOfSvc(s))} {s.period === "once" ? `(${t("mpPeriodOnce")})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 12.5, color: THEME.text2, margin: "0 0 12px", lineHeight: 1.9 }}>{t("ppsBuyNote")}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={onLogin} style={{ ...styles.button, width: "auto", padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <LogIn size={14} /> {t("ppsSignInToBuy")}
              </button>
              <button type="button" onClick={onStartFree}
                style={{ padding: "10px 22px", borderRadius: 10, border: `1.5px solid ${THEME.teal}`, background: "transparent", color: THEME.tealDeep, fontFamily: THEME.font, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} /> {t("ppsStartFree")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
