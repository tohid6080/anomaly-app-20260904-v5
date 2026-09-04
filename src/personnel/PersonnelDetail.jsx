import React, { useState, useEffect } from "react";
import { Clock, ShieldCheck, UserX, Trash2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { isoToJalaliDisplay, JalaliDateInput } from "./jalaliDate.jsx";
import DocUploadField from "./DocUploadField.jsx";
import DocumentViewerModal from "./DocumentViewerModal.jsx";
import SyncStatusBadge from "../offline/SyncStatusBadge.jsx";
import { loadRequiredTrainingsForJobTitle } from "../training/trainingApi.js";
import AccidentPronenessSection from "./AccidentPronenessSection.jsx";
import {
  DOC_TYPES, docStatusMeta, personnelStatusMeta,
  loadPersonnelDocuments, upsertDocument, insertTrainingAttachment, reviewDocumentDB, deleteDocumentDB,
  updatePersonnelDB, progressPersonnelWorkflow, checkAndUpdateDeadlines,
  EMPLOYMENT_STATUS, employmentStatusMeta, setEmploymentStatus,
} from "./personnelApi.js";
import {
  loadGateStatusForRecord, loadCompanyStaffOptions, assignForReview, submitReview,
  approveGateItem, rejectGateItem, GATE_STATUS_LABELS,
} from "../hseGateApi.js";

/**
 * Personnel detail / review screen.
 * Contractor: uploads & replaces documents.
 * Employer/Admin: reviews each document (approve / reject / needs correction),
 * approves qualification (for special jobs), and — implicitly, through the
 * document approvals — drives the occupational-health workflow via
 * progressPersonnelWorkflow() in personnelApi.js.
 */
export default function PersonnelDetail({ personnel: initialPersonnel, role, currentUser, onBack, onUpdated, readOnly, onNavigateToAssessment }) {
  const [personnel, setPersonnel] = useState(initialPersonnel);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewDraft, setReviewDraft] = useState({});
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [qualNote, setQualNote] = useState(initialPersonnel.qualificationNote || "");
  const [showQualReject, setShowQualReject] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminationDateDraft, setTerminationDateDraft] = useState("");
  const [terminationError, setTerminationError] = useState("");
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [requiredTrainings, setRequiredTrainings] = useState([]);
  const [trainingsLoading, setTrainingsLoading] = useState(true);

  // گیت سرپرست/مدیر HSE — ارجاع بررسی این پرسنل به یک کارشناس، یا تأیید
  // مستقیم توسط خودِ سرپرست. دقیقاً همان زیرساخت مشترک آنومالی.
  const [gateItem, setGateItem] = useState(null);
  const [gateStaff, setGateStaff] = useState([]);
  const [assigningGate, setAssigningGate] = useState(false);
  const [assignGateTo, setAssignGateTo] = useState("");
  const [reviewingGate, setReviewingGate] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [gateRejectNote, setGateRejectNote] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateMessage, setGateMessage] = useState("");
  const isGatekeeper = (currentUser?.role === "HSE_SUPERVISOR" || role === "ADMIN") && !readOnly;

  const loadGate = () => {
    if (role === "CONTRACTOR") return;
    Promise.all([
      loadGateStatusForRecord("personnelAccess", personnel.id),
      isGatekeeper ? loadCompanyStaffOptions() : Promise.resolve([]),
    ]).then(([item, staff]) => { setGateItem(item); setGateStaff(staff); });
  };
  useEffect(() => { loadGate(); }, [personnel.id]);

  const handleAssignForReview = async () => {
    if (!gateItem || !assignGateTo) return;
    setGateBusy(true); setGateMessage("");
    const result = await assignForReview(gateItem.id, assignGateTo, currentUser?.name);
    setGateBusy(false);
    if (result?.__error) { setGateMessage(result.message); return; }
    setAssigningGate(false); setAssignGateTo("");
    loadGate();
  };
  const handleSubmitGateReview = async () => {
    if (!gateItem) return;
    setGateBusy(true); setGateMessage("");
    const result = await submitReview(gateItem.id, currentUser?.username, reviewComment);
    setGateBusy(false);
    if (result?.__error) { setGateMessage(result.message); return; }
    setReviewingGate(false); setReviewComment("");
    loadGate();
  };
  const handleApproveGate = async () => {
    if (!gateItem) return;
    setGateBusy(true); setGateMessage("");
    const result = await approveGateItem(gateItem.id, currentUser?.name);
    setGateBusy(false);
    if (result?.__error) { setGateMessage(result.message); return; }
    loadGate();
  };
  const handleRejectGate = async (note) => {
    if (!gateItem) return;
    setGateBusy(true); setGateMessage("");
    const result = await rejectGateItem(gateItem.id, currentUser?.name, note);
    setGateBusy(false);
    if (result?.__error) { setGateMessage(result.message); return; }
    loadGate();
  };

  useEffect(() => {
    loadRequiredTrainingsForJobTitle(personnel.jobTitle).then((list) => {
      setRequiredTrainings(list);
      setTrainingsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personnel.jobTitle]);

  // طبق تصمیم تأییدشده: بررسی/تأیید مدارک و صلاحیت پرسنل فقط برای
  // سرپرست/مدیر HSE و ادمین مجاز است، نه هر کارفرمایی معمولی. چون
  // role (prop) همیشه "EMPLOYER" است (حتی برای حساب سرپرست HSE — هر دو
  // در EmployerDashboard میزبانی می‌شوند)، مستقیم currentUser?.role چک
  // می‌شود که واقعاً نقش سیستمی کاربر جاری را نشان می‌دهد.
  const isEmployer = (currentUser?.role === "HSE_SUPERVISOR" || role === "ADMIN" || (gateItem?.status === "assigned_review" && gateItem?.assignedTo === currentUser?.username)) && !readOnly;
  const isContractor = role === "CONTRACTOR" && !readOnly;

  const load = async () => {
    setDocuments(await loadPersonnelDocuments(personnel.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [personnel.id]);

  const refreshAfterChange = (updatedPersonnel, updatedDocs) => {
    setPersonnel(updatedPersonnel);
    setDocuments(updatedDocs);
    onUpdated && onUpdated(updatedPersonnel);
  };

  const handleConfirmTermination = async () => {
    if (!terminationDateDraft) { setTerminationError("تاریخ ترک کار / تسویه حساب الزامی است"); return; }
    setSavingEmployment(true);
    setTerminationError("");
    const result = await setEmploymentStatus(personnel.id, "terminated", terminationDateDraft, currentUser?.name || currentUser?.username);
    setSavingEmployment(false);
    if (result?.__error) { setTerminationError(result.message); return; }
    setShowTerminateForm(false);
    refreshAfterChange({ ...personnel, ...result }, documents);
  };

  const handleReactivate = async () => {
    if (!confirm("این پرسنل دوباره به وضعیت «فعال» بازگردانده شود؟")) return;
    setSavingEmployment(true);
    const result = await setEmploymentStatus(personnel.id, "active", "", currentUser?.name || currentUser?.username);
    setSavingEmployment(false);
    if (result?.__error) { alert(result.message); return; }
    refreshAfterChange({ ...personnel, ...result }, documents);
  };

  const docByType = (t) => documents.find((d) => d.docType === t);

  const handleConfirmUpload = async (docType, data, fileName, mimeType) => {
    if (!isContractor) { alert("شما مجوز بارگذاری مدرک را ندارید"); return { __error: true, message: "no permission" }; }
    const doc = await upsertDocument(personnel.id, docType, data, fileName, mimeType, (currentUser?.name || currentUser?.username));
    if (doc?.__error) return doc;
    const newDocs = [...documents.filter((d) => d.docType !== docType), doc];
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    refreshAfterChange(updatedP, newDocs);
    return doc;
  };

  const handleDeleteDoc = async (doc) => {
    if (!isContractor) { alert("شما مجوز حذف مدرک را ندارید"); return; }
    if (!confirm("این مدرک حذف شود؟")) return;
    await deleteDocumentDB(doc.id);
    setDocuments(documents.filter((d) => d.id !== doc.id));
  };

  // پیوست‌های آموزش تخصصی — تا ۳ فایل هم‌زمان، افزودنی نه جایگزین‌کننده
  const trainingAttachments = documents.filter((d) => d.docType === "specialized_safety_training");
  const handleUploadTrainingAttachment = async (data, fileName, mimeType) => {
    if (!isContractor) { alert("شما مجوز بارگذاری پیوست را ندارید"); return { __error: true, message: "no permission" }; }
    const doc = await insertTrainingAttachment(personnel.id, data, fileName, mimeType, (currentUser?.name || currentUser?.username));
    if (doc?.__error) return doc;
    const newDocs = [...documents, doc];
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    refreshAfterChange(updatedP, newDocs);
    return doc;
  };
  const handleDeleteTrainingAttachment = async (doc) => {
    if (!isContractor) { alert("شما مجوز حذف پیوست را ندارید"); return; }
    if (!confirm("این پیوست حذف شود؟")) return;
    await deleteDocumentDB(doc.id);
    setDocuments(documents.filter((d) => d.id !== doc.id));
  };

  const handleReviewDoc = async (doc, status, note) => {
    if (!isEmployer) { alert("شما مجوز بررسی مدارک را ندارید"); return; }
    const updatedDoc = await reviewDocumentDB(doc.id, status, note, (currentUser?.name || currentUser?.username));
    const newDocs = documents.map((d) => (d.id === doc.id ? updatedDoc : d));
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    setShowRejectFor(null);
    refreshAfterChange(updatedP, newDocs);
  };

  const handleQualificationDecision = async (status) => {
    if (!isEmployer) { alert("شما مجوز تأیید صلاحیت را ندارید"); return; }
    const updated = await updatePersonnelDB(personnel.id, { qualificationStatus: status, qualificationNote: qualNote }, (currentUser?.name || currentUser?.username));
    const finalP = await progressPersonnelWorkflow(updated, documents, (currentUser?.name || currentUser?.username));
    setShowQualReject(false);
    refreshAfterChange(finalP, documents);
  };

  const sm = personnelStatusMeta(personnel.status);
  const visibleDocTypes = DOC_TYPES.filter((dt) => !dt.specialOnly || personnel.qualificationRequired);

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>در حال بارگذاری...</div>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>← بازگشت به لیست</div>}

      <div style={{ ...styles.card, width: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, color: THEME.navy, fontWeight: 700 }}>{personnel.fullName}</h2>
            <p style={{ fontSize: 12, color: THEME.text3, margin: "4px 0 0" }}>{personnel.jobTitle} · {personnel.contractorName}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...styles.badge, color: sm.color, background: sm.bg, fontSize: 12 }}>{sm.label}</span>
            <span style={{ ...styles.badge, color: employmentStatusMeta(personnel.employmentStatus).color, background: employmentStatusMeta(personnel.employmentStatus).bg, fontSize: 12 }}>
              {employmentStatusMeta(personnel.employmentStatus).label}
            </span>
            {personnel.syncStatus && personnel.syncStatus !== "synced" && <SyncStatusBadge status={personnel.syncStatus} />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: THEME.text2, marginTop: 12, lineHeight: 2 }}>
          <div>کد ملی: {personnel.nationalCode}</div>
          <div>شماره تماس: {personnel.phone}</div>
          <div>تاریخ شروع به کار: {isoToJalaliDisplay(personnel.startDate)}</div>
          {personnel.occHealthExpiry && <div>انقضای طب کار: {isoToJalaliDisplay(personnel.occHealthExpiry)}</div>}
          {personnel.employmentStatus === "terminated" && personnel.terminationDate && (
            <div style={{ color: THEME.danger, fontWeight: 600 }}>تاریخ ترک کار / تسویه حساب: {isoToJalaliDisplay(personnel.terminationDate)}</div>
          )}
        </div>
      </div>

      {gateItem && (gateItem.status === "pending_approval" || gateItem.status === "assigned_review" || gateItem.status === "reviewed") && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "0 0 8px" }}>
            گیت بازبینی سرپرست/مدیر HSE — {GATE_STATUS_LABELS[gateItem.status] || gateItem.status}
          </p>
          {gateItem.reviewerComment && (
            <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px", lineHeight: 1.8 }}>
              <b>نظر کارشناس:</b> {gateItem.reviewerComment}
            </p>
          )}
          {gateMessage && <p style={styles.error}>{gateMessage}</p>}

          {/* سمت سرپرست/مدیر HSE */}
          {isGatekeeper && (gateItem.status === "pending_approval" || gateItem.status === "reviewed") && (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={handleApproveGate} disabled={gateBusy}>
                  تأیید بررسی اولیه
                </button>
                {gateItem.status === "pending_approval" && (
                  <button type="button" style={styles.smallButton} onClick={() => { setAssigningGate(true); setAssignGateTo(""); }} disabled={gateBusy}>
                    ارجاع به کارشناس برای بررسی
                  </button>
                )}
                <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowRejectFor("__gate__")} disabled={gateBusy}>
                  رد
                </button>
              </div>
              {assigningGate && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select style={{ ...styles.input, marginTop: 0, maxWidth: 220 }} value={assignGateTo} onChange={(e) => setAssignGateTo(e.target.value)} dir="rtl">
                    <option value="">انتخاب کارشناس</option>
                    {gateStaff.filter((s) => s.username !== currentUser?.username).map((s) => <option key={s.username} value={s.username}>{s.name}</option>)}
                  </select>
                  <button type="button" style={styles.smallButton} onClick={handleAssignForReview} disabled={gateBusy || !assignGateTo}>ثبت ارجاع</button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setAssigningGate(false)}>انصراف</button>
                </div>
              )}
              {showRejectFor === "__gate__" && (
                <div style={{ marginTop: 8 }}>
                  <label style={styles.label}>دلیل رد (اختیاری)</label>
                  <textarea style={{ ...styles.input, minHeight: 50 }} value={gateRejectNote} onChange={(e) => setGateRejectNote(e.target.value)} dir="rtl" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => { handleRejectGate(gateRejectNote); setShowRejectFor(null); setGateRejectNote(""); }} disabled={gateBusy}>ثبت رد</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectFor(null)}>انصراف</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* سمت کارشناسی که این پرسنل به او ارجاع شده */}
          {gateItem.status === "assigned_review" && gateItem.assignedTo === currentUser?.username && (
            <div>
              {!reviewingGate ? (
                <button type="button" style={styles.smallButton} onClick={() => { setReviewingGate(true); setReviewComment(""); }} disabled={gateBusy}>
                  ارسال نتیجه‌ی بررسی برای سرپرست/مدیر HSE
                </button>
              ) : (
                <div>
                  <label style={styles.label}>نظر یا توضیح (اختیاری)</label>
                  <textarea style={{ ...styles.input, minHeight: 50 }} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} dir="rtl" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={styles.smallButton} onClick={handleSubmitGateReview} disabled={gateBusy}>ارسال</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setReviewingGate(false)}>انصراف</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ ...styles.card, width: "auto" }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700 }}>آموزش‌های تخصصی موردنیاز (بر اساس عنوان شغلی)</h3>
        {trainingsLoading && <p style={{ fontSize: 12, color: THEME.text3 }}>در حال بررسی...</p>}
        {!trainingsLoading && requiredTrainings.length === 0 && (
          <p style={{ fontSize: 12, color: THEME.text3 }}>برای عنوان شغلی «{personnel.jobTitle}» آموزش الزامی‌ای در ماتریس تعریف نشده است.</p>
        )}
        {!trainingsLoading && requiredTrainings.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {requiredTrainings.map((t) => (
              <span key={t.id} style={{ ...styles.badge, background: "#e3f5f4", color: THEME.tealDeep }} title={t.description || ""}>{t.title}</span>
            ))}
          </div>
        )}

        <h4 style={{ fontSize: 12.5, color: THEME.navy, margin: "16px 0 8px", fontWeight: 700, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
          پیوست‌های فرم آموزش ایمنی تخصصی ({trainingAttachments.length.toLocaleString("fa-IR")} از ۳)
        </h4>
        {trainingAttachments.map((doc) => (
          <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: THEME.bg, borderRadius: 8, marginBottom: 6 }}>
            <button type="button" onClick={() => setViewerSrc(doc.fileData)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, color: THEME.navy, textAlign: "start" }}>
              {doc.fileName || "پیوست"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {docStatusMeta && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: docStatusMeta(doc.status).bg, color: docStatusMeta(doc.status).color, fontWeight: 600 }}>
                  {docStatusMeta(doc.status).label}
                </span>
              )}
              {isContractor && (
                <button type="button" onClick={() => handleDeleteTrainingAttachment(doc)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {isContractor && trainingAttachments.length < 3 && (
          <DocUploadField
            existingDoc={null}
            onConfirm={handleUploadTrainingAttachment}
            onView={setViewerSrc}
          />
        )}
        {!isContractor && trainingAttachments.length === 0 && (
          <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>هنوز پیوستی بارگذاری نشده</p>
        )}
      </div>

      {isEmployer && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <UserX size={16} color={THEME.text2} /> وضعیت اشتغال
          </h3>

          {personnel.employmentStatus === "active" && !showTerminateForm && (
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowTerminateForm(true)}>
              ثبت ترک کار / تسویه حساب
            </button>
          )}

          {showTerminateForm && (
            <div>
              <label style={styles.label}>تاریخ ترک کار / تسویه حساب</label>
              <JalaliDateInput value={terminationDateDraft} onChange={setTerminationDateDraft} />
              {terminationError && <p style={styles.error}>{terminationError}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={handleConfirmTermination} disabled={savingEmployment}>
                  {savingEmployment ? "در حال ثبت..." : "تأیید ترک کار / تسویه حساب"}
                </button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => { setShowTerminateForm(false); setTerminationError(""); }}>
                  انصراف
                </button>
              </div>
            </div>
          )}

          {personnel.employmentStatus === "terminated" && !showTerminateForm && (
            <button type="button" style={styles.smallButton} onClick={handleReactivate} disabled={savingEmployment}>
              {savingEmployment ? "در حال ثبت..." : "بازگرداندن به وضعیت فعال"}
            </button>
          )}
        </div>
      )}

      {personnel.qualificationRequired && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={16} color="#c2410c" /> تأیید صلاحیت کارفرما
          </h3>
          <span style={{ ...styles.badge, color: docStatusMeta(personnel.qualificationStatus || "pending").color, background: docStatusMeta(personnel.qualificationStatus || "pending").bg }}>
            {docStatusMeta(personnel.qualificationStatus || "pending").label}
          </span>
          {personnel.qualificationNote && <p style={{ fontSize: 12, color: THEME.text2, marginTop: 8 }}><b>یادداشت:</b> {personnel.qualificationNote}</p>}
          {isEmployer && personnel.qualificationStatus !== "approved" && (
            <div style={{ marginTop: 12 }}>
              {!showQualReject ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={styles.button} onClick={() => handleQualificationDecision("approved")}>تأیید صلاحیت</button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowQualReject(true)}>رد / نیاز به اصلاح</button>
                </div>
              ) : (
                <>
                  <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={qualNote} onChange={(e) => setQualNote(e.target.value)} placeholder="دلیل رد یا نکات اصلاحی" dir="rtl" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleQualificationDecision("rejected")}>ثبت رد</button>
                    <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => handleQualificationDecision("needs_correction")}>نیاز به اصلاح</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowQualReject(false)}>انصراف</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <AccidentPronenessSection personnel={personnel} role={role} currentUser={currentUser} onNavigateToAssessment={onNavigateToAssessment} />

      <div style={{ ...styles.card, width: "auto" }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 4px", fontWeight: 700 }}>مدارک</h3>
        {visibleDocTypes.map((dt) => {
          const doc = docByType(dt.value);
          const dsm = doc ? docStatusMeta(doc.status) : null;
          return (
            <div key={dt.value} style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{dt.label}</span>
                {dsm && <span style={{ ...styles.badge, color: dsm.color, background: dsm.bg }}>{dsm.label}</span>}
              </div>

              {doc && (
                <div style={{ marginTop: 8 }}>
                  <DocUploadField
                    existingDoc={doc}
                    onConfirm={(data, name, mime) => handleConfirmUpload(dt.value, data, name, mime)}
                    onDelete={isContractor ? handleDeleteDoc : null}
                    onView={setViewerSrc}
                    disabled={isEmployer}
                    allowReplace={isContractor && (doc.status === "rejected" || doc.status === "needs_correction")}
                  />
                </div>
              )}
              {!doc && (
                <div style={{ marginTop: 8 }}>
                  {isContractor ? (
                    <DocUploadField
                      existingDoc={null}
                      onConfirm={(data, name, mime) => handleConfirmUpload(dt.value, data, name, mime)}
                      onView={setViewerSrc}
                    />
                  ) : (
                    <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0" }}>هنوز بارگذاری نشده</p>
                  )}
                </div>
              )}
              {doc?.reviewNote && <p style={{ fontSize: 11.5, color: THEME.danger, marginTop: 6 }}><b>یادداشت بررسی:</b> {doc.reviewNote}</p>}

              {isEmployer && doc && doc.status === "pending" && (
                <div style={{ marginTop: 8 }}>
                  {showRejectFor !== doc.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" style={{ ...styles.smallButton, padding: "6px 12px" }} onClick={() => handleReviewDoc(doc, "approved", "")}>تأیید</button>
                      <button type="button" style={{ ...styles.smallButton, background: THEME.danger, padding: "6px 12px" }} onClick={() => setShowRejectFor(doc.id)}>رد / اصلاح</button>
                    </div>
                  ) : (
                    <>
                      <textarea style={{ ...styles.input, minHeight: 50, fontFamily: "inherit", marginTop: 6 }} value={reviewDraft[doc.id] || ""} onChange={(e) => setReviewDraft({ ...reviewDraft, [doc.id]: e.target.value })} placeholder="توضیح رد/اصلاح" dir="rtl" />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleReviewDoc(doc, "rejected", reviewDraft[doc.id])}>رد</button>
                        <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => handleReviewDoc(doc, "needs_correction", reviewDraft[doc.id])}>نیاز به اصلاح</button>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectFor(null)}>انصراف</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {personnel.occHealthPath === "no_certificate" && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={16} /> فرآیند طب کار
          </h3>
          <p style={{ fontSize: 12, color: THEME.text2, margin: "0 0 8px" }}>
            تاریخ شروع به کار: <b>{personnel.startDate ? isoToJalaliDisplay(personnel.startDate) : "ثبت نشده"}</b>
          </p>
          {!personnel.occHealthVisitDeadline && (
            <p style={{ fontSize: 12, color: THEME.text3 }}>پس از تأیید مدارک اولیه، مهلت ۳ روزه مراجعه به طب کار به‌صورت خودکار فعال می‌شود.</p>
          )}
          {personnel.occHealthVisitDeadline && !docByType("health_visit_receipt") && (
            <p style={{ fontSize: 12, color: "#b45309" }}>مهلت مراجعه تا تاریخ {isoToJalaliDisplay(personnel.occHealthVisitDeadline)}</p>
          )}
          {personnel.occHealthResultDeadline && !docByType("health_final_result") && (
            <p style={{ fontSize: 12, color: "#b45309" }}>مهلت بارگذاری نتیجه تا تاریخ {isoToJalaliDisplay(personnel.occHealthResultDeadline)}</p>
          )}
          {isEmployer && (personnel.occHealthVisitDeadline || personnel.occHealthResultDeadline) && (
            <button
              type="button"
              style={{ ...styles.smallButton, marginTop: 8 }}
              onClick={async () => {
                await checkAndUpdateDeadlines([personnel]);
                alert("بررسی انجام شد. اگر مهلت گذشته بود، اعلان باید همین الان توی زنگوله ظاهر شده باشد.");
              }}
            >
              بررسی مهلت و ارسال اعلان همین الان
            </button>
          )}
        </div>
      )}

      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}
