import React, { useState } from "react";
import {
  Sigma, Construction, Flame, FlaskConical, Zap, Wind, Atom, HardHat, Leaf,
  Wrench, ArrowRightLeft, ThermometerSun, Volume2,
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

// 4) WBGT
function WbgtTool({ lang }) {
  const [tnw, setTnw] = useState("");
  const [tg, setTg] = useState("");
  const [ta, setTa] = useState("");
  const [sun, setSun] = useState("out");
  const a = num(tnw); const b = num(tg); const t = num(ta);
  let w = null;
  if (a !== null && b !== null) w = sun === "out" && t !== null ? 0.7 * a + 0.2 * b + 0.1 * t : 0.7 * a + 0.3 * b;
  const band = w === null ? null : w < 28 ? "ok" : w < 30 ? "warn" : "bad";
  const bandTxt = { ok: { fa: "کم — کار عادی", en: "Low — normal work", de: "Gering — normale Arbeit" }, warn: { fa: "متوسط — استراحت/آب دوره‌ای", en: "Moderate — regular rest & water", de: "Mäßig — regelmäßige Pausen & Wasser" }, bad: { fa: "بالا — محدودسازی کار در گرما", en: "High — restrict heat work", de: "Hoch — Hitzearbeit einschränken" } };
  return (
    <div>
      <Num label={lang === "fa" ? "دمای حباب‌ترِ طبیعی (Tnw)" : "Natural wet-bulb (Tnw)"} value={tnw} onChange={setTnw} unit="°C" />
      <Num label={lang === "fa" ? "دمای گویسان (Tg)" : "Globe temp (Tg)"} value={tg} onChange={setTg} unit="°C" />
      <Sel label={lang === "fa" ? "محیط" : lang === "de" ? "Umgebung" : "Environment"} value={sun} onChange={setSun}
        options={[{ v: "out", l: lang === "fa" ? "فضای باز / آفتاب" : lang === "de" ? "Im Freien / Sonne" : "Outdoors / sun" }, { v: "in", l: lang === "fa" ? "سرپوشیده / بدون تابش" : lang === "de" ? "Innen / ohne Strahlung" : "Indoors / no radiant load" }]} />
      {sun === "out" && <Num label={lang === "fa" ? "دمای خشکِ هوا (Ta)" : "Dry-bulb air (Ta)"} value={ta} onChange={setTa} unit="°C" />}
      {w !== null && <Result tone={band}>WBGT = <b>{fmt(w, 1)} °C</b> — {bandTxt[band][lang] || bandTxt[band].en}</Result>}
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

// 8) گازهایِ فضایِ محصور
function ConfinedGasTool({ lang }) {
  const [o2, setO2] = useState("");
  const [lel, setLel] = useState("");
  const [h2s, setH2s] = useState("");
  const [co, setCo] = useState("");
  const checks = [];
  const O = num(o2), Ll = num(lel), H = num(h2s), Co = num(co);
  if (O !== null) checks.push([O >= 19.5 && O <= 23.5, `O₂ ${fmt(O, 1)}%`, "19.5–23.5%"]);
  if (Ll !== null) checks.push([Ll < 10, `LEL ${fmt(Ll, 1)}%`, "< 10%"]);
  if (H !== null) checks.push([H < 10, `H₂S ${fmt(H, 1)} ppm`, "< 10 ppm"]);
  if (Co !== null) checks.push([Co < 25, `CO ${fmt(Co, 1)} ppm`, "< 25 ppm"]);
  const allOk = checks.length > 0 && checks.every((c) => c[0]);
  return (
    <div>
      <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 10, lineHeight: 1.8 }}>
        {lang === "fa" ? "قرائتِ گازسنج را وارد کنید (هر کدام که سنجیده شده)." : "Enter your gas-meter readings."}
      </div>
      <Num label="O₂" value={o2} onChange={setO2} unit="%" />
      <Num label="LEL" value={lel} onChange={setLel} unit="%" />
      <Num label="H₂S" value={h2s} onChange={setH2s} unit="ppm" />
      <Num label="CO" value={co} onChange={setCo} unit="ppm" />
      {checks.length > 0 && (
        <Result tone={allOk ? "ok" : "bad"}>
          {checks.map((c, i) => (
            <div key={i}>{c[0] ? "✓" : "✕"} {c[1]} <span style={{ opacity: 0.7, fontWeight: 400 }}>({lang === "fa" ? "مجاز" : "limit"} {c[2]})</span></div>
          ))}
          <div style={{ marginTop: 6 }}>{allOk ? (lang === "fa" ? "مجازِ ورود — سایر شرایطِ مجوز رعایت شود" : "Entry acceptable — verify other permit conditions") : (lang === "fa" ? "ورود ممنوع — تهویه و تکرارِ سنجش" : "Do not enter — ventilate and re-test")}</div>
        </Result>
      )}
      <div style={{ height: 12 }} />
      <RefTable head={[lang === "fa" ? "گاز" : "Gas", lang === "fa" ? "محدودهٔ مجازِ ورود" : "Acceptable entry range"]}
        rows={[["O₂", "19.5% – 23.5%"], ["LEL (قابل‌اشتعال)", "< 10%"], ["H₂S", "< 10 ppm"], ["CO", "< 25 ppm"]]} />
    </div>
  );
}

// 9) فاصلهٔ ایمنِ نزدیک‌شدن به برق
function ElecDistanceTool({ lang }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 10, lineHeight: 1.8 }}>
        {lang === "fa" ? "حداقل فاصلهٔ نزدیک‌شدن برای افرادِ فاقدِ صلاحیتِ برقی (مرجعِ عمومی؛ الزامِ محلی/OSHA را چک کنید)." : "Minimum approach distance for unqualified persons (general reference — check local/OSHA rules)."}
      </div>
      <RefTable head={[lang === "fa" ? "ولتاژ" : "Voltage", lang === "fa" ? "حداقل فاصله" : "Min. distance"]}
        rows={[
          ["≤ 1 kV", "1.0 m"], ["1 – 15 kV", "2.0 m"], ["15 – 36 kV", "2.5 m"],
          ["36 – 132 kV", "3.0 m"], ["132 – 220 kV", "4.0 m"], ["220 – 400 kV", "5.0 m"],
        ]} />
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "برای کار روی خط یا نزدیکِ آن، صلاحیت، مجوزِ کار و فاصلهٔ کارِ زنده جداگانه لازم است." : "Live/near-line work needs qualification, a permit and separate live-working distances."}
      </div>
    </div>
  );
}

