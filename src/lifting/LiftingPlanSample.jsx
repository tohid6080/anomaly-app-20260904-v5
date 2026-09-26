import React, { useMemo } from "react";
import {
  GraduationCap, Construction, Weight, Link2, Layers, MapPin, Users,
  ListChecks, ShieldCheck, CheckCircle2, Info,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import InfoHint from "../shared/InfoHint.jsx";
import LiftingPlanCanvas from "./LiftingPlanCanvas.jsx";
import { computeLiftCalc, DEFAULT_CRITERIA, segPointDist, loadFootprintRadius } from "./liftingCalcEngine.js";
import { validateLiftingPlan } from "./liftingSafetyEngine.js";
import { fmtN, fmtKg, CalcRow, Verdict, Gauge } from "./liftingCalcDisplay.jsx";
import { liftingStatusMeta } from "./liftingPlanApi.js";
import { LIFT_RISK_ITEMS } from "./liftingRiskChecklist.js";
import { SAMPLE_SCENE, SAMPLE_META, SAMPLE_PHASE, SAMPLE_FRAC } from "./liftingPlanSampleScene.js";

/* ============================================================================ *
 * نمونه‌ی آموزشیِ «طراحیِ نقشه‌ی لیفتینگ» — یک پلنِ کاملاً فرضی و از پیش‌
 * پُرشده که با موتورِ واقعیِ محاسبه/ایمنی (همان‌هایی که LiftingPlanWorkspace
 * برای پلن‌های واقعی استفاده می‌کند) پردازش می‌شود. هیچ عددی این‌جا هارد‌کد
 * نشده — SAMPLE_SCENE فقط «ورودی» است، محاسبه و ارزیابی همیشه زنده و واقعی
 * اجرا می‌شود. کاملاً client-side و read-only؛ هیچ نوشتی روی دیتابیس ندارد.
 * ============================================================================ */

function Spec({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: THEME.text2, marginBottom: 5 }}>
        {label} {hint && <InfoHint text={hint} />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.heading, lineHeight: 1.6, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </div>
    </div>
  );
}

