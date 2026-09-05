import React, { useState, useEffect } from "react";
import { Truck, Plus, Trash2, FileText, Paperclip } from "lucide-react";
import { styles, THEME } from "../shared.js";
import DataView, { StatusPill } from "../shared/DataView.jsx";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { isPdfDataUrl } from "../personnel/fileHelpers.js";
import DocumentViewerModal from "../personnel/DocumentViewerModal.jsx";
import SyncStatusBadge from "../offline/SyncStatusBadge.jsx";
import {
  MACHINE_TYPES, APPROVAL_STATUSES, MACHINERY_DOC_TYPES, approvalStatusMeta,
  loadMachineryListOfflineFirst, deleteMachineryDB, setMachineryApproval,
  requestMachineryDeletion, approveMachineryDeletion, rejectMachineryDeletion,
  loadMachineryDocuments, daysUntil, EXPIRY_WARNING_DAYS,
} from "./machineryApi.js";
import MachineryForm from "./MachineryForm.jsx";
import {
  loadPendingGateItems, loadAssignedGateItems, loadAssignedReviewItemsForModule, loadCompanyStaffOptions, assignForReview,
  submitReview as submitGateReview, approveGateItem, rejectGateItem, GATE_STATUS_LABELS,
} from "../hseGateApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const SORT_OPTIONS_KEYS = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "oldest", labelKey: "sortOldest" },
  { value: "name", labelKey: "sortMachineNameAlpha" },
];

/**
 * Reference implementation of the shared List/Grid pattern (see
 * src/shared/DataView.jsx) — every other module's list should eventually
 * follow this same structure: DataView owns the toolbar/view-toggle/rows,
 * this file only supplies columns, the card, and the actions.
 */
