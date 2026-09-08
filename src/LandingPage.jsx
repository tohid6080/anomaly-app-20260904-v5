import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ClipboardCheck, ListChecks, Wrench, GraduationCap, Users,
  FileCheck, HardHat, Boxes, MessagesSquare, FolderOpen, UserCog, LayoutDashboard,
  ArrowLeft, Check, Menu, X, BarChart3, LineChart, Gauge, Smartphone, Zap,
  Database, FileBarChart, Recycle, Layers, TrendingUp, Bell,
} from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext.jsx";

/* ------------------------------------------------------------------ *
 * صفحهٔ فرودِ عمومیِ IHMS — Enterprise SaaS، فارسی/RTL، تمِ روشنِ لوکس.
 * این صفحه دنیای بصریِ خودش را دارد (پیش از ورود)، پس پالتِ صریحِ برند
 * را به‌کار می‌برد و نیازی به تمِ تیره ندارد. فرمِ ورود اینجا نیست؛ با
 * دکمهٔ «ورود کاربران» یک Modal باز می‌شود (در App.jsx).
 * ------------------------------------------------------------------ */

// پالتِ برند (سرمه‌ای صنعتی + سبز/فیروزه‌ای)
const C = {
  ink: "#0c2233",
  ink2: "#33566b",
  ink3: "#6a8698",
  navy: "#0e2c3f",
  navyDeep: "#081a27",
  teal: "#12b5a6",
  tealDeep: "#0e8f86",
  tealSoft: "#e6f6f4",
  line: "#e4ecf1",
  lineSoft: "#eef3f6",
  bg: "#ffffff",
  bgSoft: "#f5f9fb",
  bgTint: "#f0f7f8",
  white: "#ffffff",
  amber: "#e8a13a",
  good: "#1e9e6a",
};

const FONT = 'var(--ihms-font, "Vazirmatn", "IRANSans", Tahoma, system-ui, sans-serif)';

