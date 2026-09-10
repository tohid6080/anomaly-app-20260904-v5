import React, { useState, lazy, Suspense } from "react";
import {
  Sigma, Construction, Flame, FlaskConical, Zap, Wind, Atom, HardHat, Leaf,
  Wrench, ArrowRightLeft, Volume2, Link2, Weight, Crosshair, Gauge, Layers,
  ArrowDownToLine, MapPin, Percent, ListChecks, Mountain,
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

// 16) زاویه‌ی اسلینگ از هندسه (فاصله‌ی افقی + ارتفاعِ ریگینگ)
function SlingAngleGeoTool({ lang }) {
  const [horiz, setHoriz] = useState("");
  const [rigH, setRigH] = useState("");
  const h = num(horiz), v = num(rigH);
  const angDeg = h !== null && v ? (Math.atan2(h, v) * 180) / Math.PI : null;
  const legLen = h !== null && v !== null ? Math.hypot(h, v) : null;
  const tone = angDeg === null ? "ok" : angDeg > 60 ? "bad" : angDeg > 45 ? "warn" : "ok";
  return (
    <div>
      <Num label={lang === "fa" ? "فاصلهٔ افقیِ قلاب تا نقطهٔ برداشت" : lang === "de" ? "Horizontaler Abstand Haken–Anschlagpunkt" : "Horizontal distance, hook to pick point"} value={horiz} onChange={setHoriz} unit="m" />
      <Num label={lang === "fa" ? "ارتفاعِ ریگینگ (قلاب تا نقطهٔ برداشت)" : lang === "de" ? "Anschlaghöhe (Haken bis Anschlagpunkt)" : "Rigging height (hook to pick point)"} value={rigH} onChange={setRigH} unit="m" />
      {angDeg !== null && <Result tone={tone}>
        {lang === "fa" ? "زاویه نسبت به قائم" : lang === "de" ? "Winkel zur Senkrechten" : "Angle from vertical"} = <b>{fmt(angDeg, 1)}°</b>
        {legLen !== null && <><br />{lang === "fa" ? "طولِ تقریبیِ هر پایه" : lang === "de" ? "Ungefähre Stranglänge" : "Approx. leg length"} = <b>{fmt(legLen, 2)} m</b></>}
        {tone === "bad" && <><br />{lang === "fa" ? "بیش از ۶۰°: کششِ خیلی بالا، ریگینگ را بازبینی کنید" : lang === "de" ? "> 60°: sehr hohe Zugkraft, Anschlag überdenken" : "> 60°: very high tension, reconsider the rigging"}</>}
        {tone === "warn" && <><br />{lang === "fa" ? "۴۵–۶۰°: کششِ بالا، اسپریدر بیم را در نظر بگیرید" : lang === "de" ? "45–60°: hohe Zugkraft, Traverse in Betracht ziehen" : "45–60°: high tension, consider a spreader beam"}</>}
      </Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "زاویه = arctan(فاصلهٔ افقی ÷ ارتفاعِ ریگینگ)" : "angle = arctan(horizontal distance ÷ rigging height)"}
      </div>
    </div>
  );
}

// 17) کششِ پایه‌های اسلینگ
function SlingTensionTool({ lang }) {
  const [load, setLoad] = useState("");
  const [legs, setLegs] = useState("2");
  const [ang, setAng] = useState("30");
  const [wll, setWll] = useState("");
  const w = num(load), n = num(legs), a = num(ang), wl = num(wll);
  const share = w !== null && n ? w / n : null;
  const tension = share !== null && a !== null ? share / Math.cos((Math.min(89.5, a) * Math.PI) / 180) : null;
  const tone = tension === null || !wl ? "ok" : tension > wl ? "bad" : tension > wl * 0.85 ? "warn" : "ok";
  return (
    <div>
      <Num label={lang === "fa" ? "وزنِ کل روی قلاب" : lang === "de" ? "Gesamtlast am Haken" : "Total load on hook"} value={load} onChange={setLoad} unit="kg" />
      <Sel label={lang === "fa" ? "تعدادِ پایه" : lang === "de" ? "Anzahl Stränge" : "Number of legs"} value={legs} onChange={setLegs} options={[{ v: "2", l: "2" }, { v: "3", l: "3" }, { v: "4", l: "4" }]} />
      <Num label={lang === "fa" ? "زاویهٔ هر پایه نسبت به قائم" : lang === "de" ? "Winkel jedes Strangs zur Senkrechten" : "Each leg's angle from vertical"} value={ang} onChange={setAng} unit="°" />
      <Num label={lang === "fa" ? "WLL هر پایهٔ اسلینگ (اختیاری)" : lang === "de" ? "WLL je Anschlagstrang (optional)" : "Sling WLL per leg (optional)"} value={wll} onChange={setWll} unit="kg" hint={lang === "fa" ? "برای مقایسه" : lang === "de" ? "zum Vergleich" : "for comparison"} />
      {tension !== null && <Result tone={tone}>
        {lang === "fa" ? "کششِ هر پایه" : lang === "de" ? "Zugkraft je Strang" : "Tension per leg"} = <b>{fmt(tension, 0)} kg</b>
        {wl ? <><br />{lang === "fa" ? "بهره‌گیری از WLL" : lang === "de" ? "WLL-Auslastung" : "WLL utilisation"} = <b>{fmt((tension / wl) * 100, 0)}٪</b></> : null}
      </Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "کشش = (بار ÷ تعدادِ پایه) ÷ cos(زاویه) — با فرضِ توزیعِ متقارن" : "tension = (load ÷ legs) ÷ cos(angle) — assumes symmetric distribution"}
      </div>
    </div>
  );
}

// 18) بارِ مجازِ شگل (WLL) + جدولِ مرجع
const SHACKLE_WLL_TABLE = [
  ["3/8\"", "3.25 t"], ["1/2\"", "4.75 t"], ["5/8\"", "6.5 t"], ["3/4\"", "8.5 t"],
  ["7/8\"", "9.5 t"], ["1\"", "12 t"], ["1-1/8\"", "13.5 t"], ["1-1/4\"", "17 t"],
  ["1-3/8\"", "19 t"], ["1-1/2\"", "25 t"], ["1-3/4\"", "35 t"], ["2\"", "55 t"],
];
function ShackleLoadTool({ lang }) {
  const [applied, setApplied] = useState("");
  const [wll, setWll] = useState("");
  const a = num(applied), w = num(wll);
  const pct = a !== null && w ? (a / w) * 100 : null;
  const tone = pct === null ? "ok" : pct > 100 ? "bad" : pct > 80 ? "warn" : "ok";
  return (
    <div>
      <Num label={lang === "fa" ? "بارِ واردشده به شگل" : lang === "de" ? "Last am Schäkel" : "Load applied to the shackle"} value={applied} onChange={setApplied} unit="kg" />
      <Num label={lang === "fa" ? "WLL شگل (از روی بدنه یا کاتالوگ)" : lang === "de" ? "Schäkel-WLL (Prägung oder Katalog)" : "Shackle WLL (from body stamp or catalogue)"} value={wll} onChange={setWll} unit="kg" />
      {pct !== null && <Result tone={tone}>
        {lang === "fa" ? "درصدِ بهره‌گیری" : lang === "de" ? "Auslastung" : "Utilisation"} = <b>{fmt(pct, 0)}٪</b>
        {tone === "bad" && <><br />{lang === "fa" ? "بیش از WLL — شگلِ بزرگ‌تر لازم است" : lang === "de" ? "über WLL — größerer Schäkel erforderlich" : "over WLL — a larger shackle is needed"}</>}
      </Result>}
      <div style={{ marginTop: 12 }}>
        <RefTable head={[lang === "fa" ? "سایزِ پین" : lang === "de" ? "Bolzengröße" : "Pin size", "WLL"]} rows={SHACKLE_WLL_TABLE} />
        <p style={{ fontSize: 10, color: THEME.text3, marginTop: 6, lineHeight: 1.6 }}>
          {lang === "fa" ? "مقادیرِ مرجعِ شگلِ Bow معمولی (Grade 6/8) — همیشه رتبه‌ی حکاکی‌شده روی بدنه‌ی خودِ شگل را مبنا قرار دهید." : lang === "de" ? "Referenzwerte für gängige Bogenschäkel (Grade 6/8) — immer die auf dem Schäkel selbst eingeprägte Nennlast zugrunde legen." : "Typical bow-shackle reference values (Grade 6/8) — always use the rating stamped on the actual shackle body."}
        </p>
      </div>
    </div>
  );
}

// 19) وزنِ بار از هندسه + چگالی
const MATERIAL_DENSITY = [
  { v: "steel", l: { fa: "فولاد", en: "Steel", de: "Stahl" }, d: 7850 },
  { v: "concrete", l: { fa: "بتن", en: "Concrete", de: "Beton" }, d: 2400 },
  { v: "aluminum", l: { fa: "آلومینیوم", en: "Aluminium", de: "Aluminium" }, d: 2700 },
  { v: "water", l: { fa: "آب", en: "Water", de: "Wasser" }, d: 1000 },
  { v: "wood", l: { fa: "چوب", en: "Wood", de: "Holz" }, d: 700 },
  { v: "custom", l: { fa: "دلخواه", en: "Custom", de: "Benutzerdefiniert" }, d: null },
];
function LoadWeightTool({ lang }) {
  const [shape, setShape] = useState("block");
  const [l, setL] = useState(""); const [wd, setWd] = useState(""); const [h, setH] = useState("");
  const [dia, setDia] = useState(""); const [len2, setLen2] = useState("");
  const [mat, setMat] = useState("steel");
  const [customDensity, setCustomDensity] = useState("7850");
  const matObj = MATERIAL_DENSITY.find((m) => m.v === mat);
  const density = mat === "custom" ? num(customDensity) : matObj?.d;
  let volume = null;
  if (shape === "block") { const a = num(l), b = num(wd), c = num(h); if (a && b && c) volume = a * b * c; }
  else { const dd = num(dia), ll = num(len2); if (dd && ll) volume = Math.PI * (dd / 2) ** 2 * ll; }
  const weight = volume !== null && density ? volume * density : null;
  return (
    <div>
      <Sel label={lang === "fa" ? "شکلِ هندسی" : lang === "de" ? "Form" : "Shape"} value={shape} onChange={setShape}
        options={[{ v: "block", l: lang === "fa" ? "بلوکِ مستطیلی" : lang === "de" ? "Quader" : "Rectangular block" }, { v: "cyl", l: lang === "fa" ? "استوانه / لوله" : lang === "de" ? "Zylinder / Rohr" : "Cylinder / pipe" }]} />
      {shape === "block" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "طول" : lang === "de" ? "Länge" : "Length"} value={l} onChange={setL} unit="m" /></div>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "عرض" : lang === "de" ? "Breite" : "Width"} value={wd} onChange={setWd} unit="m" /></div>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "ارتفاع" : lang === "de" ? "Höhe" : "Height"} value={h} onChange={setH} unit="m" /></div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "قطر" : lang === "de" ? "Durchmesser" : "Diameter"} value={dia} onChange={setDia} unit="m" /></div>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "طول" : lang === "de" ? "Länge" : "Length"} value={len2} onChange={setLen2} unit="m" /></div>
        </div>
      )}
      <Sel label={lang === "fa" ? "جنس" : lang === "de" ? "Material" : "Material"} value={mat} onChange={setMat} options={MATERIAL_DENSITY.map((m) => ({ v: m.v, l: m.l[lang] || m.l.en }))} />
      {mat === "custom" && <Num label={lang === "fa" ? "چگالی" : lang === "de" ? "Dichte" : "Density"} value={customDensity} onChange={setCustomDensity} unit="kg/m³" />}
      {weight !== null && <Result>
        {lang === "fa" ? "حجم" : lang === "de" ? "Volumen" : "Volume"} = <b>{fmt(volume, 3)} m³</b><br />
        {lang === "fa" ? "وزنِ تخمینی" : lang === "de" ? "Geschätztes Gewicht" : "Estimated weight"} = <b style={{ fontSize: 16 }}>{fmt(weight, 0)} kg</b>
      </Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "وزن = حجم × چگالی — برای بارِ توپُر و همگن؛ فضاهای خالی/سوراخ را خودتان کم کنید." : lang === "de" ? "Gewicht = Volumen × Dichte — für eine massive, homogene Last; Hohlräume/Bohrungen selbst abziehen." : "weight = volume × density — for a solid, uniform load; subtract voids/holes yourself."}
      </div>
    </div>
  );
}

