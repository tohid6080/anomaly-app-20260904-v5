import React, { useEffect, useState } from "react";
import { Trash2, Ban, CheckCircle2 } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadCraneliftTrialUsers, setCraneliftTrialUserActive, deleteCraneliftTrialUser } from "./craneliftTrialApi.js";

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

  const load = async () => setUsers(await loadCraneliftTrialUsers());
  useEffect(() => { load(); }, []);

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
