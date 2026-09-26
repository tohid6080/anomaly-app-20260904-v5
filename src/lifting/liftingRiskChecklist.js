/* ============================================================================ *
 * چک‌لیستِ کوتاهِ کنترل‌های HSE قبل از شروعِ عملیاتِ لیفتینگ — تکِ منبعِ حقیقت.
 * هم ابزارِ «ارزیابیِ سریعِ ریسکِ لیفتینگ» (quicktools/quickToolsData.jsx) و هم
 * نمونه‌ی آموزشیِ «طراحیِ نقشه‌ی لیفتینگ» (lifting/LiftingPlanSample.jsx) از
 * همینِ یک آرایه استفاده می‌کنند تا دو چک‌لیستِ متفاوت و ناهم‌راستا نداشته باشیم.
 * ============================================================================ */

export const LIFT_RISK_ITEMS = [
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