// 10) فاصلهٔ ایمنِ پرتونگاری (عکسِ مجذور)
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

// 11) طبقاتِ حریق
function FireClassTool({ lang }) {
  const rows = lang === "fa"
    ? [["A", "جامداتِ معمولی (چوب، کاغذ، پارچه)", "آب، پودر ABC، فوم"],
       ["B", "مایعاتِ قابل‌اشتعال (بنزین، حلال، روغن)", "پودر ABC/BC، فوم، CO₂"],
       ["C", "تجهیزاتِ برق‌دار", "CO₂، پودرِ خشک — نه آب/فوم"],
       ["D", "فلزاتِ قابل‌اشتعال (منیزیم، سدیم)", "پودرِ ویژهٔ فلزات (Class D)"],
       ["K/F", "روغن و چربیِ آشپزخانه", "خاموش‌کنندهٔ Wet Chemical"]]
    : [["A", "Ordinary combustibles (wood, paper, cloth)", "Water, ABC powder, foam"],
       ["B", "Flammable liquids (fuel, solvent, oil)", "ABC/BC powder, foam, CO₂"],
       ["C", "Energised electrical equipment", "CO₂, dry powder — not water/foam"],
       ["D", "Combustible metals (Mg, Na)", "Class-D metal powder"],
       ["K/F", "Cooking oils & fats", "Wet-chemical extinguisher"]];
  return <RefTable head={[lang === "fa" ? "طبقه" : "Class", lang === "fa" ? "نوعِ آتش" : "Fuel", lang === "fa" ? "خاموش‌کنندهٔ مناسب" : "Suitable agent"]} rows={rows} />;
}