const LP_CSS = `
.ihms-lp *{box-sizing:border-box}
.ihms-lp{font-family:${FONT};color:${C.ink};background:${C.bg};line-height:1.75;-webkit-font-smoothing:antialiased}
.ihms-lp h1,.ihms-lp h2,.ihms-lp h3,.ihms-lp p{margin:0}
.ihms-lp a{color:inherit;text-decoration:none}
.ihms-lp button{font-family:inherit}
.ihms-lp .wrap{max-width:1180px;margin:0 auto;padding:0 clamp(18px,4vw,40px)}
.ihms-lp section{padding:clamp(56px,8vw,104px) 0}
.ihms-lp .eyebrow{display:inline-block;font-size:12.5px;font-weight:800;letter-spacing:.04em;color:${C.tealDeep};background:${C.tealSoft};padding:6px 14px;border-radius:999px;margin-bottom:16px}
.ihms-lp .h2{font-size:clamp(23px,3.4vw,34px);font-weight:900;letter-spacing:-.01em;color:${C.ink};text-wrap:balance}
.ihms-lp .sub{font-size:clamp(14px,1.7vw,16.5px);color:${C.ink2};max-width:640px;margin:12px auto 0}
.ihms-lp .center{text-align:center}
.ihms-lp .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:14.5px;
  border-radius:12px;padding:13px 24px;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,background .2s ease;border:1px solid transparent}
.ihms-lp .btn:hover{transform:translateY(-1px)}
.ihms-lp .btn-primary{background:linear-gradient(180deg,${C.teal},${C.tealDeep});color:#fff;box-shadow:0 10px 24px -10px rgba(14,143,134,.55)}
.ihms-lp .btn-primary:hover{box-shadow:0 14px 30px -10px rgba(14,143,134,.6)}
.ihms-lp .btn-ghost{background:#fff;color:${C.navy};border-color:${C.line}}
.ihms-lp .btn-ghost:hover{border-color:${C.teal};background:${C.bgTint}}
.ihms-lp .btn-lg{padding:15px 30px;font-size:15.5px;border-radius:14px}
.ihms-lp .card{background:#fff;border:1px solid ${C.line};border-radius:18px;transition:transform .18s ease,box-shadow .22s ease,border-color .2s ease}
.ihms-lp .card.hoverable:hover{transform:translateY(-3px);box-shadow:0 20px 40px -24px rgba(12,34,51,.28);border-color:#dbe7ee}
.ihms-lp .ico{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ihms-lp [data-rv]{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
.ihms-lp [data-rv].in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.ihms-lp [data-rv]{opacity:1;transform:none;transition:none}.ihms-lp .btn:hover{transform:none}}

/* Header */
.ihms-lp .hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);backdrop-filter:saturate(180%) blur(10px);
  -webkit-backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid transparent;transition:border-color .2s ease,box-shadow .2s ease}
.ihms-lp .hdr.scrolled{border-color:${C.line};box-shadow:0 6px 22px -18px rgba(12,34,51,.4)}
.ihms-lp .hdr .row{display:flex;align-items:center;gap:18px;height:66px}
.ihms-lp .nav{display:flex;align-items:center;gap:24px;font-size:13.5px;font-weight:700;color:${C.ink2}}
.ihms-lp .nav a{position:relative;padding:6px 0;transition:color .15s ease}
.ihms-lp .nav a:hover{color:${C.tealDeep}}
.ihms-lp .hdr .spacer{flex:1}
.ihms-lp .link-login{font-size:13px;font-weight:800;color:${C.navy};padding:9px 14px;border-radius:10px;border:1px solid ${C.line};background:#fff;cursor:pointer;transition:border-color .15s ease}
.ihms-lp .link-login:hover{border-color:${C.teal}}
.ihms-lp .hamb{display:none;background:none;border:1px solid ${C.line};border-radius:10px;padding:8px;cursor:pointer;color:${C.navy}}
.ihms-lp .mnav{display:none}

@media (max-width:960px){
  .ihms-lp .nav{display:none}
  .ihms-lp .hdr .link-login{display:none}
  .ihms-lp .hamb{display:flex}
  .ihms-lp .mnav.open{display:block;border-top:1px solid ${C.line};background:#fff}
  .ihms-lp .mnav .wrap{padding-top:12px;padding-bottom:16px;display:flex;flex-direction:column;gap:4px}
  .ihms-lp .mnav a{padding:11px 6px;font-weight:700;color:${C.ink2};border-radius:10px}
  .ihms-lp .mnav a:active{background:${C.bgSoft}}
}

/* Hero */
.ihms-lp .hero{padding-top:clamp(34px,6vw,64px)}
.ihms-lp .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,60px);align-items:center}
.ihms-lp .hero h1{font-size:clamp(30px,5.2vw,50px);font-weight:900;line-height:1.28;letter-spacing:-.015em;color:${C.ink}}
.ihms-lp .hero h1 .accent{color:${C.tealDeep};display:block}
.ihms-lp .hero .lede{font-size:clamp(14.5px,1.9vw,17px);color:${C.ink2};margin-top:18px;max-width:540px}
.ihms-lp .hero .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
.ihms-lp .hero .ticks{display:flex;gap:20px;flex-wrap:wrap;margin-top:22px;font-size:13px;font-weight:700;color:${C.ink2}}
.ihms-lp .hero .ticks span{display:inline-flex;align-items:center;gap:7px}
.ihms-lp .hero-visual{position:relative}
.ihms-lp .hero-photo{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:4/3.4;border:1px solid ${C.line};
  background:linear-gradient(160deg,${C.navy},${C.navyDeep});box-shadow:0 40px 80px -40px rgba(8,26,39,.55)}
.ihms-lp .hero-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ihms-lp .hero-photo .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);font-weight:700;font-size:13px;padding:24px;text-align:center}
.ihms-lp .hero-photo .grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:34px 34px}
.ihms-lp .mock{position:absolute;background:#fff;border:1px solid ${C.line};border-radius:16px;box-shadow:0 30px 60px -30px rgba(12,34,51,.4);padding:14px}
.ihms-lp .mock.dash{inset-inline-start:-26px;bottom:-26px;width:min(300px,64%)}
.ihms-lp .mock.kpi{inset-inline-end:-18px;top:24px;width:min(210px,48%);padding:12px 14px}
@media (max-width:900px){
  .ihms-lp .hero-grid{grid-template-columns:1fr;text-align:center}
  .ihms-lp .hero .lede,.ihms-lp .hero h1{margin-inline:auto}
  .ihms-lp .hero .cta,.ihms-lp .hero .ticks{justify-content:center}
  .ihms-lp .hero-visual{margin-top:8px}
  .ihms-lp .mock.dash{inset-inline-start:-8px;bottom:-16px;width:64%}
  .ihms-lp .mock.kpi{inset-inline-end:-6px}
}

/* generic grids */
.ihms-lp .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.ihms-lp .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.ihms-lp .g2{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,56px);align-items:center}
@media (max-width:960px){.ihms-lp .g4{grid-template-columns:repeat(2,1fr)}.ihms-lp .g3{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.ihms-lp .g3,.ihms-lp .g4,.ihms-lp .g2{grid-template-columns:1fr}}

/* announcement bar */
.ihms-lp .anounce{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:${C.tealSoft};border:1px solid #cdeee9;
  border-radius:14px;padding:12px 16px;margin-top:34px}
.ihms-lp .anounce .dot{width:34px;height:34px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;color:${C.tealDeep};flex-shrink:0}
.ihms-lp .anounce .txt{flex:1;min-width:220px;font-size:12.5px;color:${C.ink2}}
.ihms-lp .anounce .txt b{color:${C.ink};font-weight:800}
.ihms-lp .anounce .date{font-size:11.5px;color:${C.ink3};font-variant-numeric:tabular-nums}

/* how it works */
.ihms-lp .flow{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:36px}
.ihms-lp .flow .step{flex:1 1 150px;max-width:190px;text-align:center}
.ihms-lp .flow .sIco{width:54px;height:54px;border-radius:15px;background:#fff;border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:${C.tealDeep}}
.ihms-lp .flow .num{font-size:11px;font-weight:800;color:${C.ink3}}
.ihms-lp .flow .sT{font-size:14px;font-weight:800;color:${C.ink};margin-top:2px}
.ihms-lp .flow .sD{font-size:12px;color:${C.ink2};margin-top:4px;line-height:1.7}
.ihms-lp .flow .arrow{display:flex;align-items:center;color:${C.ink3};padding-top:14px}
@media (max-width:820px){.ihms-lp .flow .arrow{transform:rotate(-90deg)}}

/* modules */
.ihms-lp .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:24px auto 30px}
.ihms-lp .chip{font-size:12.5px;font-weight:800;padding:8px 16px;border-radius:999px;border:1px solid ${C.line};background:#fff;color:${C.ink2};cursor:pointer;transition:all .15s ease}
.ihms-lp .chip:hover{border-color:${C.teal};color:${C.tealDeep}}
.ihms-lp .chip.on{background:${C.navy};border-color:${C.navy};color:#fff}
.ihms-lp .mcard{padding:18px;display:flex;flex-direction:column;gap:10px}
.ihms-lp .mcard .mT{font-size:14.5px;font-weight:800;color:${C.ink}}
.ihms-lp .mcard .mD{font-size:12px;color:${C.ink2};line-height:1.7;flex:1}
.ihms-lp .mcard .more{font-size:11.5px;font-weight:800;color:${C.tealDeep};display:inline-flex;align-items:center;gap:5px}

/* showcase / mobile */
.ihms-lp .showcase{background:${C.bgSoft}}
.ihms-lp .feat{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid ${C.line}}
.ihms-lp .feat:last-child{border-bottom:0}
.ihms-lp .feat .fT{font-size:14.5px;font-weight:800;color:${C.ink}}
.ihms-lp .feat .fD{font-size:12.5px;color:${C.ink2};margin-top:3px}
.ihms-lp .bigmock{background:#fff;border:1px solid ${C.line};border-radius:20px;box-shadow:0 40px 80px -46px rgba(12,34,51,.4);padding:16px}
.ihms-lp .phone{width:min(260px,80%);margin:0 auto;background:${C.navyDeep};border-radius:34px;padding:12px;box-shadow:0 40px 80px -40px rgba(8,26,39,.6)}
.ihms-lp .phone .screen{background:#fff;border-radius:24px;overflow:hidden;aspect-ratio:9/18.5}

/* pricing */
.ihms-lp .toggle{display:inline-flex;background:${C.bgSoft};border:1px solid ${C.line};border-radius:999px;padding:4px;margin:18px auto 8px;gap:4px}
.ihms-lp .toggle button{border:none;background:none;font-size:12.5px;font-weight:800;color:${C.ink2};padding:9px 20px;border-radius:999px;cursor:pointer}
.ihms-lp .toggle button.on{background:#fff;color:${C.navy};box-shadow:0 2px 8px -3px rgba(12,34,51,.25)}
.ihms-lp .save{font-size:11px;font-weight:800;color:${C.tealDeep}}
.ihms-lp .price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:30px;align-items:stretch}
@media (max-width:900px){.ihms-lp .price-grid{grid-template-columns:1fr}}
.ihms-lp .plan{padding:26px 24px;display:flex;flex-direction:column;gap:6px}
.ihms-lp .plan.pop{border-color:${C.teal};box-shadow:0 30px 60px -34px rgba(14,143,134,.4);position:relative}
.ihms-lp .plan .badge{position:absolute;top:-13px;inset-inline-start:24px;background:linear-gradient(180deg,${C.teal},${C.tealDeep});color:#fff;font-size:11px;font-weight:800;padding:5px 14px;border-radius:999px}
.ihms-lp .plan .pName{font-size:15px;font-weight:900;color:${C.ink}}
.ihms-lp .plan .pFor{font-size:12px;color:${C.ink3}}
.ihms-lp .plan .pPrice{font-size:30px;font-weight:900;color:${C.ink};margin-top:12px;font-variant-numeric:tabular-nums}
.ihms-lp .plan .pPrice small{font-size:12.5px;font-weight:700;color:${C.ink3}}
.ihms-lp .plan ul{list-style:none;padding:0;margin:16px 0 20px;display:flex;flex-direction:column;gap:9px}
.ihms-lp .plan li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;color:${C.ink2}}
.ihms-lp .plan li svg{color:${C.tealDeep};flex-shrink:0;margin-top:2px}

/* final CTA + footer */
.ihms-lp .final{background:linear-gradient(150deg,${C.navy},${C.navyDeep});color:#fff;border-radius:24px;padding:clamp(34px,6vw,64px);text-align:center;position:relative;overflow:hidden}
.ihms-lp .final .grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:38px 38px;opacity:.6}
.ihms-lp .final h2{font-size:clamp(24px,4vw,36px);font-weight:900;position:relative}
.ihms-lp .final p{color:rgba(255,255,255,.82);margin-top:12px;position:relative}
.ihms-lp .ftr{background:${C.navyDeep};color:rgba(255,255,255,.7);padding:52px 0 26px}
.ihms-lp .ftr .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px}
@media (max-width:820px){.ihms-lp .ftr .cols{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.ihms-lp .ftr .cols{grid-template-columns:1fr}}
.ihms-lp .ftr h4{color:#fff;font-size:13px;font-weight:800;margin-bottom:12px}
.ihms-lp .ftr a{display:block;font-size:12.5px;padding:5px 0;transition:color .15s ease}
.ihms-lp .ftr a:hover{color:${C.teal}}
.ihms-lp .ftr .base{border-top:1px solid rgba(255,255,255,.1);margin-top:34px;padding-top:20px;font-size:11.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
`;

