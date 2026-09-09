import React, { useState } from "react";
import {
  Sigma, Construction, Flame, FlaskConical, Zap, Wind, Atom, HardHat, Leaf,
  Wrench, ArrowRightLeft, Volume2,
} from "lucide-react";
import { THEME } from "../shared.js";

/* ================================================================== *
 * رجیستریِ «ابزارهای سریع HSE» — تنها منبعِ حقیقتِ «چه ابزاری، در چه
 * دسته‌ای، با چه محاسبه/مرجعی». افزودنِ ابزارِ جدید = افزودنِ یک شیٔ به
 * آرایهٔ QUICK_TOOLS؛ هیچ تغییرِ ساختاری لازم نیست. هر ابزار سبک است و
 * فقط محاسبه/جدولِ مرجع دارد — بدونِ API و بدونِ داده‌ی واقعیِ سازمان.
 * ================================================================== */

export const QT_CATEGORIES = [
  { key: "calc", icon: Sigma, label: { fa: "محاسبات HSE", en: "HSE calculations", de: "HSE-Berechnungen" } },
  { key: "lifting", icon: Construction, label: { fa: "جرثقیل و لیفتینگ", en: "Crane & lifting", de: "Kran & Heben" } },
  { key: "fire", icon: Flame, label: { fa: "حریق", en: "Fire", de: "Brand" } },
  { key: "chem", icon: FlaskConical, label: { fa: "مواد شیمیایی", en: "Chemicals", de: "Chemikalien" } },
  { key: "elec", icon: Zap, label: { fa: "برق", en: "Electrical", de: "Elektrik" } },
  { key: "gas", icon: Wind, label: { fa: "گازها", en: "Gases", de: "Gase" } },
  { key: "rad", icon: Atom, label: { fa: "رادیوگرافی", en: "Radiography", de: "Radiografie" } },
  { key: "ppe", icon: HardHat, label: { fa: "PPE", en: "PPE", de: "PSA" } },
  { key: "env", icon: Leaf, label: { fa: "محیط زیست", en: "Environment", de: "Umwelt" } },
  { key: "general", icon: Wrench, label: { fa: "ابزارهای عمومی HSE", en: "General HSE tools", de: "Allgemeine HSE-Werkzeuge" } },
];

