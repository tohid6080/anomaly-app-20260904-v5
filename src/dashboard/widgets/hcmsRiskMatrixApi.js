import {
  loadFullMatrix, loadHcmsAssessments, parseRpnCode,
  SEVERITY_CODES, PROBABILITY_LETTERS,
} from "../../hcms/hcmsApi.js";

/**
 * لایهٔ دادهٔ ویجت «ماتریس ریسک HCMS» (طرح D-006). شبکهٔ ۶×۵ از loadFullMatrix
 * (override ادمین یا فرمول)، و روی هر خانه تعداد ارزیابیِ فعالی که — بر پایهٔ
 * RPNِ باقی‌مانده — در آن خانه می‌افتد. هیچ منطقِ ماتریسی بازنویسی نمی‌شود.
 */
const CATS = ["human", "equipment", "environment", "reputation"];

function drivingRpnCode(a) {
  const pick = (rpn, lvl, overall) =>
    (rpn && CATS.find((c) => rpn[c] && lvl && lvl[c] === overall)) ||
    (rpn && CATS.find((c) => rpn[c])) || null;
  const rc = pick(a.residualRpn, a.residualLevel, a.residualLevelOverall);
  if (rc) return a.residualRpn[rc];
  const ic = pick(a.initialRpn, a.initialLevel, a.initialLevelOverall);
  return ic ? a.initialRpn[ic] : "";
}

export async function loadHcmsRiskMatrix({ includePending = false } = {}) {
  const [mxRes, listRes] = await Promise.allSettled([loadFullMatrix(), loadHcmsAssessments()]);
  if (mxRes.status === "rejected") throw mxRes.reason;

  const cells = {};
  (mxRes.value || []).forEach((c) => {
    cells[`${c.severity}${c.letter}`] = { severity: c.severity, letter: c.letter, level: c.level, count: 0 };
  });

  const assessments = (listRes.status === "fulfilled" ? listRes.value : [])
    .filter((a) => a.status === "active" || (includePending && a.status === "pending_review"));

  let unplaced = 0;
  assessments.forEach((a) => {
    const p = parseRpnCode(drivingRpnCode(a));
    const cell = p && cells[`${p.severity}${p.letter}`];
    if (!cell) { unplaced += 1; return; }
    cell.count += 1;
  });

  const byLevel = { Low: 0, Medium: 0, High: 0 };
  Object.values(cells).forEach((c) => { if (byLevel[c.level] != null) byLevel[c.level] += c.count; });

  return {
    severities: SEVERITY_CODES,
    letters: PROBABILITY_LETTERS,
    cells,
    byLevel,
    total: assessments.length - unplaced,
    unplacedCount: unplaced,
    listErrored: listRes.status === "rejected",
  };
}
