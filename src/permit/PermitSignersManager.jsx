import React, { useEffect, useState } from "react";
import { UserCheck, UserX, Plus, Trash2, ShieldCheck } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadAllAuthorizedSigners, loadContractorSigners, loadContractorAccountsForSigning, loadEmployerAccountsForSigning,
  createSigner, setSignerStatus, setSignerSubstitute, deleteSigner,
} from "./permitSignersApi.js";

const keyOf = (accountType, id) => `${accountType}:${id}`;

/**
 * «لیستِ امضاهایِ مجاز» — پیمانکار فقط ردیفِ خودش را می‌بیند (readOnly).
 * سرپرست/کارشناسِ HSEِ کارفرما فهرستِ کاملِ شرکت را می‌بیند و مدیریت
 * می‌کند. نام و شغلِ هر امضاکننده آزادانه تایپ نمی‌شود — «افزودنِ
 * امضاکننده» از میانِ حساب‌هایِ واقعاً ثبت‌شده در SuperAdmin (مدیریتِ
 * حساب‌ها) انتخاب می‌شود: هم حساب‌هایِ پیمانکاری، هم حساب‌هایِ کارفرما/
 * سرپرستِ HSE — تا سرپرستِ کارفرما و بقیه‌ی کارشناسانش هم بتوانند در همین
 * فهرست باشند و جانشین معرفی کنند. جانشین فقط از همان «گروه» انتخاب‌پذیر
 * است: برایِ یک امضاکننده‌ی پیمانکاری، فقط هم‌شرکتی‌هایِ خودش؛ برایِ یک
 * امضاکننده‌ی کارفرمایی، فقط بقیه‌ی حساب‌هایِ کارفرما/سرپرستِ HSE.
 * فعال/مرخصی و جانشین، فرمان‌هایِ اتمیک‌اند (اثرِ فوری، نه بخشی از فرم).
 */
