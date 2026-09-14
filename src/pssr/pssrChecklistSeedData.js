/*
 * داده‌ی Seed چک‌لیست‌های مرجع PSSR — استخراج‌شده عیناً از فایل اکسل رسمی
 * «PSSR Report -Rev00.xlsx» (۹ چک‌لیست تخصصی). محتوای requirement بدون
 * هیچ تغییری (حتی شماره‌گذاریِ ناپیوسته‌ی اصلی) حفظ شده تا مرجع مهندسی
 * دست‌نخورده بماند؛ فقط برای هر ردیف یک group (سرتیترِ بخش در فایل، مثل
 * «Switchgear») نگه داشته شده تا در UI دسته‌بندی شود.
 *
 * هر ردیف یک textFa (ترجمه‌ی فارسی) و groupFa (سرتیترِ فارسی، اگر group
 * داشته باشد) هم دارد — طبق درخواستِ کاربر برای نمایشِ دوزبانه (وقتی زبانِ
 * سامانه فارسی است، textFa نشان داده می‌شود؛ در حالتِ انگلیسی همان text
 * اصلی). این ترجمه‌ها ماشینی/اولیه‌اند — پیش از تکیه‌ی عملیاتیِ کامل روی
 * آن‌ها در یک PSSR واقعی، بازبینیِ یک کارشناسِ فنی توصیه می‌شود؛ هرکدام هم
 * از همینجا یا از «مدیریتِ چک‌لیست» (PSSRChecklistAdmin) قابلِ ویرایش است.
 */