// 20) مرکزِ ثقلِ بار (چند جزء، یک‌بُعدی)
function LoadCgTool({ lang }) {
  const [rows, setRows] = useState([{ w: "", x: "" }, { w: "", x: "" }]);
  const setRow = (i, k, v) => setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const valid = rows.map((r) => ({ w: num(r.w), x: num(r.x) })).filter((r) => r.w !== null && r.x !== null);
  const totalW = valid.reduce((s, r) => s + r.w, 0);
  const cg = valid.length && totalW ? valid.reduce((s, r) => s + r.w * r.x, 0) / totalW : null;
  return (
    <div>
      <p style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 10, lineHeight: 1.7 }}>
        {lang === "fa" ? "برای هر جزءِ بار، وزن و فاصله‌اش را از یک نقطه‌ی مرجعِ ثابت (مثلاً یک انتهای بار) وارد کنید." : lang === "de" ? "Für jeden Lastteil Gewicht und Abstand von einem festen Bezugspunkt (z. B. einem Lastende) eingeben." : "For each part of the load, enter its weight and distance from a fixed reference point (e.g. one end of the load)."}
      </p>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
          <div style={{ flex: 1 }}><Num label={`${lang === "fa" ? "وزنِ جزء" : lang === "de" ? "Teilgewicht" : "Part weight"} ${i + 1}`} value={r.w} onChange={(v) => setRow(i, "w", v)} unit="kg" /></div>
          <div style={{ flex: 1 }}><Num label={lang === "fa" ? "فاصله از مرجع" : lang === "de" ? "Abstand vom Bezugspunkt" : "Distance from reference"} value={r.x} onChange={(v) => setRow(i, "x", v)} unit="m" /></div>
          {rows.length > 2 && <button type="button" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}
            style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer", padding: "0 0 10px" }}>✕</button>}
        </div>
      ))}
      <button type="button" onClick={() => setRows((p) => [...p, { w: "", x: "" }])}
        style={{ fontSize: 12, fontWeight: 700, color: THEME.teal, border: `1px solid ${THEME.teal}`, background: "transparent", borderRadius: 8, padding: "7px 12px", cursor: "pointer", marginBottom: 10 }}>
        + {lang === "fa" ? "افزودنِ جزء" : lang === "de" ? "Teil hinzufügen" : "Add part"}
      </button>
      {cg !== null && <Result>
        {lang === "fa" ? "وزنِ کل" : lang === "de" ? "Gesamtgewicht" : "Total weight"} = <b>{fmt(totalW, 0)} kg</b><br />
        {lang === "fa" ? "مرکزِ ثقل از نقطهٔ مرجع" : lang === "de" ? "Schwerpunkt ab Bezugspunkt" : "CG from reference point"} = <b style={{ fontSize: 16 }}>{fmt(cg, 3)} m</b>
      </Result>}
    </div>
  );
}

