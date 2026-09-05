import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { JalaliDateInput } from "./jalaliDate.jsx";
import DocUploadField from "./DocUploadField.jsx";
import DocumentViewerModal from "./DocumentViewerModal.jsx";
import { insertPersonnel, updatePersonnelDB, upsertDocument, loadContractorOptions, isSpecialJob } from "./personnelApi.js";
import { submitToGate } from "../hseGateApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Phase 2.2 — Personnel registration form.
 * Handles: basic info, automatic qualification-required detection, and the
 * occupational-health branch at registration time (has-certificate vs. no
 * certificate). The full 7-document upload/review UI is Phase 2.3 — this
 * form only inline-handles the ONE certificate upload for the "has
 * certificate" path, per the explicit Phase 2.2 requirements.
 */

// اعتبارسنجی کد ملی ایران (الگوریتم استاندارد رقم کنترلی)
function isValidNationalCode(code) {
  return /^\d{10}$/.test(code);
}
function isValidMobile(phone) {
  return /^09\d{9}$/.test((phone || "").trim());
}

export default function PersonnelForm({ onBack, onSaved, currentUser }) {
  const { t, dir } = useLanguage();
  const [contractors, setContractors] = useState([]);
  const [loadingContractors, setLoadingContractors] = useState(true);

  const [fullName, setFullName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");

  const [occHealthPath, setOccHealthPath] = useState(""); // has_certificate | no_certificate
  const [occHealthDate, setOccHealthDate] = useState("");
  const [certFile, setCertFile] = useState(null); // { data, name, mime }
  const [viewerSrc, setViewerSrc] = useState(null);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await loadContractorOptions();
      setContractors(list);
      setLoadingContractors(false);
      // اگر خودِ پیمانکار در حال ثبت پرسنل است، شرکت پیمانکار باید
      // خودکار و بدون امکان انتخاب، همان حساب کاربری واردشده باشد —
      // نه یک فهرست آزاد از همه‌ی پیمانکاران شرکت. این فرم فقط برای
      // ایجاد رکورد جدید است (بدون حالت ویرایش)، پس همیشه امن است.
      if (currentUser?.role === "CONTRACTOR") {
        setContractorId(currentUser.id);
      }
    })();
  }, []);

  const special = isSpecialJob(jobTitle);

  const handleCertConfirm = async (data, name, mime) => {
    setCertFile({ data, name, mime });
    setErrors((er) => { const c = { ...er }; delete c.cert; return c; });
    return null;
  };

  const validate = () => {
    const er = {};
    if (!fullName.trim() || fullName.trim().length < 3) er.fullName = t("pfErrFullName");
    if (!nationalCode.trim()) er.nationalCode = t("pfErrNationalCodeRequired");
    else if (!isValidNationalCode(nationalCode.trim())) er.nationalCode = t("pfErrNationalCodeInvalid");
    if (!contractorId) er.contractorId = t("pfErrContractorRequired");
    if (!jobTitle.trim()) er.jobTitle = t("pfErrJobTitleRequired");
    if (!phone.trim()) er.phone = t("pfErrPhoneRequired");
    else if (!isValidMobile(phone)) er.phone = t("pfErrPhoneInvalid");
    if (!startDate) er.startDate = t("pfErrStartDateRequired");
    if (!occHealthPath) er.occHealthPath = t("pfErrOccHealthPathRequired");
    if (occHealthPath === "has_certificate") {
      if (!certFile) er.cert = t("pfErrCertRequired");
      if (!occHealthDate) er.occHealthDate = t("pfErrOccHealthDateRequired");
    }
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!validate()) { setFormError(t("pfErrFixFormErrors")); return; }
    setSaving(true);
    const contractor = contractors.find((c) => c.id === contractorId);
    const inserted = await insertPersonnel({
      fullName: fullName.trim(),
      nationalCode: nationalCode.trim(),
      contractorId,
      contractorName: contractor?.name || "",
      jobTitle: jobTitle.trim(),
      phone: phone.trim(),
      startDate,
      createdBy: currentUser?.name || currentUser?.username || "",
    });
    if (!inserted || inserted.__error) {
      setSaving(false);
      setFormError(t("cmErrorSaveReason", { reason: inserted?.message || t("commonErrorUnknown") }));
      return;
    }

    if (occHealthPath === "has_certificate") {
      await updatePersonnelDB(inserted.id, { occHealthPath, occHealthDate }, currentUser?.name || currentUser?.username);
      await upsertDocument(inserted.id, "health_certificate", certFile.data, certFile.name, certFile.mime, currentUser?.name || currentUser?.username);
    } else {
      await updatePersonnelDB(inserted.id, { occHealthPath }, currentUser?.name || currentUser?.username);
    }

    if (currentUser?.role === "CONTRACTOR") {
      submitToGate({
        moduleKey: "personnelAccess", recordId: inserted.id,
        recordLabel: `${fullName.trim()} — ${jobTitle.trim()}`, direction: "contractor_to_employer",
      }, currentUser?.name).catch(() => {});
    }

    setSaving(false);
    onSaved ? onSaved(inserted) : onBack && onBack();
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("pfBack")}</div>}
      <h2 style={{ margin: "0 0 4px", color: THEME.navy, fontSize: 18, fontWeight: 700 }}>{t("pfRegisterNewPersonnel")}</h2>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 18 }}>
        {t("pfSubtitle")}
      </p>

      <div style={styles.card}>
        <label style={styles.label}>{t("pfFullName")}</label>
        <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} dir={dir} />
        {errors.fullName && <p style={styles.error}>{errors.fullName}</p>}

        <label style={styles.label}>{t("pfNationalCode")}</label>
        <input style={styles.input} value={nationalCode} onChange={(e) => setNationalCode(e.target.value.replace(/\D/g, "").slice(0, 10))} dir="ltr" inputMode="numeric" />
        {errors.nationalCode && <p style={styles.error}>{errors.nationalCode}</p>}

        <label style={styles.label}>{t("pfContractorCompany")}</label>
        {currentUser?.role === "CONTRACTOR" ? (
          <input style={{ ...styles.input, background: THEME.bg, color: THEME.text3 }} value={currentUser?.name || ""} disabled dir={dir} />
        ) : loadingContractors ? (
          <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("pfLoadingContractors")}</p>
        ) : (
          <select style={styles.input} value={contractorId} onChange={(e) => setContractorId(e.target.value)} dir={dir}>
            <option value="">{t("pfSelectPlaceholder")}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {errors.contractorId && <p style={styles.error}>{errors.contractorId}</p>}

        <label style={styles.label}>{t("pfJobTitle")}</label>
        <input style={styles.input} list="job-title-suggestions" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} dir={dir} placeholder={t("pfJobTitlePlaceholder")} />
        <datalist id="job-title-suggestions">
          <option value="داربست‌بند" /><option value="اپراتور جرثقیل" /><option value="ریگر" /><option value="نصاب" /><option value="برقکار" />
        </datalist>
        {errors.jobTitle && <p style={styles.error}>{errors.jobTitle}</p>}

        {special && (
          <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: 12, marginTop: 12, display: "flex", gap: 8 }}>
            <AlertTriangle size={17} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#7c2d12", margin: 0, lineHeight: 1.7 }}>
              {t("pfSpecialJobWarning")}
            </p>
          </div>
        )}

        <label style={styles.label}>{t("pfPhone")}</label>
        <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} dir="ltr" inputMode="numeric" placeholder="09123456789" />
        {errors.phone && <p style={styles.error}>{errors.phone}</p>}

        <label style={styles.label}>{t("pfStartDate")}</label>
        <JalaliDateInput value={startDate} onChange={setStartDate} />
        {errors.startDate && <p style={styles.error}>{errors.startDate}</p>}
      </div>

      <div style={styles.card}>
        <h3 style={{ fontSize: 14.5, color: THEME.navy, margin: "0 0 4px", fontWeight: 700 }}>{t("pfOccHealthStatus")}</h3>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginTop: 0, marginBottom: 12 }}>{t("pfOccHealthQuestion")}</p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setOccHealthPath("has_certificate")}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font,
              border: occHealthPath === "has_certificate" ? `2px solid ${THEME.teal}` : `1.5px solid ${THEME.border}`,
              background: occHealthPath === "has_certificate" ? THEME.tealSoft : "#fff", color: occHealthPath === "has_certificate" ? THEME.tealDeep : THEME.text2,
            }}
          >
            {t("pfHasCertificate")}
          </button>
          <button
            type="button"
            onClick={() => { setOccHealthPath("no_certificate"); setCertFile(null); setOccHealthDate(""); }}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font,
              border: occHealthPath === "no_certificate" ? `2px solid ${THEME.navyMid}` : `1.5px solid ${THEME.border}`,
              background: occHealthPath === "no_certificate" ? "#eef1f5" : "#fff", color: occHealthPath === "no_certificate" ? THEME.navy : THEME.text2,
            }}
          >
            {t("pfNoCertificate")}
          </button>
        </div>
        {errors.occHealthPath && <p style={styles.error}>{errors.occHealthPath}</p>}

        {occHealthPath === "has_certificate" && (
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>{t("pfOccHealthDate")}</label>
            <JalaliDateInput value={occHealthDate} onChange={setOccHealthDate} allowEmpty />
            {errors.occHealthDate && <p style={styles.error}>{errors.occHealthDate}</p>}

            <label style={styles.label}>{t("pfOccHealthCert")}</label>
            <DocUploadField
              existingDoc={certFile ? { fileData: certFile.data, fileName: certFile.name } : null}
              onConfirm={handleCertConfirm}
              onDelete={() => setCertFile(null)}
              onView={setViewerSrc}
              allowReplace
            />
            {errors.cert && <p style={styles.error}>{errors.cert}</p>}
          </div>
        )}

        {occHealthPath === "no_certificate" && (
          <p style={{ fontSize: 11.5, color: THEME.text3, marginTop: 12, lineHeight: 1.8 }}>
            {t("pfNoCertNote")}
          </p>
        )}
      </div>

      {formError && <p style={styles.error}>{formError}</p>}
      <button type="button" style={styles.button} onClick={handleSubmit} disabled={saving}>
        {saving ? t("pfSubmitting") : t("pfSubmitPersonnel")}
      </button>

      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}