// --- دادهٔ سکشن‌ها ---
const NAV = [
  { id: "top", label: "صفحه اصلی" },
  { id: "features", label: "امکانات" },
  { id: "modules", label: "ماژول‌ها" },
  { id: "benefits", label: "مزایا" },
  { id: "pricing", label: "پلن‌ها" },
  { id: "about", label: "درباره سامانه" },
  { id: "contact", label: "تماس با ما" },
];

const WHY = [
  { icon: Database, t: "مدیریت متمرکز اطلاعات HSE", d: "همهٔ داده‌های ایمنی، بهداشت و محیط‌زیست در یک پایگاه واحد و یکپارچه." },
  { icon: FileCheck, t: "کاهش فرآیندهای کاغذی", d: "ثبت، تأیید و بایگانی دیجیتال؛ بدون فرم کاغذی و پیگیری دستی." },
  { icon: AlertTriangle, t: "کنترل و پیگیری ریسک‌ها", d: "شناسایی، ارزیابی و پایش ریسک‌ها تا مرحلهٔ کنترل مؤثر." },
  { icon: ClipboardCheck, t: "مدیریت اقدامات اصلاحی", d: "تخصیص، مهلت‌گذاری و پیگیری اقدامات تا بسته‌شدن کامل." },
  { icon: FileBarChart, t: "گزارش‌گیری مدیریتی", d: "گزارش‌های آماده و شاخص‌های کلیدی برای تصمیم‌های سریع‌تر." },
  { icon: TrendingUp, t: "تصمیم‌گیری مبتنی بر داده", d: "روندها و تحلیل‌های واقعی به‌جای برداشت‌های پراکنده." },
];