// 21) شعاعِ کار و ظرفیتِ جرثقیل (درون‌یابیِ چارتِ کوچک)
function CraneRadiusCapacityTool({ lang }) {
  const [chart, setChart] = useState([{ r: "6", c: "10000" }, { r: "12", c: "5000" }]);
  const [radius, setRadius] = useState("");
  const [load, setLoad] = useState("");
  const setCell = (i, k, v) => setChart((p) => p.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const pts = chart.map((row) => ({ r: num(row.r), c: num(row.c) })).filter((p) => p.r !== null && p.c !== null).sort((a, b) => a.r - b.r);
  const rNum = num(radius);
  let capacity = null;
  if (pts.length >= 2 && rNum !== null) {
    if (rNum <= pts[0].r) capacity = pts[0].c;
    else if (rNum < pts[pts.length - 1].r) {
      for (let i = 1; i < pts.length; i++) {
        if (rNum <= pts[i].r) { const f = (rNum - pts[i - 1].r) / (pts[i].r - pts[i - 1].r); capacity = pts[i - 1].c + f * (pts[i].c - pts[i - 1].c); break; }
      }
    }
  }
  const loadNum = num(load);
  const pct = capacity && loadNum !== null ? (loadNum / capacity) * 100 : null;
  const tone = pct === null ? "ok" : pct > 90 ? "bad" : pct > 75 ? "warn" : "ok";
  const cellStyle = { width: "100%", padding: "6px 8px", borderRadius: 7, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 12.5, fontFamily: THEME.font, outline: "none" };
  return (
    <div>
      <p style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "چند نقطه از Load Chartِ جرثقیل (شعاع ← ظرفیت) را وارد کنید." : lang === "de" ? "Einige Punkte aus der Traglasttabelle des Krans eingeben (Radius → Kapazität)." : "Enter a few points from the crane's load chart (radius → capacity)."}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 8 }}>
        <thead><tr>
          <th style={{ textAlign: "start", fontSize: 10.5, fontWeight: 800, color: THEME.text3, padding: "4px 6px" }}>{lang === "fa" ? "شعاع (m)" : "Radius (m)"}</th>
          <th style={{ textAlign: "start", fontSize: 10.5, fontWeight: 800, color: THEME.text3, padding: "4px 6px" }}>{lang === "fa" ? "ظرفیت (kg)" : "Capacity (kg)"}</th>
          <th style={{ width: 30 }} />
        </tr></thead>
        <tbody>
          {chart.map((row, i) => (
            <tr key={i}>
              <td style={{ padding: "3px 6px" }}><input type="number" value={row.r} onChange={(e) => setCell(i, "r", e.target.value)} style={cellStyle} /></td>
              <td style={{ padding: "3px 6px" }}><input type="number" value={row.c} onChange={(e) => setCell(i, "c", e.target.value)} style={cellStyle} /></td>
              <td style={{ padding: "3px 6px" }}>{chart.length > 2 && <button type="button" onClick={() => setChart((p) => p.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}>✕</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setChart((p) => [...p, { r: "", c: "" }])}
        style={{ fontSize: 12, fontWeight: 700, color: THEME.teal, border: `1px solid ${THEME.teal}`, background: "transparent", borderRadius: 8, padding: "6px 11px", cursor: "pointer", marginBottom: 12 }}>
        + {lang === "fa" ? "افزودنِ ردیف" : lang === "de" ? "Zeile hinzufügen" : "Add row"}
      </button>
      <Num label={lang === "fa" ? "شعاعِ کارِ موردنظر" : lang === "de" ? "Gewünschter Arbeitsradius" : "Target working radius"} value={radius} onChange={setRadius} unit="m" />
      <Num label={lang === "fa" ? "وزنِ بار (شاملِ ریگینگ)" : lang === "de" ? "Lastgewicht (inkl. Anschlagmittel)" : "Load weight (incl. rigging)"} value={load} onChange={setLoad} unit="kg" />
      {rNum !== null && (
        <Result tone={capacity === null ? "bad" : tone}>
          {capacity === null ? (lang === "fa" ? "خارج از دامنهٔ چارت" : lang === "de" ? "Außerhalb des Tabellenbereichs" : "Outside the chart range") : (<>
            {lang === "fa" ? "ظرفیتِ درون‌یابی‌شده" : lang === "de" ? "Interpolierte Kapazität" : "Interpolated capacity"} = <b>{fmt(capacity, 0)} kg</b>
            {pct !== null && <><br />{lang === "fa" ? "بهره‌برداری" : lang === "de" ? "Auslastung" : "Utilisation"} = <b>{fmt(pct, 0)}٪</b></>}
          </>)}
        </Result>
      )}
    </div>
  );
}

// 22) فشارِ واردشده به زمین
function GroundPressureTool({ lang }) {
  const [craneW, setCraneW] = useState("");
  const [loadW, setLoadW] = useState("");
  const [pads, setPads] = useState("4");
  const [padArea, setPadArea] = useState("0.5");
  const [factor, setFactor] = useState("60");
  const [soil, setSoil] = useState("");
  const [sf, setSf] = useState("2");
  const cw = num(craneW), lw = num(loadW), pa = num(padArea), f = num(factor), s = num(soil), sff = num(sf);
  const reaction = (cw || 0) + (lw || 0);
  const pressure = reaction && pa && f !== null ? ((reaction * 9.80665) / 1000) * (f / 100) / pa : null;
  const allow = s && sff ? s / sff : null;
  const tone = pressure === null || allow === null ? "ok" : pressure > allow ? "bad" : "ok";
  return (
    <div>
      <Num label={lang === "fa" ? "وزنِ جرثقیل" : lang === "de" ? "Krangewicht" : "Crane weight"} value={craneW} onChange={setCraneW} unit="kg" />
      <Num label={lang === "fa" ? "وزنِ بار + ریگینگ" : lang === "de" ? "Last- + Anschlagmittelgewicht" : "Load + rigging weight"} value={loadW} onChange={setLoadW} unit="kg" />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><Num label={lang === "fa" ? "تعدادِ پَد/اوتریگر" : lang === "de" ? "Anzahl Stützen" : "Pads / outriggers"} value={pads} onChange={setPads} /></div>
        <div style={{ flex: 1 }}><Num label={lang === "fa" ? "مساحتِ هر پَد" : lang === "de" ? "Fläche je Stütze" : "Area per pad"} value={padArea} onChange={setPadArea} unit="m²" /></div>
      </div>
      <Num label={lang === "fa" ? "درصدِ بار روی بدترین پَد" : lang === "de" ? "% der Last auf ungünstigster Stütze" : "% of load on worst pad"} value={factor} onChange={setFactor} unit="٪" hint={lang === "fa" ? "پیش‌فرضِ محافظه‌کارانه: ۶۰٪" : lang === "de" ? "konservativer Standard: 60 %" : "conservative default: 60%"} />
      <Num label={lang === "fa" ? "ظرفیتِ باربریِ خاک" : lang === "de" ? "Bodentragfähigkeit" : "Soil bearing capacity"} value={soil} onChange={setSoil} unit="kPa" />
      <Num label={lang === "fa" ? "ضریبِ اطمینان (SF)" : lang === "de" ? "Sicherheitsfaktor (SF)" : "Safety factor (SF)"} value={sf} onChange={setSf} />
      {pressure !== null && <Result tone={tone}>
        {lang === "fa" ? "فشارِ واردشده به زمین" : lang === "de" ? "Bodendruck" : "Ground bearing pressure"} = <b>{fmt(pressure, 0)} kPa</b>
        {allow !== null && <><br />{lang === "fa" ? "مجاز (خاک ÷ SF)" : lang === "de" ? "Zulässig (Boden ÷ SF)" : "Allowable (soil ÷ SF)"} = <b>{fmt(allow, 0)} kPa</b></>}
        {tone === "bad" && <><br />{lang === "fa" ? "فشار از حدِ مجاز بیشتر است — پَد را بزرگ‌تر یا موقعیت را عوض کنید" : lang === "de" ? "Druck über dem zulässigen Wert — größere Stützplatten oder Position ändern" : "pressure exceeds the allowable — use bigger pads or reposition"}</>}
      </Result>}
    </div>
  );
}

// 23) بارِ واردشده بر جک‌ها/اوتریگرهای جرثقیل
function JackLoadTool({ lang }) {
  const [totalW, setTotalW] = useState("");
  const [jacks, setJacks] = useState("4");
  const [unevenFactor, setUnevenFactor] = useState("1.5");
  const w = num(totalW), n = num(jacks), f = num(unevenFactor);
  const avg = w !== null && n ? w / n : null;
  const worst = avg !== null && f ? avg * f : null;
  return (
    <div>
      <Num label={lang === "fa" ? "وزنِ کل (جرثقیل + بار)" : lang === "de" ? "Gesamtgewicht (Kran + Last)" : "Total weight (crane + load)"} value={totalW} onChange={setTotalW} unit="kg" />
      <Sel label={lang === "fa" ? "تعدادِ جک/اوتریگر" : lang === "de" ? "Anzahl Stützen" : "Number of jacks / outriggers"} value={jacks} onChange={setJacks} options={[{ v: "3", l: "3" }, { v: "4", l: "4" }]} />
      <Num label={lang === "fa" ? "ضریبِ توزیعِ نامتقارن (بدترین جک)" : lang === "de" ? "Ungleichverteilungsfaktor (ungünstigste Stütze)" : "Uneven-distribution factor (worst jack)"} value={unevenFactor} onChange={setUnevenFactor}
        hint={lang === "fa" ? "در چرخش/شعاعِ حداکثر معمولاً ۱٫۵ تا ۲؛ اگر دفترچهٔ جرثقیل دارید، از همان استفاده کنید" : lang === "de" ? "beim Schwenken/max. Radius typischerweise 1,5–2; Krananleitung bevorzugen, falls vorhanden" : "typically 1.5–2 during slew/max radius; use the crane manual's value if available"} />
      {worst !== null && <Result tone={f >= 2 ? "warn" : "ok"}>
        {lang === "fa" ? "بارِ متوسطِ هر جک" : lang === "de" ? "Durchschnittliche Stützenlast" : "Average load per jack"} = <b>{fmt(avg, 0)} kg</b><br />
        {lang === "fa" ? "بارِ بدترین جک (تخمینی)" : lang === "de" ? "Ungünstigste Stützenlast (geschätzt)" : "Worst-jack load (estimated)"} = <b style={{ fontSize: 16 }}>{fmt(worst, 0)} kg</b>
      </Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "یک تخمینِ سریع است، نه جایگزینِ محاسبه‌ی دقیقِ سازنده‌ی جرثقیل بر پایه‌ی شعاع/زاویه‌ی واقعی." : lang === "de" ? "Eine schnelle Schätzung, kein Ersatz für die genaue Berechnung des Kranherstellers nach tatsächlichem Radius/Winkel." : "a quick estimate, not a substitute for the crane manufacturer's exact radius/angle-based calculation."}
      </div>
    </div>
  );
}

// 24) بارِ واردشده بر نقاطِ لیفت (دو نقطه، تعادلِ گشتاور)
function LiftPointLoadTool({ lang }) {
  const [w, setW] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const ww = num(w), a = num(d1), b = num(d2);
  const total = a !== null && b !== null ? a + b : null;
  const p1 = ww !== null && total ? ww * (b / total) : null;
  const p2 = ww !== null && total ? ww * (a / total) : null;
  return (
    <div>
      <Num label={lang === "fa" ? "وزنِ کلِ بار" : lang === "de" ? "Gesamtlastgewicht" : "Total load weight"} value={w} onChange={setW} unit="kg" />
      <Num label={lang === "fa" ? "فاصلهٔ نقطهٔ لیفتِ ۱ تا مرکزِ ثقل" : lang === "de" ? "Abstand Anschlagpunkt 1 zum Schwerpunkt" : "Distance, lift point 1 to CG"} value={d1} onChange={setD1} unit="m" />
      <Num label={lang === "fa" ? "فاصلهٔ نقطهٔ لیفتِ ۲ تا مرکزِ ثقل" : lang === "de" ? "Abstand Anschlagpunkt 2 zum Schwerpunkt" : "Distance, lift point 2 to CG"} value={d2} onChange={setD2} unit="m" />
      {p1 !== null && p2 !== null && <Result>
        {lang === "fa" ? "بارِ نقطهٔ لیفتِ ۱" : lang === "de" ? "Last an Anschlagpunkt 1" : "Load at lift point 1"} = <b>{fmt(p1, 0)} kg</b><br />
        {lang === "fa" ? "بارِ نقطهٔ لیفتِ ۲" : lang === "de" ? "Last an Anschlagpunkt 2" : "Load at lift point 2"} = <b>{fmt(p2, 0)} kg</b>
      </Result>}
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "تعادلِ گشتاور برای دو نقطهٔ لیفتِ هم‌راستا با مرکزِ ثقل — نقاطِ لیفتِ بیشتر یا نامنظم نیاز به تحلیلِ دقیق‌تر دارند." : lang === "de" ? "Momentengleichgewicht für zwei mit dem Schwerpunkt fluchtende Anschlagpunkte — mehr oder unregelmäßige Punkte erfordern eine genauere Analyse." : "moment balance for two lift points in line with the CG — more or irregular lift points need a more detailed analysis."}
      </div>
    </div>
  );
}

// 25) درصدِ استفاده از ظرفیتِ ریگینگ (WLL Utilization) — چند قطعه
function RiggingUtilTool({ lang }) {
  const [rows, setRows] = useState([{ name: "", applied: "", wll: "" }]);
  const setRow = (i, k, v) => setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      {rows.map((r, i) => {
        const a = num(r.applied), w = num(r.wll);
        const pct = a !== null && w ? (a / w) * 100 : null;
        const tone = pct === null ? null : pct > 100 ? "bad" : pct > 80 ? "warn" : "ok";
        return (
          <div key={i} style={{ ...box, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} placeholder={lang === "fa" ? "نامِ قطعه (مثلاً اسلینگِ شمارهٔ ۱)" : lang === "de" ? "Bauteilname (z. B. Anschlagstrang 1)" : "Component name (e.g. sling #1)"}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 12.5, fontFamily: THEME.font, outline: "none" }} />
              {rows.length > 1 && <button type="button" onClick={() => setRows((p) => p.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}>✕</button>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><Num label={lang === "fa" ? "بارِ واردشده" : lang === "de" ? "Einwirkende Last" : "Applied load"} value={r.applied} onChange={(v) => setRow(i, "applied", v)} unit="kg" /></div>
              <div style={{ flex: 1 }}><Num label="WLL" value={r.wll} onChange={(v) => setRow(i, "wll", v)} unit="kg" /></div>
            </div>
            {pct !== null && <Result tone={tone}>{lang === "fa" ? "بهره‌گیری" : lang === "de" ? "Auslastung" : "Utilisation"} = <b>{fmt(pct, 0)}٪</b></Result>}
          </div>
        );
      })}
      <button type="button" onClick={() => setRows((p) => [...p, { name: "", applied: "", wll: "" }])}
        style={{ fontSize: 12, fontWeight: 700, color: THEME.teal, border: `1px solid ${THEME.teal}`, background: "transparent", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
        + {lang === "fa" ? "افزودنِ قطعه" : lang === "de" ? "Bauteil hinzufügen" : "Add component"}
      </button>
    </div>
  );
}

// 26) ارزیابیِ سریعِ ریسکِ عملیاتِ لیفتینگ — چک‌لیست
const LIFT_RISK_ITEMS = [
  { k: "weight", critical: true, l: { fa: "وزنِ بار مشخص و تأییدشده است", en: "Load weight is known and verified", de: "Lastgewicht ist bekannt und bestätigt" } },
  { k: "chart", critical: true, l: { fa: "ظرفیتِ جرثقیل از Load Chart بررسی شده", en: "Crane capacity checked against the load chart", de: "Krankapazität anhand der Traglasttabelle geprüft" } },
  { k: "ground", critical: true, l: { fa: "وضعیتِ زمین/فشارِ مجاز بررسی شده", en: "Ground conditions / bearing capacity checked", de: "Bodenverhältnisse/Tragfähigkeit geprüft" } },
  { k: "rigging", critical: true, l: { fa: "ریگینگ (اسلینگ/شگل/قلاب) بازرسی شده و WLL کافی است", en: "Rigging (slings/shackles/hook) inspected, WLL sufficient", de: "Anschlagmittel geprüft, WLL ausreichend" } },
  { k: "operator", critical: true, l: { fa: "اپراتور و ریگر گواهی‌نامه‌ی معتبر دارند", en: "Operator and rigger hold valid certification", de: "Kranführer und Anschläger besitzen gültige Zertifizierung" } },
  { k: "exclusion", critical: false, l: { fa: "محدودهٔ ممنوعه/حصار مشخص شده", en: "Exclusion zone / barrier established", de: "Sperrbereich/Absperrung eingerichtet" } },
  { k: "powerline", critical: true, l: { fa: "فاصله تا خطِ برق بررسی و کافی است", en: "Clearance to power lines checked and adequate", de: "Abstand zu Stromleitungen geprüft und ausreichend" } },
  { k: "wind", critical: false, l: { fa: "سرعتِ باد در محدودهٔ مجاز است", en: "Wind speed is within the allowed limit", de: "Windgeschwindigkeit innerhalb der zulässigen Grenze" } },
  { k: "tagline", critical: false, l: { fa: "طنابِ راهنما (Tag line) در نظر گرفته شده", en: "Tag lines are in use where needed", de: "Führungsleinen sind bei Bedarf vorgesehen" } },
  { k: "comm", critical: false, l: { fa: "روشِ ارتباطیِ اپراتور/ریگر مشخص است", en: "Operator/rigger communication method is defined", de: "Kommunikationsmethode Kranführer/Anschläger ist festgelegt" } },
  { k: "supervisor", critical: false, l: { fa: "سرپرستِ لیفت در محل حضور دارد", en: "A lift supervisor is present on site", de: "Ein Hebeaufsichtsführer ist vor Ort" } },
];
function LiftRiskChecklistTool({ lang }) {
  const [checked, setChecked] = useState({});
  const toggle = (k) => setChecked((p) => ({ ...p, [k]: !p[k] }));
  const criticalUnchecked = LIFT_RISK_ITEMS.filter((i) => i.critical && !checked[i.k]).length;
  const totalUnchecked = LIFT_RISK_ITEMS.filter((i) => !checked[i.k]).length;
  const level = criticalUnchecked > 0 ? "bad" : totalUnchecked > 2 ? "warn" : "ok";
  const levelText = {
    bad: { fa: "ریسکِ بالا — موردِ حیاتیِ تیک‌نخورده وجود دارد؛ قبل از لیفت رفع کنید", en: "High risk — a critical item is unchecked; resolve before lifting", de: "Hohes Risiko — ein kritischer Punkt ist nicht abgehakt; vor dem Heben beheben" },
    warn: { fa: "ریسکِ متوسط — چند موردِ غیرِحیاتی هنوز باقی است", en: "Medium risk — a few non-critical items remain", de: "Mittleres Risiko — einige nicht kritische Punkte verbleiben" },
    ok: { fa: "آماده — همه یا تقریباً همه‌ی موارد تکمیل است", en: "Ready — all or nearly all items are complete", de: "Bereit — alle oder fast alle Punkte sind erledigt" },
  };
  return (
    <div>
      {LIFT_RISK_ITEMS.map((it) => (
        <label key={it.k} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }}>
          <input type="checkbox" checked={!!checked[it.k]} onChange={() => toggle(it.k)} style={{ marginTop: 3 }} />
          <span style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7 }}>
            {it.l[lang] || it.l.fa}
            {it.critical && <span style={{ fontSize: 10, color: THEME.danger, fontWeight: 700, marginInlineStart: 6 }}>({lang === "fa" ? "حیاتی" : lang === "de" ? "kritisch" : "critical"})</span>}
          </span>
        </label>
      ))}
      <div style={{ marginTop: 12 }}>
        <Result tone={level}>{levelText[level][lang] || levelText[level].fa}</Result>
      </div>
      <p style={{ fontSize: 10, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "این یک ارزیابیِ سریعِ کیفی است، نه جایگزینِ نقشه/مجوزِ رسمیِ لیفتینگ." : lang === "de" ? "Dies ist eine schnelle qualitative Prüfung, kein Ersatz für einen formellen Hebeplan/eine Genehmigung." : "this is a quick qualitative check, not a substitute for a formal lift plan/permit."}
      </p>
    </div>
  );
}

