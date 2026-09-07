import { sb, sbOk, getCurrentCompanyId } from "../../shared.js";
import { loadPendingGateItems, loadAssignedGateItems } from "../../hseGateApi.js";
import { loadCorrectiveActions, isOverdue } from "../../correctiveActions/correctiveActionsApi.js";

/**
 * لایهٔ دادهٔ ویجت «کارتابل فوری من» (طرح D-004). سه منبعِ واقعی را جمع می‌کند:
 *  ۱) موارد HSE Gate در انتظارِ تصمیم/بررسیِ کاربر
 *  ۲) اقدامات اصلاحیِ با مسئولِ کاربر
 *  ۳) آنومالی‌های بازِ سطحِ بالا (چون جدولِ anomalies ستونِ «مسئول» ندارد،
 *     «بحرانیِ باز» جایگزینِ صادقانه است)
 * فقط خواندن؛ هیچ نوشتنی. شکستِ یک منبع بقیه را از کار نمی‌اندازد.
 */

const norm = (s) => (s || "").trim().toLowerCase();

function daysOverdue(dueDate) {
  if (!dueDate) return 0;
  const diff = new Date(new Date().toDateString()) - new Date(dueDate);
  return Math.max(0, Math.floor(diff / 86400000));
}

export async function loadMyTaskQueue({ role, currentUser } = {}) {
  const isContractor = role === "CONTRACTOR";
  const isSupervisor = role === "HSE_SUPERVISOR" || role === "EMPLOYER";
  const uname = currentUser?.username || "";
  const me = norm(currentUser?.name);
  const companyId = getCurrentCompanyId();
  const companyFilter = companyId ? `&company_id=eq.${companyId}` : "";

  const [gateRes, caRes, anomalyRes] = await Promise.allSettled([
    isContractor
      ? Promise.resolve([])
      : isSupervisor
        ? loadPendingGateItems()
        : loadAssignedGateItems(uname),
    loadCorrectiveActions(),
    sb(
      `anomalies?select=id,tracking_number,area,contractor,risk_level,status` +
      `&risk_level=eq.High&status=neq.Closed&order=created_at.asc&limit=20` +
      companyFilter + (isContractor && currentUser?.name ? `&contractor=eq.${encodeURIComponent(currentUser.name)}` : "")
    ),
  ]);

  // --- گروهِ Gate ---
  const gateItems = gateRes.status === "fulfilled" && Array.isArray(gateRes.value) ? gateRes.value : [];
  const gateGroup = {
    key: "gate",
    labelKey: isSupervisor ? "wtqGroupGate" : "wtqGroupGateAssigned",
    total: gateItems.length,
    overdueCount: 0,
    rows: gateItems.slice(0, 4).map((g) => ({
      id: g.id, kind: "gate", code: (g.moduleKey || "GATE").slice(0, 10),
      title: g.recordLabel || g.recordId || "",
      chip: { type: "queueAge", days: daysOverdue(g.createdAt) },
      nav: { module: "hseGate", recordId: g.id, moduleKey: g.moduleKey, targetRecordId: g.recordId },
    })),
  };

  // --- گروهِ اقدامات اصلاحیِ من ---
  const allCa = caRes.status === "fulfilled" && Array.isArray(caRes.value) ? caRes.value : [];
  const myCa = allCa
    .filter((c) => c.status !== "closed" && c.status !== "expired")
    .filter((c) =>
      norm(c.responsiblePerson) === me ||
      norm(c.responsibleContractorName) === me ||
      (currentUser?.contractorId && c.responsibleContractorId === currentUser.contractorId)
    );
  const caSorted = myCa.slice().sort((a, b) => {
    const ao = isOverdue(a) ? daysOverdue(a.dueDate) : -1;
    const bo = isOverdue(b) ? daysOverdue(b.dueDate) : -1;
    if (ao !== bo) return bo - ao;
    return (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1;
  });
  const caGroup = {
    key: "ca",
    labelKey: isContractor ? "wtqGroupMyCaContractor" : "wtqGroupMyCa",
    total: myCa.length,
    overdueCount: myCa.filter(isOverdue).length,
    rows: caSorted.slice(0, 4).map((c) => {
      const od = isOverdue(c) ? daysOverdue(c.dueDate) : 0;
      return {
        id: c.id, kind: "ca", code: c.actionNumber || "CA",
        title: c.actionDescription || c.nonconformanceDescription || "",
        chip: od > 0 ? { type: "overdue", days: od } : (c.dueDate ? { type: "due", date: c.dueDate } : null),
        nav: { module: "correctiveActions", recordId: c.id },
      };
    }),
  };

  // --- گروهِ آنومالی‌های بحرانی ---
  const anomalyRows = anomalyRes.status === "fulfilled" && sbOk(anomalyRes.value) ? anomalyRes.value : [];
  const anomalyGroup = {
    key: "criticalAnomaly",
    labelKey: "wtqGroupCriticalAnomaly",
    total: anomalyRows.length,
    overdueCount: 0,
    rows: anomalyRows.slice(0, 4).map((a) => ({
      id: a.id, kind: "anomaly", code: a.tracking_number || "ANM",
      title: a.area || a.contractor || "",
      chip: { type: "risk" },
      nav: { module: "anomaly", recordId: a.id },
    })),
  };

  return {
    groups: [gateGroup, caGroup, anomalyGroup].filter((g) => !isContractor || g.key !== "gate"),
    total: gateGroup.total + caGroup.total + anomalyGroup.total,
    overdueTotal: caGroup.overdueCount,
    errors: {
      gate: gateRes.status === "rejected",
      ca: caRes.status === "rejected",
      anomaly: anomalyRes.status === "rejected",
    },
  };
}
