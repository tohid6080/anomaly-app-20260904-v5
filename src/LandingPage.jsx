import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ClipboardCheck, ListChecks, Wrench, GraduationCap, Users,
  FileCheck, HardHat, Boxes, MessagesSquare, FolderOpen, UserCog, LayoutDashboard,
  ArrowLeft, ArrowRight, Check, Menu, X, BarChart3, LineChart, Gauge, Smartphone,
  Zap, Database, FileBarChart, Recycle, Layers, TrendingUp, Bell, Globe,
} from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext.jsx";

/* ------------------------------------------------------------------ *
 * صفحهٔ فرودِ عمومیِ IHMS — Enterprise SaaS، سه‌زبانه (فا/EN/DE)، تمِ
 * روشنِ لوکسِ برند. متنِ همهٔ سکشن‌ها در آبجکتِ L نگه‌داری می‌شود و با
 * کشویِ زبان در Header، کلِ صفحه (و جهت RTL/LTR) عوض می‌شود. فرمِ ورود
 * اینجا نیست؛ با «ورود کاربران» یک Modal در App.jsx باز می‌شود.
 * ------------------------------------------------------------------ */

const C = {
  ink: "#0c2233", ink2: "#33566b", ink3: "#6a8698",
  navy: "#0e2c3f", navyDeep: "#081a27",
  teal: "#12b5a6", tealDeep: "#0e8f86", tealSoft: "#e6f6f4",
  line: "#e4ecf1", lineSoft: "#eef3f6",
  bg: "#ffffff", bgSoft: "#f5f9fb", bgTint: "#f0f7f8", white: "#ffffff",
  amber: "#e8a13a", good: "#1e9e6a",
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
.ihms-lp .eyebrow{display:inline-block;font-size:12.5px;font-weight:800;letter-spacing:.02em;color:${C.tealDeep};background:${C.tealSoft};padding:6px 14px;border-radius:999px;margin-bottom:16px}
.ihms-lp .h2{font-size:clamp(23px,3.4vw,34px);font-weight:900;letter-spacing:-.01em;color:${C.ink};text-wrap:balance}
.ihms-lp .sub{font-size:clamp(14px,1.7vw,16.5px);color:${C.ink2};max-width:660px;margin:12px auto 0}
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
.ihms-lp .ico{border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ihms-lp [data-rv]{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
.ihms-lp [data-rv].in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.ihms-lp [data-rv]{opacity:1;transform:none;transition:none}.ihms-lp .btn:hover{transform:none}}

.ihms-lp .hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);backdrop-filter:saturate(180%) blur(10px);
  -webkit-backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid transparent;transition:border-color .2s ease,box-shadow .2s ease}
.ihms-lp .hdr.scrolled{border-color:${C.line};box-shadow:0 6px 22px -18px rgba(12,34,51,.4)}
.ihms-lp .hdr .row{display:flex;align-items:center;gap:16px;height:66px}
.ihms-lp .nav{display:flex;align-items:center;gap:22px;font-size:13.5px;font-weight:700;color:${C.ink2}}
.ihms-lp .nav a{position:relative;padding:6px 0;transition:color .15s ease}
.ihms-lp .nav a:hover{color:${C.tealDeep}}
.ihms-lp .hdr .spacer{flex:1}
.ihms-lp .link-login{font-size:13px;font-weight:800;color:${C.navy};padding:9px 14px;border-radius:10px;border:1px solid ${C.line};background:#fff;cursor:pointer;transition:border-color .15s ease}
.ihms-lp .link-login:hover{border-color:${C.teal}}
.ihms-lp .langsw{position:relative;display:inline-flex;align-items:center}
.ihms-lp .langsw .glb{position:absolute;inset-inline-start:9px;pointer-events:none;color:${C.ink3}}
.ihms-lp .langsw select{appearance:none;-webkit-appearance:none;font-family:inherit;font-size:12.5px;font-weight:800;color:${C.navy};
  background:${C.bgSoft};border:1px solid ${C.line};border-radius:999px;padding:8px 30px 8px 30px;cursor:pointer;transition:border-color .15s ease}
.ihms-lp .langsw select:hover{border-color:${C.teal}}
.ihms-lp .langsw .cv{position:absolute;inset-inline-end:9px;pointer-events:none;color:${C.ink3}}
.ihms-lp .hamb{display:none;background:none;border:1px solid ${C.line};border-radius:10px;padding:8px;cursor:pointer;color:${C.navy}}
.ihms-lp .mnav{display:none}
@media (max-width:980px){
  .ihms-lp .nav{display:none}
  .ihms-lp .hdr .row .link-login{display:none}
  .ihms-lp .hamb{display:flex}
  .ihms-lp .mnav.open{display:block;border-top:1px solid ${C.line};background:#fff}
  .ihms-lp .mnav .wrap{padding-top:12px;padding-bottom:16px;display:flex;flex-direction:column;gap:4px}
  .ihms-lp .mnav a{padding:11px 6px;font-weight:700;color:${C.ink2};border-radius:10px}
}

.ihms-lp .hero{padding-top:clamp(34px,6vw,64px)}
.ihms-lp .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,60px);align-items:center}
.ihms-lp .hero h1{font-size:clamp(30px,5.2vw,50px);font-weight:900;line-height:1.28;letter-spacing:-.015em;color:${C.ink}}
.ihms-lp .hero h1 .accent{color:${C.tealDeep};display:block}
.ihms-lp .hero .lede{font-size:clamp(14.5px,1.9vw,17px);color:${C.ink2};margin-top:18px;max-width:560px}
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
.ihms-lp .mock.kpi{inset-inline-end:-18px;top:24px;width:min(214px,48%);padding:12px 14px}
@media (max-width:900px){
  .ihms-lp .hero-grid{grid-template-columns:1fr;text-align:center}
  .ihms-lp .hero .lede,.ihms-lp .hero h1{margin-inline:auto}
  .ihms-lp .hero .cta,.ihms-lp .hero .ticks{justify-content:center}
  .ihms-lp .hero-visual{margin-top:8px}
  .ihms-lp .mock.dash{inset-inline-start:-8px;bottom:-16px;width:64%}
  .ihms-lp .mock.kpi{inset-inline-end:-6px}
}