/* --------------------------- registry ---------------------------- */
/* --------------------- ابزارِ full-bleed: طراحی نقشه‌ی لیفتینگ --------------------- *
 * برخلافِ بقیهٔ ابزارها که سبک و client-side‌اند، این یک میان‌بر به Workspaceِ
 * کاملِ ماژولِ «طراحی نقشه‌ی لیفتینگ» است (همان دیتابیس، نسخه‌بندی و Audit
 * Trail). با flagِ full:true رجیستر می‌شود تا پنلِ ابزار بدونِ سقفِ عرض و
 * بدونِ کارتِ دورگیر نمایش دهد. lazy است تا در چانکِ خودِ ماژول بماند.       */
const LiftingPlanWorkspace = lazy(() => import("../lifting/LiftingPlanWorkspace.jsx"));
function LiftingPlanBridge({ currentUser, wide }) {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontSize: 13, color: THEME.text3, fontFamily: THEME.font }}>…</div>}>
      <LiftingPlanWorkspace currentUser={currentUser} role={currentUser?.role || "EMPLOYER"} wide={wide} />
    </Suspense>
  );
}

/* --------------- ابزارِ full-bleed: محاسبه‌گرِ شیب و عرضِ ایمنِ گودبرداری --------------- *
 * همان الگوی LiftingPlanBridge: میان‌بر به Workspaceِ کاملِ ماژولِ Excavation
 * (جدول‌های واقعی، Standard Profile قابلِ‌تنظیم، Audit Trail) به‌جای یک
 * ابزارِ سبکِ client-only. lazy تا در چانکِ خودِ ماژول بماند.                */
