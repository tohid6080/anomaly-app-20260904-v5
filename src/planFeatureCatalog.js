// فهرست فیچرهایی که یک پلن می‌تواند فعال/غیرفعال کند — کلیدها با HSE_MODULES هماهنگ‌اند.
// درختِ واقعی ماژول/زیرماژولِ اپ — دقیقاً منطبق با HSE_MODULES در App.jsx، تا انتخابِ
// فیچرِ هر پلن با ساختارِ واقعیِ منوها همخوانی داشته باشد.
//
// این فهرست به یک ماژولِ سبکِ جدا منتقل شد تا هم پنلِ سوپرادمین و هم صفحه‌ی
// خریدِ مشتری (SubscriptionGate) بتوانند بدونِ کشیدنِ کلِ superAdminApi به
// باندلِ مشتری، از آن استفاده کنند. superAdminApi همان را دوباره export می‌کند
// تا واردکننده‌های قبلی دست‌نخورده بمانند.
export const PLAN_FEATURES = [
  { key: "chat", labelKey: "pfChat" },
  {
    key: "archiveManagement", labelKey: "pfArchiveManagement",
    sub: [
      { key: "archivePersonnel", labelKey: "pfArchivePersonnel" },
      { key: "archiveAnomaly", labelKey: "pfArchiveAnomaly" },
      { key: "archiveMachinery", labelKey: "pfArchiveMachinery" },
      { key: "archiveScaffold", labelKey: "pfArchiveScaffold" },
    ],
  },
  {
    key: "anomalyReport", labelKey: "pfAnomalyReport",
    sub: [
      { key: "anomalyForm", labelKey: "pfAnomalyForm" },
      { key: "anomalyList", labelKey: "pfAnomalyList" },
      { key: "correctiveActionsList", labelKey: "pfCorrectiveActionsList" },
    ],
  },
  {
    key: "riskAssessment", labelKey: "pfRiskAssessment",
    sub: [
      { key: "bowtieDashboard", labelKey: "pfBowtieDashboard" },
      { key: "hcmsDashboard", labelKey: "pfHcmsDashboard" },
      { key: "riskKnowledgeManagement", labelKey: "pfRiskKnowledgeManagement" },
    ],
  },
  {
    key: "personnelAccess", labelKey: "pfPersonnelAccess",
    sub: [
      { key: "personnelDashboard", labelKey: "pfPersonnelDashboard" },
      { key: "personnelForm", labelKey: "pfPersonnelForm" },
    ],
  },
  {
    key: "proactiveIndicators", labelKey: "pfProactiveIndicators",
    sub: [
      { key: "accidentProneness", labelKey: "pfAccidentProneness" },
      { key: "hseClimate", labelKey: "pfHseClimate" },
      { key: "sbs", labelKey: "pfSbs" },
    ],
  },
  {
    key: "incidentManagement", labelKey: "pfIncidentManagement",
    sub: [
      { key: "incidentsList", labelKey: "pfIncidentsList" },
      { key: "tripodBetaAnalysis", labelKey: "pfTripodBetaAnalysis" },
    ],
  },
  {
    key: "machineryManagement", labelKey: "pfMachineryManagement",
    sub: [{ key: "machineryDashboard", labelKey: "pfMachineryDashboard" }],
  },
  {
    key: "scaffoldManagement", labelKey: "pfScaffoldManagement",
    sub: [{ key: "scaffoldDashboard", labelKey: "pfScaffoldDashboard" }],
  },
  { key: "managementDashboard", labelKey: "pfManagementDashboard" },
  { key: "operationalDashboard", labelKey: "pfOperationalDashboard" },
  { key: "hseSurvey", labelKey: "pfHseSurvey" },
  {
    key: "quickTools", labelKey: "pfQuickTools",
    sub: [
      { key: "unit-converter", labelKey: "pfQtUnitConverter" },
      { key: "ltifr", labelKey: "pfQtLtifr" },
      { key: "trir", labelKey: "pfQtTrir" },
      { key: "noise", labelKey: "pfQtNoise" },
      { key: "crane-load", labelKey: "pfQtCraneLoad" },
      { key: "sling-angle", labelKey: "pfQtSlingAngle" },
      { key: "sling-angle-geo", labelKey: "pfQtSlingAngleGeo" },
      { key: "sling-tension", labelKey: "pfQtSlingTension" },
      { key: "shackle-load", labelKey: "pfQtShackleLoad" },
      { key: "load-weight", labelKey: "pfQtLoadWeight" },
      { key: "load-cg", labelKey: "pfQtLoadCg" },
      { key: "crane-radius-capacity", labelKey: "pfQtCraneRadiusCapacity" },
      { key: "ground-pressure", labelKey: "pfQtGroundPressure" },
      { key: "jack-load", labelKey: "pfQtJackLoad" },
      { key: "lift-point-load", labelKey: "pfQtLiftPointLoad" },
      { key: "rigging-wll-util", labelKey: "pfQtRiggingWllUtil" },
      { key: "lift-risk-checklist", labelKey: "pfQtLiftRiskChecklist" },
      { key: "rad-zones", labelKey: "pfQtRadZones" },
      { key: "rad-distance", labelKey: "pfQtRadDistance" },
      { key: "lifting-plan", labelKey: "pfLiftingPlan" },
      { key: "excavation-calculator", labelKey: "pfQtExcavation" },
      { key: "energy-calculator", labelKey: "pfQtEnergy" },
      { key: "fleet-fuel-calculator", labelKey: "pfQtFleetFuel" },
    ],
  },
  {
    key: "systemManagement", labelKey: "pfSystemManagement",
    sub: [
      { key: "permissionManagement", labelKey: "pfPermissionManagement" },
      { key: "jobPositionManagement", labelKey: "pfJobPositionManagement" },
      { key: "scaffoldCodeManagement", labelKey: "pfScaffoldCodeManagement" },
      { key: "trainingManagement", labelKey: "pfTrainingManagement" },
      { key: "chatAccessManagement", labelKey: "pfChatAccessManagement" },
      { key: "hcmsMatrixManagement", labelKey: "pfHcmsMatrixManagement" },
      { key: "effectivenessThresholds", labelKey: "pfEffectivenessThresholds" },
      { key: "anomalyCategoryManagement", labelKey: "pfAnomalyCategoryManagement" },
    ],
  },
];