const FLOW = [
  { icon: FileCheck, t: "ثبت اطلاعات", d: "حادثه، بازرسی، ریسک و مشاهدهٔ ناایمن" },
  { icon: LineChart, t: "بررسی و تحلیل", d: "شناسایی الگوها و علل ریشه‌ای" },
  { icon: AlertTriangle, t: "شناسایی ریسک", d: "ارزیابی و اولویت‌بندی ریسک‌ها" },
  { icon: Wrench, t: "اقدام اصلاحی", d: "تعریف و تخصیص اقدامات کنترلی" },
  { icon: ListChecks, t: "پیگیری", d: "پایش تا بسته‌شدن و اثربخشی" },
  { icon: FileBarChart, t: "گزارش مدیریتی", d: "داشبورد KPI و تصمیم‌گیری" },
];

const MODULES = [
  { icon: AlertTriangle, cat: "safety", t: "حوادث و شبه‌حوادث", d: "ثبت، بررسی و تحلیل حوادث و رویدادهای نزدیک به حادثه." },
  { icon: Layers, cat: "safety", t: "ارزیابی ریسک", d: "شناسایی خطر، ارزیابی و کنترل ریسک‌های فرآیندی و عملیاتی." },
  { icon: ClipboardCheck, cat: "safety", t: "بازرسی و چک‌لیست", d: "بازرسی‌های دوره‌ای و برنامه‌ای با چک‌لیست‌های استاندارد." },
  { icon: Wrench, cat: "management", t: "اقدامات اصلاحی", d: "تعریف، تخصیص و پیگیری اقدامات اصلاحی و پیشگیرانه." },
  { icon: GraduationCap, cat: "health", t: "آموزش HSE", d: "برنامه‌ریزی دوره‌ها، سوابق آموزشی و صلاحیت افراد." },
  { icon: Users, cat: "management", t: "مدیریت پیمانکاران", d: "ارزیابی، مدارک و نظارت بر عملکرد HSE پیمانکاران." },
  { icon: FileCheck, cat: "safety", t: "مجوز کار", d: "صدور و کنترل مجوزهای کار گرم، ارتفاع و فضای بسته." },
  { icon: HardHat, cat: "safety", t: "PPE", d: "مدیریت تجهیزات حفاظت فردی و تخصیص به افراد." },
  { icon: Boxes, cat: "management", t: "تجهیزات و ماشین‌آلات", d: "شناسنامه، بازرسی و نگهداری تجهیزات و ماشین‌آلات." },
  { icon: MessagesSquare, cat: "safety", t: "جلسات و Toolbox", d: "ثبت جلسات ایمنی و آموزش‌های پیش از کار." },
  { icon: Recycle, cat: "env", t: "محیط زیست", d: "پایش پسماند، پساب و شاخص‌های زیست‌محیطی." },
  { icon: FolderOpen, cat: "management", t: "مستندات HSE", d: "مدیریت رویه‌ها، دستورالعمل‌ها و مدارک سامانه." },
  { icon: UserCog, cat: "health", t: "مدیریت کارکنان", d: "ورود و تردد، صلاحیت و پرونده سلامت شغلی افراد." },
  { icon: LayoutDashboard, cat: "report", t: "داشبورد و KPI", d: "شاخص‌های کلیدی و نمای کامل عملکرد HSE سازمان." },
];