export const PSSR_CHECKLIST_SEED = [
  {
    "code": "electrical",
    "discipline": "electrical",
    "title": "Electrical",
    "requirements": [
      {
        "reqNo": "1",
        "group": "General",
        "text": "Pre-com documents are checked for all following parts? (Including test sheet and check lists, punch list, FAT report, As built drawing, updated LOTO register)",
        "order": 1,
        "textFa": "مدارک پیش‌راه‌اندازی برای تمام بخش‌های زیر بررسی شده‌اند؟ (شامل برگه‌های تست و چک‌لیست‌ها، پانچ‌لیست، گزارش FAT، نقشه‌ی As Built، و رجیستر به‌روزشده‌ی LOTO)",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "2",
        "group": "General",
        "text": "Motor list and technical data sheets for motors are available.",
        "order": 2,
        "textFa": "لیست موتورها و برگه‌های اطلاعات فنی موتورها موجود است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "3",
        "group": "General",
        "text": "Function List are available.",
        "order": 3,
        "textFa": "لیست عملکردها (Function List) موجود است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "4",
        "group": "General",
        "text": "Circuit diagrams of plant power supply are available.",
        "order": 4,
        "textFa": "نقشه‌ی مدارهای تغذیه‌ی برق واحد موجود است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "5",
        "group": "General",
        "text": "Electrically driven motors–set point of over current trip is correctly adjusted; diagrams are available; displays in operation; Motors are labeled",
        "order": 5,
        "textFa": "موتورهای برقی — نقطه‌ی تنظیم (Set Point) تریپ اضافه‌جریان به‌درستی تنظیم شده؛ نقشه‌ها موجود است؛ نمایشگرها فعال‌اند؛ موتورها برچسب‌گذاری شده‌اند.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "6",
        "group": "General",
        "text": "All electrical equipment (distributors etc.) is provided with warning signs, marked and secured against being touched.",
        "order": 6,
        "textFa": "تمام تجهیزات برقی (توزیع‌کننده‌ها و غیره) دارای علائم هشدار، علامت‌گذاری‌شده و در برابر تماس محافظت شده‌اند.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "7",
        "group": "General",
        "text": "Access to switch room and rack room is cleared.",
        "order": 7,
        "textFa": "دسترسی به اتاق سوییچ و اتاق رک باز و بدون مانع است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "8",
        "group": "General",
        "text": "Access to switch room and rack room is possible only for permitted personnel.",
        "order": 8,
        "textFa": "دسترسی به اتاق سوییچ و اتاق رک فقط برای پرسنل مجاز امکان‌پذیر است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "9",
        "group": "General",
        "text": "Cables are protected against fire as per engineering design specifications.",
        "order": 9,
        "textFa": "کابل‌ها طبق مشخصات فنی طراحی در برابر آتش محافظت شده‌اند.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "10",
        "group": "General",
        "text": "Temperature of motors, bearing, transformer,… is checked when loaded.",
        "order": 10,
        "textFa": "دمای موتورها، بلبرینگ، ترانسفورماتور و... هنگام بارگذاری بررسی شده است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "11",
        "group": "General",
        "text": "Operation of manual and auto controls is checked.",
        "order": 11,
        "textFa": "عملکرد کنترل‌های دستی و اتوماتیک بررسی شده است.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "12",
        "group": "General",
        "text": "Safety cautions as per required permits are followed.",
        "order": 12,
        "textFa": "نکات ایمنی طبق مجوزهای موردنیاز رعایت شده‌اند.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "13",
        "group": "General",
        "text": "Insulation and heat tracing are checked.",
        "order": 13,
        "textFa": "عایق‌کاری و هیت‌تریسینگ بررسی شده‌اند.",
        "groupFa": "عمومی"
      },
      {
        "reqNo": "14",
        "group": "Switchgear",
        "text": "Bus bar condition is checked.",
        "order": 14,
        "textFa": "وضعیت باس‌بار بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "15",
        "group": "Switchgear",
        "text": "Feeder's condition is checked.",
        "order": 15,
        "textFa": "وضعیت فیدر بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "16",
        "group": "Switchgear",
        "text": "Power and control cable connection is checked.",
        "order": 16,
        "textFa": "اتصال کابل‌های قدرت و کنترل بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "17",
        "group": "Switchgear",
        "text": "Space heater of all panels is checked.",
        "order": 17,
        "textFa": "هیتر داخلی (Space Heater) تمام تابلوها بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "18",
        "group": "Switchgear",
        "text": "Relay setting is checked.",
        "order": 18,
        "textFa": "تنظیمات رله بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "19",
        "group": "Switchgear",
        "text": "Rated power of all feeders is checked.",
        "order": 19,
        "textFa": "توان نامی تمام فیدرها بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "20",
        "group": "Switchgear",
        "text": "Function test of feeder is done and checked.",
        "order": 20,
        "textFa": "تست عملکرد فیدر انجام و بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "21",
        "group": "Switchgear",
        "text": "Earth connections, numbers, location are checked.",
        "order": 21,
        "textFa": "اتصالات، تعداد و محل اتصالات ارت بررسی شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "22",
        "group": "Switchgear",
        "text": "Bus bar energizing is checked.",
        "order": 22,
        "textFa": "برق‌دار کردن (Energizing) باس‌بار بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "23",
        "group": "Switchgear",
        "text": "Pre-com activities are done and verified.",
        "order": 23,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی انجام و تأیید شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "24",
        "group": "Switchgear",
        "text": "Functional test (e.g. inter-lock, inter-tripe, earthing interlock) have been done and checked.",
        "order": 24,
        "textFa": "تست‌های عملکردی (مانند اینترلاک، اینتر-تریپ، اینترلاک ارت) انجام و بررسی شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "25",
        "group": "Switchgear",
        "text": "All internal wiring is correctly looped and clearly identified.",
        "order": 25,
        "textFa": "تمام سیم‌کشی داخلی به‌درستی حلقه‌بندی و به‌وضوح شناسایی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "26",
        "group": "Switchgear",
        "text": "All C.Ts, V.Ts & fuses are properly installed and as per data sheet.",
        "order": 26,
        "textFa": "تمام CTها، VTها و فیوزها به‌درستی و طبق دیتاشیت نصب شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "27",
        "group": "Switchgear",
        "text": "Breaker/ isolator different status are checked.",
        "order": 27,
        "textFa": "وضعیت‌های مختلف بریکر/ایزولاتور بررسی شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "28",
        "group": "Switchgear",
        "text": "control fuses removal is checked",
        "order": 28,
        "textFa": "خارج‌سازی فیوزهای کنترل بررسی شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "29",
        "group": "Switchgear",
        "text": "Protection devices for load are checked.",
        "order": 29,
        "textFa": "تجهیزات حفاظتی بار بررسی شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "30",
        "group": "Switchgear",
        "text": "Zone class (hazardous area classification) is checked and verified.",
        "order": 30,
        "textFa": "کلاس زون (طبقه‌بندی مناطق خطرناک) بررسی و تأیید شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "31",
        "group": "Switchgear",
        "text": "SAT is done.",
        "order": 31,
        "textFa": "SAT انجام شده است.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "32",
        "group": "Switchgear",
        "text": "Cells are tagged off.",
        "order": 32,
        "textFa": "سل‌ها تگ (Tag) شده‌اند.",
        "groupFa": "سوییچگیر"
      },
      {
        "reqNo": "34",
        "group": "Power transformer",
        "text": "Power and control cable are checked.",
        "order": 33,
        "textFa": "کابل‌های قدرت و کنترل بررسی شده‌اند.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "35",
        "group": "Power transformer",
        "text": "All protection devices are checked.",
        "order": 34,
        "textFa": "تمام تجهیزات حفاظتی بررسی شده‌اند.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "36",
        "group": "Power transformer",
        "text": "Tap changer is checked.",
        "order": 35,
        "textFa": "تپ‌چنجر بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "37",
        "group": "Power transformer",
        "text": "The oil transformer is checked.",
        "order": 36,
        "textFa": "روغن ترانسفورماتور بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "38",
        "group": "Power transformer",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 37,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "39",
        "group": "Power transformer",
        "text": "Energizing is done and checked.",
        "order": 38,
        "textFa": "برق‌دار کردن انجام و بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "40",
        "group": "Power transformer",
        "text": "nameplate is checked as per data sheet",
        "order": 39,
        "textFa": "پلاک مشخصات (Nameplate) طبق دیتاشیت بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "41",
        "group": "Power transformer",
        "text": "Pre-com activities are done and verified.",
        "order": 40,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی انجام و تأیید شده‌اند.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "42",
        "group": "Power transformer",
        "text": "All bushing joint & seals are checked for fluid leakage.",
        "order": 41,
        "textFa": "تمام اتصالات و آب‌بندی‌های بوشینگ از نظر نشتی سیال بررسی شده‌اند.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "43",
        "group": "Power transformer",
        "text": "All auxiliary equipment (e.g. pressure & temperature connections) is correctly installed and checked.",
        "order": 42,
        "textFa": "تمام تجهیزات جانبی (مانند اتصالات فشار و دما) به‌درستی نصب و بررسی شده‌اند.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "44",
        "group": "Power transformer",
        "text": "SAT is done.",
        "order": 43,
        "textFa": "SAT انجام شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "45",
        "group": "Power transformer",
        "text": "Bus bar energizing is checked.",
        "order": 44,
        "textFa": "برق‌دار کردن باس‌بار بررسی شده است.",
        "groupFa": "ترانسفورماتور قدرت"
      },
      {
        "reqNo": "47",
        "group": "Electro motor",
        "text": "Power and control cable are checked.",
        "order": 45,
        "textFa": "کابل‌های قدرت و کنترل بررسی شده‌اند.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "48",
        "group": "Electro motor",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 46,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "49",
        "group": "Electro motor",
        "text": "The lubrication system is in operation and checked.",
        "order": 47,
        "textFa": "سیستم روان‌کاری در حال کار و بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "50",
        "group": "Electro motor",
        "text": "Feeder /LCS function test is in test position and checked.",
        "order": 48,
        "textFa": "تست عملکرد فیدر/LCS در وضعیت تست انجام و بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "51",
        "group": "Electro motor",
        "text": "nameplate is checked as per data sheet",
        "order": 49,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "52",
        "group": "Electro motor",
        "text": "Space heater is checked.",
        "order": 50,
        "textFa": "هیتر داخلی بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "53",
        "group": "Electro motor",
        "text": "Pre-com activities (e.g. free run) are done.",
        "order": 51,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی (مانند فری‌ران) انجام شده‌اند.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "54",
        "group": "Electro motor",
        "text": "RTDs works is done correctly and checked.",
        "order": 52,
        "textFa": "کارهای مربوط به RTDها به‌درستی انجام و بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "55",
        "group": "Electro motor",
        "text": "Rotation is checked",
        "order": 53,
        "textFa": "جهت چرخش بررسی شده است.",
        "groupFa": "الکتروموتور"
      },
      {
        "reqNo": "56",
        "group": "Heater",
        "text": "nameplate is checked as per data sheet",
        "order": 54,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "57",
        "group": "Heater",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 55,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "58",
        "group": "Heater",
        "text": "Entry & terminals are routed and installed correctly.",
        "order": 56,
        "textFa": "ورودی‌ها و ترمینال‌ها به‌درستی مسیردهی و نصب شده‌اند.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "59",
        "group": "Heater",
        "text": "Power and control cable are checked.",
        "order": 57,
        "textFa": "کابل‌های قدرت و کنترل بررسی شده‌اند.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "60",
        "group": "Heater",
        "text": "The electrical resistance is checked.",
        "order": 58,
        "textFa": "مقاومت الکتریکی بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "61",
        "group": "Heater",
        "text": "insulation for heater is checked",
        "order": 59,
        "textFa": "عایق‌کاری هیتر بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "62",
        "group": "Heater",
        "text": "Thermocouple is checked",
        "order": 60,
        "textFa": "ترموکوپل بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "63",
        "group": "Heater",
        "text": "Energizing is checked",
        "order": 61,
        "textFa": "برق‌دار کردن بررسی شده است.",
        "groupFa": "هیتر"
      },
      {
        "reqNo": "65",
        "group": "Emergency diesel generator",
        "text": "nameplate is checked as per data sheet",
        "order": 62,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "66",
        "group": "Emergency diesel generator",
        "text": "Power and control cable are checked.",
        "order": 63,
        "textFa": "کابل‌های قدرت و کنترل بررسی شده‌اند.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "67",
        "group": "Emergency diesel generator",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 64,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "68",
        "group": "Emergency diesel generator",
        "text": "All protection devices are checked.",
        "order": 65,
        "textFa": "تمام تجهیزات حفاظتی بررسی شده‌اند.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "69",
        "group": "Emergency diesel generator",
        "text": "The lubrication system is in operation and checked.",
        "order": 66,
        "textFa": "سیستم روان‌کاری در حال کار و بررسی شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "70",
        "group": "Emergency diesel generator",
        "text": "Function test is in test position.",
        "order": 67,
        "textFa": "تست عملکرد در وضعیت تست انجام شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "71",
        "group": "Emergency diesel generator",
        "text": "The synchronizing with other EDG is checked and verified.",
        "order": 68,
        "textFa": "سنکرون‌سازی با سایر دیزل‌ژنراتورهای اضطراری (EDG) بررسی و تأیید شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "72",
        "group": "Emergency diesel generator",
        "text": "The synchronizing with bus bar checked and verified.",
        "order": 69,
        "textFa": "سنکرون‌سازی با باس‌بار بررسی و تأیید شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "73",
        "group": "Emergency diesel generator",
        "text": "The loading test is checked and verified.",
        "order": 70,
        "textFa": "تست بارگذاری بررسی و تأیید شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "74",
        "group": "Emergency diesel generator",
        "text": "The automatic starting is checked and verified.",
        "order": 71,
        "textFa": "استارت اتوماتیک بررسی و تأیید شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "75",
        "group": "Emergency diesel generator",
        "text": "Emergency LV bus bar for energizing is checked.",
        "order": 72,
        "textFa": "باس‌بار فشار ضعیف اضطراری برای برق‌دار کردن بررسی شده است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "76",
        "group": "Emergency diesel generator",
        "text": "Cooling & Exhaust system are checked.",
        "order": 73,
        "textFa": "سیستم خنک‌کاری و اگزوز بررسی شده‌اند.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "77",
        "group": "Emergency diesel generator",
        "text": "Battery electrolyte is at right level.",
        "order": 74,
        "textFa": "الکترولیت باتری در سطح مناسب است.",
        "groupFa": "دیزل‌ژنراتور اضطراری"
      },
      {
        "reqNo": "78",
        "group": "UPS system",
        "text": "nameplate is checked as per data sheet",
        "order": 75,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "79",
        "group": "UPS system",
        "text": "Power and control cable are checked.",
        "order": 76,
        "textFa": "کابل‌های قدرت و کنترل بررسی شده‌اند.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "80",
        "group": "UPS system",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 77,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "81",
        "group": "UPS system",
        "text": "UPS status is checked",
        "order": 78,
        "textFa": "وضعیت UPS بررسی شده است.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "82",
        "group": "UPS system",
        "text": "charging and discharging of batteries is checked",
        "order": 79,
        "textFa": "شارژ و دشارژ باتری‌ها بررسی شده است.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "83",
        "group": "UPS system",
        "text": "The rectifier and inverter is working as per design specifications.",
        "order": 80,
        "textFa": "رکتیفایر و اینورتر طبق مشخصات فنی طراحی کار می‌کنند.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "84",
        "group": "UPS system",
        "text": "Electrical Interlock between batteries and mechanical exhaust fan operation is checked.",
        "order": 81,
        "textFa": "اینترلاک الکتریکی بین باتری‌ها و عملکرد فن اگزوز مکانیکی بررسی شده است.",
        "groupFa": "سیستم UPS"
      },
      {
        "reqNo": "85",
        "group": "Earthing system",
        "text": "lightning system to be checked and verified?",
        "order": 82,
        "textFa": "سیستم صاعقه‌گیر بررسی و تأیید شده است؟",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "86",
        "group": "Earthing system",
        "text": "nameplate is checked as per data sheet.",
        "order": 83,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "87",
        "group": "Earthing system",
        "text": "all connections are checked.",
        "order": 84,
        "textFa": "تمام اتصالات بررسی شده‌اند.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "88",
        "group": "Earthing system",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 85,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "89",
        "group": "Earthing system",
        "text": "Pre-com activities are done.",
        "order": 86,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی انجام شده‌اند.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "90",
        "group": "Earthing system",
        "text": "resistance of earth system is checked and verified.",
        "order": 87,
        "textFa": "مقاومت سیستم ارت بررسی و تأیید شده است.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "91",
        "group": "Earthing system",
        "text": "main rod installation and connection is checked",
        "order": 88,
        "textFa": "نصب و اتصال میله‌ی اصلی ارت بررسی شده است.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "92",
        "group": "Earthing system",
        "text": "main earth lines are checked and verified",
        "order": 89,
        "textFa": "خطوط اصلی ارت بررسی و تأیید شده‌اند.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "93",
        "group": "Earthing system",
        "text": "earth connection to equipment is checked and verified",
        "order": 90,
        "textFa": "اتصال ارت به تجهیزات بررسی و تأیید شده است.",
        "groupFa": "سیستم ارت"
      },
      {
        "reqNo": "94",
        "group": "Cathodic Protection System",
        "text": "nameplate is checked as per data sheet.",
        "order": 91,
        "textFa": "پلاک مشخصات طبق دیتاشیت بررسی شده است.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "95",
        "group": "Cathodic Protection System",
        "text": "all connections are checked.",
        "order": 92,
        "textFa": "تمام اتصالات بررسی شده‌اند.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "96",
        "group": "Cathodic Protection System",
        "text": "NJBs / PJBs are checked.",
        "order": 93,
        "textFa": "جعبه‌های NJB/PJB بررسی شده‌اند.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "97",
        "group": "Cathodic Protection System",
        "text": "cable connection to equipment (e.g. vessel, tank, pipe and drum)  is checked.",
        "order": 94,
        "textFa": "اتصال کابل به تجهیزات (مانند ظرف، مخزن، لوله و درام) بررسی شده است.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "98",
        "group": "Cathodic Protection System",
        "text": "Pre-com activities are done.",
        "order": 95,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی انجام شده‌اند.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "99",
        "group": "Cathodic Protection System",
        "text": "Energizing is checked",
        "order": 96,
        "textFa": "برق‌دار کردن بررسی شده است.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "100",
        "group": "Cathodic Protection System",
        "text": "Safety/ warning signs are installed",
        "order": 97,
        "textFa": "علائم ایمنی/هشدار نصب شده‌اند.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "101",
        "group": "Cathodic Protection System",
        "text": "Electrical heat tracing is completed",
        "order": 98,
        "textFa": "هیت‌تریسینگ الکتریکی تکمیل شده است.",
        "groupFa": "سیستم حفاظت کاتدی"
      },
      {
        "reqNo": "102",
        "group": "Lighting (normal & emergency)",
        "text": "Lighting position, layout & number (as per project drawings) are checked and verified.",
        "order": 99,
        "textFa": "موقعیت، چیدمان و تعداد روشنایی (طبق نقشه‌های پروژه) بررسی و تأیید شده‌اند.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "103",
        "group": "Lighting (normal & emergency)",
        "text": "Normal & emergency panel of lighting system are checked.",
        "order": 100,
        "textFa": "تابلوی روشنایی نرمال و اضطراری بررسی شده‌اند.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "104",
        "group": "Lighting (normal & emergency)",
        "text": "Illumination (lux) of level gauge glasses is checked.",
        "order": 101,
        "textFa": "میزان روشنایی (لوکس) شیشه‌های سطح‌سنج بررسی شده است.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "105",
        "group": "Lighting (normal & emergency)",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 102,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "106",
        "group": "Lighting (normal & emergency)",
        "text": "Illumination (lux) of normal and emergency lighting systems is checked.",
        "order": 103,
        "textFa": "میزان روشنایی (لوکس) سیستم‌های روشنایی نرمال و اضطراری بررسی شده است.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "107",
        "group": "Lighting (normal & emergency)",
        "text": "Lighting certificates (e.g. explosion proof) are available as per design specifications.",
        "order": 104,
        "textFa": "گواهینامه‌های روشنایی (مانند ضدانفجار) طبق مشخصات فنی طراحی موجود است.",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      },
      {
        "reqNo": "108",
        "group": "Lighting (normal & emergency)",
        "text": "Is effect of power failure checked (Battery operation)?",
        "order": 105,
        "textFa": "اثر قطع برق (عملکرد باتری) بررسی شده است؟",
        "groupFa": "روشنایی (نرمال و اضطراری)"
      }
    ]
  },
  {
    "code": "instrument",
    "discipline": "instrument",
    "title": "Instrument",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All instrumentation equipment is installed and checked as per engineering design specifications (P&ID/ including Instrument hook-up diagram / Instrument installation specification / platform for readability if necessary / support against vibration if necessary).",
        "order": 1,
        "textFa": "تمام تجهیزات ابزاردقیق طبق مشخصات فنی طراحی (P&ID شامل نقشه‌ی هوک‌آپ ابزاردقیق / مشخصات نصب ابزاردقیق / پلتفرم برای خوانایی در صورت نیاز / ساپورت در برابر ویبره در صورت نیاز) نصب و بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "All electrical and pneumatic loops are checked as per engineering design specifications.",
        "order": 2,
        "textFa": "تمام لوپ‌های الکتریکی و پنوماتیکی طبق مشخصات فنی طراحی بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Pre-com documents are checked for all following parts? (Including test sheet and check lists, punch list, FAT/SAT report, As built drawing).",
        "order": 3,
        "textFa": "مدارک پیش‌راه‌اندازی برای تمام بخش‌های زیر بررسی شده‌اند؟ (شامل برگه‌های تست و چک‌لیست‌ها، پانچ‌لیست، گزارش FAT/SAT، نقشه‌ی As Built)",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "All field devices (e.g. indicator, junction box, cabinet) and technical room cabins are protected as per specifications (e.g. IP, weather-proofed)",
        "order": 4,
        "textFa": "تمام تجهیزات فیلد (مانند ایندیکاتور، جانکشن‌باکس، کابینت) و کابین‌های اتاق فنی طبق مشخصات (مانند درجه‌ی IP، مقاوم در برابر شرایط جوی) محافظت شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "All instrumentation devices are calibrated and checked",
        "order": 5,
        "textFa": "تمام تجهیزات ابزاردقیق کالیبره و بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Partial stroke & Solenoid test is checked and verified on all ESDVs.",
        "order": 6,
        "textFa": "تست Partial Stroke و سولنویید روی تمام شیرهای ESD بررسی و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "F&G devices/ logics (e.g. emergency alarms) and shutdown devices (e.g. ESD, fire dampers) are tested and verified as per latest cause & effect.",
        "order": 7,
        "textFa": "تجهیزات/منطق F&G (مانند آلارم‌های اضطراری) و تجهیزات شات‌داون (مانند ESD، دمپرهای آتش) طبق آخرین Cause & Effect تست و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Identification (e.g. tag number) is checked.",
        "order": 8,
        "textFa": "شناسایی (مانند شماره‌ی تگ) بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 9,
        "textFa": "تجهیزات از نظر آسیب مکانیکی بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Grounding (earth) connection is in place and checked",
        "order": 10,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "PSV set point is check and verified.",
        "order": 11,
        "textFa": "نقطه‌ی تنظیم PSV بررسی و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Is effect of instrument air failure checked?",
        "order": 12,
        "textFa": "اثر قطع هوای ابزاردقیق بررسی شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Are emergency lightings in control room, power station in place & checked on regular basis?",
        "order": 13,
        "textFa": "روشنایی اضطراری در اتاق کنترل و نیروگاه برقرار است و به‌صورت دوره‌ای بررسی می‌شود؟",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Measuring and safety devices (e.g. P/T transmitters, enclosure, flushing to flare ...) are in operation. (from mech rotary)",
        "order": 14,
        "textFa": "تجهیزات اندازه‌گیری و ایمنی (مانند ترانسمیترهای فشار/دما، محفظه، فلاشینگ به فلر و ...) در حال کار هستند. (از مکانیک روتاری)",
        "groupFa": null
      }
    ]
  },
  {
    "code": "control_system",
    "discipline": "control_system",
    "title": "Control System",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Control functions are verified in accordance with latest cause & effect/shut down logic /pcs interlock.",
        "order": 1,
        "textFa": "عملکردهای کنترلی طبق آخرین Cause & Effect/منطق شات‌داون/اینترلاک PCS تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "DCS/PLC  logics are tested.",
        "order": 2,
        "textFa": "منطق DCS/PLC تست شده است.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Grounding (earth) connection is in place and checked (IE&PE).",
        "order": 3,
        "textFa": "اتصال زمین (ارت) برقرار و بررسی شده است (IE&PE).",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "List of set points (pre- & main alarms, trips) are checked and verified.",
        "order": 4,
        "textFa": "لیست نقاط تنظیم (آلارم‌های اولیه و اصلی، تریپ‌ها) بررسی و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "UPS / batteries should be on service",
        "order": 5,
        "textFa": "UPS/باتری‌ها باید در سرویس باشند.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Data link (master/ slave) related to and Fiber optic are checked .",
        "order": 6,
        "textFa": "لینک داده (مستر/اسلیو) مربوطه و فیبر نوری بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "System/ marshalling cabinets in LCC are checked and verified. /FAT/SAT has been done",
        "order": 7,
        "textFa": "کابینت‌های سیستم/مارشالینگ در LCC بررسی و تأیید شده‌اند. FAT/SAT انجام شده است.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "System cabinets are energized.",
        "order": 8,
        "textFa": "کابینت‌های سیستم برق‌دار شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Marshalling cabinets are energized.",
        "order": 9,
        "textFa": "کابینت‌های مارشالینگ برق‌دار شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Data link (master/ slave) related to package are checked.",
        "order": 10,
        "textFa": "لینک داده (مستر/اسلیو) مربوط به پکیج بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Are emergency shutdown system operational and correct assignment documented / tested",
        "order": 11,
        "textFa": "سیستم شات‌داون اضطراری عملیاتی است و تخصیص صحیح آن مستندسازی/تست شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "USS system",
        "order": 12,
        "textFa": "سیستم USS",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "F&G logics (e.g. emergency alarms) and shutdown logic (e.g. ESD) are tested and verified as per latest document.",
        "order": 13,
        "textFa": "منطق F&G (مانند آلارم‌های اضطراری) و منطق شات‌داون (مانند ESD) طبق آخرین مدرک تست و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Checking ups1/2 and non ups power  for all cabinet",
        "order": 14,
        "textFa": "بررسی برق UPS1/2 و برق غیر UPS برای تمام کابینت‌ها",
        "groupFa": null
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "Data link (master/ slave)  related to PDCS are checked",
        "order": 15,
        "textFa": "لینک داده (مستر/اسلیو) مربوط به PDCS بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "interface signal’s between all LCC’& SS",
        "order": 16,
        "textFa": "سیگنال‌های اینترفیس بین تمام LCCها و SS",
        "groupFa": null
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "requirement for automation system are checked and completed?",
        "order": 17,
        "textFa": "الزامات سیستم اتوماسیون بررسی و تکمیل شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "automation system license check and verify?",
        "order": 18,
        "textFa": "لایسنس سیستم اتوماسیون بررسی و تأیید شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "list of documents to be send to contractor?",
        "order": 19,
        "textFa": "لیست مدارکی که باید به پیمانکار ارسال شود؟",
        "groupFa": null
      }
    ]
  },
  {
    "code": "telecom",
    "discipline": "telecom",
    "title": "Telecom",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Communication systems (e.g. fiber optic/ CCTV/ PABX/ AISS/ Hotline/ LAN/ ACU/ VHF/ UHF trunk/ PA&GA)) are tested and verified",
        "order": 1,
        "textFa": "سیستم‌های ارتباطی (مانند فیبر نوری/CCTV/PABX/AISS/هات‌لاین/LAN/ACU/ترانک VHF/UHF/PA&GA) تست و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "Is PAGA system in service?",
        "order": 2,
        "textFa": "سیستم PAGA در سرویس است؟",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Are Telecom check list regarding PAGA completed without any punch A & B?",
        "order": 3,
        "textFa": "چک‌لیست مخابرات مربوط به PAGA بدون هیچ پانچ A و B تکمیل شده است؟",
        "groupFa": null
      }
    ]
  },
  {
    "code": "piping_process",
    "discipline": "piping_process",
    "title": "Piping & Process",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Pre-commissioning (Pre-Com) documents have been reviewed and approved.",
        "order": 1,
        "textFa": "مدارک پیش‌راه‌اندازی (Pre-Com) بازبینی و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "P&ID \"as built\" is available.",
        "order": 2,
        "textFa": "P&ID به‌صورت As Built موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Piping is selected (material point of view), routed and valved as per approved PIDs.",
        "order": 3,
        "textFa": "لوله‌کشی (از نظر جنس)، مسیردهی و شیرگذاری طبق P&IDهای تأییدشده انجام شده است.",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "All piping & valves have been installed and supported as per design specifications.",
        "order": 4,
        "textFa": "تمام لوله‌ها و شیرها طبق مشخصات فنی طراحی نصب و ساپورت شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Post construction leak tests, hydro tests and documentation have been completed.",
        "order": 5,
        "textFa": "تست‌های نشتی و هیدرواستاتیک پس از ساخت و مستندسازی آن‌ها تکمیل شده است.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "All manual valves are checked.",
        "order": 6,
        "textFa": "تمام شیرهای دستی بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "All flushing & draining activities are completed.",
        "order": 7,
        "textFa": "تمام فعالیت‌های فلاشینگ و زهکشی تکمیل شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "All construction blinds have been removed.",
        "order": 8,
        "textFa": "تمام بلایندهای دوران ساخت برداشته شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "All flanges have been checked for proper gaskets and installation.",
        "order": 9,
        "textFa": "تمام فلنج‌ها از نظر گسکت مناسب و نصب صحیح بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "All drains and sewers have been inspected for plugs and covers.",
        "order": 10,
        "textFa": "تمام زهکش‌ها و فاضلاب‌ها از نظر پلاگ و درپوش بازرسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "All valves are rated for maximum operating pressure.",
        "order": 11,
        "textFa": "تمام شیرها متناسب با حداکثر فشار کاری رده‌بندی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "All valves are set in the proper position.",
        "order": 12,
        "textFa": "تمام شیرها در وضعیت صحیح تنظیم شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "All check valves are installed in the proper flow direction.",
        "order": 13,
        "textFa": "تمام شیرهای یک‌طرفه در جهت صحیح جریان نصب شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "PSV discharge piping will be unaffected or will tighten during actual discharge.",
        "order": 14,
        "textFa": "لوله‌ی خروجی PSV در هنگام تخلیه‌ی واقعی تحت‌تأثیر قرار نمی‌گیرد یا محکم می‌ماند.",
        "groupFa": null
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "QC documentations (e.g. weld test) have been conducted and documented.",
        "order": 15,
        "textFa": "مستندات کنترل کیفیت (مانند تست جوش) انجام و مستندسازی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "Piping has been installed to prevent freezing or plugging.",
        "order": 16,
        "textFa": "لوله‌کشی به‌گونه‌ای نصب شده که از یخ‌زدگی یا گرفتگی جلوگیری شود.",
        "groupFa": null
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "Piping supports are checked.",
        "order": 17,
        "textFa": "ساپورت‌های لوله بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "Piping documentations are available (including list & location of all blinds, Spades, spectacle & key locking)",
        "order": 18,
        "textFa": "مستندات لوله‌کشی موجود است (شامل لیست و محل تمام بلایندها، اسپید، اسپکتاکل و قفل کلید).",
        "groupFa": null
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "Pipe tightness is checked and verified.",
        "order": 19,
        "textFa": "آب‌بندی لوله بررسی و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "20",
        "group": null,
        "text": "Safety cautions as per required permits are followed.",
        "order": 20,
        "textFa": "نکات ایمنی طبق مجوزهای موردنیاز رعایت شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "21",
        "group": null,
        "text": "All piping and related connections are marked as per design specifications.",
        "order": 21,
        "textFa": "تمام لوله‌ها و اتصالات مربوطه طبق مشخصات فنی طراحی علامت‌گذاری شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "22",
        "group": null,
        "text": "Water/ foam monitor, hydrant are installed?",
        "order": 22,
        "textFa": "مانیتور آب/فوم و هیدرانت نصب شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "23",
        "group": null,
        "text": "Fire fighting equipment (e.g. water spray nozzle, deluge package, foaming package) are installed and checked as per engineering design documents.",
        "order": 23,
        "textFa": "تجهیزات آتش‌نشانی (مانند نازل اسپری آب، پکیج دلوژ، پکیج فوم) طبق مدارک فنی طراحی نصب و بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "24",
        "group": null,
        "text": "Safety shower and eye wash are installed?",
        "order": 24,
        "textFa": "دوش ایمنی و چشم‌شوی نصب شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "25",
        "group": null,
        "text": "Leak tests of equipment (e.g. vessels, pipes, columns) are checked and verified",
        "order": 25,
        "textFa": "تست‌های نشتی تجهیزات (مانند ظروف، لوله‌ها، برج‌ها) بررسی و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "26",
        "group": null,
        "text": "chemicals are loaded in tanks?",
        "order": 26,
        "textFa": "مواد شیمیایی داخل مخازن بارگیری شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "27",
        "group": null,
        "text": "All chemical treatment activities (e.g. pickling, chemical cleaning) have been completed?",
        "order": 27,
        "textFa": "تمام فعالیت‌های تصفیه‌ی شیمیایی (مانند پیکلینگ، شست‌وشوی شیمیایی) تکمیل شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "28",
        "group": null,
        "text": "All utility systems (e.g. air, steam, fuel) are in operation?",
        "order": 28,
        "textFa": "تمام سیستم‌های یوتیلیتی (مانند هوا، بخار، سوخت) در حال کار هستند؟",
        "groupFa": null
      },
      {
        "reqNo": "29",
        "group": null,
        "text": "hydraulic unit/pakage & network  are filled with appropriate oil ?",
        "order": 29,
        "textFa": "واحد/پکیج و شبکه‌ی هیدرولیک با روغن مناسب پر شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "30",
        "group": null,
        "text": "All inerting activities are carried out?",
        "order": 30,
        "textFa": "تمام فعالیت‌های اینرت‌سازی انجام شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "31",
        "group": null,
        "text": "Car seals or locking devices on block valves & safety equipment are installed?",
        "order": 31,
        "textFa": "سیل‌های کار (Car Seal) یا وسایل قفل‌کننده روی شیرهای بلوک و تجهیزات ایمنی نصب شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "32",
        "group": null,
        "text": "PSV set point is check and verified?",
        "order": 32,
        "textFa": "نقطه‌ی تنظیم PSV بررسی و تأیید شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "33",
        "group": null,
        "text": "Temporary blanks required for start-up are defined, provided and installed.",
        "order": 33,
        "textFa": "بلایندهای موقت موردنیاز برای استارت‌آپ تعیین، تأمین و نصب شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "34",
        "group": null,
        "text": "anti crossion material to be checked?",
        "order": 34,
        "textFa": "مواد ضدخوردگی بررسی شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "35",
        "group": null,
        "text": "open drain to be checked?",
        "order": 35,
        "textFa": "زهکش باز (Open Drain) بررسی شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "36",
        "group": null,
        "text": "آيا سيستم زهکشي بررسي و تاييد شده است؟",
        "order": 36,
        "textFa": "آيا سيستم زهکشي بررسي و تاييد شده است؟",
        "groupFa": null
      },
      {
        "reqNo": "37",
        "group": null,
        "text": "ESD Procedures  is available?",
        "order": 37,
        "textFa": "دستورالعمل‌های ESD موجود است؟",
        "groupFa": null
      },
      {
        "reqNo": "38",
        "group": null,
        "text": "process by path system checked  and chemical connected to the sumps are checked and verified?",
        "order": 38,
        "textFa": "سیستم بای‌پس فرایند و اتصال مواد شیمیایی به سامپ‌ها بررسی و تأیید شده‌اند؟",
        "groupFa": null
      }
    ]
  },
  {
    "code": "mechanic_fix",
    "discipline": "mechanic_fix",
    "title": "Mechanic (Fix)",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All equipment (e.g. pressure vessel /storage tank /strainer / filter / safety valve / rupture disc) are installed as per engineering design specifications.",
        "order": 1,
        "textFa": "تمام تجهیزات (مانند ظرف تحت فشار/مخزن ذخیره/صافی/فیلتر/شیر اطمینان/دیسک پارگی) طبق مشخصات فنی طراحی نصب شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "General arrangement drawing (plot plan) is available",
        "order": 2,
        "textFa": "نقشه‌ی چیدمان کلی (Plot Plan) موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Vessel and pipe documentation are available",
        "order": 3,
        "textFa": "مستندات ظروف و لوله‌ها موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Pre-com activities are done and verified",
        "order": 4,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی انجام و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Safety valves are installed and tested.",
        "order": 5,
        "textFa": "شیرهای اطمینان نصب و تست شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Rupture discs and breathing valves are installed and checked.",
        "order": 6,
        "textFa": "دیسک‌های پارگی و شیرهای تنفسی نصب و بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Vessels and ancillary pipes are cleaned and rinsed",
        "order": 7,
        "textFa": "ظروف و لوله‌های جانبی تمیز و شست‌وشو شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Leak tests of equipment (e.g. vessels, pipes, columns) are checked and verified.",
        "order": 8,
        "textFa": "تست‌های نشتی تجهیزات (مانند ظروف، لوله‌ها، برج‌ها) بررسی و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Vessels and ancillary pipes are dried and neutralized",
        "order": 9,
        "textFa": "ظروف و لوله‌های جانبی خشک و خنثی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Filters are checked and marked",
        "order": 10,
        "textFa": "فیلترها بررسی و علامت‌گذاری شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "All hand valves are checked and verified",
        "order": 11,
        "textFa": "تمام شیرهای دستی بررسی و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Safety cautions as per required permits are followed",
        "order": 12,
        "textFa": "نکات ایمنی طبق مجوزهای موردنیاز رعایت شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "chemicals are loaded in tanks",
        "order": 13,
        "textFa": "مواد شیمیایی داخل مخازن بارگیری شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 14,
        "textFa": "تجهیزات از نظر آسیب مکانیکی بررسی شده‌اند.",
        "groupFa": null
      }
    ]
  },
  {
    "code": "mechanic_rotary",
    "discipline": "mechanic_rotary",
    "title": "Mechanic (Rotary)",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All equipment (pump / compressor / fan / blowers / diesel engine) is installed and test as per design specifications.",
        "order": 1,
        "textFa": "تمام تجهیزات (پمپ/کمپرسور/فن/بلوئر/موتور دیزل) طبق مشخصات فنی طراحی نصب و تست شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "P&ID \"as built\" is available.",
        "order": 2,
        "textFa": "P&ID به‌صورت As Built موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "General arrangement drawing (plot plan) is available.",
        "order": 3,
        "textFa": "نقشه‌ی چیدمان کلی (Plot Plan) موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Pre-com activities (e.g. preservation) are done and verified",
        "order": 4,
        "textFa": "فعالیت‌های پیش‌راه‌اندازی (مانند نگهداری/Preservation) انجام و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Commissioning functional tests are completed and verified.",
        "order": 5,
        "textFa": "تست‌های عملکردی راه‌اندازی تکمیل و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Commissioning operational tests are completed and verified.",
        "order": 6,
        "textFa": "تست‌های عملیاتی راه‌اندازی تکمیل و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Manufacturer’s representative signed off.",
        "order": 7,
        "textFa": "نماینده‌ی سازنده تأییدیه‌ی نهایی را امضا کرده است.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Adequate spare parts are considered and available.",
        "order": 8,
        "textFa": "قطعات یدکی کافی در نظر گرفته شده و موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Noise and vibration measurement is done for required machines and verified.",
        "order": 9,
        "textFa": "اندازه‌گیری صدا و ویبره برای ماشین‌آلات موردنیاز انجام و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Minimum & Maximum flow requirement is considered and verified.",
        "order": 10,
        "textFa": "الزامات حداقل و حداکثر دبی در نظر گرفته شده و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Equipment grouted?",
        "order": 11,
        "textFa": "تجهیزات گروت‌ریزی شده‌اند؟",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Lube and drain connection are installed and checked.",
        "order": 12,
        "textFa": "اتصالات روغن‌کاری و زهکشی نصب و بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Mechanical catalogues is issued and available.",
        "order": 13,
        "textFa": "کاتالوگ‌های مکانیکی صادر و موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Lube oil flushing is carried out. All moving parts have been lubricated as per vendor instruction. Oil level is okay. Lube oil system is in operation and checked.",
        "order": 14,
        "textFa": "فلاشینگ روغن روان‌کاری انجام شده است. تمام قطعات متحرک طبق دستورالعمل سازنده روان‌کاری شده‌اند. سطح روغن مناسب است. سیستم روغن روان‌کاری در حال کار و بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "Regarding rotating parts of equipment, required safety guards are in place.",
        "order": 15,
        "textFa": "در خصوص قطعات دوار تجهیزات، گاردهای ایمنی موردنیاز نصب شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "Mechanical seals are checked and verified.",
        "order": 16,
        "textFa": "سیل‌های مکانیکی بررسی و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "Level in suction vessel is checked and verified.",
        "order": 17,
        "textFa": "سطح در ظرف مکش بررسی و تأیید شده است.",
        "groupFa": null
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "Explosion doors are adjusted and verified.",
        "order": 18,
        "textFa": "درب‌های انفجار (Explosion Doors) تنظیم و تأیید شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "Cooling system is in operation and checked.",
        "order": 19,
        "textFa": "سیستم خنک‌کاری در حال کار و بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "20",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 20,
        "textFa": "تجهیزات از نظر آسیب مکانیکی بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "21",
        "group": null,
        "text": "Coupling connection is done and checked",
        "order": 21,
        "textFa": "اتصال کوپلینگ انجام و بررسی شده است.",
        "groupFa": null
      }
    ]
  },
  {
    "code": "hse_erp_fifi",
    "discipline": "hse_fifi_env_health",
    "title": "HSE, ERP & FIFI",
    "requirements": [
      {
        "reqNo": "1",
        "group": "Safety Issues",
        "text": "Are spades, blinds, spectacle blinds and key locking list available?",
        "order": 1,
        "textFa": "لیست اسپیدها، بلایندها، اسپکتاکل‌بلایندها و قفل کلید موجود است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "2",
        "group": "Safety Issues",
        "text": "Are lettering and colour coding sign done?",
        "order": 2,
        "textFa": "حروف‌نگاری و علائم رنگی (Colour Coding) انجام شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "3",
        "group": "Safety Issues",
        "text": "Scaffolding and temporary platforms removed as required to allow for safe operation?",
        "order": 3,
        "textFa": "داربست‌ها و سکوهای موقت طبق نیاز برای اجازه‌ی بهره‌برداری ایمن برداشته شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "4",
        "group": "Safety Issues",
        "text": "All combustible material removed (e.g. scaffold boards, tarps, plastic, trash etc.)?",
        "order": 4,
        "textFa": "تمام مواد قابل‌اشتعال (مانند تخته‌های داربست، برزنت، پلاستیک، زباله و غیره) برداشته شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "5",
        "group": "Safety Issues",
        "text": "Safety representatives appointed",
        "order": 5,
        "textFa": "نماینده(های) ایمنی تعیین شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "6",
        "group": "Safety Issues",
        "text": "Are PPE protection warning signs installed?",
        "order": 6,
        "textFa": "تابلوهای هشدار الزام استفاده از PPE نصب شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "7",
        "group": "Safety Issues",
        "text": "Are Inerting systems in place?",
        "order": 7,
        "textFa": "سیستم‌های اینرت‌سازی برقرار است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "8",
        "group": "Safety Issues",
        "text": "Are all utility stations N2 instrument, operating air, steam and water lines marked up and in operation?",
        "order": 8,
        "textFa": "تمام ایستگاه‌های یوتیلیتی خطوط نیتروژن ابزاردقیق، هوای عملیاتی، بخار و آب علامت‌گذاری شده و در حال کار هستند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "9",
        "group": "Safety Issues",
        "text": "All road safety-related painting complete (cross walks, railings, kerbs, guardrails etc.)?",
        "order": 9,
        "textFa": "تمام رنگ‌آمیزی‌های مربوط به ایمنی جاده تکمیل شده است (خطوط عابر پیاده، نرده‌ها، جدول‌ها، گاردریل‌ها و غیره)؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "10",
        "group": "Safety Issues",
        "text": "are plat forms and ladders constructed correctly ?",
        "order": 10,
        "textFa": "سکوها و نردبان‌ها به‌درستی ساخته شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "11",
        "group": "Safety Issues",
        "text": "Are handrails , cages and guards Installed?",
        "order": 11,
        "textFa": "نرده‌های دستی، قفس‌ها و گاردها نصب شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "12",
        "group": "Safety Issues",
        "text": "Are all safeguards including signs, chains etc. installed?",
        "order": 12,
        "textFa": "تمام حفاظ‌ها شامل علائم، زنجیرها و غیره نصب شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "13",
        "group": "Safety Issues",
        "text": "Are hot, cold surfaces insulated?",
        "order": 13,
        "textFa": "سطوح گرم و سرد عایق‌کاری شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "14",
        "group": "Safety Issues",
        "text": "fire proofing coating is checked?",
        "order": 14,
        "textFa": "پوشش ضدحریق بررسی شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "15",
        "group": "Safety Issues",
        "text": "Are required noise reduction systems in place?",
        "order": 15,
        "textFa": "سیستم‌های کاهش صدای موردنیاز برقرار است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "16",
        "group": "Safety Issues",
        "text": "Rotating facilities covered",
        "order": 16,
        "textFa": "تجهیزات دوار پوشانده شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "17",
        "group": "Safety Issues",
        "text": "All mechanical tools/equipment not required by the design or for operations have been removed",
        "order": 17,
        "textFa": "تمام ابزار/تجهیزات مکانیکی که برای طراحی یا بهره‌برداری موردنیاز نیستند، برداشته شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "18",
        "group": "Safety Issues",
        "text": "Fire protective insulation of constructions and vessels in place",
        "order": 18,
        "textFa": "عایق‌کاری محافظ آتش سازه‌ها و ظروف برقرار است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "19",
        "group": "Safety Issues",
        "text": "Access routes for fire brigade are cleared.",
        "order": 19,
        "textFa": "مسیرهای دسترسی برای آتش‌نشانی باز و بدون مانع است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "20",
        "group": "Safety Issues",
        "text": "Are Safety Eq. check list completed(PPE & Machinery)",
        "order": 20,
        "textFa": "چک‌لیست تجهیزات ایمنی (PPE و ماشین‌آلات) تکمیل شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "21",
        "group": "Safety Issues",
        "text": "Fire water network is tested (OTP) as per design specifications. Flushing & Cleaning?",
        "order": 21,
        "textFa": "شبکه‌ی آب آتش‌نشانی طبق مشخصات فنی طراحی تست (OTP) شده است. فلاشینگ و تمیزکاری انجام شده؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "22",
        "group": "Safety Issues",
        "text": "Water/ foam monitor, hydrant are installed & tested (OTP) as per design specifications.",
        "order": 22,
        "textFa": "مانیتور آب/فوم و هیدرانت طبق مشخصات فنی طراحی نصب و تست (OTP) شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "23",
        "group": "Safety Issues",
        "text": "Fixed fire fighting equipment ( eg. foaming package & etc.) are installed & tested (OTP) as per design specifications..",
        "order": 23,
        "textFa": "تجهیزات ثابت آتش‌نشانی (مانند پکیج فوم و غیره) طبق مشخصات فنی طراحی نصب و تست (OTP) شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "24",
        "group": "Safety Issues",
        "text": "Loose fire fighting equipment (e.g. fire extinguishers, fire blankets) are arranged sufficiently in process and non-process areas as per design specifications.",
        "order": 24,
        "textFa": "تجهیزات آتش‌نشانی سیار (مانند کپسول آتش‌نشانی، پتوی آتش) به‌اندازه‌ی کافی در مناطق فرایندی و غیرفرایندی طبق مشخصات فنی طراحی چیده شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "25",
        "group": "Safety Issues",
        "text": "Are deluge system installed-completed-tested and operational(Operation test has been done?) water spray nozzle & fusible plugs are in service?",
        "order": 25,
        "textFa": "سیستم دلوژ نصب، تکمیل، تست و عملیاتی شده است (تست عملیاتی انجام شده؟)؛ نازل اسپری آب و فیوزیبل‌پلاگ‌ها در سرویس هستند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "26",
        "group": "Safety Issues",
        "text": "Fire station building in operation as per commissioning requirements.",
        "order": 26,
        "textFa": "ساختمان ایستگاه آتش‌نشانی طبق الزامات راه‌اندازی در حال بهره‌برداری است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "27",
        "group": "Safety Issues",
        "text": "Fire station building is equipped as per commissioning requirements",
        "order": 27,
        "textFa": "ساختمان ایستگاه آتش‌نشانی طبق الزامات راه‌اندازی تجهیز شده است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "28",
        "group": "Safety Issues",
        "text": "Fire pump station is in operation as per commissioning requirements. Operation test has been done? )",
        "order": 28,
        "textFa": "ایستگاه پمپ آتش‌نشانی طبق الزامات راه‌اندازی در حال کار است. تست عملیاتی انجام شده؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "29",
        "group": "Safety Issues",
        "text": "Fire fighting trucks (water, foam & powder) are provided as per commissioning requirements",
        "order": 29,
        "textFa": "خودروهای آتش‌نشانی (آب، فوم و پودر) طبق الزامات راه‌اندازی تأمین شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "30",
        "group": "Safety Issues",
        "text": "Mobile (trailer-mounted) fire fighting equipment is provided as per commissioning requirements.",
        "order": 30,
        "textFa": "تجهیزات سیار آتش‌نشانی (نصب‌شده روی تریلر) طبق الزامات راه‌اندازی تأمین شده‌اند.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "31",
        "group": "Safety Issues",
        "text": "Fire fighting brigade is qualified and properly trained",
        "order": 31,
        "textFa": "تیم آتش‌نشانی واجد شرایط و به‌درستی آموزش‌دیده است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "32",
        "group": "Safety Issues",
        "text": "CO2 flooding system operational",
        "order": 32,
        "textFa": "سیستم سیل‌آب CO2 عملیاتی است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "33",
        "group": "Safety Issues",
        "text": "Are F&G Precom checklist completed?",
        "order": 33,
        "textFa": "چک‌لیست پیش‌راه‌اندازی F&G تکمیل شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "34",
        "group": "Safety Issues",
        "text": "Are all F&G detectors calibrated & synchronized with F&G panel?",
        "order": 34,
        "textFa": "تمام دتکتورهای F&G کالیبره و با پنل F&G سنکرون شده‌اند؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "35",
        "group": "Safety Issues",
        "text": "Are Instrument test sheet regarding Analyser & actuated valve (ESD, BDV , …) completed",
        "order": 35,
        "textFa": "برگه‌ی تست ابزاردقیق مربوط به آنالایزر و شیرهای عملگردار (ESD، BDV و ...) تکمیل شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "36",
        "group": "Safety Issues",
        "text": "Are Instrument function test regarding F&G completed?",
        "order": 36,
        "textFa": "تست عملکرد ابزاردقیق مربوط به F&G تکمیل شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "37",
        "group": "Safety Issues",
        "text": "Are operation test for F&G/ESD system has been done?",
        "order": 37,
        "textFa": "تست عملیاتی سیستم F&G/ESD انجام شده است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "38",
        "group": "Safety Issues",
        "text": "Signal of fire detection system routed to control room and tested",
        "order": 38,
        "textFa": "سیگنال سیستم آشکارساز حریق به اتاق کنترل مسیردهی و تست شده است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "39",
        "group": "Safety Issues",
        "text": "Fire alarm system checked and sufficient; Documentation available",
        "order": 39,
        "textFa": "سیستم اعلام حریق بررسی شده و کافی است؛ مستندات موجود است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "40",
        "group": "Safety Issues",
        "text": "Is PAGA system in service?",
        "order": 40,
        "textFa": "سیستم PAGA در سرویس است؟",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "40",
        "group": "Safety Issues",
        "text": "storage and warehouse safety for  chemical and other needed material for sturtup checked and verified.",
        "order": 41,
        "textFa": "ایمنی انبار و انبارداری برای مواد شیمیایی و سایر مواد موردنیاز استارت‌آپ بررسی و تأیید شده است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "41",
        "group": "Safety Issues",
        "text": "Feeder /LCS function test is in test position and checked.",
        "order": 42,
        "textFa": "تست عملکرد فیدر/LCS در وضعیت تست انجام و بررسی شده است.",
        "groupFa": "مسائل ایمنی"
      },
      {
        "reqNo": "42",
        "group": "Environmental Issues",
        "text": "Is disposal material organised ?",
        "order": 43,
        "textFa": "مواد قابل دفع سازمان‌دهی شده‌اند؟",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "43",
        "group": "Environmental Issues",
        "text": "Commissioning environmental aspects have been considered in operating/ commissioning manuals and followed accordingly.",
        "order": 44,
        "textFa": "جنبه‌های زیست‌محیطی راه‌اندازی در دستورالعمل‌های بهره‌برداری/راه‌اندازی لحاظ و بر همین اساس رعایت شده‌اند.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "44",
        "group": "Environmental Issues",
        "text": "Facilities for conducting of wastewater into treatment in operation.",
        "order": 45,
        "textFa": "تأسیسات انتقال فاضلاب به واحد تصفیه در حال کار است.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "45",
        "group": "Environmental Issues",
        "text": "is waste water treatment in service?",
        "order": 46,
        "textFa": "واحد تصفیه‌ی فاضلاب در سرویس است؟",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "46",
        "group": "Environmental Issues",
        "text": "Facilities for collecting & conducting of effluent into treatment are in operation.",
        "order": 47,
        "textFa": "تأسیسات جمع‌آوری و انتقال پساب به واحد تصفیه در حال کار است.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "46",
        "group": "Environmental Issues",
        "text": "Soil pollution is prevented as per project design specifications. Measures to be checked and verified.",
        "order": 48,
        "textFa": "آلودگی خاک طبق مشخصات فنی طراحی پروژه جلوگیری می‌شود. اقدامات مربوطه بررسی و تأیید شده‌اند.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "47",
        "group": "Environmental Issues",
        "text": "Emission to air is controlled as per project design specifications (e.g. waste & emission inventory). Measures to be checked and verified.",
        "order": 49,
        "textFa": "انتشار به هوا طبق مشخصات فنی طراحی پروژه (مانند اینونتوری پسماند و انتشار) کنترل می‌شود. اقدامات مربوطه بررسی و تأیید شده‌اند.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "48",
        "group": "Environmental Issues",
        "text": "Oil spillage is controlled. Preventive measures to be checked and verified.",
        "order": 50,
        "textFa": "نشت روغن کنترل می‌شود. اقدامات پیشگیرانه بررسی و تأیید شده‌اند.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "49",
        "group": "Environmental Issues",
        "text": "Temporary disposal area is checked and verified.",
        "order": 51,
        "textFa": "محل موقت دفع بررسی و تأیید شده است.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "49",
        "group": "Environmental Issues",
        "text": "List of all hazardous substances are available",
        "order": 52,
        "textFa": "لیست تمام مواد خطرناک موجود است.",
        "groupFa": "مسائل زیست‌محیطی"
      },
      {
        "reqNo": "50",
        "group": "Emergency Response Plan",
        "text": "ERP is available and approved (responsibilities are  clarified)",
        "order": 53,
        "textFa": "ERP موجود و تأییدشده است (مسئولیت‌ها مشخص شده‌اند).",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "51",
        "group": "Emergency Response Plan",
        "text": "Are emergency radio channel available",
        "order": 54,
        "textFa": "کانال رادیویی اضطراری موجود است؟",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "52",
        "group": "Emergency Response Plan",
        "text": "Personnel are properly aware about ERP & their roles in this regards.",
        "order": 55,
        "textFa": "پرسنل به‌درستی از ERP و نقش خود در این خصوص آگاه هستند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "53",
        "group": "Emergency Response Plan",
        "text": "All personnel are aware about ERP & their responsibilities?",
        "order": 56,
        "textFa": "تمام پرسنل از ERP و مسئولیت‌های خود آگاه هستند؟",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "54",
        "group": "Emergency Response Plan",
        "text": "Action plans for possible events/ incidents are available",
        "order": 57,
        "textFa": "برنامه‌های اقدام برای رویدادها/حوادث احتمالی موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "55",
        "group": "Emergency Response Plan",
        "text": "Alarm plans/ MSDS/... are available at fire station.",
        "order": 58,
        "textFa": "برنامه‌های آلارم/MSDS و... در ایستگاه آتش‌نشانی موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "56",
        "group": "Emergency Response Plan",
        "text": "Alarm and signal of safety systems (F&G system) are tested (OTP) properly.",
        "order": 59,
        "textFa": "آلارم و سیگنال سیستم‌های ایمنی (سیستم F&G) به‌درستی تست (OTP) شده‌اند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "57",
        "group": "Emergency Response Plan",
        "text": "required internal & external communication channels have been provided and checked as per ERP",
        "order": 60,
        "textFa": "کانال‌های ارتباطی داخلی و خارجی موردنیاز طبق ERP تأمین و بررسی شده‌اند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "58",
        "group": "Emergency Response Plan",
        "text": "ERP exercises & drills are carried out regularly",
        "order": 61,
        "textFa": "تمرین‌ها و مانورهای ERP به‌صورت منظم انجام می‌شوند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "59",
        "group": "Emergency Response Plan",
        "text": "Emergency team members are qualified and properly trained",
        "order": 62,
        "textFa": "اعضای تیم اضطراری واجد شرایط و به‌درستی آموزش‌دیده‌اند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "60",
        "group": "Emergency Response Plan",
        "text": "Emergency call lists (e.g. authorities, medical services) are available.",
        "order": 63,
        "textFa": "لیست تماس‌های اضطراری (مانند مراجع، خدمات پزشکی) موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "61",
        "group": "Emergency Response Plan",
        "text": "Drill results and findings are investigated.",
        "order": 64,
        "textFa": "نتایج و یافته‌های مانورها بررسی می‌شوند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "62",
        "group": "Emergency Response Plan",
        "text": "Escape routes and evacuation plan are cleared and marked.",
        "order": 65,
        "textFa": "مسیرهای فرار و برنامه‌ی تخلیه باز و علامت‌گذاری شده‌اند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "63",
        "group": "Emergency Response Plan",
        "text": "Gathering (muster) points are defined and marked",
        "order": 66,
        "textFa": "نقاط تجمع (Muster Point) تعریف و علامت‌گذاری شده‌اند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "64",
        "group": "Emergency Response Plan",
        "text": "Daily up-dated road map of site is available at fire station.",
        "order": 67,
        "textFa": "نقشه‌ی راه سایت به‌صورت روزانه به‌روزشده در ایستگاه آتش‌نشانی موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "65",
        "group": "Emergency Response Plan",
        "text": "Escape mask set is available for all personnel.",
        "order": 68,
        "textFa": "ماسک فرار برای تمام پرسنل موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "66",
        "group": "Emergency Response Plan",
        "text": "Portable toxic gas detector is available for Effective personnel.",
        "order": 69,
        "textFa": "دتکتور گاز سمی قابل‌حمل برای پرسنل مرتبط موجود است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "67",
        "group": "Emergency Response Plan",
        "text": "ERP is upgraded with respect to changes, modifications, new requirements.",
        "order": 70,
        "textFa": "ERP با توجه به تغییرات، اصلاحات و الزامات جدید به‌روزرسانی می‌شود.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "68",
        "group": "Emergency Response Plan",
        "text": "Safety shower and eye wash facilities are properly installed, tested & operational (OTP)?",
        "order": 71,
        "textFa": "تأسیسات دوش ایمنی و چشم‌شوی به‌درستی نصب، تست و عملیاتی (OTP) شده‌اند؟",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "69",
        "group": "Emergency Response Plan",
        "text": "General alarm available and tested",
        "order": 72,
        "textFa": "آلارم عمومی موجود و تست شده است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "70",
        "group": "Emergency Response Plan",
        "text": "SCBA available as appropriate?",
        "order": 73,
        "textFa": "SCBA به‌میزان مناسب موجود است؟",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "71",
        "group": "Emergency Response Plan",
        "text": "Red line operational",
        "order": 74,
        "textFa": "خط قرمز (Red Line) عملیاتی است.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "72",
        "group": "Emergency Response Plan",
        "text": "Housekeeping procedure is defined and followed",
        "order": 75,
        "textFa": "دستورالعمل نظم و ترتیب (Housekeeping) تعریف و رعایت می‌شود.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "73",
        "group": "Emergency Response Plan",
        "text": "Fixed  TGD are checked and ready?",
        "order": 76,
        "textFa": "دتکتورهای گاز سمی ثابت (TGD) بررسی و آماده هستند؟",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "74",
        "group": "Emergency Response Plan",
        "text": "Emergency and HSE signal inpute to specific panel",
        "order": 77,
        "textFa": "ورودی سیگنال‌های اضطراری و HSE به پنل مربوطه",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "75",
        "group": "Emergency Response Plan",
        "text": "The height of chemney to be corrected",
        "order": 78,
        "textFa": "ارتفاع دودکش باید اصلاح شود.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "76",
        "group": "Emergency Response Plan",
        "text": "Emergency electricity and emergency lighting must be connected to critical equipment.",
        "order": 79,
        "textFa": "برق اضطراری و روشنایی اضطراری باید به تجهیزات بحرانی متصل باشند.",
        "groupFa": "برنامه‌ی واکنش اضطراری (ERP)"
      },
      {
        "reqNo": "77",
        "group": "Documentation",
        "text": "Pre-Com & Com/ Operating manual are available",
        "order": 80,
        "textFa": "دستورالعمل پیش‌راه‌اندازی، راه‌اندازی و بهره‌برداری موجود است.",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "78",
        "group": "Documentation",
        "text": "The start-up procedures is available",
        "order": 81,
        "textFa": "دستورالعمل‌های استارت‌آپ موجود است.",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "79",
        "group": "Documentation",
        "text": "material safety data sheets are available",
        "order": 82,
        "textFa": "برگه‌های ایمنی مواد (MSDS) موجود است.",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "80",
        "group": "Documentation",
        "text": "Commissioning safety Procedures (e.g. PTW, SIMOPS) are available and followed.",
        "order": 83,
        "textFa": "دستورالعمل‌های ایمنی راه‌اندازی (مانند PTW، SIMOPS) موجود و رعایت می‌شوند.",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "81",
        "group": "Documentation",
        "text": "Safety cautions as per required permits are followed.",
        "order": 84,
        "textFa": "نکات ایمنی طبق مجوزهای موردنیاز رعایت شده‌اند.",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "81",
        "group": "Documentation",
        "text": "Management Of Change (MOC) is established & Executed?",
        "order": 85,
        "textFa": "مدیریت تغییر (MOC) برقرار و اجرا شده است؟",
        "groupFa": "مستندسازی"
      },
      {
        "reqNo": "82",
        "group": "Hazard Identification",
        "text": "Risk assessment procedure is available",
        "order": 86,
        "textFa": "دستورالعمل ارزیابی ریسک موجود است.",
        "groupFa": "شناسایی خطرات"
      },
      {
        "reqNo": "83",
        "group": "Hazard Identification",
        "text": "Risk assessment has been done according to the occupational safety and health requirements.",
        "order": 87,
        "textFa": "ارزیابی ریسک طبق الزامات ایمنی و بهداشت شغلی انجام شده است.",
        "groupFa": "شناسایی خطرات"
      },
      {
        "reqNo": "84",
        "group": "Hazard Identification",
        "text": "Hazardous substances register is available",
        "order": 88,
        "textFa": "رجیستر مواد خطرناک موجود است.",
        "groupFa": "شناسایی خطرات"
      },
      {
        "reqNo": "85",
        "group": "Hazard Identification",
        "text": "All recommended actions (RA findings) for safe start-up have been considered.",
        "order": 89,
        "textFa": "تمام اقدامات پیشنهادی (یافته‌های RA) برای استارت‌آپ ایمن لحاظ شده‌اند.",
        "groupFa": "شناسایی خطرات"
      },
      {
        "reqNo": "86",
        "group": "Hazard Identification",
        "text": "Commissioning JSA Procedure is available",
        "order": 90,
        "textFa": "دستورالعمل JSA راه‌اندازی موجود است.",
        "groupFa": "شناسایی خطرات"
      },
      {
        "reqNo": "87",
        "group": "Training",
        "text": "Training plan is available and followed",
        "order": 91,
        "textFa": "برنامه‌ی آموزش موجود و رعایت می‌شود.",
        "groupFa": "آموزش"
      },
      {
        "reqNo": "88",
        "group": "Training",
        "text": "Training facilities (e.g. document, equipment) are provided to enhance results and motivate trainees.",
        "order": 92,
        "textFa": "امکانات آموزشی (مانند مدرک، تجهیزات) برای بهبود نتایج و ایجاد انگیزه در آموزش‌گیرندگان تأمین شده‌اند.",
        "groupFa": "آموزش"
      },
      {
        "reqNo": "89",
        "group": "Communication",
        "text": "Communication plan is available",
        "order": 93,
        "textFa": "برنامه‌ی ارتباطات موجود است.",
        "groupFa": "ارتباطات"
      },
      {
        "reqNo": "90",
        "group": "Communication",
        "text": "Communication system is available",
        "order": 94,
        "textFa": "سیستم ارتباطات موجود است.",
        "groupFa": "ارتباطات"
      },
      {
        "reqNo": "91",
        "group": "Incident Investigation Reporting",
        "text": "Action plans for possible events/incidents are available",
        "order": 95,
        "textFa": "برنامه‌های اقدام برای رویدادها/حوادث احتمالی موجود است.",
        "groupFa": "گزارش‌دهی و بررسی حوادث"
      },
      {
        "reqNo": "92",
        "group": "Machinery/ Equipment safety",
        "text": "safeguards are provided to meet the minimum safety requirements",
        "order": 96,
        "textFa": "حفاظ‌ها برای برآورده‌کردن حداقل الزامات ایمنی تأمین شده‌اند.",
        "groupFa": "ایمنی ماشین‌آلات/تجهیزات"
      },
      {
        "reqNo": "93",
        "group": "Machinery/ Equipment safety",
        "text": "Worker's hands, fingers, and body are kept out the danger area.",
        "order": 97,
        "textFa": "دست‌ها، انگشتان و بدن کارگر از منطقه‌ی خطر دور نگه داشته می‌شوند.",
        "groupFa": "ایمنی ماشین‌آلات/تجهیزات"
      },
      {
        "reqNo": "94",
        "group": "Electrical safety",
        "text": "Electrical safety procedure is defined and followed",
        "order": 98,
        "textFa": "دستورالعمل ایمنی برق تعریف و رعایت می‌شود.",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "95",
        "group": "Electrical safety",
        "text": "LOTO system is defined and followed",
        "order": 99,
        "textFa": "سیستم LOTO تعریف و رعایت می‌شود.",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "96",
        "group": "Electrical safety",
        "text": "Power panels are equipped with RCCB device.",
        "order": 100,
        "textFa": "تابلوهای برق مجهز به کلید RCCB هستند.",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "97",
        "group": "Electrical safety",
        "text": "Power panels are grounded as per safety requirements.",
        "order": 101,
        "textFa": "تابلوهای برق طبق الزامات ایمنی ارت شده‌اند.",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "98",
        "group": "Electrical safety",
        "text": "Temporary Panels are removed",
        "order": 102,
        "textFa": "تابلوهای موقت برداشته شده‌اند.",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "99",
        "group": "Electrical safety",
        "text": "are portable cabins have electrical  safety checklist and followed?",
        "order": 103,
        "textFa": "کابین‌های سیار دارای چک‌لیست ایمنی برق هستند و رعایت می‌شود؟",
        "groupFa": "ایمنی برق"
      },
      {
        "reqNo": "100",
        "group": "PPE",
        "text": "Are PPE protection warning signs installed?",
        "order": 104,
        "textFa": "تابلوهای هشدار الزام استفاده از PPE نصب شده‌اند؟",
        "groupFa": "تجهیزات حفاظت فردی (PPE)"
      },
      {
        "reqNo": "101",
        "group": "PPE",
        "text": "PPE (e.g. goggle, harness, helmet, welding shield, ear plug & muff,...) are provided for each job",
        "order": 105,
        "textFa": "PPE (مانند عینک ایمنی، هارنس، کلاه ایمنی، شیلد جوشکاری، ایرپلاگ و ایرماف و ...) برای هر کار تأمین شده است.",
        "groupFa": "تجهیزات حفاظت فردی (PPE)"
      },
      {
        "reqNo": "102",
        "group": "PPE",
        "text": "All personnel have been trained to use PPE correctly.",
        "order": 106,
        "textFa": "تمام پرسنل برای استفاده‌ی صحیح از PPE آموزش دیده‌اند.",
        "groupFa": "تجهیزات حفاظت فردی (PPE)"
      }
    ]
  },
  {
    "code": "civil",
    "discipline": "civil",
    "title": "Civil",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Documents regarding pre-com operations are checked.",
        "order": 1,
        "textFa": "مدارک مربوط به عملیات پیش‌راه‌اندازی بررسی شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "Steel Structural is installed as per engineering design specifications.",
        "order": 2,
        "textFa": "سازه‌ی فلزی طبق مشخصات فنی طراحی نصب شده است.",
        "groupFa": null
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Concrete installed as per engineering design specifications.",
        "order": 3,
        "textFa": "بتن طبق مشخصات فنی طراحی اجرا شده است.",
        "groupFa": null
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Sewers/ drains installed as per engineering design specifications and tested.",
        "order": 4,
        "textFa": "فاضلاب‌ها/زهکش‌ها طبق مشخصات فنی طراحی نصب و تست شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Cable trenches are tiled and sand filled.",
        "order": 5,
        "textFa": "ترنچ کابل کاشی‌کاری و با شن پر شده است.",
        "groupFa": null
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Open ditches are fair sloped and cleaned for water leading.",
        "order": 6,
        "textFa": "کانال‌های باز شیب مناسب دارند و برای هدایت آب تمیز شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Fire wall installed for ESD valves and deluge packages.",
        "order": 7,
        "textFa": "دیوار آتش برای شیرهای ESD و پکیج‌های دلوژ نصب شده است.",
        "groupFa": null
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Paving in units extended; hunches are fair enough and extension joints are installed.",
        "order": 8,
        "textFa": "آسفالت/کف‌سازی واحدها تکمیل شده؛ شیب‌بندی‌ها مناسب و درزهای انبساط نصب شده‌اند.",
        "groupFa": null
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Foundation grouted and completed.",
        "order": 9,
        "textFa": "فونداسیون گروت‌ریزی و تکمیل شده است.",
        "groupFa": null
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Manholes are lining and wall is completed.",
        "order": 10,
        "textFa": "منهول‌ها روکش‌کاری شده و دیواره‌ی آن‌ها تکمیل شده است.",
        "groupFa": null
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Passive fire protection (paint-base and cement-base coating) are installed and checked.",
        "order": 11,
        "textFa": "حفاظت غیرفعال در برابر آتش (پوشش بر پایه‌ی رنگ و سیمان) نصب و بررسی شده است.",
        "groupFa": null
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Plans of foundations and underground pipes are available in term of \"as built\".",
        "order": 12,
        "textFa": "نقشه‌های فونداسیون و لوله‌های زیرزمینی به‌صورت As Built موجود است.",
        "groupFa": null
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Thermal insulation of equipment (column and vessel) is in place.",
        "order": 13,
        "textFa": "عایق حرارتی تجهیزات (برج و ظرف) برقرار است.",
        "groupFa": null
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "anti acid & anti lining protection are install and checked?",
        "order": 14,
        "textFa": "محافظت ضداسید و آستری (Lining) نصب و بررسی شده است؟",
        "groupFa": null
      }
    ]
  }
];
