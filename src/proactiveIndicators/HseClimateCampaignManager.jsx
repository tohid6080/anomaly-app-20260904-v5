import React, { useState, useEffect } from "react";
import { Plus, Copy, QrCode, Lock, Unlock, Users, Building2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadContractorOptions } from "../personnel/personnelApi.js";
import {
  createHseClimateCampaign, loadHseClimateCampaigns, closeHseClimateCampaign, reopenHseClimateCampaign,
  buildHseClimateSurveyLink, loadHseClimateAggregate,
} from "./hseClimateCampaignsApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * مدیریت دوره‌های ارزیابی HSE Climate — طرف احراز هویت‌شده (کارفرما/پیمانکار).
 * پیمانکار فقط برای پرسنل خودش کمپین می‌سازد (org_type به‌طور خودکار
 * "contractor" و contractorId به‌طور خودکار خودِ همین پیمانکار است — قابل
 * تغییر توسط خودِ کاربر نیست). کارفرما برای پرسنل خودش کمپین می‌سازد
 * (org_type="employer") و می‌تواند نتایج پیمانکاران را هم به‌صورت
 * تجمیعی ببیند.
 */
export default function HseClimateCampaignManager({ currentUser, role, onBack }) {
  const { t, dir } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const isEmployerSide = role === "EMPLOYER" || role === "ADMIN";

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [targetCount, setTargetCount] = useState("");
  const [minValid, setMinValid] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revealedLink, setRevealedLink] = useState(null);
  // فقط سمت کارفرما/ادمین معنا دارد: کمپین برای پرسنل خودِ کارفرماست یا
  // برای پرسنل یکی از پیمانکاران؟ سمت پیمانکار همیشه فقط برای خودش است.
  const [targetOrgType, setTargetOrgType] = useState("employer");
  const [targetContractorId, setTargetContractorId] = useState("");
  const [contractorOptions, setContractorOptions] = useState([]);

  useEffect(() => {
    if (isEmployerSide) loadContractorOptions().then(setContractorOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await loadHseClimateCampaigns(isContractor ? currentUser?.id : undefined);
    setCampaigns(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setError("");
    if (isEmployerSide && targetOrgType === "contractor" && !targetContractorId) {
      setError(t("errSelectContractor"));
      return;
    }
    setSaving(true);
    const selectedContractor = contractorOptions.find((c) => c.id === targetContractorId);
    const payload = isContractor
      ? { projectName, orgType: "contractor", contractorId: currentUser?.id, contractorName: currentUser?.name, targetCount: Number(targetCount) || null, minValidResponses: Number(minValid) || 50 }
      : targetOrgType === "contractor"
        ? { projectName, orgType: "contractor", contractorId: targetContractorId, contractorName: selectedContractor?.name || "", targetCount: Number(targetCount) || null, minValidResponses: Number(minValid) || 50 }
        : { projectName, orgType: "employer", targetCount: Number(targetCount) || null, minValidResponses: Number(minValid) || 50 };
    const result = await createHseClimateCampaign(payload, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setShowCreate(false);
    setProjectName(""); setTargetCount(""); setMinValid(50); setTargetOrgType("employer"); setTargetContractorId("");
    setRevealedLink(result);
    await load();
  };

  const handleToggleStatus = async (c) => {
    const result = c.status === "active" ? await closeHseClimateCampaign(c.id) : await reopenHseClimateCampaign(c.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  const copyLink = (token) => {
    const link = buildHseClimateSurveyLink(token);
    navigator.clipboard?.writeText(link);
    alert(t("linkCopied"));
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <h3 style={{ marginBottom: 4, color: THEME.navy }}>{t("hccmCampaignsTitle")}</h3>
      <p style={{ color: THEME.text3, fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        {t("hccmAnonymousNote")}
      </p>

      <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }} onClick={() => { setShowCreate((v) => !v); setError(""); }}>
        <Plus size={13} /> {t("hccmNewCampaign")}
      </button>

      {showCreate && (
        <div style={{ background: THEME.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          {isEmployerSide && (
            <div style={{ marginBottom: 10 }}>
              <label style={styles.label}>{t("hccmWhichUnit")}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="target-org" checked={targetOrgType === "employer"} onChange={() => { setTargetOrgType("employer"); setTargetContractorId(""); }} />
                  {t("hccmEmployerPersonnelSelf")}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
                  <input type="radio" name="target-org" checked={targetOrgType === "contractor"} onChange={() => setTargetOrgType("contractor")} />
                  {t("hccmSpecificContractor")}
                </label>
              </div>
              {targetOrgType === "contractor" && (
                <select style={{ ...styles.input, marginTop: 8 }} value={targetContractorId} onChange={(e) => setTargetContractorId(e.target.value)} dir={dir}>
                  <option value="">{t("hccmSelectContractorPlaceholder")}</option>
                  {contractorOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={styles.label}>{t("hccmProjectNameOptional")}</label>
              <input style={styles.input} value={projectName} onChange={(e) => setProjectName(e.target.value)} dir={dir} />
            </div>
            <div>
              <label style={styles.label}>{t("hccmTargetResponseCount")}</label>
              <input type="number" style={styles.input} value={targetCount} onChange={(e) => setTargetCount(e.target.value)} dir="ltr" />
            </div>
            <div>
              <label style={styles.label}>{t("hccmMinValidResponses")}</label>
              <input type="number" style={styles.input} value={minValid} onChange={(e) => setMinValid(e.target.value)} dir="ltr" />
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="button" style={styles.smallButton} onClick={handleCreate} disabled={saving}>{saving ? t("hccmCreatingEllipsis") : t("hccmCreateAndGetLink")}</button>
        </div>
      )}

      {revealedLink && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: "#14532d", fontWeight: 700, marginBottom: 10 }}>{t("hccmLinkQrNote")}</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildHseClimateSurveyLink(revealedLink.publicToken))}`}
            alt="QR Code"
            style={{ marginBottom: 10, borderRadius: 8, background: "#fff", padding: 8 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 11, background: "#fff", padding: "6px 10px", borderRadius: 6, wordBreak: "break-all" }}>{buildHseClimateSurveyLink(revealedLink.publicToken)}</code>
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5 }} onClick={() => copyLink(revealedLink.publicToken)}>
              <Copy size={12} /> {t("hccmCopyLink")}
            </button>
          </div>
          <button type="button" style={{ ...styles.smallButton, background: THEME.text3, marginTop: 10 }} onClick={() => setRevealedLink(null)}>{t("commonClose")}</button>
        </div>
      )}

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {!loading && campaigns.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("hccmNoCampaignsYet")}</p>}

      {campaigns.map((c) => (
        <div key={c.id} style={{ ...styles.card, width: "auto", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: THEME.navy, fontSize: 13 }}>
                {c.projectName || t("hccmNoProjectName")} — {c.orgType === "contractor" ? t("hccmContractorInline", { name: c.contractorName }) : t("hccmEmployerPersonnel")}
              </div>
              <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>{t("hccmCreatedMinResponse", { date: toJalaliSafe(c.createdAt), count: c.minValidResponses })}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: c.status === "active" ? "#dcfce7" : "#eef1f5", color: c.status === "active" ? "#166534" : "#5b6b7d", fontWeight: 600 }}>
                {c.status === "active" ? t("hccmStatusActive") : t("hccmStatusClosed")}
              </span>
              <button type="button" style={{ ...styles.smallButton, fontSize: 11, background: THEME.navyMid, display: "flex", alignItems: "center", gap: 4 }} onClick={() => copyLink(c.publicToken)}>
                <QrCode size={11} /> {t("hccmLinkBtn")}
              </button>
              <button type="button" style={{ ...styles.smallButton, fontSize: 11, background: c.status === "active" ? THEME.danger : "#166534", display: "flex", alignItems: "center", gap: 4 }} onClick={() => handleToggleStatus(c)}>
                {c.status === "active" ? <Lock size={11} /> : <Unlock size={11} />} {c.status === "active" ? t("hccmCloseBtn") : t("hccmActivateBtn")}
              </button>
            </div>
          </div>
          <CampaignResult campaign={c} />
        </div>
      ))}

      {isEmployerSide && <TotalHseClimateScore currentUser={currentUser} />}
    </div>
  );
}

function CampaignResult({ campaign }) {
  const { t, lang } = useLanguage();
  const [agg, setAgg] = useState(null);
  useEffect(() => {
    loadHseClimateAggregate({ projectName: campaign.projectName || null, orgType: campaign.orgType, contractorId: campaign.contractorId || null }).then(setAgg);
  }, [campaign.id]);

  if (!agg) return null;
  if (agg.responseCount < campaign.minValidResponses) {
    return <p style={{ fontSize: 11.5, color: THEME.text3, marginTop: 8 }}>{t("hccmResponsesUntilMin", { count: agg.responseCount, min: campaign.minValidResponses })}</p>;
  }
  const dimTitle = (title) => (typeof title === "object" && title !== null ? (title[lang] || title.fa) : title);
  return (
    <div style={{ marginTop: 10, background: THEME.bg, borderRadius: 8, padding: 10 }}>
      <p style={{ fontSize: 12, color: THEME.navy, fontWeight: 700, marginBottom: 6 }}>
        {t("hccmTotalScoreBasedOn", { score: agg.averageTotal?.toFixed(1), count: agg.responseCount })}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {agg.dimensionAverages.map((d) => (
          <span key={d.id} style={{ fontSize: 10.5, background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "3px 8px" }}>{dimTitle(d.title)}: {d.score}</span>
        ))}
      </div>
    </div>
  );
}

// «امتیاز جو ایمنی، بهداشت و محیط زیست کل» — فقط برای کارفرما/ادمین، طبق بخش ۷
function TotalHseClimateScore({ currentUser }) {
  const { t } = useLanguage();
  const [companyAgg, setCompanyAgg] = useState(null);
  const [employerAgg, setEmployerAgg] = useState(null);
  const [contractorAgg, setContractorAgg] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [perContractor, setPerContractor] = useState({});

  useEffect(() => {
    loadHseClimateAggregate({}).then(setCompanyAgg);
    loadHseClimateAggregate({ orgType: "employer" }).then(setEmployerAgg);
    loadHseClimateAggregate({ orgType: "contractor" }).then(setContractorAgg);
    loadContractorOptions().then(async (list) => {
      setContractors(list);
      const results = await Promise.all(list.map((c) => loadHseClimateAggregate({ orgType: "contractor", contractorId: c.id }).then((agg) => [c.id, agg])));
      setPerContractor(Object.fromEntries(results));
    });
  }, []);

  const Row = ({ icon: Icon, label, agg }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.border}` }}>
      <span style={{ fontSize: 12, color: THEME.text2, display: "flex", alignItems: "center", gap: 6 }}><Icon size={13} /> {label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.navy }}>
        {agg && agg.responseCount > 0 ? t("hccmScoreOfResponses", { score: agg.averageTotal?.toFixed(1), count: agg.responseCount }) : t("hccmNoData")}
      </span>
    </div>
  );

  return (
    <div style={{ ...styles.card, width: "auto", marginTop: 20 }}>
      <h4 style={{ fontSize: 13.5, color: THEME.navy, fontWeight: 700, marginBottom: 10 }}>{t("hccmTotalClimateScoreTitle")}</h4>
      <Row icon={Building2} label={t("hccmWholeCompany")} agg={companyAgg} />
      <Row icon={Users} label={t("hccmEmployerPersonnel")} agg={employerAgg} />
      <Row icon={Users} label={t("hccmAllContractors")} agg={contractorAgg} />
      {contractors.map((c) => (
        <Row key={c.id} icon={Users} label={t("hccmContractorInline", { name: c.name })} agg={perContractor[c.id]} />
      ))}
    </div>
  );
}
