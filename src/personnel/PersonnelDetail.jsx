import React, { useState, useEffect } from "react";
import { Clock, ShieldCheck, UserX } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { isoToJalaliDisplay, JalaliDateInput } from "./jalaliDate.jsx";
import DocUploadField from "./DocUploadField.jsx";
import DocumentViewerModal from "./DocumentViewerModal.jsx";
import SyncStatusBadge from "../offline/SyncStatusBadge.jsx";
import { loadRequiredTrainingsForJobTitle } from "../training/trainingApi.js";
import AccidentPronenessSection from "./AccidentPronenessSection.jsx";
import {
  DOC_TYPES, docStatusMeta, personnelStatusMeta,
  loadPersonnelDocuments, upsertDocument, upsertTrainingDocument, reviewDocumentDB, deleteDocumentDB,
  updatePersonnelDB, progressPersonnelWorkflow, checkAndUpdateDeadlines,
  EMPLOYMENT_STATUS, employmentStatusMeta, setEmploymentStatus,
} from "./personnelApi.js";
import {
  loadGateStatusForRecord, loadCompanyStaffOptions, assignForReview, submitReview,
  approveGateItem, rejectGateItem, submitToGate, gateStatusLabel,
} from "../hseGateApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Personnel detail / review screen.
 * Contractor: uploads & replaces documents.
 * Employer/Admin: reviews each document (approve / reject / needs correction),
 * approves qualification (for special jobs), and — implicitly, through the
 * document approvals — drives the occupational-health workflow via
 * progressPersonnelWorkflow() in personnelApi.js.
 */
