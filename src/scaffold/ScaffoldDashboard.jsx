import React, { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Printer } from "lucide-react";
import { styles, THEME } from "../shared.js";
import DataView, { StatusPill } from "../shared/DataView.jsx";
import { JalaliDateInput, toJalaliSafe, toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { exportHtmlReportNativeAware } from "../offline/nativeFile.js";
import SyncStatusBadge from "../offline/SyncStatusBadge.jsx";
import {
  SCAFFOLD_STATUSES, scaffoldStatusMeta, loadScaffoldTagsOfflineFirst, loadContractorsWithScaffoldCode,
  deleteScaffoldTagDB, approveInitialRequest, issueScaffoldTag, markNeedsCorrection,
  resubmitForInspection, requestScaffoldRemoval, confirmScaffoldRemoved,
} from "./scaffoldApi.js";
import ScaffoldRequestForm from "./ScaffoldRequestForm.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { translate as i18nTranslate, getCurrentLang } from "../i18n/translations.js";

const SORT_OPTIONS_KEYS = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "oldest", labelKey: "sortOldest" },
  { value: "tag", labelKey: "sortTagNumber" },
];

export default function ScaffoldDashboard({ onBack, currentUser, role, initialStatusFilter, initialContractorFilter, readOnly }) {
  const { t, dir } = useLanguage();
  const SORT_OPTIONS = SORT_OPTIONS_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) }));
  const isContractor = role === "CONTRACTOR";
  const [list, setList] = useState([]);
  const [myContractorCode, setMyContractorCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionDeadline, setCorrectionDeadline] = useState("");
  const [correctionDeadlineTime, setCorrectionDeadlineTime] = useState("18:00");
  const [removalDate, setRemovalDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    // اگر بارگذاری با خطا مواجه شود، صفحه نباید برای همیشه روی «در حال
    // بارگذاری» بماند — finally تضمین می‌کند setLoading(false) در هر
    // حالتی اجرا شود.
    try {
      const all = await loadScaffoldTagsOfflineFirst();
      setList(all);
      if (isContractor) {
        const contractors = await loadContractorsWithScaffoldCode();
        const myName = (currentUser?.name || "").trim().toLowerCase();
        const mine = contractors.find((c) => c.name.trim().toLowerCase() === myName);
        setMyContractorCode(mine?.scaffoldTagCode || "");
      }
    } catch (e) {
      console.error("بارگذاری لیست داربست ناموفق بود", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // پنل جزئیات (درخواست برچیدن / ثبت اصلاح) حالا از طریق renderExpanded
  // دقیقاً زیر همان ردیف انتخاب‌شده باز می‌شود، نه انتهای کل لیست — پس
  // دیگر نیازی به اسکرول خودکار برای پیداکردن پنل نیست.

  const myName = (currentUser?.name || "").trim().toLowerCase();
  const scoped = isContractor ? list.filter((t) => (t.contractorName || "").trim().toLowerCase() === myName) : list;
  const contractorScoped = !isContractor && initialContractorFilter && initialContractorFilter !== "all"
    ? scoped.filter((t) => t.contractorId === initialContractorFilter)
    : scoped;

  const filtered = contractorScoped.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${t.tagNumber} ${t.contractorName} ${t.location}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "tag") return (a.tagNumber || "").localeCompare(b.tagNumber || "");
    const at = a.createdAt || "", bt = b.createdAt || "";
    return sort === "oldest" ? at.localeCompare(bt) : bt.localeCompare(at);
  });

  // آمار همیشه از کل لیست (قبل از جستجو/فیلتر) محاسبه می‌شود — این خلاصه‌ی
  // کلی وضعیته، نه چیزی که با تایپ کردن توی جستجو باید عوض بشه.
  const computeStats = (rows) => ({
    issued: rows.filter((t) => !!t.issueDate).length,
    notRemoved: rows.filter((t) => !!t.issueDate && t.status !== "removed").length,
    notIssued: rows.filter((t) => !t.issueDate).length,
  });

  const myStats = isContractor ? computeStats(scoped) : null;

  const perContractorStats = !isContractor
    ? Object.entries(
        list.reduce((acc, t) => {
          const name = (t.contractorName || "").trim();
          if (!name) return acc;
          if (!acc[name]) acc[name] = [];
          acc[name].push(t);
          return acc;
        }, {})
      )
        .map(([name, rows]) => ({ name, ...computeStats(rows) }))
        .sort((a, b) => a.name.localeCompare(b.name, "fa"))
    : [];

  const handleDelete = async (id) => {
    if (readOnly) { alert(t("errNoDeletePermission")); return; }
    if (!confirm(t("confirmDeleteTagRequest"))) return;
    await deleteScaffoldTagDB(id);
    await load();
  };

  const handleApproveInitial = async (t) => {
    setSaving(true);
    await approveInitialRequest(t.id, currentUser?.name || "");
    setSaving(false);
    await load();
  };

  const handleIssueTag = async (t) => {
    setSaving(true);
    await issueScaffoldTag(t.id, currentUser?.name || "");
    setSaving(false);
    await load();
  };

  const startCorrection = (t) => { setExpandedId(t.id); setCorrectionNote(""); setCorrectionDeadline(""); setCorrectionDeadlineTime("18:00"); };
  const submitCorrection = async (row) => {
    if (!correctionNote.trim() || !correctionDeadline) {
      alert(t("errFaultDescDeadlineRequired"));
      return;
    }
    setSaving(true);
    const deadlineIso = `${correctionDeadline}T${correctionDeadlineTime}:00`;
    await markNeedsCorrection(row.id, correctionNote, deadlineIso, currentUser?.name || "");
    setSaving(false);
    setExpandedId(null);
    await load();
  };

  const handleResubmit = async (row) => {
    if (readOnly) { alert(t("errNoActionPermission")); return; }
    setSaving(true);
    await resubmitForInspection(row.id);
    setSaving(false);
    await load();
  };

  const startRemovalRequest = (t) => { setExpandedId(`removal-${t.id}`); setRemovalDate(""); };
  const submitRemovalRequest = async (row) => {
    if (readOnly) { alert(t("errNoActionPermission")); return; }
    if (!removalDate) { alert(t("errRemovalDateRequired")); return; }
    setSaving(true);
    await requestScaffoldRemoval(row.id, removalDate);
    setSaving(false);
    setExpandedId(null);
    await load();
  };

  const handleConfirmRemoved = async (t) => {
    setSaving(true);
    await confirmScaffoldRemoved(t.id, currentUser?.name || "");
    setSaving(false);
    await load();
  };

  const handlePrintTag = async (t) => {
    const lang = getCurrentLang();
    const isEn = lang !== "fa";
    const html = `<!doctype html><html lang="${lang}" dir="${isEn ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${i18nTranslate(lang, "scaffTagPrintTitle", { num: t.tagNumber })}</title>
    <style>
      body { font-family: Tahoma, Arial, sans-serif; direction: ${isEn ? "ltr" : "rtl"}; padding: 30px; }
      .tag { border: 3px solid #166534; border-radius: 12px; padding: 24px; max-width: 420px; margin: 0 auto; text-align: center; }
      .num { font-size: 26px; font-weight: 700; color: #166534; direction: ltr; margin: 10px 0; }
      .row { font-size: 13px; color: #333; margin: 6px 0; text-align: ${isEn ? "left" : "right"}; }
    </style></head>
    <body>
      <div class="tag">
        <h2>${i18nTranslate(lang, "scaffTagHeading")}</h2>
        <div class="num">${t.tagNumber}</div>
        <div class="row"><b>${i18nTranslate(lang, "scaffPrintContractor")}</b> ${t.contractorName || "—"}</div>
        <div class="row"><b>${i18nTranslate(lang, "scaffPrintLocation")}</b> ${t.location || "—"}</div>
        <div class="row"><b>${i18nTranslate(lang, "scaffPrintErectionDate")}</b> ${toJalaliSafe(t.erectionDate) || "—"}</div>
        <div class="row"><b>${i18nTranslate(lang, "scaffPrintIssueDate")}</b> ${toJalaliSafe(t.issueDate) || "—"}</div>
        <div class="row"><b>${i18nTranslate(lang, "scaffPrintStatus")}</b> ${i18nTranslate(lang, scaffoldStatusMeta(t.status).labelKey)}</div>
      </div>
    </body></html>`;
    if (await exportHtmlReportNativeAware(html, `Tag-${t.tagNumber}`)) return;
    const win = window.open("", "_blank");
    if (!win) { alert(i18nTranslate(lang, "errPopupBlockedShort")); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  if (showForm) {
    return (
      <ScaffoldRequestForm
        currentUser={currentUser}
        contractorCode={myContractorCode}
        onBack={() => { setShowForm(false); load(); }}
      />
    );
  }

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  const t2 = t;
  const rowActions = (t) => (
    <>
      {isContractor && !readOnly && t.status === "pending_initial_approval" && (
        <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleDelete(t.id)}><Trash2 size={12} /></button>
      )}
      {isContractor && !readOnly && t.status === "needs_correction" && (
        <button type="button" style={styles.smallButton} onClick={() => handleResubmit(t)} disabled={saving}>{t2("scaffRequestReinspection")}</button>
      )}
      {isContractor && !readOnly && t.status === "tag_issued" && (
        <button type="button" style={{ ...styles.smallButton, background: "#7c3aed" }} onClick={() => startRemovalRequest(t)}>{t2("scaffRequestRemovalPermit")}</button>
      )}
      {(t.status === "tag_issued" || t.status === "removal_requested" || t.status === "removed") && (
        <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid, display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => handlePrintTag(t)}>
          <Printer size={12} /> {t2("scaffPrint")}
        </button>
      )}
      {!isContractor && !readOnly && t.status === "pending_initial_approval" && (
        <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={() => handleApproveInitial(t)} disabled={saving}>{t2("scaffInitialApprove")}</button>
      )}
      {!isContractor && !readOnly && t.status === "pending_installation" && (
        <>
          <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={() => handleIssueTag(t)} disabled={saving}>{t2("scaffSafe")}</button>
          <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => startCorrection(t)}>{t2("scaffNonconformance")}</button>
        </>
      )}
      {!isContractor && !readOnly && t.status === "removal_requested" && (
        <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={() => handleConfirmRemoved(t)} disabled={saving}>{t2("scaffConfirmRemoval")}</button>
      )}
    </>
  );

  // شناسه‌ی ردیفی که پنلش باز است — expandedId می‌تواند خودِ id یا
  // `removal-<id>` باشد؛ اینجا به id واقعی ردیف نرمال می‌شود تا DataView
  // بتواند پنل را دقیقاً زیر همان ردیف رندر کند.
  const expandedItem = sorted.find((t) => t.id === expandedId || `removal-${t.id}` === expandedId);

  // پنلی که قبلاً انتهای کل لیست بود — حالا دقیقاً زیر همان ردیف
  const renderExpandedPanel = (t) => (
    <div style={{ ...styles.card, width: "auto", margin: 0 }}>
      <h3 style={{ fontSize: 14, color: THEME.navy, margin: "0 0 10px", fontWeight: 700, direction: "ltr", textAlign: "start" }}>{t.tagNumber}</h3>

      {expandedId === t.id && !isContractor && (
        <div>
          <label style={styles.label}>{t2("scaffFaultDescLabel")}</label>
          <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} dir={dir} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>{t2("scaffCorrectionDeadlineDate")}</label>
              <JalaliDateInput value={correctionDeadline} onChange={setCorrectionDeadline} />
            </div>
            <div style={{ width: 110 }}>
              <label style={styles.label}>{t2("fieldTime")}</label>
              <input type="time" style={styles.input} value={correctionDeadlineTime} onChange={(e) => setCorrectionDeadlineTime(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => submitCorrection(t)} disabled={saving}>{t2("scaffSubmitAndSendToContractor")}</button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setExpandedId(null)}>{t2("commonCancel")}</button>
          </div>
        </div>
      )}

      {expandedId === `removal-${t.id}` && isContractor && (
        <div>
          <label style={styles.label}>{t2("scaffRemovalDateField")}</label>
          <JalaliDateInput value={removalDate} onChange={setRemovalDate} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={{ ...styles.smallButton, background: "#7c3aed" }} onClick={() => submitRemovalRequest(t)} disabled={saving}>{t2("scaffSubmitRemovalRequest")}</button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setExpandedId(null)}>{t2("commonCancel")}</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackToMenu")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Tag size={20} color={THEME.teal} />
        <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>{t("scaffModuleTitle")}</h2>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 14 }}>
        {isContractor ? t("scaffContractorSubtitle") : t("scaffEmployerSubtitle")}
      </p>

      {isContractor && myStats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <StatBox label={t("scaffStatIssued")} value={myStats.issued} color="#166534" bg="#dcfce7" />
          <StatBox label={t("scaffStatNotRemoved")} value={myStats.notRemoved} color="#1d4ed8" bg="#dbeafe" />
          <StatBox label={t("scaffStatNotIssued")} value={myStats.notIssued} color="#b45309" bg="#fef3c7" />
        </div>
      )}

      {!isContractor && perContractorStats.length > 0 && (
        <div style={{ ...styles.card, width: "auto", marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, color: THEME.navy, margin: "0 0 10px", fontWeight: 700 }}>{t("scaffPerContractorStats")}</h3>
          {perContractorStats.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.border}`, flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 100, fontSize: 12.5, fontWeight: 600, color: THEME.text }}>{c.name}</span>
              <span style={{ fontSize: 11, color: "#166534" }}>{t("scaffIssuedColon")} <b>{c.issued}</b></span>
              <span style={{ fontSize: 11, color: "#1d4ed8" }}>{t("scaffNotRemovedColon")} <b>{c.notRemoved}</b></span>
              <span style={{ fontSize: 11, color: "#b45309" }}>{t("scaffNotIssuedColon")} <b>{c.notIssued}</b></span>
            </div>
          ))}
        </div>
      )}

      {isContractor && !readOnly && (
        myContractorCode ? (
          <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }} onClick={() => setShowForm(true)}>
            <Plus size={15} /> {t("scaffGetNewTag")}
          </button>
        ) : (
          <p style={{ ...styles.error, marginBottom: 14 }}>{t("errScaffNoCompanyCode")}</p>
        )
      )}

      <DataView
        items={sorted}
        getId={(t) => t.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("scaffSearchPlaceholder")}
        sortOptions={SORT_OPTIONS}
        sortValue={sort}
        onSortChange={setSort}
        filterSlot={
          <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} dir={dir}>
            <option value="all">{t("filterAllStatuses")}</option>
            {SCAFFOLD_STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
          </select>
        }
        emptyMessage={t("noItemsFound")}
        expandedId={expandedItem?.id}
        renderExpanded={renderExpandedPanel}
        columns={[
          { key: "tag", label: t("colTagNumber"), render: (row) => <span style={{ direction: "ltr", display: "inline-block", fontWeight: 600 }}>{row.tagNumber}</span> },
          ...(!isContractor ? [{ key: "contractor", label: t("fieldContractor"), render: (row) => row.contractorName || "—" }] : []),
          { key: "location", label: t("colLocationErectionDate"), render: (row) => <span style={{ fontSize: 11.5, color: THEME.text3 }}>{row.location} · {toJalaliSafe(row.erectionDate)}</span> },
          {
            key: "status", label: t("commonStatus"),
            render: (row) => {
              const sm = scaffoldStatusMeta(row.status);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <StatusPill label={t2(sm.labelKey)} color={sm.color} bg={sm.bg} />
                  {row.syncStatus && row.syncStatus !== "synced" && <SyncStatusBadge status={row.syncStatus} onRetry={() => load()} />}
                </div>
              );
            },
          },
        ]}
        renderRowActions={rowActions}
        renderCard={(card) => {
          const sm = scaffoldStatusMeta(card.status);
          return (
            <div style={{ ...styles.card, width: "auto", margin: 0, borderInlineStart: `4px solid ${sm.color}`, height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, color: THEME.navy, fontSize: 14, direction: "ltr", textAlign: "start" }}>{card.tagNumber}</div>
                  <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 4 }}>
                    {!isContractor && <>{card.contractorName} · </>}{card.location} · {toJalaliSafe(card.erectionDate)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusPill label={t2(sm.labelKey)} color={sm.color} bg={sm.bg} />
                  {card.syncStatus && card.syncStatus !== "synced" && <SyncStatusBadge status={card.syncStatus} onRetry={() => load()} />}
                </div>
              </div>

              {card.purpose && <p style={{ fontSize: 12, color: THEME.text2, marginTop: 8 }}>{card.purpose}</p>}

              {card.status === "needs_correction" && card.correctionNote && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: THEME.danger }}>
                  <p style={{ margin: "2px 0" }}><b>{t2("scaffFaultLabel")}</b> {card.correctionNote}</p>
                  {card.correctionDeadline && <p style={{ margin: "2px 0" }}><b>{t2("scaffCorrectionDeadlineLabel")}</b> {toJalaliDateTime(card.correctionDeadline)}</p>}
                </div>
              )}
              {card.issueDate && <p style={{ fontSize: 11.5, color: "#166534", marginTop: 6 }}>{t2("scaffTagIssueDateLabel")} {toJalaliSafe(card.issueDate)}</p>}
              {card.removalDate && <p style={{ fontSize: 11.5, color: THEME.text3, marginTop: 4 }}>{t2("scaffRemovalDateLabel")} {toJalaliSafe(card.removalDate)}</p>}

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>{rowActions(card)}</div>
            </div>
          );
        }}
      />
    </div>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "10px 16px", flex: 1, minWidth: 110, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color, marginTop: 2 }}>{label}</div>
    </div>
  );
}