.ihms-lp .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.ihms-lp .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.ihms-lp .g2{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,56px);align-items:center}
@media (max-width:960px){.ihms-lp .g4{grid-template-columns:repeat(2,1fr)}.ihms-lp .g3{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.ihms-lp .g3,.ihms-lp .g4,.ihms-lp .g2{grid-template-columns:1fr}}

.ihms-lp .anounce{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:${C.tealSoft};border:1px solid #cdeee9;border-radius:14px;padding:12px 16px;margin-top:34px}
.ihms-lp .anounce .dot{width:34px;height:34px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;color:${C.tealDeep};flex-shrink:0}
.ihms-lp .anounce .txt{flex:1;min-width:220px;font-size:12.5px;color:${C.ink2}}
.ihms-lp .anounce .txt b{color:${C.ink};font-weight:800}
.ihms-lp .anounce .date{font-size:11.5px;color:${C.ink3};font-variant-numeric:tabular-nums}

.ihms-lp .flow{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:36px}
.ihms-lp .flow .step{flex:1 1 150px;max-width:190px;text-align:center}
.ihms-lp .flow .sIco{width:54px;height:54px;border-radius:15px;background:#fff;border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:${C.tealDeep}}
.ihms-lp .flow .num{font-size:11px;font-weight:800;color:${C.ink3}}
.ihms-lp .flow .sT{font-size:14px;font-weight:800;color:${C.ink};margin-top:2px}
.ihms-lp .flow .sD{font-size:12px;color:${C.ink2};margin-top:4px;line-height:1.7}
.ihms-lp .flow .arrow{display:flex;align-items:center;color:${C.ink3};padding-top:14px}
@media (max-width:820px){.ihms-lp .flow .arrow{transform:rotate(90deg)}}

.ihms-lp .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:24px auto 30px}
.ihms-lp .chip{font-size:12.5px;font-weight:800;padding:8px 16px;border-radius:999px;border:1px solid ${C.line};background:#fff;color:${C.ink2};cursor:pointer;transition:all .15s ease}
.ihms-lp .chip:hover{border-color:${C.teal};color:${C.tealDeep}}
.ihms-lp .chip.on{background:${C.navy};border-color:${C.navy};color:#fff}
.ihms-lp .mcard{padding:18px;display:flex;flex-direction:column;gap:10px}
.ihms-lp .mcard .mT{font-size:14.5px;font-weight:800;color:${C.ink}}
.ihms-lp .mcard .mD{font-size:12px;color:${C.ink2};line-height:1.7;flex:1}
.ihms-lp .mcard .more{font-size:11.5px;font-weight:800;color:${C.tealDeep};display:inline-flex;align-items:center;gap:5px}

.ihms-lp .showcase{background:${C.bgSoft}}
.ihms-lp .feat{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid ${C.line}}
.ihms-lp .feat:last-child{border-bottom:0}
.ihms-lp .feat .fT{font-size:14.5px;font-weight:800;color:${C.ink}}
.ihms-lp .feat .fD{font-size:12.5px;color:${C.ink2};margin-top:3px}
.ihms-lp .bigmock{background:#fff;border:1px solid ${C.line};border-radius:20px;box-shadow:0 40px 80px -46px rgba(12,34,51,.4);padding:16px}
.ihms-lp .phone{width:min(260px,80%);margin:0 auto;background:${C.navyDeep};border-radius:34px;padding:12px;box-shadow:0 40px 80px -40px rgba(8,26,39,.6)}
.ihms-lp .phone .screen{background:#fff;border-radius:24px;overflow:hidden;aspect-ratio:9/18.5}

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
.ihms-lp .plan .pPrice{font-size:28px;font-weight:900;color:${C.ink};margin-top:12px;font-variant-numeric:tabular-nums}
.ihms-lp .plan .pPrice small{font-size:12px;font-weight:700;color:${C.ink3}}
.ihms-lp .plan ul{list-style:none;padding:0;margin:16px 0 20px;display:flex;flex-direction:column;gap:9px}
.ihms-lp .plan li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;color:${C.ink2}}
.ihms-lp .plan li svg{color:${C.tealDeep};flex-shrink:0;margin-top:2px}

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

/* ------------------------------ i18n ------------------------------ */
const MOD_ICONS = [
  AlertTriangle, Layers, ClipboardCheck, Wrench, GraduationCap, Users, FileCheck,
  HardHat, Boxes, MessagesSquare, Recycle, FolderOpen, UserCog, LayoutDashboard,
];
const MOD_CATS_KEYS = ["safety", "safety", "safety", "management", "health", "management", "safety", "safety", "management", "safety", "env", "management", "health", "report"];
const MODULES_IDX = MOD_ICONS.map((_, i) => i);
const CAT_INDEX = { safety: 1, health: 2, env: 3, management: 4, report: 5 };
const WHY_ICONS = [Database, FileCheck, AlertTriangle, ClipboardCheck, FileBarChart, TrendingUp];
const FLOW_ICONS = [FileCheck, LineChart, AlertTriangle, Wrench, ListChecks, FileBarChart];
const TRUST_ICONS = [Zap, Layers, Database, FileBarChart, AlertTriangle, TrendingUp];

const L = {
  fa: {
    d1: "۱", d7: "۷", d3: "۳", d12: "۱۲", pct94: "۹۴٪", pct78: "۷۸٪",
    nav: ["صفحه اصلی", "امکانات", "ماژول‌ها", "مزایا", "پلن‌ها", "درباره سامانه", "تماس با ما"],
    heroEyebrow: "سامانه یکپارچه مدیریت HSE",
    heroH1a: "مدیریت هوشمند HSE", heroH1b: "از گزارش تا تصمیم‌گیری",
    heroLede: "IHMS یک سامانهٔ جامع و یکپارچه برای مدیریت ایمنی، بهداشت، محیط‌زیست و فرآیندهای HSE سازمان است؛ با استفاده از اطلاعات واقعی، فرآیندهای سازمان را یکپارچه کنید، ریسک‌ها را کنترل کنید و تصمیم‌های دقیق‌تری بگیرید.",
    ctaPrimary: "همین الان رایگان شروع کنید", ctaSecondary: "مشاهده امکانات", login: "ورود کاربران",
    ticks: ["شروع سریع", "دسترسی تحت وب و موبایل", "مدیریت یکپارچه HSE"],
    annTitle: "نسخهٔ جدید سامانهٔ IHMS منتشر شد", annBody: "امکانات جدید و بهبودهای سامانه را مشاهده کنید.",
    annDate: "۱۴۰۵/۰۶/۱۸", annBtn: "مشاهده اطلاعیه", annAll: "مشاهده همه اطلاعیه‌ها",
    whyEyebrow: "چرا IHMS؟", whyH2: "تمام فرآیندهای HSE را در یک محیط یکپارچه مدیریت کنید",
    whySub: "از ثبت اطلاعات میدانی تا تصمیم‌گیری مدیریتی، همه‌چیز در یک بستر منسجم و قابل‌اتکا.",
    why: [
      ["مدیریت متمرکز اطلاعات HSE", "همهٔ داده‌های ایمنی، بهداشت و محیط‌زیست در یک پایگاه واحد و یکپارچه."],
      ["کاهش فرآیندهای کاغذی", "ثبت، تأیید و بایگانی دیجیتال؛ بدون فرم کاغذی و پیگیری دستی."],
      ["کنترل و پیگیری ریسک‌ها", "شناسایی، ارزیابی و پایش ریسک‌ها تا مرحلهٔ کنترل مؤثر."],
      ["مدیریت اقدامات اصلاحی", "تخصیص، مهلت‌گذاری و پیگیری اقدامات تا بسته‌شدن کامل."],
      ["گزارش‌گیری مدیریتی", "گزارش‌های آماده و شاخص‌های کلیدی برای تصمیم‌های سریع‌تر."],
      ["تصمیم‌گیری مبتنی بر داده", "روندها و تحلیل‌های واقعی به‌جای برداشت‌های پراکنده."],
    ],
    flowEyebrow: "جریان کار", flowH2: "HSE را از ثبت اطلاعات تا تصمیم‌گیری مدیریت کنید",
    flowSub: "یک مسیر روشن و قابل‌پیگیری؛ از رویداد میدانی تا شاخص مدیریتی.",
    step: "مرحله", stepNo: ["۱", "۲", "۳", "۴", "۵", "۶"],
    flow: [
      ["ثبت اطلاعات", "حادثه، بازرسی، ریسک و مشاهدهٔ ناایمن"],
      ["بررسی و تحلیل", "شناسایی الگوها و علل ریشه‌ای"],
      ["شناسایی ریسک", "ارزیابی و اولویت‌بندی ریسک‌ها"],
      ["اقدام اصلاحی", "تعریف و تخصیص اقدامات کنترلی"],
      ["پیگیری", "پایش تا بسته‌شدن و اثربخشی"],
      ["گزارش مدیریتی", "داشبورد KPI و تصمیم‌گیری"],
    ],
    modEyebrow: "ماژول‌ها", modH2: "همه ابزارهای موردنیاز HSE در یک سامانه",
    modSub: "تمامی ماژول‌های مورد نیاز مدیریت HSE در یک بستر یکپارچه.",
    modCats: ["همه", "ایمنی", "بهداشت", "محیط زیست", "مدیریت", "گزارش‌گیری"],
    modMore: "مشاهده جزئیات",
    mods: [
      ["حوادث و شبه‌حوادث", "ثبت، بررسی و تحلیل حوادث و رویدادهای نزدیک به حادثه."],
      ["ارزیابی ریسک", "شناسایی خطر، ارزیابی و کنترل ریسک‌های فرآیندی و عملیاتی."],
      ["بازرسی و چک‌لیست", "بازرسی‌های دوره‌ای و برنامه‌ای با چک‌لیست‌های استاندارد."],
      ["اقدامات اصلاحی", "تعریف، تخصیص و پیگیری اقدامات اصلاحی و پیشگیرانه."],
      ["آموزش HSE", "برنامه‌ریزی دوره‌ها، سوابق آموزشی و صلاحیت افراد."],
      ["مدیریت پیمانکاران", "ارزیابی، مدارک و نظارت بر عملکرد HSE پیمانکاران."],
      ["مجوز کار", "صدور و کنترل مجوزهای کار گرم، ارتفاع و فضای بسته."],
      ["PPE", "مدیریت تجهیزات حفاظت فردی و تخصیص به افراد."],
      ["تجهیزات و ماشین‌آلات", "شناسنامه، بازرسی و نگهداری تجهیزات و ماشین‌آلات."],
      ["جلسات و Toolbox", "ثبت جلسات ایمنی و آموزش‌های پیش از کار."],
      ["محیط زیست", "پایش پسماند، پساب و شاخص‌های زیست‌محیطی."],
      ["مستندات HSE", "مدیریت رویه‌ها، دستورالعمل‌ها و مدارک سامانه."],
      ["مدیریت کارکنان", "ورود و تردد، صلاحیت و پرونده سلامت شغلی افراد."],
      ["داشبورد و KPI", "شاخص‌های کلیدی و نمای کامل عملکرد HSE سازمان."],
    ],
    scEyebrow: "محیط سامانه", scH2: "تصمیم‌های بهتر با داده‌های واقعی",
    scPara: "نمای کامل عملکرد HSE سازمان در یک صفحه؛ شاخص‌ها، روندها و نقاط بحرانی در یک نگاه.",
    scFeat: [
      ["داشبورد مدیریتی", "شاخص‌های کلیدی و وضعیت لحظه‌ای همهٔ ماژول‌ها."],
      ["گزارش‌های تحلیلی", "روند حوادث، ریسک و اقدامات با امکان فیلتر و خروجی."],
      ["کنترل شاخص‌های HSE", "پایش KPIها و هشدار روی نقاط خارج از محدوده."],
    ],
    scBtn: "مشاهده محیط سامانه", scCaption: "IHMS · داشبورد مدیریتی (نمونه)",
    mbEyebrow: "اپلیکیشن موبایل", mbH2: "HSE همیشه در دسترس شماست",
    mbPara: "فرآیندهای HSE را از محل کار، سایت و محیط عملیاتی ثبت و پیگیری کنید.",
    mbFeat: [
      ["ثبت سریع گزارش", "ثبت حادثه، مشاهدهٔ ناایمن و بازرسی در چند ثانیه."],
      ["مشاهده وظایف", "کارتابل شخصی با اولویت و مهلت هر مورد."],
      ["پیگیری اقدامات", "وضعیت اقدامات اصلاحی تا بسته‌شدن."],
    ],
    mbTag: "نسخهٔ اندروید سامانه",
    phHome: "خانه", phWelcome: "خوش آمدید 👋", phTasks: "وظایف امروز شما",
    phList: ["ثبت گزارش شرایط ناایمن", "بازرسی روزانه داربست", "پیگیری اقدام اصلاحی #۱۲"],
    prEyebrow: "پلن‌ها", prH2: "پلن مناسب سازمان خود را انتخاب کنید",
    prMonthly: "ماهانه", prYearly: "سالانه", prSave: "با پرداخت سالانه، دو ماه رایگان",
    prBadge: "محبوب‌ترین انتخاب", prUnitM: "تومان / ماه", prUnitY: "تومان / سال", prCustom: "توافقی",
    prNote: "شروع رایگان، بدون نیاز به تعهد اولیه",
    plans: [
      ["پلن پایه", "مناسب تیم‌های کوچک", "—", "—", ["ماژول‌های پایهٔ ایمنی", "ثبت حوادث و بازرسی", "اقدامات اصلاحی", "گزارش‌های استاندارد", "پشتیبانی ایمیلی"]],
      ["پلن حرفه‌ای", "مناسب شرکت‌ها و سازمان‌های متوسط", "—", "—", ["همهٔ ماژول‌های سامانه", "ارزیابی ریسک و مجوز کار", "مدیریت پیمانکاران و آموزش", "داشبورد و KPI مدیریتی", "اپلیکیشن موبایل", "پشتیبانی اولویت‌دار"]],
      ["پلن سازمانی", "مناسب سازمان‌های بزرگ", "توافقی", "توافقی", ["همهٔ امکانات پلن حرفه‌ای", "چند شرکت / چند سایت", "نقش‌ها و دسترسی‌های پیشرفته", "یکپارچه‌سازی و API", "استقرار اختصاصی", "مدیر پشتیبانی اختصاصی"]],
    ],
    trEyebrow: "چرا سازمان‌ها IHMS را انتخاب می‌کنند", trH2: "یک سیستم؛ یک تصویر کامل از عملکرد HSE",
    trSub: "به‌جای فایل‌های پراکنده و پیگیری دستی، یک بستر منسجم برای کلِ چرخهٔ HSE.",
    trust: ["کاهش زمان ثبت و پیگیری", "شفافیت فرآیندها", "دسترسی سریع به اطلاعات", "گزارش‌گیری مدیریتی", "کنترل بهتر ریسک", "افزایش بهره‌وری تیم HSE"],
    fH2: "HSE را هوشمند مدیریت کنید",
    fP: "از امروز فرآیندهای HSE سازمان خود را یکپارچه، سریع و قابل‌اندازه‌گیری کنید.",
    fSub: "راه‌اندازی سریع • محیط کاربری ساده • دسترسی تحت وب",
    ftBlurb: "سامانهٔ یکپارچهٔ مدیریت ایمنی، بهداشت و محیط‌زیست؛ برای مدیریت داده‌محور فرآیندهای HSE سازمان.",
    ftProduct: "محصول", ftCompany: "سازمان", ftStart: "شروع کنید",
    ftLinks: ["امکانات", "ماژول‌ها", "پلن‌ها", "درباره سامانه", "تماس با ما", "قوانین و حریم خصوصی", "شروع رایگان", "ورود کاربران"],
    rights: "همهٔ حقوق محفوظ است.",
    heroPh: "تصویر واقعی محیط صنعتی و کارشناس HSE در این بخش قرار می‌گیرد",
    kpiToday: "شاخص ایمنی امروز",
    mkOpenInc: "حوادث باز", mkCritRisk: "ریسک بحرانی", mkActions: "اقدامات",
    mkTrend: "روند حوادث — ۷ ماه اخیر", mkActStatus: "وضعیت اقدامات",
    mkOpen: "باز", mkInProg: "در حال انجام", mkClosed: "بسته", mkCloseRate: "نرخ بستن",
  },

  en: {
    d1: "1", d7: "7", d3: "3", d12: "12", pct94: "94%", pct78: "78%",
    nav: ["Home", "Features", "Modules", "Benefits", "Pricing", "About", "Contact"],
    heroEyebrow: "Integrated HSE Management System",
    heroH1a: "Smart HSE management", heroH1b: "from report to decision",
    heroLede: "IHMS is a complete, integrated platform for managing your organisation's safety, health, environment and HSE processes. Use real data to unify your workflows, control risk and make sharper decisions.",
    ctaPrimary: "Start free now", ctaSecondary: "See features", login: "Sign in",
    ticks: ["Quick setup", "Web & mobile access", "Unified HSE management"],
    annTitle: "A new version of IHMS has been released", annBody: "See the new features and improvements.",
    annDate: "2026/09/09", annBtn: "View announcement", annAll: "View all announcements",
    whyEyebrow: "Why IHMS?", whyH2: "Manage every HSE process in one integrated place",
    whySub: "From field data entry to management decisions — everything on one coherent, dependable platform.",
    why: [
      ["Centralised HSE data", "All safety, health and environmental data in one unified database."],
      ["Less paperwork", "Digital capture, approval and archiving — no paper forms, no manual chasing."],
      ["Risk control & follow-up", "Identify, assess and monitor risks through to effective control."],
      ["Corrective-action management", "Assign, set deadlines and track actions until fully closed."],
      ["Management reporting", "Ready-made reports and KPIs for faster decisions."],
      ["Data-driven decisions", "Real trends and analysis instead of scattered impressions."],
    ],
    flowEyebrow: "Workflow", flowH2: "Run HSE from data entry to decision",
    flowSub: "A clear, traceable path — from a field event to a management KPI.",
    step: "Step", stepNo: ["1", "2", "3", "4", "5", "6"],
    flow: [
      ["Capture data", "Incidents, inspections, risks and unsafe observations"],
      ["Review & analyse", "Spot patterns and root causes"],
      ["Identify risk", "Assess and prioritise risks"],
      ["Corrective action", "Define and assign control actions"],
      ["Follow-up", "Monitor to closure and effectiveness"],
      ["Management report", "KPI dashboard and decisions"],
    ],
    modEyebrow: "Modules", modH2: "Every HSE tool you need in one system",
    modSub: "All the modules HSE management needs, on one integrated platform.",
    modCats: ["All", "Safety", "Health", "Environment", "Management", "Reporting"],
    modMore: "Details",
    mods: [
      ["Incidents & near-misses", "Record, review and analyse incidents and near-miss events."],
      ["Risk assessment", "Hazard identification, assessment and control of process & operational risk."],
      ["Inspections & checklists", "Periodic and planned inspections with standard checklists."],
      ["Corrective actions", "Define, assign and track corrective and preventive actions."],
      ["HSE training", "Plan courses, training records and personnel competency."],
      ["Contractor management", "Assessment, documents and oversight of contractor HSE performance."],
      ["Work permits", "Issue and control hot-work, height and confined-space permits."],
      ["PPE", "Manage personal protective equipment and assignment to people."],
      ["Equipment & machinery", "Records, inspection and maintenance of equipment and machinery."],
      ["Meetings & Toolbox", "Log safety meetings and pre-task briefings."],
      ["Environment", "Monitor waste, effluent and environmental indicators."],
      ["HSE documents", "Manage procedures, instructions and system records."],
      ["Personnel management", "Access & attendance, competency and occupational-health files."],
      ["Dashboard & KPI", "Key indicators and a full view of the organisation's HSE performance."],
    ],
    scEyebrow: "The product", scH2: "Better decisions with real data",
    scPara: "A full view of your organisation's HSE performance on one screen — indicators, trends and critical points at a glance.",
    scFeat: [
      ["Management dashboard", "Key indicators and the live status of every module."],
      ["Analytical reports", "Incident, risk and action trends with filtering and export."],
      ["HSE KPI control", "Monitor KPIs and get alerts on out-of-range points."],
    ],
    scBtn: "See the product", scCaption: "IHMS · Management dashboard (sample)",
    mbEyebrow: "Mobile app", mbH2: "HSE always in your pocket",
    mbPara: "Record and follow up HSE processes from the workplace, the site and the field.",
    mbFeat: [
      ["Quick reporting", "Log an incident, unsafe observation or inspection in seconds."],
      ["See your tasks", "A personal queue with priority and due date for each item."],
      ["Track actions", "Corrective-action status through to closure."],
    ],
    mbTag: "Android app",
    phHome: "Home", phWelcome: "Welcome 👋", phTasks: "Your tasks today",
    phList: ["Report an unsafe condition", "Daily scaffold inspection", "Follow up corrective action #12"],
    prEyebrow: "Pricing", prH2: "Choose the plan that fits your organisation",
    prMonthly: "Monthly", prYearly: "Yearly", prSave: "Two months free with annual billing",
    prBadge: "Most popular", prUnitM: "/ month", prUnitY: "/ year", prCustom: "Custom",
    prNote: "Start free — no upfront commitment",
    plans: [
      ["Basic", "For small teams", "—", "—", ["Core safety modules", "Incident & inspection logging", "Corrective actions", "Standard reports", "Email support"]],
      ["Professional", "For companies and mid-size organisations", "—", "—", ["All system modules", "Risk assessment & work permits", "Contractor management & training", "Management dashboard & KPI", "Mobile app", "Priority support"]],
      ["Enterprise", "For large organisations", "Custom", "Custom", ["Everything in Professional", "Multi-company / multi-site", "Advanced roles & permissions", "Integration & API", "Dedicated deployment", "Dedicated support manager"]],
    ],
    trEyebrow: "Why teams choose IHMS", trH2: "One system; one complete picture of HSE performance",
    trSub: "Instead of scattered files and manual chasing, one coherent platform for the whole HSE cycle.",
    trust: ["Less time to log and follow up", "Process transparency", "Fast access to information", "Management reporting", "Better risk control", "Higher HSE-team productivity"],
    fH2: "Manage HSE the smart way",
    fP: "Make your organisation's HSE processes unified, fast and measurable — starting today.",
    fSub: "Quick setup • Simple UI • Web access",
    ftBlurb: "Integrated management of safety, health and environment — for data-driven management of your organisation's HSE processes.",
    ftProduct: "Product", ftCompany: "Company", ftStart: "Get started",
    ftLinks: ["Features", "Modules", "Pricing", "About", "Contact", "Terms & privacy", "Start free", "Sign in"],
    rights: "All rights reserved.",
    heroPh: "A real photo of an industrial site and an HSE officer goes here",
    kpiToday: "Today's safety index",
    mkOpenInc: "Open incidents", mkCritRisk: "Critical risk", mkActions: "Actions",
    mkTrend: "Incident trend — last 7 months", mkActStatus: "Action status",
    mkOpen: "Open", mkInProg: "In progress", mkClosed: "Closed", mkCloseRate: "Close rate",
  },

  de: {
    d1: "1", d7: "7", d3: "3", d12: "12", pct94: "94 %", pct78: "78 %",
    nav: ["Start", "Funktionen", "Module", "Vorteile", "Preise", "Über", "Kontakt"],
    heroEyebrow: "Integriertes HSE-Managementsystem",
    heroH1a: "Intelligentes HSE-Management", heroH1b: "vom Bericht bis zur Entscheidung",
    heroLede: "IHMS ist eine vollständige, integrierte Plattform für das Management von Sicherheit, Gesundheit, Umwelt und HSE-Prozessen Ihrer Organisation. Nutzen Sie echte Daten, um Abläufe zu vereinheitlichen, Risiken zu steuern und fundiertere Entscheidungen zu treffen.",
    ctaPrimary: "Jetzt kostenlos starten", ctaSecondary: "Funktionen ansehen", login: "Anmelden",
    ticks: ["Schnelle Einrichtung", "Web- & Mobilzugriff", "Einheitliches HSE-Management"],
    annTitle: "Eine neue Version von IHMS wurde veröffentlicht", annBody: "Sehen Sie die neuen Funktionen und Verbesserungen.",
    annDate: "09.09.2026", annBtn: "Ankündigung ansehen", annAll: "Alle Ankündigungen ansehen",
    whyEyebrow: "Warum IHMS?", whyH2: "Verwalten Sie jeden HSE-Prozess an einem integrierten Ort",
    whySub: "Von der Felddatenerfassung bis zur Managemententscheidung – alles auf einer kohärenten, zuverlässigen Plattform.",
    why: [
      ["Zentrale HSE-Daten", "Alle Sicherheits-, Gesundheits- und Umweltdaten in einer einheitlichen Datenbank."],
      ["Weniger Papierkram", "Digitale Erfassung, Freigabe und Archivierung – keine Papierformulare, kein manuelles Nachfassen."],
      ["Risikokontrolle & Nachverfolgung", "Risiken identifizieren, bewerten und bis zur wirksamen Kontrolle überwachen."],
      ["Management von Korrekturmaßnahmen", "Maßnahmen zuweisen, terminieren und bis zum vollständigen Abschluss verfolgen."],
      ["Management-Berichte", "Fertige Berichte und Kennzahlen für schnellere Entscheidungen."],
      ["Datenbasierte Entscheidungen", "Echte Trends und Analysen statt verstreuter Eindrücke."],
    ],
    flowEyebrow: "Arbeitsablauf", flowH2: "HSE von der Erfassung bis zur Entscheidung steuern",
    flowSub: "Ein klarer, nachvollziehbarer Weg – vom Feldereignis bis zur Management-Kennzahl.",
    step: "Schritt", stepNo: ["1", "2", "3", "4", "5", "6"],
    flow: [
      ["Daten erfassen", "Vorfälle, Inspektionen, Risiken und unsichere Beobachtungen"],
      ["Prüfen & analysieren", "Muster und Grundursachen erkennen"],
      ["Risiko erkennen", "Risiken bewerten und priorisieren"],
      ["Korrekturmaßnahme", "Kontrollmaßnahmen definieren und zuweisen"],
      ["Nachverfolgung", "Bis zum Abschluss und zur Wirksamkeit überwachen"],
      ["Management-Bericht", "KPI-Dashboard und Entscheidungen"],
    ],
    modEyebrow: "Module", modH2: "Alle benötigten HSE-Werkzeuge in einem System",
    modSub: "Alle Module, die das HSE-Management braucht, auf einer integrierten Plattform.",
    modCats: ["Alle", "Sicherheit", "Gesundheit", "Umwelt", "Management", "Berichte"],
    modMore: "Details",
    mods: [
      ["Vorfälle & Beinaheunfälle", "Vorfälle und Beinaheunfälle erfassen, prüfen und analysieren."],
      ["Risikobewertung", "Gefährdungsermittlung, Bewertung und Kontrolle von Prozess- und Betriebsrisiken."],
      ["Inspektionen & Checklisten", "Regelmäßige und geplante Inspektionen mit Standard-Checklisten."],
      ["Korrekturmaßnahmen", "Korrektur- und Vorbeugemaßnahmen definieren, zuweisen und verfolgen."],
      ["HSE-Schulung", "Kurse planen, Schulungsnachweise und Personalkompetenz."],
      ["Auftragnehmer-Management", "Bewertung, Dokumente und Überwachung der HSE-Leistung von Auftragnehmern."],
      ["Arbeitserlaubnis", "Heißarbeits-, Höhen- und Behältererlaubnisse ausstellen und kontrollieren."],
      ["PSA", "Persönliche Schutzausrüstung verwalten und Personen zuweisen."],
      ["Geräte & Maschinen", "Stammdaten, Inspektion und Wartung von Geräten und Maschinen."],
      ["Besprechungen & Toolbox", "Sicherheitsbesprechungen und Unterweisungen vor der Arbeit dokumentieren."],
      ["Umwelt", "Abfall, Abwasser und Umweltkennzahlen überwachen."],
      ["HSE-Dokumente", "Verfahren, Anweisungen und Systemunterlagen verwalten."],
      ["Personalverwaltung", "Zutritt & Anwesenheit, Kompetenz und arbeitsmedizinische Akten."],
      ["Dashboard & KPI", "Kennzahlen und ein vollständiger Überblick über die HSE-Leistung."],
    ],
    scEyebrow: "Das Produkt", scH2: "Bessere Entscheidungen mit echten Daten",
    scPara: "Ein vollständiger Überblick über die HSE-Leistung Ihrer Organisation auf einem Bildschirm – Kennzahlen, Trends und kritische Punkte auf einen Blick.",
    scFeat: [
      ["Management-Dashboard", "Kennzahlen und der Live-Status jedes Moduls."],
      ["Analytische Berichte", "Trends zu Vorfällen, Risiken und Maßnahmen mit Filter und Export."],
      ["HSE-KPI-Kontrolle", "KPIs überwachen und bei Abweichungen benachrichtigt werden."],
    ],
    scBtn: "Produkt ansehen", scCaption: "IHMS · Management-Dashboard (Beispiel)",
    mbEyebrow: "Mobile App", mbH2: "HSE immer griffbereit",
    mbPara: "Erfassen und verfolgen Sie HSE-Prozesse vom Arbeitsplatz, der Baustelle und dem Feld.",
    mbFeat: [
      ["Schnelle Meldung", "Vorfall, unsichere Beobachtung oder Inspektion in Sekunden erfassen."],
      ["Aufgaben sehen", "Eine persönliche Liste mit Priorität und Fälligkeit je Eintrag."],
      ["Maßnahmen verfolgen", "Status der Korrekturmaßnahmen bis zum Abschluss."],
    ],
    mbTag: "Android-App",
    phHome: "Start", phWelcome: "Willkommen 👋", phTasks: "Ihre Aufgaben heute",
    phList: ["Unsicheren Zustand melden", "Tägliche Gerüstinspektion", "Korrekturmaßnahme #12 verfolgen"],
    prEyebrow: "Preise", prH2: "Wählen Sie den passenden Plan für Ihre Organisation",
    prMonthly: "Monatlich", prYearly: "Jährlich", prSave: "Zwei Monate gratis bei Jahresabrechnung",
    prBadge: "Am beliebtesten", prUnitM: "/ Monat", prUnitY: "/ Jahr", prCustom: "Individuell",
    prNote: "Kostenlos starten – ohne Vorabverpflichtung",
    plans: [
      ["Basis", "Für kleine Teams", "—", "—", ["Kern-Sicherheitsmodule", "Vorfall- & Inspektionserfassung", "Korrekturmaßnahmen", "Standardberichte", "E-Mail-Support"]],
      ["Professional", "Für Unternehmen und mittlere Organisationen", "—", "—", ["Alle Systemmodule", "Risikobewertung & Arbeitserlaubnis", "Auftragnehmer-Management & Schulung", "Management-Dashboard & KPI", "Mobile App", "Priorisierter Support"]],
      ["Enterprise", "Für große Organisationen", "Individuell", "Individuell", ["Alles aus Professional", "Mehrere Firmen / Standorte", "Erweiterte Rollen & Berechtigungen", "Integration & API", "Dedizierte Bereitstellung", "Dedizierter Support-Manager"]],
    ],
    trEyebrow: "Warum Teams IHMS wählen", trH2: "Ein System; ein vollständiges Bild der HSE-Leistung",
    trSub: "Statt verstreuter Dateien und manuellem Nachfassen – eine kohärente Plattform für den gesamten HSE-Zyklus.",
    trust: ["Weniger Zeit für Erfassung und Nachverfolgung", "Prozesstransparenz", "Schneller Zugriff auf Informationen", "Management-Berichte", "Bessere Risikokontrolle", "Höhere Produktivität des HSE-Teams"],
    fH2: "HSE intelligent verwalten",
    fP: "Machen Sie die HSE-Prozesse Ihrer Organisation ab heute einheitlich, schnell und messbar.",
    fSub: "Schnelle Einrichtung • Einfache Oberfläche • Webzugriff",
    ftBlurb: "Integriertes Management von Sicherheit, Gesundheit und Umwelt – für ein datenbasiertes Management Ihrer HSE-Prozesse.",
    ftProduct: "Produkt", ftCompany: "Unternehmen", ftStart: "Loslegen",
    ftLinks: ["Funktionen", "Module", "Preise", "Über", "Kontakt", "AGB & Datenschutz", "Kostenlos starten", "Anmelden"],
    rights: "Alle Rechte vorbehalten.",
    heroPh: "Hier steht ein echtes Foto einer Industrieanlage und einer HSE-Fachkraft",
    kpiToday: "Sicherheitsindex heute",
    mkOpenInc: "Offene Vorfälle", mkCritRisk: "Kritisches Risiko", mkActions: "Maßnahmen",
    mkTrend: "Vorfall-Trend – letzte 7 Monate", mkActStatus: "Maßnahmenstatus",
    mkOpen: "Offen", mkInProg: "In Bearbeitung", mkClosed: "Geschlossen", mkCloseRate: "Abschlussquote",
  },
};

const LANG_OPTIONS = [
  { code: "fa", label: "فارسی" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];

function IcoBox({ icon: Icon, tint = C.tealSoft, color = C.tealDeep, size = 46 }) {
  return (
    <span className="ico" style={{ width: size, height: size, background: tint, color }}>
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.1} />
    </span>
  );
}

function DashMock({ x, compact }) {
  const bars = [42, 68, 30, 88, 54, 72, 46];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[[x.mkOpenInc, x.d7, C.amber], [x.mkCritRisk, x.d3, "#e05c5c"], [x.mkActions, x.d12, C.tealDeep]].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1, background: C.bgSoft, borderRadius: 10, padding: "8px 9px" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 8.5, color: C.ink3, marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgSoft, borderRadius: 10, padding: "10px 10px 8px" }}>
        <div style={{ fontSize: 9, color: C.ink3, marginBottom: 8 }}>{x.mkTrend}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: compact ? 46 : 60 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i === 3 ? C.tealDeep : "#bfe3df" }} />
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: C.bgSoft, borderRadius: 10, padding: "9px 10px" }}>
            <div style={{ fontSize: 9, color: C.ink3, marginBottom: 6 }}>{x.mkActStatus}</div>
            {[[x.mkOpen, 40, C.amber], [x.mkInProg, 35, C.tealDeep], [x.mkClosed, 25, C.good]].map(([l, w, c]) => (
              <div key={l} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 8, color: C.ink3, display: "flex", justifyContent: "space-between" }}><span>{l}</span><span>{w}%</span></div>
                <div style={{ height: 4, background: "#e4ecf1", borderRadius: 4, marginTop: 2 }}>
                  <div style={{ width: `${w}%`, height: "100%", background: c, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: 84, background: C.bgSoft, borderRadius: 10, padding: "9px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.ink3, marginBottom: 6 }}>{x.mkCloseRate}</div>
            <div style={{
              width: 46, height: 46, borderRadius: "50%", margin: "0 auto",
              background: `conic-gradient(${C.tealDeep} 0 78%, #e4ecf1 78% 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: C.ink }}>{x.pct78}</div>
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
  const { lang, setLang } = useLanguage();
  const x = L[lang] || L.fa;
  const dir = lang === "fa" ? "rtl" : "ltr";
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [scrolled, setScrolled] = useState(false);
  const [mNav, setMNav] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [modCat, setModCat] = useState(0);
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
  const NAV_IDS = ["top", "features", "modules", "benefits", "pricing", "about", "contact"];

  const ann = Array.isArray(announcements) && announcements.length > 0 ? announcements[0] : null;
  const shownIdx = MODULES_IDX.filter((i) => modCat === 0 || CAT_INDEX[MOD_CATS_KEYS[i]] === modCat);

  const langSwitch = (
    <label className="langsw">
      <Globe className="glb" size={14} />
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
        {LANG_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
      </select>
      <svg className="cv" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </label>
  );

  return (
    <div className="ihms-lp" dir={dir} ref={rootRef}>
      <style>{LP_CSS}</style>

      {/* HEADER */}
      <header className={"hdr" + (scrolled ? " scrolled" : "")} id="lp-top">
        <div className="wrap">
          <div className="row">
            <a href="#lp-top" onClick={(e) => { e.preventDefault(); go("top"); }} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={logoUrl || `${import.meta.env.BASE_URL}logo.png`} alt="IHMS" width={34} height={34} style={{ objectFit: "contain" }} />
              <span style={{ fontWeight: 900, fontSize: 18, color: C.navy, letterSpacing: "-.01em" }}>IHMS</span>
            </a>
            <nav className="nav">
              {x.nav.map((label, i) => (
                <a key={i} href={"#lp-" + NAV_IDS[i]} onClick={(e) => { e.preventDefault(); go(NAV_IDS[i]); }}>{label}</a>
              ))}
            </nav>
            <span className="spacer" />
            {langSwitch}
            <button type="button" className="link-login" onClick={onUserLogin}>{x.login}</button>
            <button type="button" className="btn btn-primary" style={{ padding: "11px 18px", fontSize: 13.5 }} onClick={onStartFree}>
              {x.ctaPrimary}
            </button>
            <button type="button" className="hamb" aria-label="menu" onClick={() => setMNav((v) => !v)}>
              {mNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <div className={"mnav" + (mNav ? " open" : "")}>
          <div className="wrap">
            {x.nav.map((label, i) => (
              <a key={i} href={"#lp-" + NAV_IDS[i]} onClick={(e) => { e.preventDefault(); go(NAV_IDS[i]); }}>{label}</a>
            ))}
            <div style={{ marginTop: 10 }}>{langSwitch}</div>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMNav(false); onUserLogin(); }}>{x.login}</button>
            <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setMNav(false); onStartFree(); }}>{x.ctaPrimary}</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="hero-grid">
            <div data-rv>
              <span className="eyebrow">{x.heroEyebrow}</span>
              <h1>{x.heroH1a}<span className="accent">{x.heroH1b}</span></h1>
              <p className="lede">{x.heroLede}</p>
              <div className="cta">
                <button type="button" className="btn btn-primary btn-lg" onClick={onStartFree}>{x.ctaPrimary}</button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => go("features")}>{x.ctaSecondary}</button>
              </div>
              <div className="ticks">
                {x.ticks.map((tk) => <span key={tk}><Check size={15} color={C.tealDeep} /> {tk}</span>)}
              </div>
            </div>

            <div className="hero-visual" data-rv>
              <div className="hero-photo">
                {heroImageUrl
                  ? <img src={heroImageUrl} alt="HSE" />
                  : (<><div className="grid-lines" /><div className="ph">{x.heroPh}</div></>)}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(8,26,39,.05),rgba(8,26,39,.35))" }} />
              </div>
              <div className="mock dash"><DashMock x={x} /></div>
              <div className="mock kpi">
                <div style={{ fontSize: 9.5, color: C.ink3 }}>{x.kpiToday}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.tealDeep, fontVariantNumeric: "tabular-nums" }}>{x.pct94}</div>
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
              <b>{ann?.title || x.annTitle}</b>{"  "}— {ann?.body || x.annBody}
            </div>
            <span className="date">{ann?.dateLabel || x.annDate}</span>
            <button type="button" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12.5 }} onClick={onStartFree}>{x.annBtn}</button>
            <a href="#lp-top" onClick={(e) => { e.preventDefault(); go("top"); }} style={{ fontSize: 12, fontWeight: 800, color: C.tealDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {x.annAll} <Arrow size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* WHY / FEATURES */}
      <section id="lp-features">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">{x.whyEyebrow}</span>
            <h2 className="h2">{x.whyH2}</h2>
            <p className="sub">{x.whySub}</p>
          </div>
          <div className="g3" style={{ marginTop: 40 }}>
            {x.why.map(([t, d], i) => (
              <div key={t} className="card hoverable" style={{ padding: 22 }} data-rv>
                <IcoBox icon={WHY_ICONS[i]} />
                <div style={{ fontSize: 15.5, fontWeight: 800, color: C.ink, margin: "14px 0 6px" }}>{t}</div>
                <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.85 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="showcase">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">{x.flowEyebrow}</span>
            <h2 className="h2">{x.flowH2}</h2>
            <p className="sub">{x.flowSub}</p>
          </div>
          <div className="flow">
            {x.flow.map(([t, d], i) => (
              <React.Fragment key={t}>
                <div className="step" data-rv>
                  <div className="sIco">{React.createElement(FLOW_ICONS[i], { size: 22, strokeWidth: 2.1 })}</div>
                  <div className="num">{x.step} {x.stepNo[i]}</div>
                  <div className="sT">{t}</div>
                  <div className="sD">{d}</div>
                </div>
                {i < x.flow.length - 1 && <div className="arrow"><Arrow size={18} /></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="lp-modules">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">{x.modEyebrow}</span>
            <h2 className="h2">{x.modH2}</h2>
            <p className="sub">{x.modSub}</p>
          </div>
          <div className="chips" data-rv>
            {x.modCats.map((label, i) => (
              <button key={label} type="button" className={"chip" + (modCat === i ? " on" : "")} onClick={() => setModCat(i)}>{label}</button>
            ))}
          </div>
          <div className="g4">
            {shownIdx.map((i) => (
              <div key={i} className="card hoverable mcard" data-rv>
                <IcoBox icon={MOD_ICONS[i]} size={42} />
                <div className="mT">{x.mods[i][0]}</div>
                <div className="mD">{x.mods[i][1]}</div>
                <span className="more">{x.modMore} <Arrow size={13} /></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="showcase" id="lp-benefits">
        <div className="wrap">
          <div className="g2">
            <div data-rv>
              <span className="eyebrow">{x.scEyebrow}</span>
              <h2 className="h2">{x.scH2}</h2>
              <p style={{ fontSize: 14, color: C.ink2, margin: "12px 0 8px" }}>{x.scPara}</p>
              <div style={{ marginTop: 8 }}>
                {x.scFeat.map(([t, d], i) => (
                  <div key={t} className="feat">
                    <IcoBox icon={[LayoutDashboard, BarChart3, Gauge][i]} size={40} />
                    <div><div className="fT">{t}</div><div className="fD">{d}</div></div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 20 }} onClick={onStartFree}>{x.scBtn}</button>
            </div>
            <div className="bigmock" data-rv>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#e05c5c" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.amber }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.good }} />
                <span style={{ marginInlineStart: "auto", fontSize: 10, color: C.ink3 }}>{x.scCaption}</span>
              </div>
              <DashMock x={x} />
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE APP */}
      <section>
        <div className="wrap">
          <div className="g2">
            <div className="center" data-rv style={{ order: 2 }}>
              <div className="phone">
                <div className="screen" style={{ background: C.navyDeep, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 2px" }}>{x.phHome}</div>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.ink }}>{x.phWelcome}</div>
                    <div style={{ fontSize: 8, color: C.ink3, marginTop: 3 }}>{x.phTasks}</div>
                  </div>
                  {x.phList.map((tk, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "9px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={11} color={C.tealDeep} />
                      </span>
                      <span style={{ fontSize: 9, color: C.ink2, flex: 1 }}>{tk}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: "auto", background: "#0e2c3f", borderRadius: 12, display: "flex", justifyContent: "space-around", padding: "8px 4px" }}>
                    {[LayoutDashboard, ListChecks, Boxes, Bell].map((I, i) => <I key={i} size={14} color={i === 0 ? C.teal : "rgba(255,255,255,.5)"} />)}
                  </div>
                </div>
              </div>
            </div>
            <div data-rv style={{ order: 1 }}>
              <span className="eyebrow">{x.mbEyebrow}</span>
              <h2 className="h2">{x.mbH2}</h2>
              <p style={{ fontSize: 14, color: C.ink2, margin: "12px 0 10px" }}>{x.mbPara}</p>
              {x.mbFeat.map(([t, d], i) => (
                <div key={t} className="feat">
                  <IcoBox icon={[Zap, ListChecks, ClipboardCheck][i]} size={40} tint={C.bgTint} />
                  <div><div className="fT">{t}</div><div className="fD">{d}</div></div>
                </div>
              ))}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 12.5, fontWeight: 800, color: C.tealDeep }}>
                <Smartphone size={16} /> {x.mbTag}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="showcase" id="lp-pricing">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">{x.prEyebrow}</span>
            <h2 className="h2">{x.prH2}</h2>
            <div className="toggle">
              <button type="button" className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>{x.prMonthly}</button>
              <button type="button" className={yearly ? "on" : ""} onClick={() => setYearly(true)}>{x.prYearly}</button>
            </div>
            <div className="save">{x.prSave}</div>
          </div>
          <div className="price-grid">
            {x.plans.map(([name, forWho, m, y, features], i) => {
              const price = yearly ? y : m;
              const showUnit = price !== x.prCustom && price !== "—";
              return (
                <div key={name} className={"card plan" + (i === 1 ? " pop" : "")} data-rv>
                  {i === 1 && <span className="badge">{x.prBadge}</span>}
                  <div className="pName">{name}</div>
                  <div className="pFor">{forWho}</div>
                  <div className="pPrice">{price}{showUnit && <small> {yearly ? x.prUnitY : x.prUnitM}</small>}</div>
                  <ul>
                    {features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}
                  </ul>
                  <button type="button" className={"btn " + (i === 1 ? "btn-primary" : "btn-ghost")} style={{ marginTop: "auto" }} onClick={onStartFree}>
                    {x.ctaPrimary}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="center" style={{ fontSize: 12.5, color: C.ink3, marginTop: 22 }}>{x.prNote}</p>
        </div>
      </section>

      {/* TRUST */}
      <section id="lp-about">
        <div className="wrap">
          <div className="center" data-rv>
            <span className="eyebrow">{x.trEyebrow}</span>
            <h2 className="h2">{x.trH2}</h2>
            <p className="sub">{x.trSub}</p>
          </div>
          <div className="g3" style={{ marginTop: 38 }}>
            {x.trust.map((t, i) => (
              <div key={t} className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }} data-rv>
                <IcoBox icon={TRUST_ICONS[i]} size={42} tint={C.bgTint} />
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="lp-contact" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="final" data-rv>
            <div className="grid-lines" />
            <h2>{x.fH2}</h2>
            <p>{x.fP}</p>
            <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 24, position: "relative" }} onClick={onStartFree}>{x.ctaPrimary}</button>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.7)", position: "relative" }}>{x.fSub}</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ftr">
        <div className="wrap">
          <div className="cols">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src={logoUrl || `${import.meta.env.BASE_URL}logo.png`} alt="IHMS" width={30} height={30} style={{ objectFit: "contain" }} />
                <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>IHMS</span>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 2, maxWidth: 320 }}>{(systemName ? systemName + " — " : "") + x.ftBlurb}</p>
            </div>
            <div>
              <h4>{x.ftProduct}</h4>
              <a href="#lp-features" onClick={(e) => { e.preventDefault(); go("features"); }}>{x.ftLinks[0]}</a>
              <a href="#lp-modules" onClick={(e) => { e.preventDefault(); go("modules"); }}>{x.ftLinks[1]}</a>
              <a href="#lp-pricing" onClick={(e) => { e.preventDefault(); go("pricing"); }}>{x.ftLinks[2]}</a>
            </div>
            <div>
              <h4>{x.ftCompany}</h4>
              <a href="#lp-about" onClick={(e) => { e.preventDefault(); go("about"); }}>{x.ftLinks[3]}</a>
              <a href="#lp-contact" onClick={(e) => { e.preventDefault(); go("contact"); }}>{x.ftLinks[4]}</a>
              <a href="#lp-about" onClick={(e) => { e.preventDefault(); go("about"); }}>{x.ftLinks[5]}</a>
            </div>
            <div>
              <h4>{x.ftStart}</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); onStartFree(); }}>{x.ftLinks[6]}</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onUserLogin(); }}>{x.ftLinks[7]}</a>
            </div>
          </div>
          <div className="base">
            <span>© {new Date().getFullYear()} IHMS — {x.rights}</span>
            <span>Integrated HSE Management System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