const ExcavationCalculatorWorkspace = lazy(() => import("../excavation/ExcavationCalculator.jsx"));
function ExcavationBridge({ currentUser, wide }) {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontSize: 13, color: THEME.text3, fontFamily: THEME.font }}>…</div>}>
      <ExcavationCalculatorWorkspace currentUser={currentUser} role={currentUser?.role || "EMPLOYER"} wide={wide} />
    </Suspense>
  );
}

/* --------------- ابزارِ full-bleed: محاسبه و پایشِ مصرفِ برق --------------- *
 * همان الگوی بالا: میان‌بر به Workspaceِ کاملِ ماژولِ Energy (جدول‌های واقعی،
 * بانکِ تجهیزاتِ Company/Project، تعرفه‌ی نسخه‌دار، Audit Trail).            */
const EnergyCalculatorWorkspace = lazy(() => import("../energy/EnergyCalculator.jsx"));
function EnergyBridge({ currentUser, wide }) {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontSize: 13, color: THEME.text3, fontFamily: THEME.font }}>…</div>}>
      <EnergyCalculatorWorkspace currentUser={currentUser} role={currentUser?.role || "EMPLOYER"} wide={wide} />
    </Suspense>
  );
}

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
  { id: "sling-angle-geo", cat: "lifting", icon: Construction, Tool: SlingAngleGeoTool,
    title: { fa: "محاسبهٔ زاویهٔ اسلینگ", en: "Sling angle calculation", de: "Berechnung des Anschlagwinkels" },
    desc: { fa: "زاویه نسبت به قائم از روی فاصلهٔ افقی و ارتفاعِ ریگینگ", en: "Angle from vertical, from horizontal offset and rigging height", de: "Winkel zur Senkrechten aus horizontalem Abstand und Anschlaghöhe" } },
  { id: "sling-tension", cat: "lifting", icon: Construction, Tool: SlingTensionTool,
    title: { fa: "محاسبهٔ کششِ پایه‌های اسلینگ", en: "Sling leg tension", de: "Zugkraft der Anschlagstränge" },
    desc: { fa: "کششِ هر پایه از وزنِ بار، تعدادِ پایه و زاویه", en: "Per-leg tension from load, leg count and angle", de: "Zugkraft je Strang aus Last, Stranganzahl und Winkel" } },
  { id: "shackle-load", cat: "lifting", icon: Link2, Tool: ShackleLoadTool,
    title: { fa: "محاسبهٔ بارِ مجازِ شگل", en: "Shackle allowable load", de: "Zulässige Schäkellast" },
    desc: { fa: "درصدِ بهره‌گیریِ شگل از WLL + جدولِ مرجعِ سایزها", en: "Shackle WLL utilisation + a size reference table", de: "Schäkel-WLL-Auslastung + Referenztabelle der Größen" } },
  { id: "load-weight", cat: "calc", icon: Weight, Tool: LoadWeightTool,
    title: { fa: "محاسبهٔ وزنِ بار", en: "Load weight calculation", de: "Berechnung des Lastgewichts" },
    desc: { fa: "وزنِ تخمینی از هندسه (بلوک/استوانه) و چگالیِ جنس", en: "Estimated weight from geometry (block/cylinder) and material density", de: "Geschätztes Gewicht aus Geometrie (Quader/Zylinder) und Materialdichte" } },
  { id: "load-cg", cat: "lifting", icon: Crosshair, Tool: LoadCgTool,
    title: { fa: "محاسبهٔ مرکزِ ثقلِ بار (CG)", en: "Load centre of gravity (CG)", de: "Lastschwerpunkt (CG)" },
    desc: { fa: "ترکیبِ چند جزءِ بار با وزن/فاصلهٔ متفاوت", en: "Combine several load parts with different weight/distance", de: "Kombination mehrerer Lastteile mit unterschiedlichem Gewicht/Abstand" } },
  { id: "crane-radius-capacity", cat: "lifting", icon: Gauge, Tool: CraneRadiusCapacityTool,
    title: { fa: "کنترلِ شعاعِ کاری و ظرفیتِ جرثقیل", en: "Working radius & crane capacity check", de: "Prüfung von Arbeitsradius und Kranfähigkeit" },
    desc: { fa: "درون‌یابیِ ظرفیت از یک Load Chartِ کوچکِ دستی", en: "Capacity interpolated from a small manual load chart", de: "Kapazität interpoliert aus einer kleinen manuellen Traglasttabelle" } },
  { id: "ground-pressure", cat: "lifting", icon: Layers, Tool: GroundPressureTool,
    title: { fa: "محاسبهٔ فشارِ واردشده به زمین", en: "Ground bearing pressure", de: "Bodendruckberechnung" },
    desc: { fa: "فشارِ زیرِ بدترین پَد در برابرِ ظرفیتِ باربریِ خاک", en: "Pressure under the worst pad vs. soil bearing capacity", de: "Druck unter der ungünstigsten Stütze gegenüber der Bodentragfähigkeit" } },
  { id: "jack-load", cat: "lifting", icon: ArrowDownToLine, Tool: JackLoadTool,
    title: { fa: "محاسبهٔ بارِ واردشده بر جک‌های جرثقیل", en: "Load on crane jacks", de: "Last auf Kranstützen" },
    desc: { fa: "بارِ متوسط و بدترینِ هر جک/اوتریگر", en: "Average and worst-case load per jack/outrigger", de: "Durchschnittliche und ungünstigste Last je Stütze" } },
  { id: "lift-point-load", cat: "lifting", icon: MapPin, Tool: LiftPointLoadTool,
    title: { fa: "محاسبهٔ بارِ واردشده بر نقاطِ لیفت", en: "Load on lift points", de: "Last an den Anschlagpunkten" },
    desc: { fa: "توزیعِ بار بینِ دو نقطهٔ لیفت بر پایهٔ تعادلِ گشتاور", en: "Load split between two lift points via moment balance", de: "Lastverteilung auf zwei Anschlagpunkte über Momentengleichgewicht" } },
  { id: "rigging-wll-util", cat: "lifting", icon: Percent, Tool: RiggingUtilTool,
    title: { fa: "درصدِ استفاده از ظرفیتِ ریگینگ (WLL)", en: "Rigging WLL utilisation", de: "WLL-Auslastung der Anschlagmittel" },
    desc: { fa: "بهره‌گیریِ چند قطعه (اسلینگ/شگل/…) از WLL هم‌زمان", en: "WLL utilisation of several components at once", de: "WLL-Auslastung mehrerer Bauteile gleichzeitig" } },
  { id: "lift-risk-checklist", cat: "lifting", icon: ListChecks, Tool: LiftRiskChecklistTool,
    title: { fa: "ارزیابیِ سریعِ ریسکِ عملیاتِ لیفتینگ", en: "Quick lifting risk assessment", de: "Schnelle Risikobewertung für Hebevorgänge" },
    desc: { fa: "چک‌لیستِ کوتاه؛ موارد حیاتی که تیک نخورده باشند ریسک را بالا می‌برند", en: "A short checklist; unchecked critical items raise the risk level", de: "Eine kurze Checkliste; nicht abgehakte kritische Punkte erhöhen das Risiko" } },
  { id: "rad-zones", cat: "rad", icon: Atom, Tool: RadZonesTool,
    title: { fa: "محاسبه شعاع نواحی رادیوگرافی", en: "Radiography zone radii", de: "Radiografie-Zonenradien" },
    desc: { fa: "شعاعِ منطقهٔ ممنوعه، کنترل‌شده و تحت نظارت بر پایهٔ قدرتِ چشمه (Ci) + نمودارِ دایره‌ای", en: "Prohibited / controlled / supervised radii from source activity (Ci) + radial diagram", de: "Sperr-, Kontroll- und Überwachungsradien aus Quellenaktivität (Ci) + Radialdiagramm" } },
  { id: "rad-distance", cat: "rad", icon: Atom, Tool: RadDistanceTool,
    title: { fa: "فاصلهٔ ایمنِ پرتونگاری (بر پایهٔ آهنگِ دُز)", en: "Radiography safe distance (dose-rate)", de: "Sicherer Abstand Radiografie (Dosisleistung)" },
    desc: { fa: "قانونِ عکسِ مجذور برای مرزِ ناحیهٔ کنترل‌شده", en: "Inverse-square law for the controlled-area boundary", de: "Abstandsquadratgesetz für die Sperrgrenze" } },
  { id: "lifting-plan", cat: "lifting", icon: Construction, Tool: LiftingPlanBridge, full: true,
    title: { fa: "طراحی نقشه‌ی لیفتینگ", en: "Lifting Plan Designer", de: "Hebeplan-Designer" },
    desc: { fa: "میان‌بر به Workspaceِ کامل: بومِ داده‌محور، محاسبه بر پایهٔ Load Chart، نسخه‌بندی و Audit Trail", en: "Shortcut to the full workspace: data-driven canvas, load-chart calculations, versioning and audit trail", de: "Verknüpfung zum vollständigen Arbeitsbereich: datengesteuerte Zeichenfläche, Traglasttabellen-Berechnung, Versionierung und Audit-Trail" } },
  { id: "excavation-calculator", cat: "general", icon: Mountain, Tool: ExcavationBridge, full: true,
    title: { fa: "محاسبه‌گرِ شیب و عرضِ ایمنِ گودبرداری", en: "Excavation Slope & Width Calculator", de: "Rechner für Böschungsneigung und Grabenbreite" },
    desc: { fa: "میان‌بر به Workspaceِ کامل: محاسبه بر اساسِ OSHA 1926 Subpart P، مقطعِ گرافیکی، Standard Profile قابلِ‌تنظیم و Audit Trail", en: "Shortcut to the full workspace: OSHA 1926 Subpart P calculations, graphical cross-section, configurable standard profile and audit trail", de: "Verknüpfung zum vollständigen Arbeitsbereich: Berechnungen nach OSHA 1926 Subpart P, grafischer Querschnitt, konfigurierbares Standardprofil und Audit-Trail" } },
  { id: "energy-calculator", cat: "general", icon: Zap, Tool: EnergyBridge, full: true,
    title: { fa: "محاسبه و پایشِ مصرفِ برق", en: "Electricity Consumption Calculator", de: "Stromverbrauchsrechner" },
    desc: { fa: "میان‌بر به Workspaceِ کامل: بانکِ تجهیزات، توان/جریان/انرژی و هزینه در بازه‌های ساعتی تا سالانه، داشبورد و تعرفه‌ی نسخه‌دار", en: "Shortcut to the full workspace: equipment bank, power/current/energy and cost from hourly to yearly, dashboard and versioned tariff", de: "Verknüpfung zum vollständigen Arbeitsbereich: Gerätebank, Leistung/Strom/Energie und Kosten von stündlich bis jährlich, Dashboard und versioniertem Tarif" } },
];