const MOD_CATS = [
  { key: "all", label: "همه" },
  { key: "safety", label: "ایمنی" },
  { key: "health", label: "بهداشت" },
  { key: "env", label: "محیط زیست" },
  { key: "management", label: "مدیریت" },
  { key: "report", label: "گزارش‌گیری" },
];

const TRUST = [
  { icon: Zap, t: "کاهش زمان ثبت و پیگیری" },
  { icon: Layers, t: "شفافیت فرآیندها" },
  { icon: Database, t: "دسترسی سریع به اطلاعات" },
  { icon: FileBarChart, t: "گزارش‌گیری مدیریتی" },
  { icon: AlertTriangle, t: "کنترل بهتر ریسک" },
  { icon: TrendingUp, t: "افزایش بهره‌وری تیم HSE" },
];

const PLANS = [
  {
    name: "پلن پایه", forWho: "مناسب تیم‌های کوچک", m: "—", y: "—",
    features: ["ماژول‌های پایهٔ ایمنی", "ثبت حوادث و بازرسی", "اقدامات اصلاحی", "گزارش‌های استاندارد", "پشتیبانی ایمیلی"],
  },
  {
    name: "پلن حرفه‌ای", forWho: "مناسب شرکت‌ها و سازمان‌های متوسط", m: "—", y: "—", pop: true,
    features: ["همهٔ ماژول‌های سامانه", "ارزیابی ریسک و مجوز کار", "مدیریت پیمانکاران و آموزش", "داشبورد و KPI مدیریتی", "اپلیکیشن موبایل", "پشتیبانی اولویت‌دار"],
  },
  {
    name: "پلن سازمانی", forWho: "مناسب سازمان‌های بزرگ", m: "توافقی", y: "توافقی",
    features: ["همهٔ امکانات پلن حرفه‌ای", "چند شرکت / چند سایت", "نقش‌ها و دسترسی‌های پیشرفته", "یکپارچه‌سازی و API", "استقرار اختصاصی", "مدیر پشتیبانی اختصاصی"],
  },
];

// آیکونِ سکشن — دایرهٔ رنگی
function IcoBox({ icon: Icon, tint = C.tealSoft, color = C.tealDeep, size = 46 }) {
  return (
    <span className="ico" style={{ width: size, height: size, background: tint, color }}>
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.1} />
    </span>
  );
}

