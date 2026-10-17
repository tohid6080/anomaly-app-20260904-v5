// public/proposal/proposal.js
// صفحه‌ی مستقلِ پرپوزال تبلیغاتی IHMS — خارج از باندلِ React، دقیقاً مثل
// public/demo/index.html و public/get/index.html (صفر تغییر در روتینگ/
// App.jsx). تمامِ محتوا بر اساسِ ماژول‌های واقعاً فعالِ IHMS (HSE_MODULES +
// PLAN_FEATURES) نوشته شده — نه ادعای ماژولِ غیرفعال.

(function () {
  "use strict";

  var SUPABASE_URL = "https://zmmxiyqlwkqjzghbcydi.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_pvobGcp2snOD3oFTX2LVMg_bZx2A9CR";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAFJiYjxJMsOEXaUK";
  var LANG_KEY = "ihms_proposal_lang";

  /* ---------------- آیکون‌های سبک، بدونِ وابستگیِ تازه ---------------- */
  function icon(name) {
    var p = {
      scatter: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 15l6 5M20 15l-6 5"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 14 2 2 4-4"/>',
      repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
      eyeoff: '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.26 9.26 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
      layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      hardhat: '<path d="M2 18a10 10 0 1 1 20 0Z"/><path d="M10 10V5a2 2 0 0 1 4 0v5"/><line x1="2" y1="18" x2="22" y2="18"/>',
      grad: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>',
      chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
      message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
      check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>',
      map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>',
      box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      gauge: '<path d="M12 13V3"/><path d="m8.5 16.5 2-2"/><circle cx="12" cy="16" r="6"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (p[name] || p.box) + "</svg>";
  }

  /* ---------------- دیکشنریِ متن‌هایِ ثابت (fa/en) ---------------- */
  var T = {
    fa: {
      navChallenges: "چالش‌ها", navSolution: "راهکار", navDemo: "دمو", navAudience: "مخاطبان", navValue: "ارزش اقتصادی", navStart: "شروع همکاری",
      shareCopy: "کپیِ لینک", shareEmail: "ارسال با ایمیل",
      heroEyebrow: "سامانهٔ هوشمند مدیریت HSE",
      heroTitle: 'یکپارچه‌سازیِ ایمنی، بهداشت و محیط‌زیست در <span>یک سامانهٔ واحد</span>',
      heroLead: "IHMS اطلاعات، فرایندها و پیگیری‌هایِ HSE را — از ثبتِ یک آنومالی تا ارزیابیِ عملکردِ پیمانکاران — در یک بسترِ واحد، آفلاین-محور و چندشرکتی کنار هم می‌آورد.",
      heroCtaDemo: "مشاهده دمو", heroCtaConsult: "درخواست مشاوره",
      heroStat1: "ماژولِ عملیاتیِ فعال", heroStat2Big: "آفلاین", heroStat2: "ثبتِ اطلاعات بدونِ نیاز به اینترنتِ پیوسته",
      heroStat3Big: "چندشرکتی", heroStat3: "جداسازیِ کاملِ اطلاعاتِ هر شرکت",
      heroImageCaption: "نمایی واقعی از اپلیکیشنِ موبایلِ IHMS",
      chEyebrow: "چالش‌های سازمان‌ها", chTitle: "مدیریتِ HSE، بدونِ یک سامانهٔ یکپارچه، کجا پیچیده می‌شود؟",
      chSub: "این‌ها مسائلی هستند که اغلب سازمان‌هایِ صنعتی و پروژه‌محور، با هر سطحِ بلوغِ HSE، کم‌وبیش با آن‌ها مواجه‌اند.",
      solEyebrow: "راهکار IHMS", solTitle: "یک بسترِ واحد برایِ کلِ گردشِ کارِ HSE",
      solSub: "به‌جایِ فایل‌هایِ پراکنده و پیگیریِ تلفنی، هر مرحله — از ثبت تا تاییدِ نهایی — در یک سامانه با نقش و دسترسیِ مشخص انجام می‌شود.",
      demoEyebrow: "دموی واقعی سامانه", demoTitle: "با امکاناتِ واقعی و فعالِ IHMS آشنا شوید",
      demoSub: "دموی زیر همان مرکزِ دموی زنده و تعاملیِ IHMS است — با اطلاعاتِ نمونه، بدونِ نمایشِ هیچ دادهٔ واقعیِ کاربران. می‌توانید مستقیماً از همین‌جا پیمانکار/کارفرما/شرکتِ مستقل/کارشناسِ HSE را انتخاب کنید و ماژول‌ها را قدم‌به‌قدم ببینید.",
      demoFrameLabel: "ihmsapp.ir/demo", demoOpenFull: "باز کردن در صفحهٔ کامل",
      audEyebrow: "ارزش IHMS برای هر گروه", audTitle: "هر نقش، مسیرِ کاربردیِ خودش را می‌بیند",
      audSub: "یکی از چهار مسیر را انتخاب کنید تا امکاناتِ فعالِ مرتبط با همان نقش را ببینید.",
      valEyebrow: "ارزش اقتصادی و مزایای سازمانی", valTitle: "برآوردِ زمانِ قابلِ صرفه‌جویی — بر اساسِ ورودی‌هایِ خودِ شما",
      valSub: "این ابزار فقط یک محاسبه‌گرِ شفاف است: هر عدد و هر فرض، مستقیماً از رویِ ورودی‌هایِ شما ساخته می‌شود — نه یک آمارِ ثابت یا تاییدنشده.",
      valF1: "تعدادِ پیمانکاران/واحدهایِ فعال", valF2: "ساعاتِ هفتگیِ صرف‌شده برایِ پیگیریِ دستیِ اطلاعاتِ HSE (توسطِ کارشناس/سرپرست)",
      valF3: "هزینهٔ ساعتیِ تقریبیِ کارشناس/سرپرست HSE (اختیاری، برایِ برآوردِ ریالی)",
      valF4: "فرضِ شما: چه درصدی از این پیگیریِ دستی با یکپارچه‌سازیِ اطلاعات کاهش می‌یابد؟",
      valResultLabel: "برآوردِ زمانِ آزادشدهٔ کارشناس/سرپرست در ماه", valResultCost: "برآوردِ ارزشِ ریالی (در صورتِ واردکردنِ نرخِ ساعتی)",
      valDisclaimer: "این عدد صرفاً یک برآورد بر پایهٔ ورودی‌ها و فرضِ انتخابیِ شماست، نه یک آمارِ تاییدشده یا وعدهٔ قطعیِ IHMS. نتیجهٔ واقعی در هر سازمان متفاوت است.",
      stepsEyebrow: "نحوهٔ شروعِ همکاری", stepsTitle: "فرایندِ شروعِ استفاده از IHMS",
      stepsSub: "همان مسیری که امروز هم برایِ شرکت‌هایِ جدید فعال است — بدونِ هیچ مرحلهٔ فرضی یا ارائه‌نشده.",
      stepsCardTitle: "دسترسیِ مستقیم به دورهٔ آزمایشیِ ۳۰روزه",
      stepsCardBody: "ثبت‌نامِ خودسرویس در وب‌سایتِ اصلیِ IHMS، یک شرکتِ آزمایشیِ ۳۰روزه با دسترسیِ کاملِ ماژول‌هایِ فعال برایِ شما می‌سازد — بدونِ نیاز به تاییدِ دستیِ ما.",
      stepsCardCta: "شروعِ ثبت‌نامِ رایگان",
      ctaTitle: "آمادهٔ شروعِ همکاری با IHMS هستید؟",
      ctaSub: "همین حالا دمو را ببینید، یا یکی از درخواست‌هایِ زیر را ثبت کنید — تیمِ IHMS در کوتاه‌ترین زمان با شما در ارتباط خواهد بود.",
      ctaBtnDemo: "مشاهدهٔ دمو", ctaBtnConsult: "درخواستِ جلسهٔ معرفی", ctaBtnPartner: "ثبتِ درخواستِ همکاری", ctaBtnPricing: "دریافتِ پیشنهادِ قیمت",
      lfTitle: "ثبتِ درخواست", lfSub: "اطلاعاتِ شما فقط برایِ پیگیریِ همین درخواست استفاده می‌شود.",
      rtConsult: "جلسهٔ معرفی", rtPartner: "درخواستِ همکاری", rtPricing: "پیشنهادِ قیمت",
      lfName: "نام و نام خانوادگی *", lfCompany: "نامِ سازمان *", lfPosition: "سمت", lfAudience: "نوعِ مخاطب",
      lfAudSelect: "انتخاب کنید", lfAudEmployer: "کارفرما", lfAudContractor: "پیمانکار", lfAudStandalone: "شرکتِ مستقل", lfAudHse: "کارشناسِ HSE",
      lfPhone: "شماره تماس *", lfEmail: "ایمیل", lfMessage: "توضیحِ تکمیلی", lfSubmit: "ارسالِ درخواست",
      lfErrRequired: "نام، نامِ سازمان و شماره‌ی تماس اجباری‌اند.", lfErrRequestType: "لطفاً نوعِ درخواست را انتخاب کنید.",
      lfErrCaptcha: "لطفاً تأییدِ «ربات‌نبودن» را کامل کنید.", lfErrServer: "ثبتِ درخواست ناموفق بود — لطفاً دوباره تلاش کنید.",
      lfErrNetwork: "ارتباط با سرور برقرار نشد — اتصالِ اینترنتِ خود را بررسی کنید.",
      lfOk: "درخواستِ شما با موفقیت ثبت شد. تیمِ IHMS به‌زودی با شما تماس می‌گیرد.",
      printContactTitle: "ثبتِ درخواست",
      printContactBody: "برایِ مشاهدهٔ دموی زنده یا ثبتِ درخواستِ مشاوره/همکاری/قیمت، به نسخهٔ آنلاینِ این پرپوزال به آدرسِ ihmsapp.ir/proposal/ مراجعه کنید، یا با شمارهٔ +۹۸ ۹۲۲ ۰۹۳ ۹۶۸۲ و آیدیِ تلگرامِ ihmsapp@ در تماس باشید.",
      ftrCopyright: "© IHMS — سامانهٔ هوشمند مدیریت HSE", ftrMainSite: "صفحهٔ اصلیِ IHMS",
    },
    en: {
      navChallenges: "Challenges", navSolution: "Solution", navDemo: "Demo", navAudience: "Audiences", navValue: "Economic Value", navStart: "Get Started",
      shareCopy: "Copy link", shareEmail: "Share by email",
      heroEyebrow: "Intelligent HSE Management System",
      heroTitle: 'Bringing Health, Safety and Environment together in <span>one unified platform</span>',
      heroLead: "IHMS brings HSE data, workflows and follow-ups — from logging a single anomaly to evaluating contractor performance — into one offline-first, multi-company platform.",
      heroCtaDemo: "View the demo", heroCtaConsult: "Request a consultation",
      heroStat1: "active operational modules", heroStat2Big: "Offline", heroStat2: "record data without a constant internet connection",
      heroStat3Big: "Multi-company", heroStat3: "complete data isolation per company",
      heroImageCaption: "A real view of the IHMS mobile app",
      chEyebrow: "Organizational challenges", chTitle: "Where HSE management gets complicated without one integrated system",
      chSub: "These are issues most industrial, project-driven organizations run into, regardless of their current HSE maturity.",
      solEyebrow: "The IHMS solution", solTitle: "One platform for the entire HSE workflow",
      solSub: "Instead of scattered files and phone-based follow-ups, every step — from logging to final approval — happens in one system with clear roles and access.",
      demoEyebrow: "A real system demo", demoTitle: "Explore IHMS's real, active capabilities",
      demoSub: "The demo below is the same live, interactive IHMS demo center — using sample data only, never real user data. Pick Employer / Contractor / Standalone company / HSE expert and walk through the modules step by step.",
      demoFrameLabel: "ihmsapp.ir/demo", demoOpenFull: "Open full page",
      audEyebrow: "IHMS value for each audience", audTitle: "Each role sees its own relevant path",
      audSub: "Pick one of the four tracks to see the active capabilities relevant to that role.",
      valEyebrow: "Economic value & organizational benefits", valTitle: "An estimate of potential time savings — based on your own inputs",
      valSub: "This is simply a transparent calculator: every number and assumption comes directly from what you enter — not a fixed or unverified statistic.",
      valF1: "Number of active contractors / units", valF2: "Weekly hours spent on manual HSE follow-up (by the expert/supervisor)",
      valF3: "Approximate hourly cost of the HSE expert/supervisor (optional, for a monetary estimate)",
      valF4: "Your assumption: what share of this manual follow-up would centralized data remove?",
      valResultLabel: "Estimated expert/supervisor time freed per month", valResultCost: "Estimated monetary value (if an hourly rate is entered)",
      valDisclaimer: "This number is only an estimate based on your own inputs and chosen assumption — not a verified statistic or a guarantee from IHMS. Actual results vary by organization.",
      stepsEyebrow: "How to get started", stepsTitle: "The process of starting with IHMS",
      stepsSub: "The exact same path already active today for new companies — no hypothetical or unavailable step.",
      stepsCardTitle: "Direct access to a 30-day trial",
      stepsCardBody: "Self-service sign-up on the main IHMS website creates a 30-day trial company with full access to the active modules — no manual approval needed from our side.",
      stepsCardCta: "Start the free sign-up",
      ctaTitle: "Ready to get started with IHMS?",
      ctaSub: "View the demo right now, or submit one of the requests below — the IHMS team will reach out as soon as possible.",
      ctaBtnDemo: "View the demo", ctaBtnConsult: "Request an introduction meeting", ctaBtnPartner: "Submit a partnership request", ctaBtnPricing: "Get a price quote",
      lfTitle: "Submit a request", lfSub: "Your information is used only to follow up on this request.",
      rtConsult: "Introduction meeting", rtPartner: "Partnership request", rtPricing: "Price quote",
      lfName: "Full name *", lfCompany: "Company name *", lfPosition: "Position", lfAudience: "Audience type",
      lfAudSelect: "Select", lfAudEmployer: "Employer", lfAudContractor: "Contractor", lfAudStandalone: "Standalone company", lfAudHse: "HSE expert",
      lfPhone: "Phone *", lfEmail: "Email", lfMessage: "Additional notes", lfSubmit: "Send request",
      lfErrRequired: "Full name, company name and phone are required.", lfErrRequestType: "Please choose a request type.",
      lfErrCaptcha: "Please complete the \"I'm not a robot\" check.", lfErrServer: "The request could not be submitted — please try again.",
      lfErrNetwork: "Could not reach the server — check your internet connection.",
      lfOk: "Your request was submitted successfully. The IHMS team will contact you soon.",
      printContactTitle: "Submit a request",
      printContactBody: "To view the live demo or submit a consultation/partnership/pricing request, visit the online version of this proposal at ihmsapp.ir/proposal/, or reach us at +98 922 093 9682 or Telegram @ihmsapp.",
      ftrCopyright: "© IHMS — Intelligent HSE Management System", ftrMainSite: "IHMS main site",
    },
  };

  /* ---------------- محتوایِ بخش‌ها (بر اساسِ ماژول‌هایِ واقعاً فعال) ---------------- */
  var CHALLENGES = {
    fa: [
      { icon: "scatter", title: "پراکندگیِ اطلاعات و مستندات", body: "پرونده‌هایِ پرسنل، گزارش‌هایِ آنومالی و مستنداتِ ایمنی در فایل‌ها و مکالماتِ جداگانه نگه‌داری می‌شوند، نه یک منبعِ واحد." },
      { icon: "users", title: "مدیریتِ هم‌زمانِ چند پیمانکار", body: "هر پیمانکار سطحِ متفاوتی از انضباطِ مستندسازی دارد و تجمیعِ وضعیتِ همهٔ آن‌ها برایِ کارفرما زمان‌بر می‌شود." },
      { icon: "repeat", title: "دشواریِ پیگیریِ اقداماتِ اصلاحی", body: "بدونِ یک گردشِ کارِ مشخص، اقداماتِ اصلاحیِ بازمانده یا دیرکرده به‌سختی قابلِ ردیابی‌اند." },
      { icon: "clipboard", title: "دوباره‌کاریِ کارشناسانِ HSE", body: "جمع‌آوریِ دستیِ اطلاعات برایِ گزارش‌هایِ دوره‌ای، زمانِ قابل‌توجهی از کارِ تحلیلی و میدانیِ کارشناس می‌گیرد." },
      { icon: "eyeoff", title: "نبودِ دسترسیِ منظم به اطلاعاتِ مدیریتی", body: "مدیریت برایِ دیدنِ یک تصویرِ به‌روز از وضعیتِ HSE، باید منتظرِ گزارشِ دستیِ بعدی بماند." },
      { icon: "layers", title: "ناهماهنگیِ بینِ ماژول‌هایِ مرتبط", body: "ارتباطِ بینِ یک آنومالی، اقدامِ اصلاحیِ آن و ارزیابیِ نهاییِ پیمانکار، بدونِ یک سامانهٔ یکپارچه به‌سختی حفظ می‌شود." },
    ],
    en: [
      { icon: "scatter", title: "Scattered data and documentation", body: "Personnel records, anomaly reports and safety documents live in separate files and conversations, not one source of truth." },
      { icon: "users", title: "Managing many contractors at once", body: "Each contractor has a different level of documentation discipline, making it slow for the employer to get one combined picture." },
      { icon: "repeat", title: "Hard to track corrective actions", body: "Without a defined workflow, overdue or open corrective actions are difficult to trace." },
      { icon: "clipboard", title: "Duplicate work for HSE experts", body: "Manually gathering data for periodic reports takes significant time away from field and analytical work." },
      { icon: "eyeoff", title: "No regular access to management-level data", body: "Management has to wait for the next manual report to see an up-to-date picture of HSE status." },
      { icon: "layers", title: "Disconnected related modules", body: "The link between an anomaly, its corrective action and the contractor's final evaluation is hard to maintain without one integrated system." },
    ],
  };

  var SOLUTIONS = {
    fa: [
      { icon: "clipboard", title: "ثبت و پیگیریِ عدم‌انطباق‌ها", body: "ثبتِ آنومالی با شمارهٔ پیگیریِ خودکار، دسته‌بندیِ قابل‌تایید، و زنجیرهٔ شفافِ اقدامِ اصلاحی تا بسته‌شدنِ نهایی." },
      { icon: "shield", title: "ارزیابیِ ریسک یکپارچه", body: "BowTie، HCMS، JHA و FMEA در یک ماژول، برایِ تحلیل و کنترلِ ریسک‌هایِ عملیاتی." },
      { icon: "users", title: "ارزیابیِ عملکردِ پیمانکاران", body: "امتیازدهیِ وزن‌دار بر اساسِ ده دسته‌یِ واقعی — از آنومالی و اقدامِ اصلاحی تا آموزش، ماشین‌آلات، PPE و شاخص‌هایِ Proactive." },
      { icon: "hardhat", title: "پرسنل، ماشین‌آلات و داربست", body: "مدیریتِ تردد و مدارکِ پرسنل، وضعیتِ بازرسی و بیمهٔ ماشین‌آلات، و تگ‌هایِ وضعیتِ داربست در یک‌جا." },
      { icon: "calendar", title: "صدورِ مجوزِ کار و PSSR", body: "گردشِ کارِ امضایِ دیجیتالِ مجوزِ کار، و بازبینیِ ایمنیِ پیش از راه‌اندازیِ تاسیساتِ جدید." },
      { icon: "gauge", title: "شاخص‌هایِ Proactive HSE", body: "امتیازِ استعدادِ حادثهٔ پرسنل، نظرسنجیِ HSE Climate، و برنامهٔ مشاهدهٔ رفتاریِ SBS." },
      { icon: "message", title: "دستیارِ آموزشیِ HSE با هوشِ مصنوعی", body: "هر کاربر می‌تواند کلیدِ هوشِ مصنوعیِ شخصیِ خودش (Gemini/ChatGPT/DeepSeek) را متصل کند و از دستیارِ آموزشیِ HSE برایِ پاسخِ تخصصی، آزمون و سناریوهایِ آموزشی استفاده کند." },
      { icon: "chart", title: "داشبوردِ مدیریتی و تحلیلی", body: "تصویرِ لحظه‌ای از وضعیتِ کلِ HSE برایِ مدیریت، بدونِ نیاز به گزارشِ دستی." },
    ],
    en: [
      { icon: "clipboard", title: "Non-conformance tracking", body: "Anomaly logging with an automatic tracking number, an approvable category, and a transparent corrective-action chain through to final closure." },
      { icon: "shield", title: "Integrated risk assessment", body: "BowTie, HCMS, JHA and FMEA in one module, for analyzing and controlling operational risks." },
      { icon: "users", title: "Contractor HSE evaluation", body: "Weighted scoring across ten real categories — from anomalies and corrective actions to training, machinery, PPE and proactive indicators." },
      { icon: "hardhat", title: "Personnel, machinery and scaffolding", body: "Personnel access and document management, machinery inspection/insurance status, and scaffold tag status, all in one place." },
      { icon: "calendar", title: "Work permits and PSSR", body: "A digital-signature work-permit workflow, and pre-startup safety reviews for new installations." },
      { icon: "gauge", title: "Proactive HSE indicators", body: "Personnel accident-proneness scoring, HSE Climate survey, and the SBS behavioral-observation program." },
      { icon: "message", title: "AI-powered HSE Learning Assistant", body: "Each user can connect their own personal AI key (Gemini/ChatGPT/DeepSeek) and use the HSE Learning Assistant for expert answers, exams and training scenarios." },
      { icon: "chart", title: "Management & analytics dashboard", body: "A live picture of overall HSE status for management, with no manual report needed." },
    ],
  };

  var DEMO_FEATURES = {
    fa: [
      { icon: "clipboard", title: "مدیریتِ عدم‌انطباق‌ها", body: "ثبت، دسته‌بندی و پیگیریِ آنومالی تا اقدامِ اصلاحی" },
      { icon: "shield", title: "ارزیابیِ ریسک", body: "BowTie · HCMS · JHA · FMEA" },
      { icon: "users", title: "ارزیابیِ پیمانکاران", body: "امتیازدهیِ وزن‌دارِ ده‌دسته‌ای" },
      { icon: "calendar", title: "صدورِ مجوزِ کار", body: "گردشِ کارِ امضایِ دیجیتال" },
      { icon: "hardhat", title: "پرسنل و ماشین‌آلات", body: "تردد، مدارک، بازرسی و بیمه" },
      { icon: "box", title: "مدیریتِ داربست", body: "تگ‌هایِ وضعیتِ قابل‌ردیابی" },
      { icon: "gauge", title: "شاخص‌هایِ Proactive", body: "استعدادِ حادثه · HSE Climate · SBS" },
      { icon: "message", title: "دستیارِ آموزشیِ HSE", body: "پاسخِ هوشِ مصنوعیِ شخصیِ کاربر" },
    ],
    en: [
      { icon: "clipboard", title: "Non-conformance management", body: "Log, categorize and track anomalies through to corrective action" },
      { icon: "shield", title: "Risk assessment", body: "BowTie · HCMS · JHA · FMEA" },
      { icon: "users", title: "Contractor evaluation", body: "Weighted scoring across ten categories" },
      { icon: "calendar", title: "Work permits", body: "Digital-signature workflow" },
      { icon: "hardhat", title: "Personnel & machinery", body: "Access, documents, inspection and insurance" },
      { icon: "box", title: "Scaffold management", body: "Trackable tag status" },
      { icon: "gauge", title: "Proactive indicators", body: "Accident-proneness · HSE Climate · SBS" },
      { icon: "message", title: "HSE Learning Assistant", body: "The user's own personal AI answers" },
    ],
  };

  // چهار مسیرِ مخاطب — فقط بر اساسِ نقش‌هایِ واقعیِ EMPLOYER/HSE_SUPERVISOR/
  // CONTRACTOR و مفهومِ شرکتِ مستقل (org_structure_type) و ماژول‌هایِ واقعاً
  // فعال (HSE_MODULES + PLAN_FEATURES.systemManagement).
  var AUDIENCES = {
    fa: [
      {
        key: "employer", label: "کارفرما", icon: "shield",
        note: "کارفرما همهٔ پیمانکارانِ پروژه را از یک حسابِ واحد می‌بیند؛ نقشِ «سرپرست HSE» برایِ تایید/ردِ موارد به همین حساب اضافه می‌شود.",
        features: [
          { title: "ارزیابیِ عملکردِ HSE پیمانکاران", body: "امتیازِ وزن‌دارِ هر پیمانکار بر اساسِ آنومالی، اقدامِ اصلاحی، طبِ کار، آموزش، ماشین‌آلات، حوادث، PSSR، داربست و PPE." },
          { title: "تاییدِ آنومالی و دسته‌بندیِ «سایر»", body: "بررسی و تاییدِ نهاییِ عدم‌انطباق‌هایِ ثبت‌شده توسطِ پیمانکاران، و تاییدِ دسته‌بندی‌هایِ پیشنهادیِ تازه." },
          { title: "تاییدِ مجوزِ کار", body: "امضایِ دیجیتالِ کارفرما/سرپرست HSE در گردشِ کارِ صدورِ مجوز." },
          { title: "داشبوردِ مدیریتی و گزارش‌هایِ تحلیلی", body: "تصویرِ لحظه‌ای از وضعیتِ کلِ پروژه، بدونِ نیاز به جمع‌آوریِ دستیِ گزارش از هر پیمانکار." },
          { title: "مدیریتِ حوادث و تاییدِ شبه‌حادثه", body: "بررسیِ ریشه‌ایِ حادثه و تاییدِ گزارش‌هایِ شبه‌حادثهٔ ثبت‌شده توسطِ پیمانکار." },
        ],
      },
      {
        key: "contractor", label: "پیمانکار", icon: "hardhat",
        note: "پیمانکار فقط به اطلاعاتِ شرکتِ خودش دسترسی دارد — بدونِ دیدنِ دادهٔ سایرِ پیمانکارانِ همان پروژه.",
        features: [
          { title: "ثبتِ مدیریتِ ورود و تردد پرسنل", body: "مدیریتِ مدارکِ پرسنلِ خودش و وضعیتِ صلاحیتِ آن‌ها." },
          { title: "ثبتِ ماشین‌آلات و داربست", body: "ثبتِ وضعیتِ بازرسی/بیمهٔ ماشین‌آلات، و تگ‌گذاریِ داربست‌هایِ تحتِ مالکیت." },
          { title: "ثبتِ عدم‌انطباق و درخواستِ مجوزِ کار", body: "گزارشِ آنومالی و درخواستِ صدورِ مجوزِ کار برایِ فعالیت‌هایِ خود." },
          { title: "مشاهدهٔ نتیجهٔ ارزیابیِ عملکرد", body: "دیدنِ امتیازِ به‌روزِ خود در ارزیابیِ HSE، بدونِ نیاز به پیگیریِ تلفنی از کارفرما." },
          { title: "دستیارِ آموزشیِ HSE", body: "پاسخ به پرسش‌هایِ ایمنی، ساختِ آزمون و سناریویِ آموزشی با کلیدِ هوشِ مصنوعیِ شخصیِ خودش." },
        ],
      },
      {
        key: "standalone", label: "شرکتِ مستقل", icon: "box",
        note: "برایِ سازمان‌هایی که ساختارِ کارفرما/پیمانکار ندارند — واحدِ HSE مستقیماً همهٔ ماژول‌ها را برایِ کارکنانِ خودِ شرکت مدیریت می‌کند؛ ماژولِ «ارزیابیِ پیمانکار» (چون موضوعیت ندارد) نمایش داده نمی‌شود.",
        features: [
          { title: "مدیریتِ عدم‌انطباق و ارزیابیِ ریسک", body: "ثبت و پیگیریِ آنومالی، به‌همراهِ BowTie/HCMS/JHA/FMEA، برایِ فعالیت‌هایِ داخلیِ شرکت." },
          { title: "مجوزِ کار با نقشِ «کاربرِ مجاز»", body: "گردشِ کارِ مجوزِ کار بدونِ فرضِ پیمانکارِ بیرونی — امضاکننده‌ها کاربرانِ مجازِ همان شرکت‌اند." },
          { title: "پرسنل، ماشین‌آلات، داربست و PSSR", body: "همان ماژول‌هایِ عملیاتی، منتها همه برایِ یک شرکتِ واحد." },
          { title: "مدیریتِ آموزش و PPE", body: "ماتریسِ آموزشِ موردنیاز بر اساسِ عنوانِ شغلی، و پیگیریِ توزیعِ تجهیزاتِ حفاظتِ فردی." },
        ],
      },
      {
        key: "hse_expert", label: "کارشناسِ HSE", icon: "clipboard",
        note: "نقشِ «سرپرستِ HSE» (HSE_SUPERVISOR) در سامانه، گیت‌کیپرِ اصلیِ تاییدها و مدیریتِ تنظیماتِ HSE است.",
        features: [
          { title: "تاییدِ شبه‌حادثه، دسته‌بندیِ «سایر» و جانشینِ تاییدِ مجوز", body: "اختیارِ تاییدِ موارد حساسی که به بررسیِ کارشناسِ HSE نیاز دارند." },
          { title: "مدیریتِ سیستم: آموزش، PPE، دسته‌بندی‌هایِ آنومالی", body: "تعریفِ ماتریسِ آموزشِ موردنیاز، اقلامِ PPE و دسته‌بندی‌هایِ استانداردِ آنومالی برایِ کلِ شرکت." },
          { title: "ابزارهایِ سریعِ HSE", body: "بیش از ۲۰ ابزارِ محاسباتی/چک‌لیستِ آماده — از LTIFR/TRIR تا محاسبه‌گرِ بارِ جرثقیل و فاصلهٔ تشعشع." },
          { title: "دستیارِ آموزشیِ HSE با هوشِ مصنوعی", body: "کمک در تحلیلِ ریسک، JSA، HIRA، بررسیِ حادثه و ساختِ سناریوهایِ آموزشی." },
          { title: "نقشهٔ حرارتیِ حوادث و دیجیتال‌توئینِ سایت", body: "دیدِ فضایی از تراکمِ حوادث/آنومالی‌ها و وضعیتِ لحظه‌ایِ مناطقِ سایت." },
        ],
      },
    ],
    en: [
      {
        key: "employer", label: "Employer", icon: "shield",
        note: "The employer sees all of a project's contractors from one account; the \"HSE Supervisor\" role is added to the same account for approving/rejecting items.",
        features: [
          { title: "Contractor HSE evaluation", body: "Each contractor's weighted score across anomalies, corrective actions, occupational health, training, machinery, incidents, PSSR, scaffolding and PPE." },
          { title: "Anomaly approval & \"Other\" category review", body: "Reviewing and finally approving non-conformances logged by contractors, and approving newly proposed categories." },
          { title: "Work permit approval", body: "The employer/HSE supervisor's digital signature in the permit-issuance workflow." },
          { title: "Management & analytics dashboard", body: "A live picture of the whole project's status, without manually collecting reports from each contractor." },
          { title: "Incident management & near-miss approval", body: "Root-cause review of incidents, and approving near-miss reports logged by contractors." },
        ],
      },
      {
        key: "contractor", label: "Contractor", icon: "hardhat",
        note: "A contractor only accesses their own company's data — never other contractors' data on the same project.",
        features: [
          { title: "Personnel access management", body: "Managing their own personnel's documents and qualification status." },
          { title: "Machinery & scaffold logging", body: "Logging machinery inspection/insurance status, and tagging owned scaffolding." },
          { title: "Anomaly reporting & permit requests", body: "Reporting anomalies and requesting work permits for their own activities." },
          { title: "Viewing their evaluation score", body: "Seeing their up-to-date HSE evaluation score without calling the employer." },
          { title: "HSE Learning Assistant", body: "Answers to safety questions, exams and training scenarios using their own personal AI key." },
        ],
      },
      {
        key: "standalone", label: "Standalone company", icon: "box",
        note: "For organizations without an employer/contractor split — the HSE unit directly manages every module for the company's own staff; the \"Contractor Evaluation\" module (not applicable) is hidden.",
        features: [
          { title: "Non-conformance & risk assessment", body: "Logging and tracking anomalies, plus BowTie/HCMS/JHA/FMEA, for the company's own internal activities." },
          { title: "Work permits with an \"authorized user\" role", body: "A permit workflow with no assumed external contractor — signers are the company's own authorized users." },
          { title: "Personnel, machinery, scaffolding and PSSR", body: "The same operational modules, all for a single company." },
          { title: "Training & PPE management", body: "A required-training matrix by job title, and tracking PPE distribution." },
        ],
      },
      {
        key: "hse_expert", label: "HSE expert", icon: "clipboard",
        note: "The \"HSE Supervisor\" role is the system's main approval gatekeeper and manages HSE-wide settings.",
        features: [
          { title: "Near-miss, \"Other\" category and permit-substitute approval", body: "Authority to approve sensitive items that need HSE expert review." },
          { title: "System management: training, PPE, anomaly categories", body: "Defining the required-training matrix, PPE items and standard anomaly categories company-wide." },
          { title: "Quick HSE tools", body: "20+ ready calculators/checklists — from LTIFR/TRIR to crane-load and radiation-distance calculators." },
          { title: "AI-powered HSE Learning Assistant", body: "Help with risk assessment, JSA, HIRA, incident review and building training scenarios." },
          { title: "Incident heatmap & site digital twin", body: "A spatial view of incident/anomaly density and the live status of site zones." },
        ],
      },
    ],
  };

  var STEPS = {
    fa: [
      { title: "آشنایی با سامانه و مشاهدهٔ دمو", body: "مرکزِ دموی تعاملی را ببینید و با نقش‌ها و ماژول‌هایِ واقعی آشنا شوید." },
      { title: "تعیینِ نوعِ فعالیت و نیازهایِ سازمان", body: "مشخص‌کردنِ ساختارِ سازمانی: کارفرما/پیمانکار، یا شرکتِ مستقلِ تک‌پروژه/چندپروژه." },
      { title: "ثبت‌نام و پیکربندیِ اولیه", body: "ثبت‌نامِ خودسرویس، ساختِ خودکارِ حساب و فعال‌شدنِ دورهٔ آزمایشیِ ۳۰روزه." },
      { title: "آموزشِ کاربران", body: "آشنایی با ماژول‌هایِ مرتبط، با کمکِ دستیارِ آموزشیِ HSE و راهنماهایِ موجود." },
      { title: "آغازِ استفاده و پیگیریِ نیازهایِ تکمیلی", body: "شروعِ کارِ واقعی در سامانه، با امکانِ تماس برایِ نیازهایِ تکمیلی یا توسعهٔ بیشتر." },
    ],
    en: [
      { title: "Explore the system and view the demo", body: "See the interactive demo center and get familiar with the real roles and modules." },
      { title: "Define your organization type and needs", body: "Decide the organizational structure: employer/contractor, or a single/multi-project standalone company." },
      { title: "Sign up and initial setup", body: "Self-service sign-up, automatic account creation, and an active 30-day trial." },
      { title: "User training", body: "Getting familiar with the relevant modules, with help from the HSE Learning Assistant and existing guides." },
      { title: "Go live and follow up on further needs", body: "Start real use of the system, with the option to reach out for further needs or extensions." },
    ],
  };

  /* ---------------- رندر ---------------- */
  function cardHtml(item, extraClass, bodyTag) {
    bodyTag = bodyTag || "p";
    return (
      '<div class="card ' + (extraClass || "") + '">' +
        '<div class="icon-badge">' + icon(item.icon) + "</div>" +
        "<h4>" + item.title + "</h4>" +
        "<" + bodyTag + ">" + item.body + "</" + bodyTag + ">" +
      "</div>"
    );
  }

  function render(lang) {
    var dict = T[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.documentElement.setAttribute("data-lang", lang);
    document.getElementById("langToggle").textContent = lang === "fa" ? "EN" : "فا";

    // متن‌هایِ ثابت
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    // چالش‌ها
    document.getElementById("challengeGrid").innerHTML = CHALLENGES[lang].map(function (c) {
      return (
        '<div class="card challenge-item">' +
          '<div class="icon-badge">' + icon(c.icon) + "</div>" +
          '<div><h4>' + c.title + "</h4><p>" + c.body + "</p></div>" +
        "</div>"
      );
    }).join("");

    // راهکار
    document.getElementById("solutionGrid").innerHTML = SOLUTIONS[lang].map(function (s) {
      return cardHtml(s, "solution-card");
    }).join("");

    // دمو — کارت‌هایِ خلاصه
    document.getElementById("demoFeatureGrid").innerHTML = DEMO_FEATURES[lang].map(function (f) {
      return (
        '<div class="feature-mini">' +
          '<div class="icon-badge">' + icon(f.icon) + "</div>" +
          '<div><h5>' + f.title + "</h5><p>" + f.body + "</p></div>" +
        "</div>"
      );
    }).join("");

    // مخاطبان
    var tabsEl = document.getElementById("audienceTabs");
    var panelsEl = document.getElementById("audiencePanels");
    var auds = AUDIENCES[lang];
    var prevActive = tabsEl.querySelector(".aud-tab.active");
    var activeKey = prevActive ? prevActive.getAttribute("data-key") : auds[0].key;

    tabsEl.innerHTML = auds.map(function (a) {
      return (
        '<button type="button" class="aud-tab' + (a.key === activeKey ? " active" : "") + '" data-key="' + a.key + '">' +
          icon(a.icon).replace("<svg ", '<svg style="width:16px;height:16px" ') + "<span>" + a.label + "</span>" +
        "</button>"
      );
    }).join("");

    panelsEl.innerHTML = auds.map(function (a) {
      var printLabel = lang === "fa" ? "مسیرِ " + a.label : a.label + " track";
      return (
        '<div class="aud-panel' + (a.key === activeKey ? " active" : "") + '" data-key="' + a.key + '">' +
          '<div class="aud-tabs-print-label">' + printLabel + "</div>" +
          '<div class="grid grid-2" style="margin-bottom:18px">' +
            a.features.map(function (f) {
              return '<div class="aud-feature"><div class="icon-badge" style="width:30px;height:30px;border-radius:8px">' + icon("check") + '</div><div><h5>' + f.title + "</h5><p>" + f.body + "</p></div></div>";
            }).join("") +
          "</div>" +
          '<div class="aud-note">' + a.note + "</div>" +
        "</div>"
      );
    }).join("");

    Array.prototype.forEach.call(tabsEl.querySelectorAll(".aud-tab"), function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        Array.prototype.forEach.call(tabsEl.querySelectorAll(".aud-tab"), function (b) { b.classList.toggle("active", b === btn); });
        Array.prototype.forEach.call(panelsEl.querySelectorAll(".aud-panel"), function (p) { p.classList.toggle("active", p.getAttribute("data-key") === key); });
      });
    });

    // مراحل
    document.getElementById("stepsList").innerHTML = STEPS[lang].map(function (s, i) {
      return (
        '<div class="step-item">' +
          '<div class="step-num">' + (i + 1) + "</div>" +
          '<div class="step-body"><h4>' + s.title + "</h4><p>" + s.body + "</p></div>" +
        "</div>"
      );
    }).join("");

    // select فیلدِ مخاطب در فرم (مقدارِ انتخاب‌شده را حفظ کن)
    var audSelect = document.getElementById("lfAudience");
    var keepVal = audSelect.value;
    audSelect.value = keepVal;

    renderCalc(lang);
  }

  /* ---------------- محاسبه‌گرِ ارزشِ اقتصادی ---------------- */
  var nfCache = {};
  function fmtNum(n, lang) {
    var locale = lang === "fa" ? "fa-IR" : "en-US";
    if (!nfCache[locale]) nfCache[locale] = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    return nfCache[locale].format(n);
  }

  function renderCalc(lang) {
    var pct = document.getElementById("calcPct");
    var pctLabel = document.getElementById("calcPctLabel");
    pctLabel.textContent = pct.value + (lang === "fa" ? "٪" : "%");

    function recalc() {
      var hours = parseFloat(document.getElementById("calcHours").value) || 0;
      var rate = parseFloat(document.getElementById("calcRate").value) || 0;
      var pctVal = parseFloat(pct.value) || 0;
      pctLabel.textContent = pct.value + (document.documentElement.getAttribute("data-lang") === "fa" ? "٪" : "%");

      var weeklySaved = hours * (pctVal / 100);
      var monthlySaved = weeklySaved * 4.33;
      var curLang = document.documentElement.getAttribute("data-lang");
      var hoursUnit = curLang === "fa" ? " ساعت" : " hours";
      document.getElementById("calcResultHours").textContent = fmtNum(monthlySaved, curLang) + hoursUnit;

      var costEl = document.getElementById("calcResultCost");
      if (rate > 0) {
        var monthlyCost = monthlySaved * rate;
        costEl.textContent = fmtNum(monthlyCost, curLang) + (curLang === "fa" ? " تومان/ماه" : " /month");
      } else {
        costEl.textContent = "—";
      }
    }
    ["calcContractors", "calcHours", "calcRate", "calcPct"].forEach(function (id) {
      var el = document.getElementById(id);
      el.removeEventListener("input", el._calcHandler || function () {});
      el._calcHandler = recalc;
      el.addEventListener("input", recalc);
    });
    recalc();
  }

  /* ---------------- زبان ---------------- */
  function initLang() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* بی‌اهمیت */ }
    var lang = saved === "en" ? "en" : "fa";
    render(lang);
    document.getElementById("langToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-lang");
      var next = cur === "fa" ? "en" : "fa";
      try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* بی‌اهمیت */ }
      render(next);
    });
  }

  /* ---------------- چاپ ---------------- */
  document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
  });

  /* ---------------- اشتراک‌گذاری ---------------- */
  (function initShare() {
    var btn = document.getElementById("shareBtn");
    var menu = document.getElementById("shareMenu");
    var pageUrl = window.location.href.split("#")[0];

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", function () { menu.classList.remove("open"); });

    document.getElementById("shareCopy").addEventListener("click", function () {
      var done = function () {
        var span = document.querySelector("#shareCopy span");
        var original = span.textContent;
        span.textContent = document.documentElement.getAttribute("data-lang") === "fa" ? "کپی شد ✓" : "Copied ✓";
        setTimeout(function () { span.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pageUrl).then(done).catch(function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = pageUrl; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* بی‌اهمیت */ }
        document.body.removeChild(ta);
      }
    });

    document.getElementById("shareLinkedin").href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(pageUrl);
    document.getElementById("shareMail").href = "mailto:?subject=" + encodeURIComponent("IHMS — سامانه هوشمند مدیریت HSE") + "&body=" + encodeURIComponent(pageUrl);
  })();

  /* ---------------- دکمه‌هایِ درخواست → اسکرول + پرکردنِ فرم ---------------- */
  function selectRequestType(val) {
    var grid = document.getElementById("reqTypeGrid");
    Array.prototype.forEach.call(grid.querySelectorAll(".req-type-opt"), function (opt) {
      var isMatch = opt.getAttribute("data-val") === val;
      opt.classList.toggle("active", isMatch);
      opt.querySelector("input").checked = isMatch;
    });
  }
  document.getElementById("reqTypeGrid").addEventListener("click", function (e) {
    var opt = e.target.closest(".req-type-opt");
    if (opt) selectRequestType(opt.getAttribute("data-val"));
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-request-type]"), function (el) {
    el.addEventListener("click", function (e) {
      var val = el.getAttribute("data-request-type");
      selectRequestType(val);
      // اگر خودِ لینک به #start اشاره می‌کند، اسکرولِ پیش‌فرض کافی است؛
      // دکمه‌هایِ دیگر باید دستی به فرم اسکرول کنند.
      if (el.getAttribute("href") !== "#start") {
        e.preventDefault();
        document.getElementById("cta").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setTimeout(function () {
        document.getElementById("lfFullName").focus({ preventScroll: true });
      }, 450);
    });
  });

  /* ---------------- Turnstile ---------------- */
  var turnstileToken = "";
  var turnstileWidgetId = null;
  function renderTurnstile() {
    var container = document.getElementById("cf-turnstile-container");
    if (!container || !window.turnstile || !TURNSTILE_SITE_KEY) return;
    turnstileWidgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: function (token) { turnstileToken = token; },
      "expired-callback": function () { turnstileToken = ""; },
      "error-callback": function () { turnstileToken = ""; },
    });
  }
  (function waitForTurnstile() {
    if (window.turnstile) { renderTurnstile(); return; }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (window.turnstile) { clearInterval(iv); renderTurnstile(); }
      else if (tries > 100) { clearInterval(iv); }
    }, 150);
  })();
  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId != null && window.turnstile) {
      try { window.turnstile.reset(turnstileWidgetId); } catch (e) { /* بی‌اهمیت */ }
    }
  }

  /* ---------------- فرمِ ارسالِ سرنخ ---------------- */
  document.getElementById("leadForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var lang = document.documentElement.getAttribute("data-lang");
    var dict = T[lang];
    var msgEl = document.getElementById("lfMsg");
    msgEl.className = "lf-msg";
    msgEl.textContent = "";

    var fullName = document.getElementById("lfFullName").value.trim();
    var companyName = document.getElementById("lfCompanyName").value.trim();
    var phone = document.getElementById("lfPhone").value.trim();
    var requestTypeInput = document.querySelector('input[name="requestType"]:checked');

    if (!fullName || !companyName || !phone) {
      msgEl.className = "lf-msg err"; msgEl.textContent = dict.lfErrRequired; return;
    }
    if (!requestTypeInput) {
      msgEl.className = "lf-msg err"; msgEl.textContent = dict.lfErrRequestType; return;
    }
    if (!turnstileToken) {
      msgEl.className = "lf-msg err"; msgEl.textContent = dict.lfErrCaptcha; return;
    }

    var payload = {
      fullName: fullName,
      companyName: companyName,
      position: document.getElementById("lfPosition").value.trim(),
      phone: phone,
      email: document.getElementById("lfEmail").value.trim(),
      audienceType: document.getElementById("lfAudience").value,
      requestType: requestTypeInput.value,
      message: document.getElementById("lfMessage").value.trim(),
      turnstileToken: turnstileToken,
    };

    var submitBtn = document.getElementById("lfSubmitBtn");
    submitBtn.disabled = true;

    fetch(SUPABASE_URL + "/functions/v1/submit-proposal-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_ANON_KEY, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        submitBtn.disabled = false;
        resetTurnstile();
        if (result.ok && result.data && result.data.ok) {
          msgEl.className = "lf-msg ok";
          msgEl.textContent = dict.lfOk;
          document.getElementById("leadForm").reset();
          selectRequestType(null);
        } else {
          msgEl.className = "lf-msg err";
          msgEl.textContent = (result.data && result.data.error) || dict.lfErrServer;
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        resetTurnstile();
        msgEl.className = "lf-msg err";
        msgEl.textContent = dict.lfErrNetwork;
      });
  });

  initLang();
})();
