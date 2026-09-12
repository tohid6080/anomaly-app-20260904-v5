import React, { useEffect, useMemo, useState } from "react";
import { UserCheck, UserX, Plus, Trash2, ShieldCheck } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadContractorOptions } from "../personnel/personnelApi.js";
import { loadAllAuthorizedSigners, loadContractorSigners, createSigner, saveSigner, setSignerStatus, deleteSigner } from "./permitSignersApi.js";

/**
 * «لیستِ امضاهایِ مجاز» — پیمانکار فقط فهرستِ مربوط به خودش را می‌بیند
 * (readOnly). سرپرست/کارشناسِ HSEِ کارفرما فهرستِ همه‌ی پیمانکارها را
 * می‌بیند، پیمانکار را از یک کشویی انتخاب می‌کند و افزودن/ویرایش/جانشین/
 * فعال‌-مرخصی را مدیریت می‌کند. طبقِ الگویِ «پیش‌نویسِ محلی، ثبتِ صریح»:
 * فرمِ افزودن/ویرایش فقط با دکمه‌ی ذخیره می‌نویسد؛ فعال/مرخصی یک فرمانِ
 * اتمیکِ جداست (مثلِ Approve/Reject) چون اثرِ فوری دارد.
 */
export default function PermitSignersManager({ currentUser, role, onBack, wide }) {
  const { t, dir } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const [contractors, setContractors] = useState([]);
  const [contractorId, setContractorId] = useState(isContractor ? currentUser?.id || "" : "");
  const [signers, setSigners] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ fullName: "", jobTitle: "", substituteId: "" });

  useEffect(() => {
    if (!isContractor) loadContractorOptions().then(setContractors);
  }, [isContractor]);

  const load = async () => {
    if (isContractor) {
      setSigners(await loadContractorSigners(currentUser?.id));
    } else if (contractorId) {
      setSigners(await loadContractorSigners(contractorId));
    } else {
      setSigners(await loadAllAuthorizedSigners());
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [contractorId, isContractor]);

  const contractorName = useMemo(() => {
    const m = {};
    contractors.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [contractors]);

  const resetForm = () => { setForm({ fullName: "", jobTitle: "", substituteId: "" }); setShowAdd(false); setEditId(null); };

  const startAdd = () => {
    if (!isContractor && !contractorId) { setErr(t("pmSelectContractorFirst")); return; }
    setErr(""); resetForm(); setShowAdd(true);
  };
  const startEdit = (s) => {
    setErr(""); setShowAdd(false); setEditId(s.id);
    setForm({ fullName: s.fullName, jobTitle: s.jobTitle, substituteId: s.substituteId || "" });
  };

  const submitForm = async () => {
    if (!form.fullName.trim()) { setErr(t("pmErrRequired")); return; }
    setBusy(true); setErr("");
    const targetContractorId = isContractor ? currentUser?.id : contractorId;
    const res = editId
      ? await saveSigner({ id: editId, contractorId: targetContractorId, ...form })
      : await createSigner({ contractorId: targetContractorId, status: "active", ...form }, currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    resetForm(); await load();
  };

  const toggleStatus = async (s) => {
    if (s.status === "active" && !window.confirm(t("pmSignerConfirmLeave"))) return;
    setBusy(true);
    const res = await setSignerStatus(s.id, s.status === "active" ? "leave" : "active");
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

  const showCompanyCol = !isContractor && !contractorId;
  const sameContractorSigners = (signers || []).filter((s) => !editId || s.id !== editId);

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

      {!isContractor && (
        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>{t("pmSignersPickContractor")}</label>
          <select style={{ ...styles.input, maxWidth: 320 }} value={contractorId} dir={dir}
            onChange={(e) => { setContractorId(e.target.value); resetForm(); }}>
            <option value="">{t("pmFilter_all")}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {!isContractor && contractorId && !showAdd && !editId && (
        <button type="button" onClick={startAdd} style={{ ...styles.smallButton, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> {t("pmAddSigner")}
        </button>
      )}

      {(showAdd || editId) && (
        <div style={{ ...styles.cardWide, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div>
              <label style={styles.label}>{t("pmSignerFullName")}</label>
              <input style={styles.input} value={form.fullName} dir={dir} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>{t("pmSignerJobTitle")}</label>
              <input style={styles.input} value={form.jobTitle} dir={dir} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>{t("pmSignerSubstitute")}</label>
              <select style={styles.input} value={form.substituteId} dir={dir} onChange={(e) => setForm((f) => ({ ...f, substituteId: e.target.value }))}>
                <option value="">{t("pmSignerSubstituteNone")}</option>
                {sameContractorSigners.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={submitForm} disabled={busy} style={{ ...styles.smallButton, background: THEME.teal, opacity: busy ? 0.6 : 1 }}>{t("pmSave")}</button>
            <button type="button" onClick={resetForm} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>{t("commonCancel")}</button>
          </div>
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
                <th style={thS}>{t("pmSignerJobTitle")}</th>
                {showCompanyCol && <th style={thS}>{t("pmSignersPickContractor")}</th>}
                <th style={thS}>{t("pmSignerStatus")}</th>
                <th style={thS}>{t("pmSignerSubstitute")}</th>
                {!isContractor && <th style={thS} />}
              </tr>
            </thead>
            <tbody>
              {signers.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                  <td style={{ ...tdS, fontWeight: 700, color: THEME.text }}>{s.fullName || "—"}</td>
                  <td style={tdS}>{s.jobTitle || "—"}</td>
                  {showCompanyCol && <td style={tdS}>{contractorName[s.contractorId] || "—"}</td>}
                  <td style={tdS}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: s.status === "active" ? THEME.okBg : THEME.warnBg, color: s.status === "active" ? THEME.ok : THEME.warn }}>
                      {s.status === "active" ? t("pmSignerActive") : t("pmSignerLeave")}
                    </span>
                  </td>
                  <td style={tdS}>{signers.find((x) => x.id === s.substituteId)?.fullName || "—"}</td>
                  {!isContractor && (
                    <td style={{ ...tdS, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => startEdit(s)} style={iconBtn} title={t("pmEdit")}>{t("pmEdit")}</button>
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