// 12) ناسازگاریِ انبارشِ مواد شیمیایی
function ChemStorageTool({ lang }) {
  const rows = lang === "fa"
    ? [["اکسیدکننده‌ها", "مواد آلی، سوخت، اسیدها، عواملِ کاهنده"],
       ["اسیدهای قوی", "بازها، سیانیدها، سولفیدها، فلزاتِ فعال"],
       ["بازهای قوی", "اسیدها، فلزاتِ آمفوتر (آلومینیوم، روی)"],
       ["مایعاتِ قابل‌اشتعال", "اکسیدکننده‌ها، اسیدهای معدنیِ قوی، منابعِ جرقه"],
       ["سیلندرهایِ گازِ فشرده", "منابعِ حرارت، اکسیدکننده در کنارِ سوخت"],
       ["آبگریزها (سدیم، کلسیم‌کارباید)", "آب، رطوبت، اسیدهایِ آبی"]]
    : [["Oxidisers", "Organics, fuels, acids, reducing agents"],
       ["Strong acids", "Bases, cyanides, sulphides, active metals"],
       ["Strong bases", "Acids, amphoteric metals (Al, Zn)"],
       ["Flammable liquids", "Oxidisers, strong mineral acids, ignition sources"],
       ["Compressed-gas cylinders", "Heat sources, oxidiser next to fuel gas"],
       ["Water-reactives (Na, CaC₂)", "Water, moisture, aqueous acids"]];
  return (
    <div>
      <RefTable head={[lang === "fa" ? "مادهٔ شیمیایی" : "Chemical", lang === "fa" ? "دور نگه دارید از" : "Keep away from"]} rows={rows} />
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8, lineHeight: 1.7 }}>
        {lang === "fa" ? "مرجعِ سریع؛ همیشه به SDSِ همان ماده رجوع کنید." : "Quick reference — always check the substance SDS."}
      </div>
    </div>
  );
}

// 13) انتخابِ سطحِ PPE (تصمیم سریع)
function PpeSelectTool({ lang }) {
  const rows = lang === "fa"
    ? [["پاشش/تماسِ شیمیایی", "عینکِ ضدِپاشش + سپرِ صورت، دستکشِ مقاومِ شیمیایی، پیش‌بند/لباسِ مقاوم"],
       ["گردوغبار / ذرات", "ماسکِ FFP2/FFP3، عینکِ ایمنی"],
       ["بخار/گازِ آلی", "رِسپیراتور نیم‌صورت با فیلترِ A/ABEK، پایشِ گاز"],
       ["جوشکاری", "سپرِ جوشکاری با شیدِ مناسب، دستکشِ چرمی، لباسِ نسوز، تهویه/فیوم‌اکسترکشن"],
       ["کارِ ارتفاع", "هارنسِ کاملِ بدن + لنیاردِ جاذبِ انرژی، کلاهِ چانه‌بنددار"],
       ["صدا > ۸۵ dB", "ایرپلاگ/ایرماف با SNR کافی، محدودسازیِ زمانِ مواجهه"]]
    : [["Chemical splash/contact", "Splash goggles + face shield, chem-resistant gloves, apron/suit"],
       ["Dust / particulate", "FFP2/FFP3 mask, safety glasses"],
       ["Organic vapour/gas", "Half-mask respirator A/ABEK filter, gas monitoring"],
       ["Welding", "Welding shield (correct shade), leather gloves, FR clothing, fume extraction"],
       ["Work at height", "Full-body harness + energy-absorbing lanyard, chin-strap helmet"],
       ["Noise > 85 dB", "Ear plugs/muffs with adequate SNR, limit exposure time"]];
  return <RefTable head={[lang === "fa" ? "خطر" : "Hazard", lang === "fa" ? "حداقل PPE پیشنهادی" : "Minimum recommended PPE"]} rows={rows} />;
}

