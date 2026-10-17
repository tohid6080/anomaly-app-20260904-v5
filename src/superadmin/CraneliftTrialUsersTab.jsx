import React, { useEffect, useState } from "react";
import { Trash2, Ban, CheckCircle2, CalendarPlus } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadCraneliftTrialUsers, setCraneliftTrialUserActive, deleteCraneliftTrialUser, extendCraneliftTrialUser } from "./craneliftTrialApi.js";

const DEFAULT_EXTEND = { amount: "1", unit: "day" };

/**
 * پنل «لیفتینگ پلن» سوپرادمین — فهرستِ کاربرانِ آزمایشیِ نسخه‌ی وبِ IHMS
 * CraneLift 3D (ثبت‌شده از طریقِ کادرِ ورود/ثبت‌نامِ داخلِ صفحه‌ی
 * public/cranelift). این کاربران بخشی از مدلِ چندشرکتیِ اصلیِ IHMS
 * نیستند — فقط برایِ دیدِ سوپرادمین از بازدیدکنندگانِ عمومی‌ای که دوره‌ی
 * آزمایشیِ ۱روزه را فعال کرده‌اند.
 */
export default function CraneliftTrialUsersTab() {
  const { t, dir } = useLanguage();
  const [users, setUsers] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);
  const [extendDrafts, setExtendDrafts] = useState({});

  const load = async () => setUsers(await loadCraneliftTrialUsers());
  useEffect(() => { load(); }, []);

  const getExtendDraft = (id) => extendDrafts[id] || DEFAULT_EXTEND;
  const setExtendDraft = (id, patch) =>
    setExtendDrafts((d) => ({ ...d, [id]: { ...getExtendDraft(id), ...patch } }));

  const handleToggleActive = async (u) => {
    setBusyId(u.id); setMessage("");
    const result = await setCraneliftTrialUserActive(u.id, !u.isActive);
    setBusyId(null);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    await load();
  };

  const handleDelete = async (u) => {
    if (!window.confirm(t("ctDeleteConfirm", { name: u.fullName || u.mobile }))) return;
    setBusyId(u.id); setMessage("");
    const result = await deleteCraneliftTrialUser(u.id);
    setBusyId(null);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    await load();
  };

  const handleExtend = async (u) => {
    const draft = getExtendDraft(u.id);
    setBusyId(u.id); setMessage("");
    const result = await extendCraneliftTrialUser(u.id, u.trialExpiresAt, draft.amount, draft.unit);
    setBusyId(null);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    setMsgErr(false); setMessage(t("ctExtendOk", { name: u.fullName || u.mobile }));
    await load();
  };

  if (!users) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>;

  const th = { textAlign: "center", padding: "8px", fontSize: 11, color: THEME.text3, fontWeight: 700 };
  const td = { textAlign: "center", padding: "8px", fontSize: 12 };
  const now = Date.now();

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>{t("ctNote")}</p>

      {message && (
        <div style={{ fontSize: 12, fontWeight: 600, color: msgErr ? THEME.danger : THEME.ok, marginBottom: 12 }}>{message}</div>
      )}

      {users.length === 0 ? (
        <p style={{ fontSize: 12.5, color: THEME.text3, textAlign: "center", padding: 24 }}>{t("ctEmpty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: THEME.font }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                <th style={th}>{t("ctColName")}</th>
                <th style={th}>{t("ctColMobile")}</th>
                <th style={th}>{t("ctColCompany")}</th>
                <th style={th}>{t("ctColTrialStatus")}</th>
                <th style={th}>{t("ctColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const expired = u.trialExpiresAt ? new Date(u.trialExpiresAt).getTime() < now : false;
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <td style={td}>{u.fullName || "—"}</td>
                    <td style={{ ...td, direction: "ltr" }}>{u.mobile}</td>
                    <td style={td}>{u.companyName || "—"}</td>
                    <td style={td}>
                      {!u.isActive ? (
                        <span style={{ color: THEME.danger, fontWeight: 700 }}>{t("ctStatusDeactivated")}</span>
                      ) : expired ? (
                        <span style={{ color: THEME.text3, fontWeight: 700 }}>{t("ctStatusExpired")}</span>
                      ) : (
                        <span style={{ color: THEME.ok, fontWeight: 700 }}>{t("ctStatusActive")}</span>
                      )}
                      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2, direction: "ltr" }}>
                        {u.trialExpiresAt ? new Date(u.trialExpiresAt).toLocaleString("fa-IR") : "—"}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={busyId === u.id}
                            title={u.isActive ? t("ctBtnDeactivate") : t("ctBtnActivate")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: "transparent", color: u.isActive ? THEME.warn : THEME.ok, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            {u.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                            {u.isActive ? t("ctBtnDeactivate") : t("ctBtnActivate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={busyId === u.id}
                            title={t("ctBtnDelete")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.danger, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            <Trash2 size={13} /> {t("ctBtnDelete")}
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            type="number"
                            min="1"
                            value={getExtendDraft(u.id).amount}
                            onChange={(e) => setExtendDraft(u.id, { amount: e.target.value })}
                            style={{ width: 44, padding: "5px 4px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontSize: 11, textAlign: "center", fontFamily: THEME.font }}
                          />
                          <select
                            value={getExtendDraft(u.id).unit}
                            onChange={(e) => setExtendDraft(u.id, { unit: e.target.value })}
                            style={{ padding: "5px 4px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontSize: 11, fontFamily: THEME.font, background: "#fff" }}
                          >
                            <option value="day">{t("ctUnitDay")}</option>
                            <option value="month">{t("ctUnitMonth")}</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleExtend(u)}
                            disabled={busyId === u.id}
                            title={t("ctBtnExtend")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.tealDeep, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            <CalendarPlus size={13} /> {t("ctBtnExtend")}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