// مینی‌مکاپِ داشبورد (CSSی، دادهٔ نمونه — هیچ داده‌ی واقعی)
function DashMock({ compact }) {
  const bars = [42, 68, 30, 88, 54, 72, 46];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["حوادث باز", "۷", C.amber], ["ریسک بحرانی", "۳", "#e05c5c"], ["اقدامات", "۱۲", C.tealDeep]].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1, background: C.bgSoft, borderRadius: 10, padding: "8px 9px" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 8.5, color: C.ink3, marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgSoft, borderRadius: 10, padding: "10px 10px 8px" }}>
        <div style={{ fontSize: 9, color: C.ink3, marginBottom: 8 }}>روند حوادث — ۷ ماه اخیر</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: compact ? 46 : 60 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i === 3 ? C.tealDeep : "#bfe3df" }} />
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: C.bgSoft, borderRadius: 10, padding: "9px 10px" }}>
            <div style={{ fontSize: 9, color: C.ink3, marginBottom: 6 }}>وضعیت اقدامات</div>
            {[["باز", 40, C.amber], ["در حال انجام", 35, C.tealDeep], ["بسته", 25, C.good]].map(([l, w, c]) => (
              <div key={l} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 8, color: C.ink3, display: "flex", justifyContent: "space-between" }}><span>{l}</span><span>{w}٪</span></div>
                <div style={{ height: 4, background: "#e4ecf1", borderRadius: 4, marginTop: 2 }}>
                  <div style={{ width: `${w}%`, height: "100%", background: c, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: 78, background: C.bgSoft, borderRadius: 10, padding: "9px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.ink3, marginBottom: 6 }}>نرخ بستن</div>
            <div style={{
              width: 46, height: 46, borderRadius: "50%", margin: "0 auto",
              background: `conic-gradient(${C.tealDeep} 0 78%, #e4ecf1 78% 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: C.ink }}>۷۸٪</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const els = root.querySelectorAll("[data-rv]");
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function LandingPage({ onStartFree, onUserLogin, announcements, logoUrl, systemName, heroImageUrl }) {
  const { dir } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mNav, setMNav] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [modCat, setModCat] = useState("all");
  const rootRef = useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    setMNav(false);
    const el = document.getElementById("lp-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ann = Array.isArray(announcements) && announcements.length > 0 ? announcements[0] : null;
  const hero = heroImageUrl || "";
  const shownModules = modCat === "all" ? MODULES : MODULES.filter((m) => m.cat === modCat);
  const brandName = systemName || "IHMS";

  return (
    <div className="ihms-lp" dir={dir || "rtl"} ref={rootRef}>
      <style>{LP_CSS}</style>

      {/* ---------------- HEADER ---------------- */}
      <header className={"hdr" + (scrolled ? " scrolled" : "")} id="lp-top">
        <div className="wrap">
          <div className="row">
            <a href="#lp-top" onClick={(e) => { e.preventDefault(); go("top"); }} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={logoUrl || `${import.meta.env.BASE_URL}logo.png`} alt="IHMS" width={34} height={34} style={{ objectFit: "contain" }} />
              <span style={{ fontWeight: 900, fontSize: 18, color: C.navy, letterSpacing: "-.01em" }}>IHMS</span>
            </a>
            <nav className="nav">
              {NAV.map((n) => (
                <a key={n.id} href={"#lp-" + n.id} onClick={(e) => { e.preventDefault(); go(n.id); }}>{n.label}</a>
              ))}
            </nav>
            <span className="spacer" />
            <button type="button" className="link-login" onClick={onUserLogin}>ورود کاربران</button>
            <button type="button" className="btn btn-primary" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onStartFree}>
              همین الان رایگان شروع کنید
            </button>
            <button type="button" className="hamb" aria-label="منو" onClick={() => setMNav((v) => !v)}>
              {mNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <div className={"mnav" + (mNav ? " open" : "")}>
          <div className="wrap">
            {NAV.map((n) => (
              <a key={n.id} href={"#lp-" + n.id} onClick={(e) => { e.preventDefault(); go(n.id); }}>{n.label}</a>
            ))}
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMNav(false); onUserLogin(); }}>ورود کاربران</button>
            <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setMNav(false); onStartFree(); }}>همین الان رایگان شروع کنید</button>
          </div>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="hero-grid">
            <div data-rv>
              <span className="eyebrow">سامانه یکپارچه مدیریت HSE</span>
              <h1>مدیریت هوشمند HSE<span className="accent">از گزارش تا تصمیم‌گیری</span></h1>
              <p className="lede">
                IHMS یک سامانهٔ جامع و یکپارچه برای مدیریت ایمنی، بهداشت، محیط‌زیست و فرآیندهای HSE سازمان است؛
                با استفاده از اطلاعات واقعی، فرآیندهای سازمان را یکپارچه کنید، ریسک‌ها را کنترل کنید و تصمیم‌های دقیق‌تری بگیرید.
              </p>
              <div className="cta">
                <button type="button" className="btn btn-primary btn-lg" onClick={onStartFree}>همین الان رایگان شروع کنید</button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => go("features")}>مشاهده امکانات</button>
              </div>
              <div className="ticks">
                <span><Check size={15} color={C.tealDeep} /> شروع سریع</span>
                <span><Check size={15} color={C.tealDeep} /> دسترسی تحت وب و موبایل</span>
                <span><Check size={15} color={C.tealDeep} /> مدیریت یکپارچه HSE</span>
              </div>
            </div>

            <div className="hero-visual" data-rv>
              <div className="hero-photo">
                {hero
                  ? <img src={hero} alt="محیط صنعتی و کارشناس HSE" />
                  : (<><div className="grid-lines" /><div className="ph">تصویر واقعی محیط صنعتی و کارشناس HSE در این بخش قرار می‌گیرد</div></>)}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(8,26,39,.05),rgba(8,26,39,.35))" }} />
              </div>
              <div className="mock dash"><DashMock /></div>
              <div className="mock kpi">
                <div style={{ fontSize: 9.5, color: C.ink3 }}>شاخص ایمنی امروز</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.tealDeep, fontVariantNumeric: "tabular-nums" }}>۹۴٪</div>
                <div style={{ height: 4, background: "#e4ecf1", borderRadius: 4, marginTop: 6 }}>
                  <div style={{ width: "94%", height: "100%", background: C.tealDeep, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Announcement bar */}
          <div className="anounce" data-rv>
            <span className="dot"><Bell size={16} /></span>
            <div className="txt">
              <b>{ann?.title || "نسخه جدید سامانه IHMS منتشر شد"}</b>
              {"  "}— {ann?.body || "امکانات جدید و بهبودهای سامانه را مشاهده کنید."}
            </div>
            <span className="date">{ann?.dateLabel || "۱۴۰۵/۰۶/۱۸"}</span>
            <button type="button" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12.5 }} onClick={onStartFree}>مشاهده اطلاعیه</button>
            <a href="#lp-top" onClick={(e) => { e.preventDefault(); go("top"); }} style={{ fontSize: 12, fontWeight: 800, color: C.tealDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
              مشاهده همه اطلاعیه‌ها <ArrowLeft size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- WHY / FEATURES ---------------- */}
      <section id="lp-features">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">چرا IHMS؟</span>
            <h2 className="h2">تمام فرآیندهای HSE را در یک محیط یکپارچه مدیریت کنید</h2>
            <p className="sub">از ثبت اطلاعات میدانی تا تصمیم‌گیری مدیریتی، همه‌چیز در یک بستر منسجم و قابل‌اتکا.</p>
          </div>
          <div className="g3" style={{ marginTop: 40 }}>
            {WHY.map((w) => (
              <div key={w.t} className="card hoverable" style={{ padding: 22 }} data-rv>
                <IcoBox icon={w.icon} />
                <div style={{ fontSize: 15.5, fontWeight: 800, color: C.ink, margin: "14px 0 6px" }}>{w.t}</div>
                <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.85 }}>{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="showcase">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">جریان کار</span>
            <h2 className="h2">HSE را از ثبت اطلاعات تا تصمیم‌گیری مدیریت کنید</h2>
            <p className="sub">یک مسیر روشن و قابل‌پیگیری؛ از رویداد میدانی تا شاخص مدیریتی.</p>
          </div>
          <div className="flow">
            {FLOW.map((s, i) => (
              <React.Fragment key={s.t}>
                <div className="step" data-rv>
                  <div className="sIco"><s.icon size={22} strokeWidth={2.1} /></div>
                  <div className="num">مرحله {["۱", "۲", "۳", "۴", "۵", "۶"][i]}</div>
                  <div className="sT">{s.t}</div>
                  <div className="sD">{s.d}</div>
                </div>
                {i < FLOW.length - 1 && <div className="arrow"><ArrowLeft size={18} /></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- MODULES ---------------- */}
      <section id="lp-modules">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">ماژول‌ها</span>
            <h2 className="h2">همه ابزارهای موردنیاز HSE در یک سامانه</h2>
            <p className="sub">تمامی ماژول‌های مورد نیاز مدیریت HSE در یک بستر یکپارچه.</p>
          </div>
          <div className="chips" data-rv>
            {MOD_CATS.map((c) => (
              <button key={c.key} type="button" className={"chip" + (modCat === c.key ? " on" : "")} onClick={() => setModCat(c.key)}>{c.label}</button>
            ))}
          </div>
          <div className="g4">
            {shownModules.map((m) => (
              <div key={m.t} className="card hoverable mcard" data-rv>
                <IcoBox icon={m.icon} size={42} />
                <div className="mT">{m.t}</div>
                <div className="mD">{m.d}</div>
                <span className="more">مشاهده جزئیات <ArrowLeft size={13} /></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- PRODUCT SHOWCASE ---------------- */}
      <section className="showcase" id="lp-benefits">
        <div className="wrap">
          <div className="g2">
            <div data-rv>
              <span className="eyebrow">محیط سامانه</span>
              <h2 className="h2">تصمیم‌های بهتر با داده‌های واقعی</h2>
              <p style={{ fontSize: 14, color: C.ink2, margin: "12px 0 8px" }}>
                نمای کامل عملکرد HSE سازمان در یک صفحه؛ شاخص‌ها، روندها و نقاط بحرانی در یک نگاه.
              </p>
              <div style={{ marginTop: 8 }}>
                {[
                  { icon: LayoutDashboard, t: "داشبورد مدیریتی", d: "شاخص‌های کلیدی و وضعیت لحظه‌ای همهٔ ماژول‌ها." },
                  { icon: BarChart3, t: "گزارش‌های تحلیلی", d: "روند حوادث، ریسک و اقدامات با امکان فیلتر و خروجی." },
                  { icon: Gauge, t: "کنترل شاخص‌های HSE", d: "پایش KPIها و هشدار روی نقاط خارج از محدوده." },
                ].map((f) => (
                  <div key={f.t} className="feat">
                    <IcoBox icon={f.icon} size={40} />
                    <div><div className="fT">{f.t}</div><div className="fD">{f.d}</div></div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 20 }} onClick={onStartFree}>مشاهده محیط سامانه</button>
            </div>
            <div className="bigmock" data-rv>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#e05c5c" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.amber }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.good }} />
                <span style={{ marginInlineStart: "auto", fontSize: 10, color: C.ink3 }}>IHMS · داشبورد مدیریتی (نمونه)</span>
              </div>
              <DashMock />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- MOBILE APP ---------------- */}
      <section>
        <div className="wrap">
          <div className="g2">
            <div className="center" data-rv style={{ order: 2 }}>
              <div className="phone">
                <div className="screen" style={{ background: C.navyDeep, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 2px" }}>خانه</div>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.ink }}>خوش آمدید 👋</div>
                    <div style={{ fontSize: 8, color: C.ink3, marginTop: 3 }}>وظایف امروز شما</div>
                  </div>
                  {["ثبت گزارش شرایط ناایمن", "بازرسی روزانه داربست", "پیگیری اقدام اصلاحی #۱۲"].map((x, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "9px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={11} color={C.tealDeep} />
                      </span>
                      <span style={{ fontSize: 9, color: C.ink2, flex: 1 }}>{x}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: "auto", background: "#0e2c3f", borderRadius: 12, display: "flex", justifyContent: "space-around", padding: "8px 4px" }}>
                    {[LayoutDashboard, ListChecks, Boxes, Bell].map((I, i) => <I key={i} size={14} color={i === 0 ? C.teal : "rgba(255,255,255,.5)"} />)}
                  </div>
                </div>
              </div>
            </div>
            <div data-rv style={{ order: 1 }}>
              <span className="eyebrow">اپلیکیشن موبایل</span>
              <h2 className="h2">HSE همیشه در دسترس شماست</h2>
              <p style={{ fontSize: 14, color: C.ink2, margin: "12px 0 10px" }}>
                فرآیندهای HSE را از محل کار، سایت و محیط عملیاتی ثبت و پیگیری کنید.
              </p>
              {[
                { icon: Zap, t: "ثبت سریع گزارش", d: "ثبت حادثه، مشاهدهٔ ناایمن و بازرسی در چند ثانیه." },
                { icon: ListChecks, t: "مشاهده وظایف", d: "کارتابل شخصی با اولویت و مهلت هر مورد." },
                { icon: ClipboardCheck, t: "پیگیری اقدامات", d: "وضعیت اقدامات اصلاحی تا بسته‌شدن." },
              ].map((f) => (
                <div key={f.t} className="feat">
                  <IcoBox icon={f.icon} size={40} tint={C.bgTint} />
                  <div><div className="fT">{f.t}</div><div className="fD">{f.d}</div></div>
                </div>
              ))}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 12.5, fontWeight: 800, color: C.tealDeep }}>
                <Smartphone size={16} /> نسخهٔ اندروید سامانه
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section className="showcase" id="lp-pricing">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">پلن‌ها</span>
            <h2 className="h2">پلن مناسب سازمان خود را انتخاب کنید</h2>
            <div className="toggle">
              <button type="button" className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>ماهانه</button>
              <button type="button" className={yearly ? "on" : ""} onClick={() => setYearly(true)}>سالانه</button>
            </div>
            <div className="save">با پرداخت سالانه، دو ماه رایگان</div>
          </div>
          <div className="price-grid">
            {PLANS.map((p) => (
              <div key={p.name} className={"card plan" + (p.pop ? " pop" : "")} data-rv>
                {p.pop && <span className="badge">محبوب‌ترین انتخاب</span>}
                <div className="pName">{p.name}</div>
                <div className="pFor">{p.forWho}</div>
                <div className="pPrice">
                  {yearly ? p.y : p.m}{(yearly ? p.y : p.m) !== "توافقی" && (yearly ? p.y : p.m) !== "—" && <small> تومان / {yearly ? "سال" : "ماه"}</small>}
                </div>
                <ul>
                  {p.features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}
                </ul>
                <button type="button" className={"btn " + (p.pop ? "btn-primary" : "btn-ghost")} style={{ marginTop: "auto" }} onClick={onStartFree}>
                  همین الان رایگان شروع کنید
                </button>
              </div>
            ))}
          </div>
          <p className="center" style={{ fontSize: 12.5, color: C.ink3, marginTop: 22 }}>شروع رایگان، بدون نیاز به تعهد اولیه</p>
        </div>
      </section>

      {/* ---------------- TRUST ---------------- */}
      <section id="lp-about">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">چرا سازمان‌ها IHMS را انتخاب می‌کنند</span>
            <h2 className="h2">یک سیستم؛ یک تصویر کامل از عملکرد HSE</h2>
            <p className="sub">به‌جای فایل‌های پراکنده و پیگیری دستی، یک بستر منسجم برای کلِ چرخهٔ HSE.</p>
          </div>
          <div className="g3" style={{ marginTop: 38 }}>
            {TRUST.map((x) => (
              <div key={x.t} className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }} data-rv>
                <IcoBox icon={x.icon} size={42} tint={C.bgTint} />
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{x.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section id="lp-contact" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="final" data-rv>
            <div className="grid-lines" />
            <h2>HSE را هوشمند مدیریت کنید</h2>
            <p>از امروز فرآیندهای HSE سازمان خود را یکپارچه، سریع و قابل‌اندازه‌گیری کنید.</p>
            <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 24, position: "relative" }} onClick={onStartFree}>
              همین الان رایگان شروع کنید
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.7)", position: "relative" }}>
              راه‌اندازی سریع • محیط کاربری ساده • دسترسی تحت وب
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="ftr">
        <div className="wrap">
          <div className="cols">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src={logoUrl || `${import.meta.env.BASE_URL}logo.png`} alt="IHMS" width={30} height={30} style={{ objectFit: "contain" }} />
                <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>IHMS</span>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 2, maxWidth: 320 }}>
                {brandName} — سامانهٔ یکپارچهٔ مدیریت ایمنی، بهداشت و محیط‌زیست؛ برای مدیریت داده‌محور فرآیندهای HSE سازمان.
              </p>
            </div>
            <div>
              <h4>محصول</h4>
              <a href="#lp-features" onClick={(e) => { e.preventDefault(); go("features"); }}>امکانات</a>
              <a href="#lp-modules" onClick={(e) => { e.preventDefault(); go("modules"); }}>ماژول‌ها</a>
              <a href="#lp-pricing" onClick={(e) => { e.preventDefault(); go("pricing"); }}>پلن‌ها</a>
            </div>
            <div>
              <h4>سازمان</h4>
              <a href="#lp-about" onClick={(e) => { e.preventDefault(); go("about"); }}>درباره سامانه</a>
              <a href="#lp-contact" onClick={(e) => { e.preventDefault(); go("contact"); }}>تماس با ما</a>
              <a href="#lp-about" onClick={(e) => { e.preventDefault(); go("about"); }}>قوانین و حریم خصوصی</a>
            </div>
            <div>
              <h4>شروع کنید</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); onStartFree(); }}>شروع رایگان</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onUserLogin(); }}>ورود کاربران</a>
            </div>
          </div>
          <div className="base">
            <span>© {new Date().getFullYear()} IHMS — همهٔ حقوق محفوظ است.</span>
            <span>Integrated HSE Management System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
