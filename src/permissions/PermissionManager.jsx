import React, { useState, useEffect } from "react";
import { ShieldCheck, RotateCcw, Users, Building2 } from "lucide-react";
import { sb, sbOk, styles, THEME, getCurrentCompanyId } from "../shared.js";
import { loadContractorOptions } from "../personnel/personnelApi.js";
import { PERMISSION_MODULES, loadPermissionsMap, saveModuleAccess, getModuleAccess, resetAccountPermissions } from "./permissionsApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

async function loadEmployerAccountOptions() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`employer_accounts?select=id,name,username,job_position_id&order=name.asc${filter}`);
  return sbOk(rows) ? rows : [];
}

const ACCESS_OPTIONS = [
  { value: "none", labelKey: "permissionsAccessNone" },
  { value: "view", labelKey: "permissionsAccessView" },
  { value: "edit", labelKey: "permissionsAccessEdit" },
];

export default function PermissionManager({ onBack }) {
  const { t, dir } = useLanguage();
  const [accountType, setAccountType] = useState("employer");
  const [employerAccounts, setEmployerAccounts] = useState([]);
  const [contractorAccounts, setContractorAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [permMap, setPermMap] = useState({});
  const [draftAccess, setDraftAccess] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [emp, con] = await Promise.all([loadEmployerAccountOptions(), loadContractorOptions()]);
      setEmployerAccounts(emp);
      setContractorAccounts(con);
      setLoadingAccounts(false);
    })();
  }, []);

  const accounts = accountType === "employer" ? employerAccounts : contractorAccounts;

  useEffect(() => {
    setSelectedAccountId("");
    setPermMap({});
  }, [accountType]);

  useEffect(() => {
    if (!selectedAccountId) { setPermMap({}); setDraftAccess({}); return; }
    (async () => {
      setLoadingPerms(true);
      const map = await loadPermissionsMap(accountType, selectedAccountId);
      setPermMap(map);
      setDraftAccess(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, getModuleAccess(map, m.key)])));
      setLoadingPerms(false);
    })();
  }, [selectedAccountId, accountType]);

  // استاندارد سراسری ذخیره‌سازی: تغییر سطح دسترسی هر ماژول فقط در این
  // Draft محلی می‌رود؛ Write واقعی فقط با کلیک روی «ذخیره تغییرات» است
  const updateDraft = (moduleKey, access) => {
    setDraftAccess((prev) => ({ ...prev, [moduleKey]: access }));
  };

  const isDirty = PERMISSION_MODULES.some((m) => draftAccess[m.key] !== getModuleAccess(permMap, m.key));

  const handleSaveAll = async () => {
    setSaving(true);
    const changed = PERMISSION_MODULES.filter((m) => draftAccess[m.key] !== getModuleAccess(permMap, m.key));
    const results = await Promise.all(changed.map((m) => saveModuleAccess(accountType, selectedAccountId, m.key, draftAccess[m.key])));
    setSaving(false);
    if (results.some((r) => r?.__error)) { alert(t("errSaveSomeItems")); }
    const map = await loadPermissionsMap(accountType, selectedAccountId);
    setPermMap(map);
    setDraftAccess(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, getModuleAccess(map, m.key)])));
  };

  const handleReset = async () => {
    if (!confirm(t("permissionsResetConfirm"))) return;
    await resetAccountPermissions(accountType, selectedAccountId);
    setPermMap({});
    setDraftAccess(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, "edit"])));
  };

  const selectedAccountLabel = accounts.find((a) => a.id === selectedAccountId)?.name || "";
  const hasAnyExplicitRow = Object.keys(permMap).length > 0;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackToMenu")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <ShieldCheck size={20} color={THEME.teal} />
        <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>{t("permissionsTitle")}</h2>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 18 }}>
        {t("permissionsDesc")}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setAccountType("employer")} style={tabBtnStyle(accountType === "employer")}>
          <Users size={14} /> {t("permissionsTabEmployer")}
        </button>
        <button type="button" onClick={() => setAccountType("contractor")} style={tabBtnStyle(accountType === "contractor")}>
          <Building2 size={14} /> {t("permissionsTabContractor")}
        </button>
      </div>

      <div style={{ ...styles.card, width: "auto" }}>
        <label style={styles.label}>{t("permissionsSelectAccount")}</label>
        {loadingAccounts ? (
          <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
        ) : (
          <select style={styles.input} value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} dir={dir}>
            <option value="">{t("permissionsSelectPlaceholder")}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {selectedAccountId && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0 }}>{t("permissionsAccessFor", { name: selectedAccountLabel })}</h3>
            {hasAnyExplicitRow && (
              <button type="button" onClick={handleReset} style={{ ...styles.smallButton, background: THEME.text3, display: "flex", alignItems: "center", gap: 6 }}>
                <RotateCcw size={13} /> {t("permissionsResetToFull")}
              </button>
            )}
          </div>

          {loadingPerms ? (
            <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
          ) : (
            <>
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod.key} style={{ ...styles.card, width: "auto", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.text, flex: 1, minWidth: 160 }}>{t(mod.labelKey)}</span>
                    <select
                      style={{ ...styles.filterSelect, width: 140 }}
                      value={draftAccess[mod.key] ?? getModuleAccess(permMap, mod.key)}
                      onChange={(e) => updateDraft(mod.key, e.target.value)}
                      disabled={saving}
                      dir={dir}
                    >
                      {ACCESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              {isDirty && (
                <div style={{ position: "sticky", bottom: 10, display: "flex", gap: 8, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 14px", marginTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "#92400e", fontWeight: 600, flex: 1, alignSelf: "center" }}>{t("draftUnsavedChangesBar")}</span>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setDraftAccess(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, getModuleAccess(permMap, m.key)])))} disabled={saving}>{t("commonCancel")}</button>
                  <button type="button" style={styles.smallButton} onClick={handleSaveAll} disabled={saving}>{saving ? t("saSavingEllipsis") : t("draftCommitChanges")}</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function tabBtnStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center",
    background: active ? THEME.teal : "#fff", color: active ? "#fff" : THEME.text2,
    border: `1.5px solid ${active ? THEME.teal : THEME.border}`, borderRadius: 9,
    padding: "9px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font,
  };
}