/* ---------------------------- primitives --------------------------- */
const box = { background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px" };

function Num({ label, value, onChange, unit, step = "any", hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: THEME.text2, marginBottom: 5 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number" inputMode="decimal" step={step} value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 14.5, fontFamily: THEME.font, outline: "none" }}
        />
        {unit && <span style={{ fontSize: 12, color: THEME.text3, fontWeight: 700, flexShrink: 0 }}>{unit}</span>}
      </div>
      {hint && <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 4, lineHeight: 1.6 }}>{hint}</div>}
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: THEME.text2, marginBottom: 5 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 14, fontFamily: THEME.font, outline: "none" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Result({ children, tone = "ok" }) {
  const c = tone === "bad" ? THEME.danger : tone === "warn" ? THEME.warn : THEME.ok;
  const bg = tone === "bad" ? THEME.dangerBg : tone === "warn" ? THEME.warnBg : THEME.okBg;
  return (
    <div style={{ marginTop: 6, background: bg, border: `1px solid ${c}33`, borderRadius: 12, padding: "12px 14px", color: c, fontSize: 13.5, fontWeight: 700, lineHeight: 1.9 }}>
      {children}
    </div>
  );
}

function RefTable({ head, rows }) {
  return (
    <div style={{ overflowX: "auto", ...box, padding: 0 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={{ textAlign: "start", padding: "9px 12px", color: THEME.text3, fontWeight: 800, borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "9px 12px", color: THEME.text, borderBottom: `1px solid ${THEME.borderSoft}`, whiteSpace: "nowrap" }}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmt = (n, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : Number(n.toFixed(d)).toLocaleString());

/* ------------------------------ tools ----------------------------- */

// 1) مبدل واحد
const UNIT_GROUPS = {
  length: { fa: "طول", en: "Length", de: "Länge", units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, yd: 0.9144, mi: 1609.344 } },
  mass: { fa: "جرم", en: "Mass", de: "Masse", units: { kg: 1, g: 0.001, t: 1000, lb: 0.45359237, oz: 0.0283495 } },
  pressure: { fa: "فشار", en: "Pressure", de: "Druck", units: { bar: 1, Pa: 1e-5, kPa: 0.01, MPa: 10, psi: 0.0689476, atm: 1.01325, mmHg: 0.001333224 } },
  volume: { fa: "حجم", en: "Volume", de: "Volumen", units: { L: 1, "m³": 1000, mL: 0.001, gal: 3.785411784, "ft³": 28.316846592 } },
  area: { fa: "مساحت", en: "Area", de: "Fläche", units: { "m²": 1, "km²": 1e6, "cm²": 1e-4, "ft²": 0.09290304, ha: 1e4, acre: 4046.8564224 } },
  speed: { fa: "سرعت", en: "Speed", de: "Geschwindigkeit", units: { "m/s": 1, "km/h": 0.277778, mph: 0.44704, knot: 0.514444 } },
  temp: { fa: "دما", en: "Temperature", de: "Temperatur", units: { "°C": "c", "°F": "f", K: "k" } },
};
function toBaseTemp(v, u) { return u === "°C" ? v : u === "°F" ? (v - 32) * 5 / 9 : v - 273.15; }
function fromBaseTemp(c, u) { return u === "°C" ? c : u === "°F" ? c * 9 / 5 + 32 : c + 273.15; }

function UnitConverter({ lang }) {
  const [grp, setGrp] = useState("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [val, setVal] = useState("1");
  const g = UNIT_GROUPS[grp];
  const uKeys = Object.keys(g.units);
  const changeGrp = (k) => { setGrp(k); const ks = Object.keys(UNIT_GROUPS[k].units); setFrom(ks[0]); setTo(ks[1] || ks[0]); };
  const v = num(val);
  let out = null;
  if (v !== null) {
    if (grp === "temp") out = fromBaseTemp(toBaseTemp(v, from), to);
    else out = (v * g.units[from]) / g.units[to];
  }
  return (
    <div>
      <Sel label={lang === "fa" ? "نوع کمیت" : lang === "de" ? "Größe" : "Quantity"} value={grp} onChange={changeGrp}
        options={Object.keys(UNIT_GROUPS).map((k) => ({ v: k, l: UNIT_GROUPS[k][lang] || UNIT_GROUPS[k].en }))} />
      <Num label={lang === "fa" ? "مقدار" : lang === "de" ? "Wert" : "Value"} value={val} onChange={setVal} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Sel label={lang === "fa" ? "از" : lang === "de" ? "Von" : "From"} value={from} onChange={setFrom} options={uKeys.map((u) => ({ v: u, l: u }))} /></div>
        <div style={{ flex: 1 }}><Sel label={lang === "fa" ? "به" : lang === "de" ? "Nach" : "To"} value={to} onChange={setTo} options={uKeys.map((u) => ({ v: u, l: u }))} /></div>
      </div>
      <Result>{fmt(v, 4)} {from} = <span style={{ fontSize: 16 }}>{fmt(out, 4)}</span> {to}</Result>
    </div>
  );
}

// 2) LTIFR / نرخ شدت
function LtifrTool({ lang }) {
  const [cases, setCases] = useState("");
  const [days, setDays] = useState("");
  const [hours, setHours] = useState("");
  const c = num(cases); const d = num(days); const h = num(hours);
  const fr = c !== null && h ? (c * 1_000_000) / h : null;
  const sr = d !== null && h ? (d * 1_000_000) / h : null;
  return (
    <div>
      <Num label={lang === "fa" ? "تعداد حوادثِ ثبت‌شده (LTI)" : lang === "de" ? "Anzahl meldepflichtiger Unfälle" : "Recordable / lost-time cases"} value={cases} onChange={setCases} />
      <Num label={lang === "fa" ? "مجموع روزهای ازدست‌رفته" : lang === "de" ? "Verlorene Tage gesamt" : "Total lost days"} value={days} onChange={setDays} />
      <Num label={lang === "fa" ? "نفرساعتِ کارکرد" : lang === "de" ? "Geleistete Personenstunden" : "Hours worked"} value={hours} onChange={setHours} unit="h" />
      <Result>
        FR (LTIFR) = <b>{fmt(fr, 2)}</b> {lang === "fa" ? "به‌ازای ۱٬۰۰۰٬۰۰۰ نفرساعت" : "per 1,000,000 h"}<br />
        SR ({lang === "fa" ? "نرخ شدت" : "Severity rate"}) = <b>{fmt(sr, 2)}</b>
      </Result>
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        FR = {lang === "fa" ? "حوادث × ۱٬۰۰۰٬۰۰۰ ÷ نفرساعت" : "cases × 1,000,000 ÷ hours"}
      </div>
    </div>
  );
}

// 3) TRIR
function TrirTool({ lang }) {
  const [cases, setCases] = useState("");
  const [hours, setHours] = useState("");
  const c = num(cases); const h = num(hours);
  const trir = c !== null && h ? (c * 200_000) / h : null;
  return (
    <div>
      <Num label={lang === "fa" ? "تعداد حوادثِ ثبت‌شده" : lang === "de" ? "Meldepflichtige Fälle" : "Recordable cases"} value={cases} onChange={setCases} />
      <Num label={lang === "fa" ? "نفرساعتِ کارکرد" : lang === "de" ? "Personenstunden" : "Hours worked"} value={hours} onChange={setHours} unit="h" />
      <Result>TRIR = <b>{fmt(trir, 2)}</b> {lang === "fa" ? "به‌ازای ۲۰۰٬۰۰۰ نفرساعت (≈ ۱۰۰ نفر در سال)" : "per 200,000 h (≈100 FTE/yr)"}</Result>
    </div>
  );
}

// 5) ترکیب تراز صدا
function NoiseTool({ lang }) {
  const [rows, setRows] = useState(["", ""]);
  const vals = rows.map(num).filter((n) => n !== null);
  const total = vals.length ? 10 * Math.log10(vals.reduce((s, v) => s + Math.pow(10, v / 10), 0)) : null;
  return (
    <div>
      {rows.map((r, i) => (
        <Num key={i} label={`${lang === "fa" ? "منبع" : lang === "de" ? "Quelle" : "Source"} ${i + 1}`} value={r} onChange={(v) => setRows((p) => p.map((x, j) => (j === i ? v : x)))} unit="dB" />
      ))}
      <button type="button" onClick={() => setRows((p) => [...p, ""])}
        style={{ fontSize: 12, fontWeight: 700, color: THEME.teal, border: `1px solid ${THEME.teal}`, background: "transparent", borderRadius: 8, padding: "7px 12px", cursor: "pointer", marginBottom: 10 }}>
        + {lang === "fa" ? "افزودن منبع" : lang === "de" ? "Quelle hinzufügen" : "Add source"}
      </button>
      {total !== null && <Result tone={total >= 85 ? "bad" : total >= 80 ? "warn" : "ok"}>
        {lang === "fa" ? "ترازِ کلِ ترکیبی" : "Combined level"} = <b>{fmt(total, 1)} dB</b>
        {total >= 85 && <> — {lang === "fa" ? "الزام محافظِ شنوایی و پایش" : "hearing protection & monitoring required"}</>}
      </Result>}
    </div>
  );
}

// 6) درصد بارِ جرثقیل
function CraneLoadTool({ lang }) {
  const [load, setLoad] = useState("");
  const [swl, setSwl] = useState("");
  const [rig, setRig] = useState("");
  const l = num(load); const s = num(swl); const r = num(rig) || 0;
  const pct = l !== null && s ? ((l + r) / s) * 100 : null;
  const tone = pct === null ? "ok" : pct > 90 ? "bad" : pct > 75 ? "warn" : "ok";
  return (
    <div>
      <Num label={lang === "fa" ? "وزنِ بار" : lang === "de" ? "Lastgewicht" : "Load weight"} value={load} onChange={setLoad} unit="kg" />
      <Num label={lang === "fa" ? "وزنِ ابزارِ ریگینگ (اسلینگ/شکل و…)" : "Rigging weight"} value={rig} onChange={setRig} unit="kg" hint={lang === "fa" ? "اختیاری" : "optional"} />
      <Num label={lang === "fa" ? "بارِ مجازِ کاری (SWL) در شعاعِ کار" : "SWL at working radius"} value={swl} onChange={setSwl} unit="kg" />
      {pct !== null && <Result tone={tone}>
        {lang === "fa" ? "درصدِ بهره‌گیری" : "Utilisation"} = <b>{fmt(pct, 1)} %</b>
        {tone === "bad" && <> — {lang === "fa" ? "بیش از ۹۰٪: توقف / بازنگری پلن" : "> 90%: stop / review plan"}</>}
        {tone === "warn" && <> — {lang === "fa" ? "۷۵–۹۰٪: نظارتِ مستقیمِ سرپرست لیفتینگ" : "75–90%: direct lift-supervisor oversight"}</>}
      </Result>}
    </div>
  );
}

// 7) ضریبِ زاویهٔ اسلینگ
function SlingAngleTool({ lang }) {
  const [ang, setAng] = useState("60");
  const [legs, setLegs] = useState("2");
  const [wll, setWll] = useState("");
  const a = num(ang); const n = num(legs); const w = num(wll);
  const factor = a !== null && a > 0 && a < 180 ? 1 / Math.sin((a / 2) * Math.PI / 180) : null;
  // ظرفیت مؤثرِ سیستمِ اسلینگ (تقریب محافظه‌کارانه: ۲ پایهٔ باربر)
  const eff = w && a !== null ? w * (n >= 2 ? 2 : 1) * Math.sin((a / 2) * Math.PI / 180) : null;
  return (
    <div>
      <Num label={lang === "fa" ? "زاویهٔ بینِ دو پایهٔ اسلینگ" : "Included angle between legs"} value={ang} onChange={setAng} unit="°" hint={lang === "fa" ? "زاویهٔ کمتر → نیرویِ بیشتر روی هر پایه" : "smaller angle → higher leg tension"} />
      <Sel label={lang === "fa" ? "تعدادِ پایه" : lang === "de" ? "Anzahl Stränge" : "Number of legs"} value={legs} onChange={setLegs} options={[{ v: "2", l: "2" }, { v: "3", l: "3" }, { v: "4", l: "4" }]} />
      <Num label={lang === "fa" ? "WLL هر پایهٔ اسلینگ" : "WLL per sling leg"} value={wll} onChange={setWll} unit="kg" />
      {factor !== null && <Result tone={a < 45 ? "bad" : a < 60 ? "warn" : "ok"}>
        {lang === "fa" ? "ضریبِ نیرو روی هر پایه" : "Tension factor per leg"} = <b>×{fmt(factor, 2)}</b>
        {eff !== null && <><br />{lang === "fa" ? "ظرفیتِ مؤثرِ سیستم (تقریبی)" : "Approx. effective capacity"} = <b>{fmt(eff, 0)} kg</b></>}
        {a < 45 && <><br />{lang === "fa" ? "زاویهٔ زیرِ ۴۵° مجاز نیست" : "angles below 45° not permitted"}</>}
      </Result>}
    </div>
  );
}

// 8) فاصلهٔ ایمنِ پرتونگاری (عکسِ مجذور)
function RadDistanceTool({ lang }) {
  const [d1, setD1] = useState("");
  const [dr1, setDr1] = useState("");
  const [target, setTarget] = useState("7.5");
  const a = num(d1), b = num(dr1), c = num(target);
  const d2 = a && b && c ? a * Math.sqrt(b / c) : null;
  return (
    <div>
      <Num label={lang === "fa" ? "فاصلهٔ اندازه‌گیری (d₁)" : "Measured distance (d₁)"} value={d1} onChange={setD1} unit="m" />
      <Num label={lang === "fa" ? "آهنگِ دُز در d₁" : "Dose rate at d₁"} value={dr1} onChange={setDr1} unit="µSv/h" />
      <Num label={lang === "fa" ? "آهنگِ دُزِ هدف (مرزِ ناحیه)" : "Target dose rate (boundary)"} value={target} onChange={setTarget} unit="µSv/h" hint={lang === "fa" ? "پیش‌فرض ۷٫۵ µSv/h" : "default 7.5 µSv/h"} />
      {d2 !== null && <Result>{lang === "fa" ? "فاصلهٔ لازم برای طنابِ حصار" : "Barrier-rope distance"} ≈ <b>{fmt(d2, 1)} m</b></Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>d₂ = d₁ × √(DR₁ ÷ DR_target) — {lang === "fa" ? "قانونِ عکسِ مجذورِ فاصله؛ جایگزینِ پایشِ واقعیِ RSO نیست." : "inverse-square law; not a substitute for RSO survey."}</div>
    </div>
  );
}


// 15) شعاعِ نواحیِ رادیوگرافی — بر پایهٔ قدرتِ چشمه (Ci)
const RAD_ISOTOPES = [
  { v: "ir192", l: "Ir-192", info: { fa: "≈ ۰٫۳۸ MeV · نیم‌عمر ≈ ۷۴ روز", en: "≈0.38 MeV · t½ ≈74 d", de: "≈0,38 MeV · t½ ≈74 d" } },
  { v: "co60", l: "Co-60", info: { fa: "≈ ۱٫۲۵ MeV · نیم‌عمر ≈ ۵٫۲۷ سال", en: "≈1.25 MeV · t½ ≈5.27 y", de: "≈1,25 MeV · t½ ≈5,27 J" } },
  { v: "se75", l: "Se-75", info: { fa: "≈ ۰٫۲۱ MeV · نیم‌عمر ≈ ۱۲۰ روز", en: "≈0.21 MeV · t½ ≈120 d", de: "≈0,21 MeV · t½ ≈120 d" } },
  { v: "other", lk: { fa: "سایر منابع", en: "Other source", de: "Andere Quelle" }, info: null },
];

function RadZonesTool({ lang }) {
  const [iso, setIso] = useState("ir192");
  const [ci, setCi] = useState("");
  const A = num(ci);
  const ok = A !== null && A > 0;
  const rProh = ok ? 1.6 * Math.sqrt(A) : null;
  const rCtrl = ok ? 26 * Math.sqrt(A) : null;
  const rSup = ok ? 45 * Math.sqrt(A) : null;
  const isoObj = RAD_ISOTOPES.find((z) => z.v === iso);
  const isoInfo = isoObj && isoObj.info ? (isoObj.info[lang] || isoObj.info.en) : "";
  const L = (o) => (o && (o[lang] || o.fa || o.en)) || "";

  const zoneMeta = [
    { key: "sup", r: rSup, color: "#1e9e6a", dot: "🟢", name: { fa: "ناحیهٔ تحت نظارت", en: "Supervised area", de: "Überwachter Bereich" } },
    { key: "ctrl", r: rCtrl, color: "#e8a13a", dot: "🟠", name: { fa: "ناحیهٔ کنترل‌شده", en: "Controlled area", de: "Kontrollbereich" } },
    { key: "proh", r: rProh, color: "#e05c5c", dot: "🔴", name: { fa: "منطقهٔ ممنوعه", en: "Prohibited zone", de: "Sperrzone" } },
  ];

  // نمایشِ رادیال: بیرونی‌ترین دایره = تحت نظارت، مقیاس‌شده تا شعاعِ ۱۰۴ واحد
  const S = ok && rSup ? 104 / rSup : 0;

  return (
    <div>
      <Sel
        label={lang === "fa" ? "نوع منبع / ایزوتوپ" : lang === "de" ? "Quelle / Isotop" : "Source / isotope"}
        value={iso} onChange={setIso}
        options={RAD_ISOTOPES.map((z) => ({ v: z.v, l: z.l || L(z.lk) }))}
      />
      {isoInfo && <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: -6, marginBottom: 12, lineHeight: 1.7 }}>{isoInfo}</div>}
      <Num label={lang === "fa" ? "قدرتِ چشمه (A)" : lang === "de" ? "Quellenaktivität (A)" : "Source activity (A)"} value={ci} onChange={setCi} unit="Ci" />

      {ok && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {zoneMeta.map((z) => (
              <div key={z.key} style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.surface2, border: `1px solid ${z.color}40`, borderRadius: 11, padding: "10px 13px" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: z.color, flexShrink: 0, boxShadow: `0 0 0 3px ${z.color}22` }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{L(z.name)}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: z.color, fontVariantNumeric: "tabular-nums" }}>{fmt(z.r, 1)} m</span>
              </div>
            ))}
          </div>

          {/* نمایشِ گرافیکیِ دایره‌ایِ سه محدوده */}
          <div style={{ marginTop: 14, background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "14px 10px 10px" }}>
            <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto" }} role="img" aria-label={lang === "fa" ? "نمودارِ نواحیِ رادیوگرافی" : "Radiography zones diagram"}>
              <circle cx="120" cy="120" r={rSup * S} fill="#1e9e6a" fillOpacity="0.12" stroke="#1e9e6a" strokeWidth="1.4" />
              <circle cx="120" cy="120" r={rCtrl * S} fill="#e8a13a" fillOpacity="0.16" stroke="#e8a13a" strokeWidth="1.4" />
              <circle cx="120" cy="120" r={Math.max(rProh * S, 3)} fill="#e05c5c" fillOpacity="0.24" stroke="#e05c5c" strokeWidth="1.6" />
              <line x1="120" y1="120" x2="120" y2={120 - rSup * S} stroke={THEME.text3} strokeWidth="0.8" strokeDasharray="3 3" />
              <circle cx="120" cy="120" r="4.5" fill={THEME.heading} />
              <text x="120" y="120" dy="16" textAnchor="middle" fontSize="8" fill={THEME.text3} style={{ fontFamily: THEME.font }}>
                {lang === "fa" ? "چشمه" : lang === "de" ? "Quelle" : "Source"}
              </text>
              <text x="120" y={120 - rProh * S - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#e05c5c" style={{ fontFamily: THEME.font }}>{fmt(rProh, 0)} m</text>
              <text x="120" y={120 - rCtrl * S - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#e8a13a" style={{ fontFamily: THEME.font }}>{fmt(rCtrl, 0)} m</text>
              <text x="120" y={120 - rSup * S - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1e9e6a" style={{ fontFamily: THEME.font }}>{fmt(rSup, 0)} m</text>
            </svg>
            <div style={{ fontSize: 9.5, color: THEME.text3, textAlign: "center", marginTop: 2 }}>
              {lang === "fa" ? "شعاع‌ها هم‌مرکز حولِ چشمه — مقیاسِ نسبی" : lang === "de" ? "Konzentrische Radien um die Quelle — relative Skala" : "Concentric radii around the source — relative scale"}
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10, lineHeight: 1.8 }}>
        R (m): {lang === "fa" ? "ممنوعه" : "Prohibited"} = 1.6·√A · {lang === "fa" ? "کنترل‌شده" : "Controlled"} = 26·√A · {lang === "fa" ? "تحت نظارت" : "Supervised"} = 45·√A &nbsp;(A {lang === "fa" ? "بر حسبِ" : "in"} Ci)
      </div>
    </div>
  );
}

/* --------------------------- registry ---------------------------- */
export const QUICK_TOOLS = [
  { id: "unit-converter", cat: "general", icon: ArrowRightLeft, Tool: UnitConverter,
    title: { fa: "مبدل واحدها", en: "Unit converter", de: "Einheitenrechner" },
    desc: { fa: "طول، جرم، فشار، حجم، مساحت، سرعت و دما", en: "Length, mass, pressure, volume, area, speed, temperature", de: "Länge, Masse, Druck, Volumen, Fläche, Geschwindigkeit, Temperatur" } },
  { id: "ltifr", cat: "calc", icon: Sigma, Tool: LtifrTool,
    title: { fa: "LTIFR و نرخِ شدت", en: "LTIFR & severity rate", de: "LTIFR & Schwererate" },
    desc: { fa: "شاخصِ تکرار و شدتِ حوادث بر پایهٔ نفرساعت", en: "Frequency & severity from hours worked", de: "Häufigkeit & Schwere aus Personenstunden" } },
  { id: "trir", cat: "calc", icon: Sigma, Tool: TrirTool,
    title: { fa: "TRIR", en: "TRIR", de: "TRIR" },
    desc: { fa: "نرخِ کلِ حوادثِ ثبت‌شده به‌ازای ۲۰۰٬۰۰۰ نفرساعت", en: "Total recordable rate per 200,000 h", de: "Gesamtrate meldepflichtiger Fälle je 200.000 h" } },
  { id: "noise", cat: "calc", icon: Volume2, Tool: NoiseTool,
    title: { fa: "ترکیبِ ترازِ صدا", en: "Combine sound levels", de: "Schallpegel kombinieren" },
    desc: { fa: "جمعِ لگاریتمیِ چند منبعِ صوتی", en: "Logarithmic sum of several sources", de: "Logarithmische Summe mehrerer Quellen" } },
  { id: "crane-load", cat: "lifting", icon: Construction, Tool: CraneLoadTool,
    title: { fa: "درصدِ بارِ جرثقیل", en: "Crane load %", de: "Kranlast %" },
    desc: { fa: "درصدِ بهره‌گیری از SWL و هشدارِ ۷۵/۹۰٪", en: "SWL utilisation with 75/90% alerts", de: "SWL-Auslastung mit 75/90 %-Warnung" } },
  { id: "sling-angle", cat: "lifting", icon: Construction, Tool: SlingAngleTool,
    title: { fa: "ضریبِ زاویهٔ اسلینگ", en: "Sling angle factor", de: "Anschlagwinkel-Faktor" },
    desc: { fa: "نیرویِ هر پایه و ظرفیتِ مؤثرِ سیستمِ اسلینگ", en: "Leg tension and effective sling capacity", de: "Strangkraft und effektive Anschlagkapazität" } },
  { id: "rad-zones", cat: "rad", icon: Atom, Tool: RadZonesTool,
    title: { fa: "محاسبه شعاع نواحی رادیوگرافی", en: "Radiography zone radii", de: "Radiografie-Zonenradien" },
    desc: { fa: "شعاعِ منطقهٔ ممنوعه، کنترل‌شده و تحت نظارت بر پایهٔ قدرتِ چشمه (Ci) + نمودارِ دایره‌ای", en: "Prohibited / controlled / supervised radii from source activity (Ci) + radial diagram", de: "Sperr-, Kontroll- und Überwachungsradien aus Quellenaktivität (Ci) + Radialdiagramm" } },
  { id: "rad-distance", cat: "rad", icon: Atom, Tool: RadDistanceTool,
    title: { fa: "فاصلهٔ ایمنِ پرتونگاری (بر پایهٔ آهنگِ دُز)", en: "Radiography safe distance (dose-rate)", de: "Sicherer Abstand Radiografie (Dosisleistung)" },
    desc: { fa: "قانونِ عکسِ مجذور برای مرزِ ناحیهٔ کنترل‌شده", en: "Inverse-square law for the controlled-area boundary", de: "Abstandsquadratgesetz für die Sperrgrenze" } },
];