export default function MachineryDashboard({ onBack, currentUser, role, initialApprovalFilter, initialContractorFilter, readOnly }) {
  const { t, dir } = useLanguage();
  const SORT_OPTIONS = SORT_OPTIONS_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) }));
  const isContractor = role === "CONTRACTOR";
  // طبق همان تصمیم تأییدشده که برای پرسنل و آنومالی اعمال شد: تأیید
  // ماشین‌آلات فقط برای سرپرست/مدیر HSE و ادمین مجاز است، نه هر
  // کارفرمایی معمولی. role (prop) همیشه "EMPLOYER" است (حتی برای حساب
  // سرپرست HSE)، پس مستقیم currentUser?.role چک می‌شود.
  const isGatekeeper = (currentUser?.role === "HSE_SUPERVISOR" || role === "ADMIN") && !isContractor;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [approvalFilter, setApprovalFilter] = useState(initialApprovalFilter || "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingDocs, setEditingDocs] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNoteDraft, setReviewNoteDraft] = useState("");

  // گیت بازبینی سرپرست/مدیر HSE — ارجاع بررسی ماشین معرفی‌شده توسط
  // پیمانکار به یک کارشناس، یا تأیید مستقیم توسط خودِ سرپرست. دقیقاً
  // همان زیرساخت مشترک آنومالی/پرسنل.
  const [gateMap, setGateMap] = useState({});
  const [gateStaff, setGateStaff] = useState([]);
  const [assigningGateId, setAssigningGateId] = useState(null);
  const [assignGateTo, setAssignGateTo] = useState("");
  const [reviewingGateId, setReviewingGateId] = useState(null);
  const [gateReviewComment, setGateReviewComment] = useState("");
  const [gateBusy, setGateBusy] = useState(null);
  const [gateMessage, setGateMessage] = useState("");

  const loadGateData = async () => {
    if (isContractor) return;
    // نمایش وضعیت ارجاع (نام کارشناس + برچسب «ارجاع‌شده برای بررسی»)
    // باید برای هر کاربر غیرپیمانکار دیده شود — از جمله کارفرما/سرپرست
    // کارفرمایی که خودش سرپرست/مدیر HSE نیست — نه فقط برای کسی که مجاز
    // به اقدام (ارجاع/تأیید) است؛ پس pending و gateStaff دیگر مشروط به
    // isGatekeeper نیستند (فقط دکمه‌های اقدام پایین‌تر همچنان محدودند).
    // طبق گزارش صریح: بعد از اینکه سرپرست موردی را به کارشناسی ارجاع
    // می‌دهد، آن مورد دیگر نه در pending (چون از pending_approval خارج
    // شده) و نه در mine خودِ سرپرست (چون به شخص دیگری واگذار شده) نیست —
    // یعنی از دید ارجاع‌دهنده کاملاً ناپدید می‌شود. assignedReviewAll این
    // شکاف را می‌بندد: همه‌ی موارد «ارجاع‌شده» شرکت را می‌آورد، صرف‌نظر از
    // اینکه چه کسی ارجاع داده یا به چه کسی ارجاع شده.
    const [pending, mine, staff, assignedReviewAll] = await Promise.all([
      loadPendingGateItems("machineryManagement"),
      loadAssignedGateItems(currentUser?.username).then((rows) => rows.filter((r) => r.moduleKey === "machineryManagement")),
      loadCompanyStaffOptions(),
      loadAssignedReviewItemsForModule("machineryManagement"),
    ]);
    const map = {};
    [...pending, ...assignedReviewAll, ...mine].forEach((it) => { map[it.recordId] = it; });
    setGateMap(map);
    setGateStaff(staff);
  };
  useEffect(() => { loadGateData(); }, [isContractor, isGatekeeper, currentUser?.username]);

  const handleAssignForReview = async (m) => {
    const gateItem = gateMap[m.id];
    if (!gateItem || !assignGateTo) return;
    setGateBusy(m.id); setGateMessage("");
    const result = await assignForReview(gateItem.id, assignGateTo, currentUser?.name);
    setGateBusy(null);
    if (result?.__error) { setGateMessage(result.message); return; }
    setAssigningGateId(null); setAssignGateTo("");
    await loadGateData();
  };
  const handleSubmitGateReview = async (m) => {
    const gateItem = gateMap[m.id];
    if (!gateItem) return;
    setGateBusy(m.id); setGateMessage("");
    const result = await submitGateReview(gateItem.id, currentUser?.username, gateReviewComment);
    setGateBusy(null);
    if (result?.__error) { setGateMessage(result.message); return; }
    setReviewingGateId(null); setGateReviewComment("");
    await loadGateData();
  };
  const [savingReview, setSavingReview] = useState(false);
  const [docsExpandedId, setDocsExpandedId] = useState(null);
  const [docsMap, setDocsMap] = useState({});
  const [docsLoading, setDocsLoading] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);

  const load = async () => {
    // اگر بارگذاری با خطا مواجه شود، صفحه نباید برای همیشه روی «در حال
    // بارگذاری» بماند — finally تضمین می‌کند setLoading(false) در هر
    // حالتی اجرا شود.
    try {
      setList(await loadMachineryListOfflineFirst());
    } catch (e) {
      console.error("بارگذاری لیست ماشین‌آلات ناموفق بود", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const myName = (currentUser?.name || "").trim().toLowerCase();
  const scoped = isContractor ? list.filter((m) => (m.contractorName || "").trim().toLowerCase() === myName) : list;
  const contractorScoped = !isContractor && initialContractorFilter && initialContractorFilter !== "all"
    ? scoped.filter((m) => m.contractorId === initialContractorFilter)
    : scoped;

  const filtered = contractorScoped.filter((m) => {
    if (!isContractor && m.approvalStatus === "draft") return false;
    if (approvalFilter !== "all" && m.approvalStatus !== approvalFilter) return false;
    if (typeFilter !== "all" && m.machineType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${m.machineName} ${m.plateNumber} ${m.contractorName} ${m.deviceCode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return (a.machineName || "").localeCompare(b.machineName || "", "fa");
    const at = a.createdAt || "", bt = b.createdAt || "";
    return sort === "oldest" ? at.localeCompare(bt) : bt.localeCompare(at);
  });

  const startCreate = () => { setEditingItem(null); setEditingDocs([]); setShowForm(true); };
  const startEdit = async (m) => {
    setEditingItem(m);
    setEditingDocs(await loadMachineryDocuments(m.id));
    setShowForm(true);
  };
  const handleSaved = async () => { setShowForm(false); await load(); };

  const handleDelete = async (m) => {
    if (readOnly) { alert(t("errNoDeletePermission")); return; }
    if (isContractor && m.approvalStatus === "approved") {
      // پیمانکار نمی‌تواند ماشین تأییدشده را مستقیم حذف کند — این
      // محدودیت سمت RLS هم اعمال شده، اینجا فقط تجربه‌ی کاربری بهتری
      // برای همان محدودیت است. فقط می‌تواند درخواست حذف ثبت کند.
      const note = prompt(t("mdDeleteRequestApprovedPrompt"));
      if (note === null) return; // انصراف از prompt
      const result = await requestMachineryDeletion(m.id, note, currentUser?.name);
      if (result?.__error) { alert(result.message); return; }
      alert(t("mdDeleteRequestSubmittedAlert"));
      await load();
      return;
    }
    if (!confirm(t("confirmDeleteMachine"))) return;
    const result = await deleteMachineryDB(m.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };
  const handleApproveDeleteRequest = async (m) => {
    if (!isGatekeeper) { alert(t("errNoApproveDeletePermission")); return; }
    if (!confirm(t("mdConfirmPermanentDelete", { name: `${m.machineName} — ${m.plateNumber}` }))) return;
    const result = await approveMachineryDeletion(m.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };
  const handleRejectDeleteRequest = async (m) => {
    if (!isGatekeeper) { alert(t("errNoRejectDeletePermission")); return; }
    const result = await rejectMachineryDeletion(m.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };
  const handleBulkDelete = async (ids) => {
    if (readOnly) { alert(t("errNoDeletePermission")); return; }
    if (!confirm(t("confirmDeleteCount", { count: ids.length }))) return;
    for (const id of ids) await deleteMachineryDB(id);
    await load();
  };

  const toggleDocs = async (m) => {
    if (docsExpandedId === m.id) { setDocsExpandedId(null); return; }
    setDocsExpandedId(m.id);
    setExpandedId(null);
    if (!docsMap[m.id]) {
      setDocsLoading(true);
      const docs = await loadMachineryDocuments(m.id);
      setDocsMap((prev) => ({ ...prev, [m.id]: docs }));
      setDocsLoading(false);
    }
  };

  const startReview = async (m) => {
    setExpandedId(m.id);
    setReviewNoteDraft(m.reviewNote || "");
    if (docsExpandedId !== m.id) await toggleDocs(m);
  };
  const submitReview = async (m, status) => {
    if (readOnly) { alert(t("errNoDecisionPermission")); return; }
    if ((status === "rejected" || status === "needs_correction") && !reviewNoteDraft.trim()) {
      alert(t("errNoteRequiredForRejection"));
      return;
    }
    setSavingReview(true);
    await setMachineryApproval(m.id, status, reviewNoteDraft.trim());
    // تصمیم مستقیم سرپرست (بدون عبور از گیت) هم مجاز است — ولی اگر یک
    // رکورد گیت باز برای همین مورد وجود دارد، همان‌جا هم بسته می‌شود تا
    // تاریخچه‌ی گیت با وضعیت واقعی ماشین ناهماهنگ نماند.
    if (gateMap[m.id]) {
      if (status === "approved") approveGateItem(gateMap[m.id].id, currentUser?.name).catch(() => {});
      else rejectGateItem(gateMap[m.id].id, currentUser?.name, reviewNoteDraft.trim()).catch(() => {});
    }
    setSavingReview(false);
    setExpandedId(null);
    await load();
    await loadGateData();
  };
  const handleBulkApprove = async (ids) => {
    if (readOnly) { alert(t("errNoDecisionPermission")); return; }
    if (!confirm(t("confirmBulkApprove", { count: ids.length }))) return;
    for (const id of ids) {
      await setMachineryApproval(id, "approved", "");
      // طبق همان رفعِ ناهماهنگی که در تأیید تکی (submitReview) هست: اگر
      // رکورد گیت باز برای همین مورد وجود دارد، همان‌جا هم بسته شود —
      // وگرنه با اینکه ماشین‌آلات تأیید شده، در «کارهای در دست اقدام من»
      // و برچسب «ارجاع به کارشناس» برای همیشه باقی می‌ماند.
      if (gateMap[id]) approveGateItem(gateMap[id].id, currentUser?.name).catch(() => {});
    }
    await load();
    await loadGateData();
  };

  if (showForm) {
    return (
      <MachineryForm
        existingMachinery={editingItem}
        existingDocuments={editingDocs}
        currentUser={currentUser}
        onSaved={handleSaved}
        onBack={() => setShowForm(false)}
      />
    );
  }

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  const expiryWarning = (m) => {
    const insuranceDays = daysUntil(m.insuranceExpiry);
    const inspectionDays = daysUntil(m.inspectionExpiry);
    const healthCertDays = daysUntil(m.healthCertExpiry);
    const driverLicenseDays = daysUntil(m.driverLicenseExpiry);
    const backupDriverLicenseDays = daysUntil(m.backupDriverLicenseExpiry);
    const insuranceWarn = insuranceDays !== null && insuranceDays <= EXPIRY_WARNING_DAYS;
    const inspectionWarn = inspectionDays !== null && inspectionDays <= EXPIRY_WARNING_DAYS;
    const healthCertWarn = healthCertDays !== null && healthCertDays <= EXPIRY_WARNING_DAYS;
    const driverLicenseWarn = driverLicenseDays !== null && driverLicenseDays <= EXPIRY_WARNING_DAYS;
    const backupDriverLicenseWarn = backupDriverLicenseDays !== null && backupDriverLicenseDays <= EXPIRY_WARNING_DAYS;
    return {
      insuranceDays, inspectionDays, healthCertDays, driverLicenseDays, backupDriverLicenseDays,
      insuranceWarn, inspectionWarn, healthCertWarn, driverLicenseWarn, backupDriverLicenseWarn,
      anyWarn: insuranceWarn || inspectionWarn || healthCertWarn || driverLicenseWarn || backupDriverLicenseWarn,
    };
  };

  const rowActions = (m) => {
    const docs = docsMap[m.id] || [];
    return (
      <>
        <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid, display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => toggleDocs(m)}>
          <Paperclip size={12} /> {t("mdDocsLabel")}{docsMap[m.id] ? ` (${docs.length})` : ""}
        </button>
        {isContractor && !readOnly && (
          <>
            <button type="button" style={styles.smallButton} onClick={() => startEdit(m)}>{t("commonEdit")}</button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleDelete(m)}><Trash2 size={12} /></button>
          </>
        )}
        {isGatekeeper && !readOnly && m.approvalStatus === "pending" && (
          <button type="button" style={styles.smallButton} onClick={() => startReview(m)}>{t("mdReview")}</button>
        )}
        {isGatekeeper && !readOnly && m.approvalStatus !== "pending" && (
          <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => startReview(m)}>{t("mdChangeDecision")}</button>
        )}
      </>
    );
  };

  // پنل جزئیات/بررسی که قبلاً انتهای کل لیست باز می‌شد — حالا از طریق
  // renderExpanded دقیقاً زیر همان ردیف انتخاب‌شده رندر می‌شود.
  const renderExpandedPanel = (expandedItem) => (
    <div style={{ ...styles.card, width: "auto", margin: 0 }}>
      <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700 }}>
        {expandedItem.machineName} — {expandedItem.plateNumber}
      </h3>

      {docsExpandedId === expandedItem.id && (
        <div style={{ marginBottom: expandedId === expandedItem.id ? 14 : 0 }}>
          {docsLoading && !docsMap[expandedItem.id] ? (
            <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("mdLoadingDocs")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {MACHINERY_DOC_TYPES.map((dt) => {
                const doc = (docsMap[expandedItem.id] || []).find((d) => d.docType === dt.value);
                return (
                  <div key={dt.value} style={{ width: 88, textAlign: "center" }}>
                    {doc ? (
                      isPdfDataUrl(doc.fileData) ? (
                        <button type="button" onClick={() => setViewerSrc(doc.fileData)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <FileText size={40} color={THEME.text2} />
                        </button>
                      ) : (
                        <img
                          src={doc.fileData}
                          alt=""
                          onClick={() => setViewerSrc(doc.fileData)}
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${THEME.border}` }}
                        />
                      )
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 8, border: `1px dashed ${THEME.border}`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Paperclip size={16} color={THEME.text3} />
                      </div>
                    )}
                    <div style={{ fontSize: 9.5, color: doc ? THEME.text2 : THEME.text3, marginTop: 4, lineHeight: 1.4 }}>{t(dt.labelKey)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {gateMap[expandedItem.id] && (gateMap[expandedItem.id].status === "pending_approval" || gateMap[expandedItem.id].status === "assigned_review" || gateMap[expandedItem.id].status === "reviewed") && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: 12, marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "0 0 8px" }}>
            {t("gateReviewGateHeading", { status: GATE_STATUS_LABELS[gateMap[expandedItem.id].status] || gateMap[expandedItem.id].status })}
          </p>
          {gateMap[expandedItem.id].status === "assigned_review" && (
            <p style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, margin: "0 0 8px" }}>
              {t("gateAssignedToExpert", { name: gateStaff.find((s) => s.username === gateMap[expandedItem.id].assignedTo)?.name || gateMap[expandedItem.id].assignedTo })}
            </p>
          )}
          {gateMap[expandedItem.id].reviewerComment && (
            <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px", lineHeight: 1.8 }}>
              <b>{t("gateExpertComment")}</b> {gateMap[expandedItem.id].reviewerComment}
            </p>
          )}
          {gateMessage && <p style={styles.error}>{gateMessage}</p>}

          {/* سمت سرپرست/مدیر HSE — ارجاع به کارشناس، یا تأیید مستقیم
              (که همان دکمه‌های «تأیید شد» پایین‌تر انجامش می‌دهند) */}
          {isGatekeeper && gateMap[expandedItem.id].status === "pending_approval" && (
            <div>
              {assigningGateId === expandedItem.id ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select style={{ ...styles.input, marginTop: 0, maxWidth: 220 }} value={assignGateTo} onChange={(e) => setAssignGateTo(e.target.value)} dir={dir}>
                    <option value="">{t("gateSelectExpert")}</option>
                    {gateStaff.filter((s) => s.username !== currentUser?.username).map((s) => <option key={s.username} value={s.username}>{s.name}</option>)}
                  </select>
                  <button type="button" style={styles.smallButton} onClick={() => handleAssignForReview(expandedItem)} disabled={gateBusy === expandedItem.id || !assignGateTo}>{t("gateSubmitAssignment")}</button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setAssigningGateId(null)}>{t("commonCancel")}</button>
                </div>
              ) : (
                <button type="button" style={styles.smallButton} onClick={() => { setAssigningGateId(expandedItem.id); setAssignGateTo(""); }} disabled={gateBusy === expandedItem.id}>
                  {t("gateAssignToExpertForReview")}
                </button>
              )}
            </div>
          )}

          {/* سمت کارشناسی که این ماشین به او ارجاع شده — فقط نتیجه‌ی
              بررسی را برای سرپرست می‌فرستد، خودش نهایی تأیید نمی‌کند */}
          {gateMap[expandedItem.id].status === "assigned_review" && gateMap[expandedItem.id].assignedTo === currentUser?.username && (
            <div>
              {reviewingGateId !== expandedItem.id ? (
                <button type="button" style={styles.smallButton} onClick={() => { setReviewingGateId(expandedItem.id); setGateReviewComment(""); }} disabled={gateBusy === expandedItem.id}>
                  {t("gateSendReviewResultToSupervisor")}
                </button>
              ) : (
                <div>
                  <label style={styles.label}>{t("gateCommentOptional")}</label>
                  <textarea style={{ ...styles.input, minHeight: 50 }} value={gateReviewComment} onChange={(e) => setGateReviewComment(e.target.value)} dir={dir} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={styles.smallButton} onClick={() => handleSubmitGateReview(expandedItem)} disabled={gateBusy === expandedItem.id}>{t("gateSend")}</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setReviewingGateId(null)}>{t("commonCancel")}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {expandedId === expandedItem.id && expandedItem.deleteRequestedBy && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: 12, marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: THEME.danger, margin: "0 0 6px" }}>
            {t("mdDeleteRequestPendingTitle")}
          </p>
          <p style={{ fontSize: 11.5, color: "#374151", margin: "0 0 8px" }}>
            {t("mdDeleteRequestedBy", { name: expandedItem.deleteRequestedBy, date: toJalaliSafe(expandedItem.deleteRequestedAt) })}
            {expandedItem.deleteRequestNote && <> — {t("mdDeleteRequestReason", { note: expandedItem.deleteRequestNote })}</>}
          </p>
          {isGatekeeper && !readOnly && (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleApproveDeleteRequest(expandedItem)}>
                {t("mdApproveAndDeletePermanently")}
              </button>
              <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => handleRejectDeleteRequest(expandedItem)}>
                {t("mdRejectDeleteRequest")}
              </button>
            </div>
          )}
        </div>
      )}

      {expandedId === expandedItem.id && isGatekeeper && !readOnly && (
        <div style={{ borderTop: docsExpandedId === expandedItem.id ? `1px solid ${THEME.border}` : "none", paddingTop: docsExpandedId === expandedItem.id ? 10 : 0 }}>
          <label style={styles.label}>{t("mdReviewNoteLabel")}</label>
          <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={reviewNoteDraft} onChange={(e) => setReviewNoteDraft(e.target.value)} dir={dir} />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={() => submitReview(expandedItem, "approved")} disabled={savingReview}>{t("mdApproved")}</button>
            <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => submitReview(expandedItem, "needs_correction")} disabled={savingReview}>{t("mdNeedsCorrectionBtn")}</button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => submitReview(expandedItem, "rejected")} disabled={savingReview}>{t("mdRejectedBtn")}</button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => { setExpandedId(null); setDocsExpandedId(null); }} disabled={savingReview}>{t("commonClose")}</button>
          </div>
        </div>
      )}
      {docsExpandedId === expandedItem.id && expandedId !== expandedItem.id && (
        <button type="button" style={{ ...styles.smallButton, background: THEME.text3, marginTop: 10 }} onClick={() => setDocsExpandedId(null)}>{t("mdCloseDocs")}</button>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackToMenu")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Truck size={20} color={THEME.teal} />
        <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>{t("mdModuleTitle")}</h2>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 14 }}>
        {isContractor ? t("mdContractorSubtitle") : t("mdEmployerSubtitle")}
      </p>

      {isContractor && !readOnly && (
        <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }} onClick={startCreate}>
          <Plus size={15} /> {t("mdRegisterNewMachinery")}
        </button>
      )}

      <DataView
        items={sorted}
        getId={(m) => m.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("mdSearchPlaceholder")}
        sortOptions={SORT_OPTIONS}
        sortValue={sort}
        onSortChange={setSort}
        filterSlot={
          <>
            <select style={styles.filterSelect} value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} dir={dir}>
              <option value="all">{t("filterAllStatuses")}</option>
              {APPROVAL_STATUSES.filter((s) => isContractor || s.value !== "draft").map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
            <select style={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} dir={dir}>
              <option value="all">{t("filterAllTypes")}</option>
              {MACHINE_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{t(mt.labelKey)}</option>)}
            </select>
          </>
        }
        bulkActions={
          isGatekeeper && !readOnly
            ? [{ label: t("mdBulkApprove"), onClick: handleBulkApprove }]
            : isContractor && !readOnly
              ? [{ label: t("bulkDelete"), danger: true, onClick: handleBulkDelete }]
              : null
        }
        emptyMessage={t("mdNoMachineryFound")}
        columns={[
          {
            key: "name", label: t("colMachineNamePlate"),
            render: (m) => (
              <div>
                <div style={{ fontWeight: 600 }}>{m.machineName}</div>
                <div style={{ fontSize: 11, color: THEME.text3 }}>{m.plateNumber}</div>
              </div>
            ),
          },
          ...(!isContractor ? [{ key: "contractor", label: t("fieldContractor"), render: (m) => m.contractorName || "—" }] : []),
          { key: "type", label: t("colType"), render: (m) => { const mtm = MACHINE_TYPES.find((x) => x.value === m.machineType); return mtm ? t(mtm.labelKey) : "—"; } },
          {
            key: "expiry", label: t("colExpiry"),
            render: (m) => {
              const { anyWarn } = expiryWarning(m);
              if (!anyWarn) return <span style={{ color: THEME.text3 }}>—</span>;
              return <span style={{ color: "#b45309", fontSize: 11 }}>{t("mdDocsNearExpiry")}</span>;
            },
          },
          {
            key: "status", label: t("commonStatus"),
            render: (m) => {
              const sm = approvalStatusMeta(m.approvalStatus);
              const gi = gateMap[m.id];
              const assignedExpertName = gi?.status === "assigned_review" ? (gateStaff.find((s) => s.username === gi.assignedTo)?.name || gi.assignedTo) : null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <StatusPill label={t(sm.labelKey)} color={sm.color} bg={sm.bg} />
                  {assignedExpertName && (
                    <span style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 600 }}>{t("gateAssignedToExpert", { name: assignedExpertName })}</span>
                  )}
                  {m.deleteRequestedBy && (
                    <span style={{ fontSize: 10.5, color: THEME.danger, fontWeight: 600 }}>{t("mdStatusDeleteRequestPending")}</span>
                  )}
                  {m.syncStatus && m.syncStatus !== "synced" && <SyncStatusBadge status={m.syncStatus} onRetry={() => load()} />}
                </div>
              );
            },
          },
        ]}
        renderRowActions={rowActions}
        expandedId={docsExpandedId || expandedId}
        renderExpanded={renderExpandedPanel}
        renderCard={(m) => {
          const sm = approvalStatusMeta(m.approvalStatus);
          const giCard = gateMap[m.id];
          const assignedExpertNameCard = giCard?.status === "assigned_review" ? (gateStaff.find((s) => s.username === giCard.assignedTo)?.name || giCard.assignedTo) : null;
          const {
            insuranceDays, inspectionDays, healthCertDays, driverLicenseDays, backupDriverLicenseDays,
            insuranceWarn, inspectionWarn, healthCertWarn, driverLicenseWarn, backupDriverLicenseWarn, anyWarn,
          } = expiryWarning(m);
          return (
            <div style={{ ...styles.card, width: "auto", margin: 0, borderInlineStart: `4px solid ${sm.color}`, height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, color: THEME.navy, fontSize: 14 }}>{m.machineName} — {m.plateNumber}</div>
                  <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 4 }}>
                    {!isContractor && <>{m.contractorName} · </>}
                    {(() => { const mtm = MACHINE_TYPES.find((x) => x.value === m.machineType); return mtm ? t(mtm.labelKey) : ""; })()} {m.project && `· ${m.project}`}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusPill label={t(sm.labelKey)} color={sm.color} bg={sm.bg} />
                    {m.syncStatus && m.syncStatus !== "synced" && <SyncStatusBadge status={m.syncStatus} onRetry={() => load()} />}
                  </div>
                  {assignedExpertNameCard && (
                    <span style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 600 }}>{t("gateAssignedToExpert", { name: assignedExpertNameCard })}</span>
                  )}
                </div>
              </div>

              {anyWarn && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: "#b45309" }}>
                  {insuranceWarn && <div>{t("mdWarnInsurance", { status: insuranceDays < 0 ? t("mdWarnExpired") : t("mdWarnDaysLeft", { days: insuranceDays }), date: toJalaliSafe(m.insuranceExpiry) })}</div>}
                  {inspectionWarn && <div>{t("mdWarnInspection", { status: inspectionDays < 0 ? t("mdWarnExpired") : t("mdWarnDaysLeft", { days: inspectionDays }), date: toJalaliSafe(m.inspectionExpiry) })}</div>}
                  {healthCertWarn && <div>{t("mdWarnHealthCert", { status: healthCertDays < 0 ? t("mdWarnExpired") : t("mdWarnDaysLeft", { days: healthCertDays }), date: toJalaliSafe(m.healthCertExpiry) })}</div>}
                  {driverLicenseWarn && <div>{t("mdWarnDriverLicense", { status: driverLicenseDays < 0 ? t("mdWarnExpired") : t("mdWarnDaysLeft", { days: driverLicenseDays }), date: toJalaliSafe(m.driverLicenseExpiry) })}</div>}
                  {backupDriverLicenseWarn && <div>{t("mdWarnBackupDriverLicense", { status: backupDriverLicenseDays < 0 ? t("mdWarnExpired") : t("mdWarnDaysLeft", { days: backupDriverLicenseDays }), date: toJalaliSafe(m.backupDriverLicenseExpiry) })}</div>}
                </div>
              )}

              {m.reviewNote && (m.approvalStatus === "rejected" || m.approvalStatus === "needs_correction") && (
                <p style={{ fontSize: 11.5, color: THEME.danger, marginTop: 8 }}><b>{t("mdEmployerNoteLabel")}</b> {m.reviewNote}</p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>{rowActions(m)}</div>
            </div>
          );
        }}
      />

      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}