const bearingDeg = (ax, ay, bx, by) => (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;

export default function LiftingPlanSample({ onBack, wide }) {
  const { t, dir, lang } = useLanguage();
  const card = wide ? styles.cardWide : styles.card;

  const objs = SAMPLE_SCENE.objects;
  const craneObj = objs.find((o) => o.type === "crane");
  const loadObj = objs.find((o) => o.type === "load");
  const hookObj = objs.find((o) => o.type === "hook");
  const slingObj = objs.find((o) => o.type === "slingset");
  const shackleObj = objs.find((o) => o.type === "shackle");
  const workerObj = objs.find((o) => o.type === "worker");
  const exzoneObj = objs.find((o) => o.type === "exclusion_zone");
  const targetObj = objs.find((o) => o.type === "target");

  const calc = useMemo(
    () => computeLiftCalc(objs, SAMPLE_PHASE, SAMPLE_FRAC, SAMPLE_SCENE.env, DEFAULT_CRITERIA),
    [] // eslint-disable-line react-hooks/exhaustive-deps -- SAMPLE_SCENE ثابت است
  );
  const safety = useMemo(() => validateLiftingPlan(objs, calc), [calc]); // eslint-disable-line react-hooks/exhaustive-deps

  const leg = calc.legs[0] || { horiz: 0, angFromVertical: 0, tension: 0 };
  const legShare = calc.total / (loadObj.picks?.length || 4);
  const slingUtilPct = calc.slingWLL ? (calc.maxTension / calc.slingWLL) * 100 : null;

  const pickBearing = bearingDeg(craneObj.x, craneObj.y, loadObj.x, loadObj.y);
  const placeBearing = bearingDeg(craneObj.x, craneObj.y, targetObj.x, targetObj.y);
  const slewDeg = Math.abs(placeBearing - pickBearing);

  const clearanceBuf = loadFootprintRadius(loadObj);
  const requiredClearance = clearanceBuf + (calc.criteria.minPersonnelClearance_m ?? 3);
  const workerClearance = segPointDist(workerObj, calc.sim.pick, calc.sim.place);

  const statusM = liftingStatusMeta(SAMPLE_META.status);
  const sectionTitle = { display: "flex", alignItems: "center", gap: 8, margin: "0 0 14px", fontSize: 14.5, fontWeight: 800, color: THEME.heading };
  const grid3 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 };

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader
        icon={GraduationCap}
        title={t("lpSampleHeaderTitle")}
        note={t("lpSampleHeaderNote")}
        onBack={onBack}
        backLabel={t("commonBackPlain")}
      />

      {/* بنر بالایی */}
      <div style={{
        background: `linear-gradient(135deg, ${THEME.warnBg}, ${THEME.surface2})`, border: `1.5px dashed ${THEME.warn}`,
        borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <GraduationCap size={22} color={THEME.warn} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.warn, marginBottom: 4 }}>{t("lpSampleBannerTitle")}</div>
          <div style={{ fontSize: 12, color: THEME.text2, lineHeight: 1.9 }}>{t("lpSampleBannerBody")}</div>
        </div>
      </div>

      {/* متادیتای نقشه */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <h3 style={sectionTitle}><ListChecks size={16} color={THEME.teal} /> {t("lpMetaSection")}</h3>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: statusM.color, background: statusM.bg }}>
            {t(statusM.labelKey)}
          </span>
        </div>
        <div style={grid3}>
          <Spec label={t("lpFieldPlanNumber")}>{SAMPLE_META.planNumber}</Spec>
          <Spec label={t("lpFieldRevision")}>{SAMPLE_META.revision}</Spec>
          <Spec label={t("lpFieldProject")}>{SAMPLE_META.project}</Spec>
          <Spec label={t("lpFieldContractor")}>{SAMPLE_META.contractorName}</Spec>
          <Spec label={t("lpFieldTitle")}>{SAMPLE_META.title}</Spec>
          <Spec label={t("lpFieldPreparedBy")}>{SAMPLE_META.preparedBy}</Spec>
          <Spec label={t("lpFieldReviewedBy")}>{SAMPLE_META.reviewedBy}</Spec>
          <Spec label={t("lpFieldApprovedBy")}>{SAMPLE_META.approvedBy}</Spec>
        </div>
      </div>

      {/* بومِ واقعی — نمای بالا و جانبی */}
      <div style={card}>
        <h3 style={sectionTitle}><Construction size={16} color={THEME.teal} /> {t("lpSampleSecPlan")}
          <InfoHint text={t("lpSampleHintPlan")} />
        </h3>
        <LiftingPlanCanvas scene={SAMPLE_SCENE} onChange={() => {}} selectedId={null} onSelect={() => {}} readOnly simActive={false} />
      </div>

      {/* مشخصات بار */}
      <div style={card}>
        <h3 style={sectionTitle}><Weight size={16} color={THEME.teal} /> {t("lpSampleSecLoad")}</h3>
        <div style={grid3}>
          <Spec label={t("lpPropLabel")}>{loadObj.label}</Spec>
          <Spec label={t("lpPropWeight")} hint={t("lpSampleHintLoadWeight")}>{fmtKg(loadObj.weightKg)} kg</Spec>
          <Spec label={t("lpSampleFieldDims")}>{fmtN(loadObj.w, 1)} × {fmtN(loadObj.h, 1)} m</Spec>
          <Spec label={t("lpSampleFieldPickCount")}>{loadObj.picks.length} ({t("lpSampleFieldPickSym")})</Spec>
          <Spec label={t("lpSampleFieldCgOffset")} hint={t("lpSampleHintCg")}>
            {fmtN(loadObj.cg.x, 2)} m ({t("lpPropLength")}) ، {fmtN(loadObj.cg.y, 2)} m ({t("lpPropWidthM")})
          </Spec>
          <Spec label={t("lpSampleFieldCgResult")}>
            <span style={{ color: THEME.ok }}>{fmtN(calc.hookToCg, 2)} m</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: THEME.ok, background: THEME.okBg, borderRadius: 999, padding: "2px 8px", marginInlineStart: 8 }}>
              {t("lpSampleFieldCgOk", { warn: fmtN(calc.criteria.hookToCgWarn_m ?? 0.4, 2) })}
            </span>
          </Spec>
        </div>
      </div>

      {/* جرثقیل، بوم و Load Chart */}
      <div style={card}>
        <h3 style={sectionTitle}><Construction size={16} color={THEME.teal} /> {t("lpSampleSecCrane")}</h3>
        <div style={{ ...grid3, marginBottom: 16 }}>
          <Spec label={t("lpPropModel")}>{craneObj.model}</Spec>
          <Spec label={t("lpPropCraneWeight")}>{fmtKg(craneObj.weightKg)} kg</Spec>
          <Spec label={t("lpPropBoomLen")} hint={t("lpSampleHintBoom")}>{fmtN(craneObj.boomLengthM, 1)} m</Spec>
          <Spec label={t("lpPropBoomAngle")}>{fmtN(craneObj.boomAngleDeg, 0)}°</Spec>
          <Spec label={t("lpCalcRadius")}>{fmtN(calc.radius, 1)} m</Spec>
          <Spec label={t("lpPropPads")}>{craneObj.pads}</Spec>
          <Spec label={t("lpPropPadArea")} hint={t("lpSampleHintPadArea")}>{fmtN(craneObj.padArea, 1)} m² ({t("lpSampleMatNote")})</Spec>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: THEME.text2, marginBottom: 8 }}>
          {t("lpSampleChartLabel")} <InfoHint text={t("lpSampleHintChart")} />
        </div>
        <div style={{ overflowX: "auto", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 12 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "start", padding: "9px 12px", color: THEME.text3, fontWeight: 800, borderBottom: `1px solid ${THEME.border}` }}>{t("lpCalcRadius")} (m)</th>
                <th style={{ textAlign: "start", padding: "9px 12px", color: THEME.text3, fontWeight: 800, borderBottom: `1px solid ${THEME.border}` }}>{t("lpCalcCapacity")} (kg)</th>
              </tr>
            </thead>
            <tbody>
              {craneObj.chart.map(([r, capacity]) => {
                const hit = r === Math.round(calc.radius);
                return (
                  <tr key={r} style={hit ? { background: "rgba(20,184,166,.14)" } : undefined}>
                    <td style={{ padding: "9px 12px", color: hit ? THEME.heading : THEME.text, fontWeight: hit ? 800 : 400, borderBottom: `1px solid ${THEME.borderSoft}` }}>
                      {fmtN(r, 0)} {hit && `← ${t("lpSampleChartHit")}`}
                    </td>
                    <td style={{ padding: "9px 12px", color: hit ? THEME.heading : THEME.text, fontWeight: hit ? 800 : 400, borderBottom: `1px solid ${THEME.borderSoft}` }}>
                      {fmtN(capacity, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ریگینگ */}
      <div style={card}>
        <h3 style={sectionTitle}><Link2 size={16} color={THEME.teal} /> {t("lpSampleSecRigging")}</h3>
        <div style={{ ...grid3, marginBottom: 16 }}>
          <Spec label={t("lpObj_hook")}>{fmtKg(hookObj.weightKg)} kg · WLL {fmtKg(hookObj.wllKg)} kg · {t("lpPropRiggingH")} {fmtN(hookObj.riggingH, 1)} m</Spec>
          <Spec label={t("lpObj_slingset")} hint={t("lpSampleHintWll")}>
            {t("lpSampleSlingType")} · WLL {fmtKg(slingObj.wllKg)} kg · {fmtKg(slingObj.weightKg)} kg · {slingObj.count} {t("lpPropCount")}
          </Spec>
          <Spec label={t("lpObj_shackle")}>{t("lpSampleShackleType")} · WLL {fmtKg(shackleObj.wllKg)} kg · {shackleObj.count} {t("lpPropCount")}</Spec>
          <Spec label={t("lpObj_spreader")}>
            <span style={{ color: THEME.text3, fontWeight: 700, fontSize: 12.5 }}>
              {t("lpSampleNoSpreader", { ang: fmtN(calc.minSlingAngle, 0) })}
            </span>
          </Spec>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: THEME.text2, marginBottom: 6 }}>
          {t("lpSampleSlingCalcTitle")} <InfoHint text={t("lpSampleHintSlingAngle")} />
        </div>
        <CalcRow k={t("lpSampleFieldHoriz")} v={`${fmtN(leg.horiz, 2)} m`} />
        <CalcRow k={t("lpPropRiggingH")} v={`${fmtN(hookObj.riggingH, 2)} m`} />
        <CalcRow k={t("lpCalcSlingAngle")} v={`${fmtN(leg.angFromVertical, 0)}°`} />
        <CalcRow k={t("lpSampleFieldShare")} v={`${fmtKg(legShare)} kg`} />
        <CalcRow k={t("lpCalcSlingTension")} v={`${fmtKg(leg.tension)} kg`} strong />
        <CalcRow k={t("lpSampleFieldSlingUtil")} v={`${fmtN(slingUtilPct, 0)}٪`} tone="ok" />
      </div>

      {/* زمین، آوتریگر، شرایط جوی */}
      <div style={card}>
        <h3 style={sectionTitle}><Layers size={16} color={THEME.teal} /> {t("lpSampleSecGround")}</h3>
        <div style={grid3}>
          <Spec label={t("lpEnvSoil")} hint={t("lpHintSoil")}>{fmtN(calc.soilKpa, 0)} kPa</Spec>
          <Spec label={t("lpEnvSf")} hint={t("lpHintSf")}>{calc.sf}</Spec>
          <Spec label={t("lpCalcAllow")}>{fmtN(calc.allowableGroundKpa, 0)} kPa</Spec>
          <Spec label={t("lpSampleFieldWindLimit")} hint={t("lpSampleHintWind")}>{fmtN(calc.criteria.windLimit_ms, 1)} m/s</Spec>
        </div>
        <div style={{ marginTop: 14 }}>
          <CalcRow k={t("lpSampleWorstPadNote")} v="" />
          <CalcRow k={t("lpCalcGbp")} v={`${fmtN(calc.groundPressureKpa, 0)} kPa`} tone={calc.groundPressureKpa > calc.allowableGroundKpa ? "bad" : "ok"} strong />
          <CalcRow k={t("lpCalcAllow")} v={`${fmtN(calc.allowableGroundKpa, 0)} kPa`} />
        </div>
      </div>

      {/* مسیر، ناحیه ممنوعه و افراد */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={card}>
          <h3 style={sectionTitle}><MapPin size={16} color={THEME.teal} /> {t("lpSampleSecPath")} <InfoHint text={t("lpSampleHintPath")} /></h3>
          <CalcRow k={t("lpSampleFieldPick")} v={`${fmtN(calc.sim.rP, 1)} m · ${fmtN(pickBearing, 0)}°`} />
          <CalcRow k={t("lpSampleFieldPlace")} v={`${fmtN(calc.sim.rQ, 1)} m · ${fmtN(placeBearing, 0)}°`} />
          <CalcRow k={t("lpSampleFieldSlew")} v={`≈ ${fmtN(slewDeg, 0)}°`} />
          <CalcRow k={t("lpSampleFieldExclusion")} v={t("lpSampleNoConflict")} tone="ok" />
          <CalcRow k={t("lpSampleFieldWorkerClearance")} v={`${fmtN(workerClearance, 1)} m (≥ ${fmtN(requiredClearance, 1)} m)`} tone="ok" />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}><Users size={16} color={THEME.teal} /> {t("lpSampleSecRoles")} <InfoHint text={t("lpSampleHintRoles")} /></h3>
          {[
            ["SL", t("lpSampleRoleSupervisor"), t("lpSampleRoleSupervisorDesc")],
            ["OP", t("lpSampleRoleOperator"), t("lpSampleRoleOperatorDesc")],
            ["RG", t("lpSampleRoleRigger"), t("lpSampleRoleRiggerDesc")],
            ["BM", t("lpSampleRoleBanksman"), t("lpSampleRoleBanksmanDesc")],
            ["SP", workerObj.role, t("lpSampleRoleSpotterDesc")],
          ].map(([badge, title, desc], i) => (
            <div key={badge} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${THEME.borderSoft}` : "none" }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: THEME.tealSoft, color: THEME.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{badge}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{title}</div>
                <div style={{ fontSize: 11, color: THEME.text3 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* چک‌لیست HSE */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}><ListChecks size={16} color={THEME.teal} /> {t("lpSampleSecChecklist")}</h3>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: THEME.teal, background: THEME.tealSoft, borderRadius: 8, padding: "3px 10px" }}>
            {t("lpSampleChecklistNote")}
          </span>
        </div>
        {LIFT_RISK_ITEMS.map((it, i) => (
          <div key={it.k} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: i < LIFT_RISK_ITEMS.length - 1 ? `1px solid ${THEME.borderSoft}` : "none" }}>
            <CheckCircle2 size={16} color={THEME.ok} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12.5, color: THEME.text }}>
              {it.l[lang] || it.l.fa}
              {it.critical && <span style={{ fontSize: 10, color: THEME.danger, fontWeight: 700, marginInlineStart: 6 }}>({t("lpSampleCritical")})</span>}
            </span>
          </div>
        ))}
      </div>

      {/* محاسبات و ایمنیِ لحظه‌ای — دقیقاً همان پنلِ واقعی */}
      <div style={card}>
        <h3 style={sectionTitle}><ShieldCheck size={16} color={THEME.teal} /> {t("lpCalcSafetySection")}
          <span style={{ fontSize: 10.5, fontWeight: 800, color: THEME.teal, background: THEME.tealSoft, borderRadius: 8, padding: "3px 10px", marginInlineStart: "auto" }}>
            {t("lpSampleRealEngineNote")}
          </span>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <div>
            <Verdict worst={safety.worst} pct={calc.utilizationPct} t={t} />
            <Gauge pct={calc.utilizationPct} warn={calc.criteria.warnUtilizationPct} max={calc.criteria.maxUtilizationPct} />
            <div style={{ marginTop: 8 }}>
              <CalcRow k={t("lpCalcLoadW")} v={`${fmtKg(calc.loadW)} kg`} />
              <CalcRow k={t("lpCalcRigW")} v={`${fmtKg(calc.rigW)} kg`} />
              <CalcRow k={t("lpCalcTotal")} v={`${fmtKg(calc.total)} kg`} strong />
              <CalcRow k={t("lpCalcRadius")} v={`${fmtN(calc.radius, 1)} m`} />
              <CalcRow k={t("lpCalcCapacity")} v={calc.capacity == null ? t("lpCalcOffChart") : `${fmtKg(calc.capacity)} kg`} tone={calc.capacity == null ? "bad" : undefined} />
              <CalcRow k={t("lpCalcUtil")} v={calc.utilizationPct == null ? "—" : `${fmtN(calc.utilizationPct, 1)}٪`}
                tone={calc.utilizationPct == null ? "bad" : calc.utilizationPct > calc.criteria.maxUtilizationPct ? "bad" : calc.utilizationPct > calc.criteria.warnUtilizationPct ? "warn" : "ok"} />
              <CalcRow k={t("lpCalcSlingAngle")} v={calc.minSlingAngle == null ? "—" : `${fmtN(calc.minSlingAngle, 0)}°`} />
              <CalcRow k={t("lpCalcSlingTension")} v={`${fmtKg(calc.maxTension)} kg`} />
              <CalcRow k={t("lpCalcSlingWll")} v={`${fmtKg(calc.slingWLL)} kg`} />
              <CalcRow k={t("lpCalcGbp")} v={`${fmtN(calc.groundPressureKpa, 0)} kPa`} />
              <CalcRow k={t("lpCalcAllow")} v={`${fmtN(calc.allowableGroundKpa, 0)} kPa`} />
            </div>
            <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>{t("lpCalcNote")}</p>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: THEME.text2, marginBottom: 6 }}>{t("lpSafetySection")}</div>
            {safety.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 11.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 3, flexShrink: 0, background: it.level === "fail" ? THEME.danger : it.level === "warn" ? THEME.warn : THEME.ok }} />
                <span style={{ color: THEME.text2 }}>{it.msg}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "11px 13px", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 10, fontSize: 11, color: THEME.text3, lineHeight: 1.9 }}>
              <Info size={12} style={{ verticalAlign: "-1.5px", marginInlineEnd: 4 }} />
              {t("lpSampleWhyFewFindings", { cg: fmtN(calc.hookToCg, 2), wc: fmtN(workerClearance, 1) })}
            </div>
            <p style={{ fontSize: 10, color: THEME.text3, marginTop: 10, lineHeight: 1.7 }}>{t("lpSampleCriteriaNote")}</p>
          </div>
        </div>
      </div>

      {/* نتیجه نهایی */}
      <div style={{ ...card, borderColor: THEME.warn }}>
        <h3 style={sectionTitle}><CheckCircle2 size={16} color={THEME.warn} /> {t("lpSampleSecVerdict")}</h3>
        <div style={{ fontSize: 14, fontWeight: 800, color: THEME.warn, marginBottom: 8 }}>{t("lpVerdictWarn")}</div>
        <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 2, margin: 0 }}>
          {t("lpSampleVerdictBody", {
            util: fmtN(calc.utilizationPct, 1), warn: fmtN(calc.criteria.warnUtilizationPct, 0), max: fmtN(calc.criteria.maxUtilizationPct, 0),
          })}
        </p>
      </div>

      {/* بنر پایینی */}
      <div style={{ background: THEME.surface2, border: `1.5px dashed ${THEME.borderStrong}`, borderRadius: 14, padding: "14px 18px", color: THEME.text2, fontSize: 12, lineHeight: 1.9 }}>
        {t("lpSampleBottomNote", { btn: t("lpNewPlan") })}
      </div>
    </div>
  );
}