export default function PersonnelDetail({ personnel: initialPersonnel, role, currentUser, onBack, onUpdated, readOnly, onNavigateToAssessment }) {
  const { t, dir } = useLanguage();
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
  const [contractorSubmitMsg, setContractorSubmitMsg] = useState("");
  const [contractorSubmitOk, setContractorSubmitOk] = useState(false);
  const isGatekeeper = (currentUser?.role === "HSE_SUPERVISOR" || role === "ADMIN") && !readOnly;

  const loadGate = () => {
    // وضعیتِ گیت برای پیمانکار هم خوانده می‌شود تا دکمهٔ «ثبت و ارسال به
    // سرپرست کارفرما» بداند آیا ارسالِ در جریانی هست یا نه. فهرستِ کارکنانِ
    // کارفرما فقط برای غیرِ پیمانکار (نیازمند دسترسی به employer_accounts).
    loadGateStatusForRecord("personnelAccess", personnel.id).then(setGateItem);
    if (role !== "CONTRACTOR") {
      loadCompanyStaffOptions().then(setGateStaff).catch(() => {});
    }
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

  // پیمانکار: بعد از بارگذاری/جایگزینیِ مدارک، یک ارسالِ صریح به گیتِ
  // «سرپرست کارفرما» می‌کند (دقیقاً همان مسیرِ MachineryForm/PersonnelForm).
  const handleSubmitToSupervisor = async () => {
    setGateBusy(true); setContractorSubmitMsg(""); setContractorSubmitOk(false);
    const result = await submitToGate({
      moduleKey: "personnelAccess", recordId: personnel.id,
      recordLabel: `${personnel.fullName} — ${personnel.jobTitle || ""}`.trim(),
      direction: "contractor_to_employer",
    }, currentUser?.name || currentUser?.username);
    setGateBusy(false);
    if (result?.__error) { setContractorSubmitMsg(result.message); return; }
    setContractorSubmitMsg(t("gateSentToEmployerSupervisor")); setContractorSubmitOk(true);
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
    if (!terminationDateDraft) { setTerminationError(t("errTerminationDateRequired")); return; }
    setSavingEmployment(true);
    setTerminationError("");
    const result = await setEmploymentStatus(personnel.id, "terminated", terminationDateDraft, currentUser?.name || currentUser?.username);
    setSavingEmployment(false);
    if (result?.__error) { setTerminationError(result.message); return; }
    setShowTerminateForm(false);
    refreshAfterChange({ ...personnel, ...result }, documents);
  };

  const handleReactivate = async () => {
    if (!confirm(t("confirmReactivate"))) return;
    setSavingEmployment(true);
    const result = await setEmploymentStatus(personnel.id, "active", "", currentUser?.name || currentUser?.username);
    setSavingEmployment(false);
    if (result?.__error) { alert(result.message); return; }
    refreshAfterChange({ ...personnel, ...result }, documents);
  };

  const docByType = (dtVal) => documents.find((d) => d.docType === dtVal);

  const handleConfirmUpload = async (docType, data, fileName, mimeType) => {
    if (!isContractor) { alert(t("errNoUploadPermission")); return { __error: true, message: "no permission" }; }
    const doc = await upsertDocument(personnel.id, docType, data, fileName, mimeType, (currentUser?.name || currentUser?.username));
    if (doc?.__error) return doc;
    const newDocs = [...documents.filter((d) => d.docType !== docType), doc];
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    refreshAfterChange(updatedP, newDocs);
    return doc;
  };

  const handleDeleteDoc = async (doc) => {
    if (!isContractor) { alert(t("errNoDeleteDocPermission")); return; }
    if (!confirm(t("confirmDeleteDoc"))) return;
    await deleteDocumentDB(doc.id);
    setDocuments(documents.filter((d) => d.id !== doc.id));
  };

  // مدرکِ آموزش تخصصی به‌ازای هر دوره‌ی الزامیِ عنوان شغلی — بدون سقفِ ۳؛
  // آپلودِ دوباره برای همان دوره، مدرکِ قبلیِ همان دوره را جایگزین می‌کند.
  const handleUploadTrainingDoc = async (trainingId, data, fileName, mimeType) => {
    if (!isContractor) { alert(t("errNoUploadPermission")); return { __error: true, message: "no permission" }; }
    const doc = await upsertTrainingDocument(personnel.id, trainingId, data, fileName, mimeType, (currentUser?.name || currentUser?.username));
    if (doc?.__error) return doc;
    const newDocs = [...documents.filter((d) => !(d.docType === "specialized_safety_training" && d.trainingId === trainingId)), doc];
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    refreshAfterChange(updatedP, newDocs);
    return doc;
  };

  const handleReviewDoc = async (doc, status, note) => {
    if (!isEmployer) { alert(t("errNoReviewPermission")); return; }
    const updatedDoc = await reviewDocumentDB(doc.id, status, note, (currentUser?.name || currentUser?.username));
    const newDocs = documents.map((d) => (d.id === doc.id ? updatedDoc : d));
    const updatedP = await progressPersonnelWorkflow(personnel, newDocs, (currentUser?.name || currentUser?.username));
    setShowRejectFor(null);
    refreshAfterChange(updatedP, newDocs);
  };

  const handleQualificationDecision = async (status) => {
    if (!isEmployer) { alert(t("errNoQualificationApprovalPermission")); return; }
    const updated = await updatePersonnelDB(personnel.id, { qualificationStatus: status, qualificationNote: qualNote }, (currentUser?.name || currentUser?.username));
    const finalP = await progressPersonnelWorkflow(updated, documents, (currentUser?.name || currentUser?.username));
    setShowQualReject(false);
    refreshAfterChange(finalP, documents);
  };

  const sm = personnelStatusMeta(personnel.status);
  // «فرم آموزش ایمنی تخصصی» عمداً از کارتِ «مدارک» حذف شده — بارگذاری‌اش
  // حالا به‌ازای هر دوره‌ی الزامی در کارتِ «آموزش‌های تخصصی موردنیاز» انجام
  // می‌شود و اینجا تکراری بود.
  const visibleDocTypes = DOC_TYPES.filter((dt) => dt.value !== "specialized_safety_training" && (!dt.specialOnly || personnel.qualificationRequired));

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("pdetBackToList")}</div>}

      <div style={{ ...styles.card, width: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, color: THEME.navy, fontWeight: 700 }}>{personnel.fullName}</h2>
            <p style={{ fontSize: 12, color: THEME.text3, margin: "4px 0 0" }}>{personnel.jobTitle} · {personnel.contractorName}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...styles.badge, color: sm.color, background: sm.bg, fontSize: 12 }}>{t(sm.labelKey)}</span>
            <span style={{ ...styles.badge, color: employmentStatusMeta(personnel.employmentStatus).color, background: employmentStatusMeta(personnel.employmentStatus).bg, fontSize: 12 }}>
              {t(employmentStatusMeta(personnel.employmentStatus).labelKey)}
            </span>
            {personnel.syncStatus && personnel.syncStatus !== "synced" && <SyncStatusBadge status={personnel.syncStatus} />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: THEME.text2, marginTop: 12, lineHeight: 2 }}>
          <div>{t("pdetNationalCode")} {personnel.nationalCode}</div>
          <div>{t("pdetPhone")} {personnel.phone}</div>
          <div>{t("pdetStartDate")} {isoToJalaliDisplay(personnel.startDate)}</div>
          {personnel.occHealthExpiry && <div>{t("pdetHealthExpiry")} {isoToJalaliDisplay(personnel.occHealthExpiry)}</div>}
          {personnel.employmentStatus === "terminated" && personnel.terminationDate && (
            <div style={{ color: THEME.danger, fontWeight: 600 }}>{t("pdetTerminationDate")} {isoToJalaliDisplay(personnel.terminationDate)}</div>
          )}
        </div>
      </div>

      {!isContractor && gateItem && (gateItem.status === "pending_approval" || gateItem.status === "assigned_review" || gateItem.status === "reviewed") && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "0 0 8px" }}>
            {t("gateReviewGateHeading", { status: gateStatusLabel(gateItem.status) })}
          </p>
          {gateItem.status === "assigned_review" && (
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", margin: "0 0 8px" }}>
              {t("gateAssignedToExpert", { name: gateStaff.find((s) => s.username === gateItem.assignedTo)?.name || gateItem.assignedTo })}
            </p>
          )}
          {gateItem.reviewerComment && (
            <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px", lineHeight: 1.8 }}>
              <b>{t("gateExpertComment")}</b> {gateItem.reviewerComment}
            </p>
          )}
          {gateMessage && <p style={styles.error}>{gateMessage}</p>}

          {/* سمت سرپرست/مدیر HSE */}
          {isGatekeeper && (gateItem.status === "pending_approval" || gateItem.status === "reviewed") && (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={handleApproveGate} disabled={gateBusy}>
                  {t("gateApproveInitialReview")}
                </button>
                {gateItem.status === "pending_approval" && (
                  <button type="button" style={styles.smallButton} onClick={() => { setAssigningGate(true); setAssignGateTo(""); }} disabled={gateBusy}>
                    {t("gateAssignToExpertForReview")}
                  </button>
                )}
                <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowRejectFor("__gate__")} disabled={gateBusy}>
                  {t("gateReject")}
                </button>
              </div>
              {assigningGate && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select style={{ ...styles.input, marginTop: 0, maxWidth: 220 }} value={assignGateTo} onChange={(e) => setAssignGateTo(e.target.value)} dir={dir}>
                    <option value="">{t("gateSelectExpert")}</option>
                    {gateStaff.filter((s) => s.username !== currentUser?.username).map((s) => <option key={s.username} value={s.username}>{s.name}</option>)}
                  </select>
                  <button type="button" style={styles.smallButton} onClick={handleAssignForReview} disabled={gateBusy || !assignGateTo}>{t("gateSubmitAssignment")}</button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setAssigningGate(false)}>{t("commonCancel")}</button>
                </div>
              )}
              {showRejectFor === "__gate__" && (
                <div style={{ marginTop: 8 }}>
                  <label style={styles.label}>{t("gateRejectReasonOptional")}</label>
                  <textarea style={{ ...styles.input, minHeight: 50 }} value={gateRejectNote} onChange={(e) => setGateRejectNote(e.target.value)} dir={dir} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => { handleRejectGate(gateRejectNote); setShowRejectFor(null); setGateRejectNote(""); }} disabled={gateBusy}>{t("gateSubmitReject")}</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectFor(null)}>{t("commonCancel")}</button>
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
                  {t("gateSendReviewResultToSupervisor")}
                </button>
              ) : (
                <div>
                  <label style={styles.label}>{t("gateCommentOptional")}</label>
                  <textarea style={{ ...styles.input, minHeight: 50 }} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} dir={dir} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={styles.smallButton} onClick={handleSubmitGateReview} disabled={gateBusy}>{t("gateSend")}</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setReviewingGate(false)}>{t("commonCancel")}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ ...styles.card, width: "auto" }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700 }}>{t("pdetRequiredTrainings")}</h3>
        {trainingsLoading && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("pdetCheckingEllipsis")}</p>}
        {!trainingsLoading && requiredTrainings.length === 0 && (
          <p style={{ fontSize: 12, color: THEME.text3 }}>{t("pdetNoTrainingRequired", { job: personnel.jobTitle })}</p>
        )}
        {/* یک ردیفِ بارگذاریِ مستقل به‌ازای هر آموزشِ الزامیِ شناسایی‌شده —
            سندِ هر ردیف با همان آموزش (training_id) گره خورده است. */}
        {!trainingsLoading && requiredTrainings.map((tr) => {
          const doc = documents.find((d) => d.docType === "specialized_safety_training" && d.trainingId === tr.id);
          const dsm = doc ? docStatusMeta(doc.status) : null;
          return (
            <div key={tr.id} style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }} title={tr.description || ""}>{tr.title}</span>
                {dsm && <span style={{ ...styles.badge, color: dsm.color, background: dsm.bg }}>{t(dsm.labelKey)}</span>}
              </div>

              <div style={{ marginTop: 8 }}>
                {doc ? (
                  <DocUploadField
                    existingDoc={doc}
                    onConfirm={(data, name, mime) => handleUploadTrainingDoc(tr.id, data, name, mime)}
                    onDelete={isContractor && doc.status !== "approved" ? () => handleDeleteDoc(doc) : null}
                    onView={setViewerSrc}
                    disabled={isEmployer}
                    allowDelete={isContractor && doc.status !== "approved"}
                    allowReplace={isContractor && doc.status !== "approved"}
                  />
                ) : isContractor ? (
                  <DocUploadField
                    existingDoc={null}
                    onConfirm={(data, name, mime) => handleUploadTrainingDoc(tr.id, data, name, mime)}
                    onView={setViewerSrc}
                  />
                ) : (
                  <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0" }}>{t("pdetNotUploadedYet")}</p>
                )}
              </div>

              {doc?.reviewNote && <p style={{ fontSize: 11.5, color: THEME.danger, marginTop: 6 }}><b>{t("pdetReviewNote")}</b> {doc.reviewNote}</p>}

              {isEmployer && doc && doc.status === "pending" && (
                <div style={{ marginTop: 8 }}>
                  {showRejectFor !== doc.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" style={{ ...styles.smallButton, padding: "6px 12px" }} onClick={() => handleReviewDoc(doc, "approved", "")}>{t("pdetApprove")}</button>
                      <button type="button" style={{ ...styles.smallButton, background: THEME.danger, padding: "6px 12px" }} onClick={() => setShowRejectFor(doc.id)}>{t("pdetRejectCorrect")}</button>
                    </div>
                  ) : (
                    <>
                      <textarea style={{ ...styles.input, minHeight: 50, fontFamily: "inherit", marginTop: 6 }} value={reviewDraft[doc.id] || ""} onChange={(e) => setReviewDraft({ ...reviewDraft, [doc.id]: e.target.value })} placeholder={t("pdetRejectCorrectionPlaceholder")} dir={dir} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleReviewDoc(doc, "rejected", reviewDraft[doc.id])}>{t("pdetReject")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => handleReviewDoc(doc, "needs_correction", reviewDraft[doc.id])}>{t("pdetRejectNeedsCorrection")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectFor(null)}>{t("commonCancel")}</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isEmployer && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <UserX size={16} color={THEME.text2} /> {t("pdetEmploymentStatus")}
          </h3>

          {personnel.employmentStatus === "active" && !showTerminateForm && (
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowTerminateForm(true)}>
              {t("pdetRegisterTermination")}
            </button>
          )}

          {showTerminateForm && (
            <div>
              <label style={styles.label}>{t("pdetTerminationDateLabel")}</label>
              <JalaliDateInput value={terminationDateDraft} onChange={setTerminationDateDraft} />
              {terminationError && <p style={styles.error}>{terminationError}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={handleConfirmTermination} disabled={savingEmployment}>
                  {savingEmployment ? t("savingEllipsisShort") : t("pdetConfirmTermination")}
                </button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => { setShowTerminateForm(false); setTerminationError(""); }}>
                  {t("commonCancel")}
                </button>
              </div>
            </div>
          )}

          {personnel.employmentStatus === "terminated" && !showTerminateForm && (
            <button type="button" style={styles.smallButton} onClick={handleReactivate} disabled={savingEmployment}>
              {savingEmployment ? t("savingEllipsisShort") : t("pdetReactivate")}
            </button>
          )}
        </div>
      )}

      {personnel.qualificationRequired && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={16} color="#c2410c" /> {t("pdetEmployerQualificationApproval")}
          </h3>
          <span style={{ ...styles.badge, color: docStatusMeta(personnel.qualificationStatus || "pending").color, background: docStatusMeta(personnel.qualificationStatus || "pending").bg }}>
            {t(docStatusMeta(personnel.qualificationStatus || "pending").labelKey)}
          </span>
          {personnel.qualificationNote && <p style={{ fontSize: 12, color: THEME.text2, marginTop: 8 }}><b>{t("pdetNoteLabel")}</b> {personnel.qualificationNote}</p>}
          {isEmployer && personnel.qualificationStatus !== "approved" && (
            <div style={{ marginTop: 12 }}>
              {!showQualReject ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={styles.button} onClick={() => handleQualificationDecision("approved")}>{t("pdetApproveQualification")}</button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowQualReject(true)}>{t("pdetRejectNeedsCorrection")}</button>
                </div>
              ) : (
                <>
                  <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={qualNote} onChange={(e) => setQualNote(e.target.value)} placeholder={t("pdetRejectReasonPlaceholder")} dir={dir} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleQualificationDecision("rejected")}>{t("pdetRegisterRejection")}</button>
                    <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => handleQualificationDecision("needs_correction")}>{t("pdetRejectNeedsCorrection")}</button>
                    <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowQualReject(false)}>{t("commonCancel")}</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <AccidentPronenessSection personnel={personnel} role={role} currentUser={currentUser} onNavigateToAssessment={onNavigateToAssessment} />

      <div style={{ ...styles.card, width: "auto" }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 4px", fontWeight: 700 }}>{t("pdetDocuments")}</h3>
        {visibleDocTypes.map((dt) => {
          const doc = docByType(dt.value);
          const dsm = doc ? docStatusMeta(doc.status) : null;
          return (
            <div key={dt.value} style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{t(dt.labelKey)}</span>
                {dsm && <span style={{ ...styles.badge, color: dsm.color, background: dsm.bg }}>{t(dsm.labelKey)}</span>}
              </div>

              {doc && (
                <div style={{ marginTop: 8 }}>
                  <DocUploadField
                    existingDoc={doc}
                    onConfirm={(data, name, mime) => handleConfirmUpload(dt.value, data, name, mime)}
                    onDelete={isContractor && doc.status !== "approved" ? handleDeleteDoc : null}
                    onView={setViewerSrc}
                    disabled={isEmployer}
                    allowDelete={isContractor && doc.status !== "approved"}
                    allowReplace={isContractor && doc.status !== "approved"}
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
                    <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0" }}>{t("pdetNotUploadedYet")}</p>
                  )}
                </div>
              )}
              {doc?.reviewNote && <p style={{ fontSize: 11.5, color: THEME.danger, marginTop: 6 }}><b>{t("pdetReviewNote")}</b> {doc.reviewNote}</p>}

              {isEmployer && doc && doc.status === "pending" && (
                <div style={{ marginTop: 8 }}>
                  {showRejectFor !== doc.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" style={{ ...styles.smallButton, padding: "6px 12px" }} onClick={() => handleReviewDoc(doc, "approved", "")}>{t("pdetApprove")}</button>
                      <button type="button" style={{ ...styles.smallButton, background: THEME.danger, padding: "6px 12px" }} onClick={() => setShowRejectFor(doc.id)}>{t("pdetRejectCorrect")}</button>
                    </div>
                  ) : (
                    <>
                      <textarea style={{ ...styles.input, minHeight: 50, fontFamily: "inherit", marginTop: 6 }} value={reviewDraft[doc.id] || ""} onChange={(e) => setReviewDraft({ ...reviewDraft, [doc.id]: e.target.value })} placeholder={t("pdetRejectCorrectionPlaceholder")} dir={dir} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleReviewDoc(doc, "rejected", reviewDraft[doc.id])}>{t("pdetReject")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: "#b45309" }} onClick={() => handleReviewDoc(doc, "needs_correction", reviewDraft[doc.id])}>{t("pdetRejectNeedsCorrection")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectFor(null)}>{t("commonCancel")}</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isContractor && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={16} color={THEME.teal} /> {t("pdetSendToEmployerSupervisor")}
          </h3>
          {gateItem && (gateItem.status === "pending_approval" || gateItem.status === "assigned_review" || gateItem.status === "reviewed") ? (
            <p style={{ fontSize: 12.5, color: "#166534", margin: 0, fontWeight: 600 }}>
              {t("pdetSentStatus", { status: GATE_STATUS_LABELS[gateItem.status] ? gateStatusLabel(gateItem.status) : t("pdetGateAwaitingReview") })}
            </p>
          ) : documents.length === 0 ? (
            <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("pdetUploadDocsFirstThenSubmit")}</p>
          ) : (
            <>
              {gateItem?.status === "rejected" && (
                <p style={{ fontSize: 11.5, color: THEME.danger, margin: "0 0 8px" }}>
                  {t("pdetPrevRequestRejected", { note: gateItem.reviewNote ? `: ${gateItem.reviewNote}` : "" })}
                </p>
              )}
              <button type="button" style={styles.button} onClick={handleSubmitToSupervisor} disabled={gateBusy}>
                {gateBusy ? t("sendingEllipsis") : t("gateSubmitToEmployerSupervisor")}
              </button>
            </>
          )}
          {contractorSubmitMsg && (
            <p style={{ fontSize: 11.5, color: contractorSubmitOk ? "#166534" : THEME.danger, marginTop: 8 }}>{contractorSubmitMsg}</p>
          )}
        </div>
      )}

      {personnel.occHealthPath === "no_certificate" && (
        <div style={{ ...styles.card, width: "auto" }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={16} /> {t("pdetHealthWorkflow")}
          </h3>
          <p style={{ fontSize: 12, color: THEME.text2, margin: "0 0 8px" }}>
            {t("pdetStartDateInline")} <b>{personnel.startDate ? isoToJalaliDisplay(personnel.startDate) : t("pdetNotRegistered")}</b>
          </p>
          {!personnel.occHealthVisitDeadline && (
            <p style={{ fontSize: 12, color: THEME.text3 }}>{t("pdetVisitDeadlineAutoNote")}</p>
          )}
          {personnel.occHealthVisitDeadline && !docByType("health_visit_receipt") && (
            <p style={{ fontSize: 12, color: "#b45309" }}>{t("pdetVisitDeadlineUntil", { date: isoToJalaliDisplay(personnel.occHealthVisitDeadline) })}</p>
          )}
          {personnel.occHealthResultDeadline && !docByType("health_final_result") && (
            <p style={{ fontSize: 12, color: "#b45309" }}>{t("pdetResultDeadlineUntil", { date: isoToJalaliDisplay(personnel.occHealthResultDeadline) })}</p>
          )}
          {isEmployer && (personnel.occHealthVisitDeadline || personnel.occHealthResultDeadline) && (
            <button
              type="button"
              style={{ ...styles.smallButton, marginTop: 8 }}
              onClick={async () => {
                await checkAndUpdateDeadlines([personnel]);
                alert(t("pdetDeadlineCheckDone"));
              }}
            >
              {t("pdetCheckDeadlineNow")}
            </button>
          )}
        </div>
      )}

      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}