export default function PermitSignersManager({ currentUser, role, onBack, wide }) {
  const { t, dir } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const [signers, setSigners] = useState(null);
  const [contractorAccounts, setContractorAccounts] = useState([]);
  const [employerAccounts, setEmployerAccounts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pickKey, setPickKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setSigners(isContractor ? await loadContractorSigners(currentUser?.id) : await loadAllAuthorizedSigners());
  };
  useEffect(() => {
    load();
    if (!isContractor) {
      loadContractorAccountsForSigning().then(setContractorAccounts);
      loadEmployerAccountsForSigning().then(setEmployerAccounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addedKeys = new Set((signers || []).map((s) => keyOf(s.accountType, s.contractorId || s.employerAccountId)));
  const candidateContractors = contractorAccounts.filter((a) => a.isActive && !addedKeys.has(keyOf("contractor", a.id)));
  const candidateEmployers = employerAccounts.filter((a) => a.isActive && !addedKeys.has(keyOf("employer", a.id)));

  const submitAdd = async () => {
    if (!pickKey) { setErr(t("pmErrRequired")); return; }
    const [accountType, accountId] = pickKey.split(":");
    setBusy(true); setErr("");
    const res = await createSigner(accountType, accountId, currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setShowAdd(false); setPickKey(""); await load();
  };

  const toggleStatus = async (s) => {
    if (s.status === "active" && !window.confirm(t("pmSignerConfirmLeave"))) return;
    setBusy(true);
    const res = await setSignerStatus(s.id, s.status === "active" ? "leave" : "active");
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  // مقدارِ گزینه‌ی «new:accountType:accountId» یعنی این فرد هنوز ردیفِ
  // امضاکننده ندارد (فقط در SuperAdmin ثبت شده) — قبل از تنظیمِ جانشین، اول
  // برایش یک ردیفِ امضاکننده می‌سازیم؛ همانی که باگِ «جانشینِ هم‌شرکتی دیده
  // نمی‌شود» را حل می‌کند: قبلاً substituteCandidates فقط از میانِ
  // امضاکنندگانِ از‌قبل‌اضافه‌شده انتخاب می‌کرد، نه همه‌ی کارکنانِ ثبت‌شده‌ی
  // همان شرکت در SuperAdmin.
  const changeSubstitute = async (s, value) => {
    if (!value) { await commitSubstitute(s, null); return; }
    if (value.startsWith("new:")) {
      const [, accountType, accountId] = value.split(":");
      setBusy(true); setErr("");
      const created = await createSigner(accountType, accountId, currentUser?.name);
      if (created?.__error) { setBusy(false); setErr(created.message); return; }
      await commitSubstitute(s, created.id);
      return;
    }
    await commitSubstitute(s, value);
  };

  const commitSubstitute = async (s, substituteId) => {
    setBusy(true);
    const res = await setSignerSubstitute(s.id, substituteId);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  // گزینه‌های جانشین برای یک امضاکننده: هم امضاکنندگانِ از‌قبل‌اضافه‌شده‌ی
  // همان گروه (ردیفِ signer واقعی، بدونِ تغییر)، هم بقیه‌ی حساب‌هایِ
  // ثبت‌شده‌ی همان گروه در SuperAdmin که هنوز امضاکننده نشده‌اند (با پیشوندِ
  // «new:» — با انتخاب، خودکار به امضاکننده تبدیل می‌شوند).
  const substituteOptions = (s) => {
    const sameGroup = (x) => x.id !== s.id && x.accountType === s.accountType && (s.accountType === "contractor" ? x.groupName === s.groupName : true);
    const existing = (signers || []).filter(sameGroup);
    const existingAccountIds = new Set(existing.map((x) => (x.accountType === "contractor" ? x.contractorId : x.employerAccountId)));
    const myAccountId = s.accountType === "contractor" ? s.contractorId : s.employerAccountId;
    const rawPool = s.accountType === "contractor" ? contractorAccounts : employerAccounts;
    const notYetAdded = rawPool.filter((a) =>
      a.isActive && a.id !== myAccountId && !existingAccountIds.has(a.id) &&
      (s.accountType === "contractor" ? a.groupName === s.groupName : true)
    );
    return { existing, notYetAdded };
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
            <select style={styles.input} value={pickKey} dir={dir} onChange={(e) => setPickKey(e.target.value)}>
              <option value="">{t("pmSelect")}</option>
              {candidateContractors.length > 0 && (
                <optgroup label={t("pmAddSignerContractor")}>
                  {candidateContractors.map((a) => (
                    <option key={keyOf("contractor", a.id)} value={keyOf("contractor", a.id)}>
                      {[a.fullName, a.groupName, a.jobTitle].filter(Boolean).join(" — ")}
                    </option>
                  ))}
                </optgroup>
              )}
              {candidateEmployers.length > 0 && (
                <optgroup label={t("pmAddSignerEmployer")}>
                  {candidateEmployers.map((a) => (
                    <option key={keyOf("employer", a.id)} value={keyOf("employer", a.id)}>
                      {[a.fullName, a.jobTitle].filter(Boolean).join(" — ")}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {candidateContractors.length === 0 && candidateEmployers.length === 0 && (
              <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 4 }}>{t("pmNoCandidateAccounts")}</div>
            )}
          </div>
          <button type="button" onClick={submitAdd} disabled={busy || !pickKey} style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !pickKey ? 0.6 : 1 }}>{t("pmSave")}</button>
          <button type="button" onClick={() => { setShowAdd(false); setPickKey(""); }} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>{t("commonCancel")}</button>
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
                <th style={thS}>{t("pmSignerGroup")}</th>
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
                  <td style={tdS}>{s.groupName || "—"}</td>
                  <td style={tdS}>{s.jobTitle || "—"}</td>
                  <td style={tdS}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: s.status === "active" ? THEME.okBg : THEME.warnBg, color: s.status === "active" ? THEME.ok : THEME.warn }}>
                      {s.status === "active" ? t("pmSignerActive") : t("pmSignerLeave")}
                    </span>
                  </td>
                  <td style={tdS}>
                    {isContractor ? (signers.find((x) => x.id === s.substituteId)?.fullName || "—") : (() => {
                      const { existing, notYetAdded } = substituteOptions(s);
                      return (
                        <select style={{ ...styles.filterSelect, fontSize: 11, padding: "4px 6px" }} value={s.substituteId || ""} dir={dir}
                          onChange={(e) => changeSubstitute(s, e.target.value)} disabled={busy}>
                          <option value="">{t("pmSignerSubstituteNone")}</option>
                          {existing.map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}
                          {notYetAdded.map((a) => (
                            <option key={`new:${s.accountType}:${a.id}`} value={`new:${s.accountType}:${a.id}`}>
                              {[a.fullName, a.jobTitle].filter(Boolean).join(" — ")}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
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
