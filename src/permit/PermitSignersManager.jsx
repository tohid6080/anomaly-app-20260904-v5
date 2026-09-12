import React, { useEffect, useState } from "react";
import { UserCheck, UserX, Plus, Trash2, ShieldCheck } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadAllAuthorizedSigners, loadContractorSigners, loadContractorAccountsForSigning, createSigner, setSignerStatus, setSignerSubstitute, deleteSigner } from "./permitSignersApi.js";

/**
 * «لیستِ امضاهایِ مجاز» — پیمانکار فقط ردیفِ خودش را می‌بیند (readOnly).
 * سرپرست/کارشناسِ HSEِ کارفرما فهرستِ کاملِ شرکت را می‌بیند و مدیریت
 * می‌کند. نام و شغلِ هر امضاکننده آزادانه تایپ نمی‌شود — «افزودنِ
 * امضاکننده» از میانِ حساب‌های پیمانکاریِ واقعاً ثبت‌شده در SuperAdmin
 * (مدیریتِ حساب‌ها) انتخاب می‌شود؛ نام/شغل همیشه از همان حساب خوانده
 * می‌شود. فعال/مرخصی و جانشین، فرمان‌هایِ اتمیک‌اند (اثرِ فوری، نه بخشی
 * از یک فرمِ ویرایش).
 */
export default function PermitSignersManager({ currentUser, role, onBack, wide }) {
  const { t, dir } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const [signers, setSigners] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pickId, setPickId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setSigners(isContractor ? await loadContractorSigners(currentUser?.id) : await loadAllAuthorizedSigners());
  };
  useEffect(() => {
    load();
    if (!isContractor) loadContractorAccountsForSigning().then(setAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addedIds = new Set((signers || []).map((s) => s.contractorId));
  const candidates = accounts.filter((a) => a.isActive && !addedIds.has(a.id));

  const submitAdd = async () => {
    if (!pickId) { setErr(t("pmErrRequired")); return; }
    setBusy(true); setErr("");
    const res = await createSigner(pickId, currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setShowAdd(false); setPickId(""); await load();
  };

  const toggleStatus = async (s) => {
    if (s.status === "active" && !window.confirm(t("pmSignerConfirmLeave"))) return;
    setBusy(true);
    const res = await setSignerStatus(s.id, s.status === "active" ? "leave" : "active");
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  const changeSubstitute = async (s, substituteId) => {
    setBusy(true);
    const res = await setSignerSubstitute(s.id, substituteId);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  const remove = async (s) => {
    if (!window.confirm(t("pmSignerConfirmDelete"))) return;
    const res = await deleteSigner(s.id);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ShieldCheck size={17} color={THEME.tealDeep} />
        <h3 style={{ margin: 0, color: THEME.heading, fontSize: 15, fontWeight: 800 }}>{t("pmSigners")}</h3>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12, margin: "2px 0 14px", lineHeight: 1.8 }}>
        {isContractor ? t("pmSignersIntroContractor") : t("pmSignersIntro")}
      </p>
      {err && <p style={styles.error}>{err}</p>}

      {!isContractor && !showAdd && (
        <button type="button" onClick={() => { setShowAdd(true); setErr(""); }} style={{ ...styles.smallButton, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> {t("pmAddSigner")}
        </button>
      )}

      {!isContractor && showAdd && (
        <div style={{ ...styles.cardWide, marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <label style={styles.label}>{t("pmPickAccount")}</label>
            <select style={styles.input} value={pickId} dir={dir} onChange={(e) => setPickId(e.target.value)}>
              <option value="">{t("pmSelect")}</option>
              {candidates.map((a) => (
                <option key={a.id} value={a.id}>{[a.fullName, a.companyName, a.jobTitle].filter(Boolean).join(" — ")}</option>
              ))}
            </select>
            {candidates.length === 0 && <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 4 }}>{t("pmNoCandidateAccounts")}</div>}
          </div>
          <button type="button" onClick={submitAdd} disabled={busy || !pickId} style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !pickId ? 0.6 : 1 }}>{t("pmSave")}</button>
          <button type="button" onClick={() => { setShowAdd(false); setPickId(""); }} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>{t("commonCancel")}</button>
        </div>
      )}

      {signers === null && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {signers && signers.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("pmNoSigners")}</p>}

      {signers && signers.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={thS}>{t("pmSignerFullName")}</th>
                <th style={thS}>{t("pmSignersPickContractor")}</th>
                <th style={thS}>{t("pmSignerJobTitle")}</th>
                <th style={thS}>{t("pmSignerStatus")}</th>
                <th style={thS}>{t("pmSignerSubstitute")}</th>
                {!isContractor && <th style={thS} />}
              </tr>
            </thead>
            <tbody>
              {signers.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                  <td style={{ ...tdS, fontWeight: 700, color: THEME.text }}>{s.fullName || "—"}</td>
                  <td style={tdS}>{s.contractorCompanyName || "—"}</td>
                  <td style={tdS}>{s.jobTitle || "—"}</td>
                  <td style={tdS}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: s.status === "active" ? THEME.okBg : THEME.warnBg, color: s.status === "active" ? THEME.ok : THEME.warn }}>
                      {s.status === "active" ? t("pmSignerActive") : t("pmSignerLeave")}
                    </span>
                  </td>
                  <td style={tdS}>
                    {isContractor ? (signers.find((x) => x.id === s.substituteId)?.fullName || "—") : (
                      <select style={{ ...styles.filterSelect, fontSize: 11, padding: "4px 6px" }} value={s.substituteId || ""} dir={dir}
                        onChange={(e) => changeSubstitute(s, e.target.value)} disabled={busy}>
                        <option value="">{t("pmSignerSubstituteNone")}</option>
                        {signers.filter((x) => x.id !== s.id).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}
                      </select>
                    )}
                  </td>
                  {!isContractor && (
                    <td style={{ ...tdS, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => toggleStatus(s)} disabled={busy}
                          style={{ ...iconBtn, color: s.status === "active" ? THEME.warn : THEME.ok }}
                          title={s.status === "active" ? t("pmSignerSetLeave") : t("pmSignerSetActive")}>
                          {s.status === "active" ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                        <button type="button" onClick={() => remove(s)} style={{ ...iconBtn, color: THEME.danger }} title={t("pmSignerConfirmDelete")}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thS = { textAlign: "start", fontSize: 10, fontWeight: 800, color: THEME.text3, padding: "5px 7px", borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" };
const tdS = { padding: "6px 7px", color: THEME.text2 };
const iconBtn = { display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${THEME.border}`, background: THEME.surface, borderRadius: 6, padding: "4px 7px", fontSize: 10.5, fontFamily: THEME.font, cursor: "pointer", color: THEME.text2 };
