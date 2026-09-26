/* ============================================================================ *
 * صحنه‌ی نمونه‌ی آموزشی برای «طراحیِ نقشه‌ی لیفتینگ» — دیتای صرفاً نمایشی،
 * دقیقاً به همان مدلِ CADِ صافِ متری‌ای که LiftingPlanCanvas/liftingCalcEngine
 * واقعاً مصرف می‌کنند (رجوع کنید به SCENE_MODEL در liftingPlanApi.js). با
 * تغذیه‌ی این صحنه به computeLiftCalc/validateLiftingPlanِ واقعی (نه با
 * نوشتنِ دستیِ اعداد)، نمونه‌ی آموزشی همیشه با موتورِ واقعیِ ابزار هم‌راستا
 * می‌ماند — هیچ عددی این‌جا هارد‌کد نشده، فقط ورودی‌هاست.
 *
 * سناریو: نصبِ یک اسکیدِ پمپِ فرآیندی با یک جرثقیلِ موبایل — برداشت از
 * شعاعِ کاریِ ۱۲ متر، چرخشِ بومِ ~۵۵° و قرارگیری در همان شعاع.
 * ============================================================================ */

export const SAMPLE_SCENE = {
  v: 2,
  canvas: { grid: true },
  env: { soilKpa: 250, sf: 2, travelHeight: 10 },
  objects: [
    {
      id: "sample-crane", type: "crane", x: 0, y: 0, rot: 0,
      model: "جرثقیلِ موبایل (نمونه)", weightKg: 60000, pads: 4, padArea: 4,
      boomLengthM: 28.4, boomAngleDeg: 65, craneModelId: "", machineryId: "",
      chart: [[8, 24000], [10, 19500], [12, 15800], [14, 12900], [16, 10700], [20, 7800]],
      chartRef: "Load Chart نمونه — صرفاً برای آموزش",
    },
    { id: "sample-hook", type: "hook", x: 12, y: 0, rot: 0, weightKg: 350, wllKg: 25000, riggingH: 5, craneId: "sample-crane" },
    {
      id: "sample-load", type: "load", x: 12, y: 0, rot: 0, shape: "rect", w: 4, h: 2.2, weightKg: 12000,
      label: "اسکیدِ پمپِ فرآیندی PU-204", cg: { x: 0.15, y: 0.05 },
      picks: [{ x: -1.6, y: -0.88 }, { x: 1.6, y: -0.88 }, { x: 1.6, y: 0.88 }, { x: -1.6, y: 0.88 }],
    },
    { id: "sample-sling", type: "slingset", x: 2, y: 3, rot: 0, count: 4, wllKg: 6700, weightKg: 180, len: 6 },
    { id: "sample-shackle", type: "shackle", x: 2, y: 6, rot: 0, count: 4, wllKg: 8500, weightKg: 60 },
    { id: "sample-worker", type: "worker", x: 3, y: -3, rot: 0, role: "نگهبانِ ایمنی (Spotter)", personnelId: "" },
    { id: "sample-exzone", type: "exclusion_zone", x: -5, y: 8, rot: 0, w: 10, h: 8, label: "ناحیه‌ی ممنوعه (واحدِ فرآیندیِ مجاور)" },
    { id: "sample-target", type: "target", x: 6.883, y: 9.830, rot: 0 },
  ],
};

// چرخش (Slew) — طبقِ خودِ liftingCalcEngine.js همان مرحله‌ای است که بدترین
// فشارِ روی زمین را می‌دهد (worstPadFrac=0.6)؛ رادیوس/زاویه/کششِ اسلینگ در
// این مرحله با مرحله‌ی «برداشت» یکسان است، پس همان لحظه‌ی «بحرانی» را نشان می‌دهد.
export const SAMPLE_PHASE = 3;
export const SAMPLE_FRAC = 0;

export const SAMPLE_META = {
  planNumber: "LP-2026-014-EX",
  revision: "0",
  project: "واحد تفکیک گاز — فاز ۲",
  contractorName: "شرکت پیمانکاری مهرآذین صنعت (نمونه)",
  title: "نصبِ اسکیدِ پمپِ فرآیندی PU-204 با جرثقیلِ موبایل",
  preparedBy: "مهندس HSE سایت",
  reviewedBy: "سرپرست لیفتینگ",
  approvedBy: "مدیر HSE پروژه",
  status: "in_review",
};