// 14) تبدیل mg/m³ ↔ ppm
function GasConvTool({ lang }) {
  const [mode, setMode] = useState("mg2ppm");
  const [val, setVal] = useState("");
  const [mw, setMw] = useState("");
  const [temp, setTemp] = useState("25");
  const v = num(val), m = num(mw), t = num(temp);
  const Vm = t !== null ? 22.414 * ((t + 273.15) / 273.15) : null; // molar volume L/mol at 1 atm
  let out = null;
  if (v !== null && m && Vm) out = mode === "mg2ppm" ? (v * Vm) / m : (v * m) / Vm;
  return (
    <div>
      <Sel label={lang === "fa" ? "جهتِ تبدیل" : "Direction"} value={mode} onChange={setMode}
        options={[{ v: "mg2ppm", l: "mg/m³ → ppm" }, { v: "ppm2mg", l: "ppm → mg/m³" }]} />
      <Num label={lang === "fa" ? "مقدار" : "Value"} value={val} onChange={setVal} unit={mode === "mg2ppm" ? "mg/m³" : "ppm"} />
      <Num label={lang === "fa" ? "جرمِ مولیِ گاز (M)" : "Molar mass (M)"} value={mw} onChange={setMw} unit="g/mol" hint={lang === "fa" ? "مثال: CO=28، H₂S=34، NO₂=46، SO₂=64" : "e.g. CO=28, H₂S=34, NO₂=46, SO₂=64"} />
      <Num label={lang === "fa" ? "دما" : "Temperature"} value={temp} onChange={setTemp} unit="°C" />
      {out !== null && <Result>{fmt(v, 3)} → <b>{fmt(out, 3)}</b> {mode === "mg2ppm" ? "ppm" : "mg/m³"} <span style={{ fontWeight: 400, fontSize: 11 }}>@ 1 atm</span></Result>}
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
  { id: "wbgt", cat: "calc", icon: ThermometerSun, Tool: WbgtTool,
    title: { fa: "شاخصِ استرسِ گرمایی (WBGT)", en: "Heat stress (WBGT)", de: "Hitzebelastung (WBGT)" },
    desc: { fa: "محاسبهٔ WBGT و بازهٔ ریسکِ کار در گرما", en: "WBGT and heat-work risk band", de: "WBGT und Risikoband für Hitzearbeit" } },
  { id: "noise", cat: "calc", icon: Volume2, Tool: NoiseTool,
    title: { fa: "ترکیبِ ترازِ صدا", en: "Combine sound levels", de: "Schallpegel kombinieren" },
    desc: { fa: "جمعِ لگاریتمیِ چند منبعِ صوتی", en: "Logarithmic sum of several sources", de: "Logarithmische Summe mehrerer Quellen" } },
  { id: "crane-load", cat: "lifting", icon: Construction, Tool: CraneLoadTool,
    title: { fa: "درصدِ بارِ جرثقیل", en: "Crane load %", de: "Kranlast %" },
    desc: { fa: "درصدِ بهره‌گیری از SWL و هشدارِ ۷۵/۹۰٪", en: "SWL utilisation with 75/90% alerts", de: "SWL-Auslastung mit 75/90 %-Warnung" } },
  { id: "sling-angle", cat: "lifting", icon: Construction, Tool: SlingAngleTool,
    title: { fa: "ضریبِ زاویهٔ اسلینگ", en: "Sling angle factor", de: "Anschlagwinkel-Faktor" },
    desc: { fa: "نیرویِ هر پایه و ظرفیتِ مؤثرِ سیستمِ اسلینگ", en: "Leg tension and effective sling capacity", de: "Strangkraft und effektive Anschlagkapazität" } },
  { id: "confined-gas", cat: "gas", icon: Wind, Tool: ConfinedGasTool,
    title: { fa: "گازهایِ ورود به فضایِ محصور", en: "Confined-space entry gases", de: "Gase für Behälterzutritt" },
    desc: { fa: "کنترلِ O₂/LEL/H₂S/CO با قرائتِ گازسنج", en: "Check O₂/LEL/H₂S/CO against limits", de: "O₂/LEL/H₂S/CO gegen Grenzwerte prüfen" } },
  { id: "elec-distance", cat: "elec", icon: Zap, Tool: ElecDistanceTool,
    title: { fa: "فاصلهٔ ایمنِ خطوطِ برق", en: "Electrical approach distance", de: "Elektrischer Annäherungsabstand" },
    desc: { fa: "حداقل فاصله بر حسبِ ولتاژ", en: "Minimum distance by voltage", de: "Mindestabstand nach Spannung" } },
  { id: "rad-zones", cat: "rad", icon: Atom, Tool: RadZonesTool,
    title: { fa: "محاسبه شعاع نواحی رادیوگرافی", en: "Radiography zone radii", de: "Radiografie-Zonenradien" },
    desc: { fa: "شعاعِ منطقهٔ ممنوعه، کنترل‌شده و تحت نظارت بر پایهٔ قدرتِ چشمه (Ci) + نمودارِ دایره‌ای", en: "Prohibited / controlled / supervised radii from source activity (Ci) + radial diagram", de: "Sperr-, Kontroll- und Überwachungsradien aus Quellenaktivität (Ci) + Radialdiagramm" } },
  { id: "rad-distance", cat: "rad", icon: Atom, Tool: RadDistanceTool,
    title: { fa: "فاصلهٔ ایمنِ پرتونگاری (بر پایهٔ آهنگِ دُز)", en: "Radiography safe distance (dose-rate)", de: "Sicherer Abstand Radiografie (Dosisleistung)" },
    desc: { fa: "قانونِ عکسِ مجذور برای مرزِ ناحیهٔ کنترل‌شده", en: "Inverse-square law for the controlled-area boundary", de: "Abstandsquadratgesetz für die Sperrgrenze" } },
  { id: "fire-class", cat: "fire", icon: Flame, Tool: FireClassTool,
    title: { fa: "طبقاتِ حریق و خاموش‌کننده", en: "Fire classes & agents", de: "Brandklassen & Löschmittel" },
    desc: { fa: "جدولِ مرجعِ طبقهٔ A تا K و خاموش‌کنندهٔ مناسب", en: "Reference table, classes A–K and the right agent", de: "Referenztabelle, Klassen A–K und passendes Löschmittel" } },
  { id: "chem-storage", cat: "chem", icon: FlaskConical, Tool: ChemStorageTool,
    title: { fa: "ناسازگاریِ انبارشِ شیمیایی", en: "Chemical storage incompatibility", de: "Lager-Unverträglichkeit Chemikalien" },
    desc: { fa: "کدام مواد را از هم جدا نگه داریم", en: "Which substances to keep apart", de: "Welche Stoffe getrennt lagern" } },
  { id: "ppe-select", cat: "ppe", icon: HardHat, Tool: PpeSelectTool,
    title: { fa: "انتخابِ سریعِ PPE", en: "Quick PPE selector", de: "Schnelle PSA-Auswahl" },
    desc: { fa: "حداقلِ PPE بر پایهٔ نوعِ خطر", en: "Minimum PPE by hazard type", de: "Mindest-PSA nach Gefährdungsart" } },
  { id: "gas-conv", cat: "env", icon: Wind, Tool: GasConvTool,
    title: { fa: "تبدیل mg/m³ ↔ ppm", en: "mg/m³ ↔ ppm converter", de: "mg/m³ ↔ ppm-Rechner" },
    desc: { fa: "تبدیلِ غلظتِ آلایندهٔ گازی بر حسبِ جرمِ مولی و دما", en: "Gaseous pollutant concentration by molar mass & temperature", de: "Gasförmige Schadstoffkonzentration nach Molmasse & Temperatur" } },
];
