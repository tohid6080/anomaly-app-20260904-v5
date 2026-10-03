import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { UserCheck, Plus, Ban } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadGuestAuditorLinks, createGuestAuditorLink, revokeGuestAuditorLink, buildGuestAuditorLink, isLinkLive } from "./guestAuditorApi.js";
import { JalaliDateTimeInput, toJalaliDateTime } from "../personnel/jalaliDate.jsx";

const quickBtn = (bg, color, border) => ({
  fontSize: 11.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${border}`,
  background: bg, color, cursor: "pointer", fontWeight: 600,
});

// صدور/لغوِ لینکِ «بازرسِ مهمان» — فهرستِ لینک‌هایِ صادرشده + فرمِ صدورِ
// لینکِ تازه (برچسب + تاریخِ انقضا) + دکمه‌یِ لغوِ دسترسی (audit trail:
// revoked_by/revoked_at ثبت می‌شود). خودِ صدور/لغو نوشتنِ معمولیِ
// احراز-هویت‌شده است؛ فقط *مصرفِ* لینک (توسطِ بازرسِ بیرونی) بدونِ ورود است.
export default function GuestAuditorAccessPanel({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const refresh = () => loadGuestAuditorLinks().then((list) => { setLinks(list); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const issue = async () => {
    setError("");
    const res = await createGuestAuditorLink({ label, expiresAt, createdBy: currentUser?.name || "" });
    if (res.__error) { setError(res.message); return; }
    setLabel(""); setExpiresAt("");
    refresh();
  };

  const revoke = async (id) => {
    if (!window.confirm(t("gaConfirmRevoke"))) return;
    await revokeGuestAuditorLink(id, currentUser?.name || "");
    refresh();
  };

  const copyLink = (token, id) => {
    try {
      navigator.clipboard?.writeText(buildGuestAuditorLink(token)).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(""), 1500);
      });
    } catch { /* ignore */ }
  };

  return (
    <div style={{ maxWidth: wide ? 820 : 640, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <UserCheck size={18} color={THEME.heading} /> {t("gaTitle")}
      </h2>

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, marginBottom: 8 }}>{t("gaIssueNewTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 10 }}>
          <div>
            <label style={styles.label}>{t("gaLabelLabel")}</label>
            <input style={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} dir={dir} placeholder={t("gaLabelPlaceholder")} />
          </div>
          <div>
            <label style={styles.label}>{t("gaExpiresAtLabel")}</label>
            <JalaliDateTimeInput value={expiresAt} onChange={setExpiresAt} />
          </div>
        </div>
        {error && <p style={{ color: THEME.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
        <button onClick={issue} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, ...quickBtn(THEME.heading, "#fff", THEME.heading) }}>
          <Plus size={14} /> {t("gaIssueBtn")}
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : links.length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("gaNoLinks")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((l) => {
            const live = isLinkLive(l);
            return (
              <div key={l.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: THEME.heading }}>{l.label || t("gaUnlabeled")}</div>
                    <div style={{ fontSize: 11, color: THEME.text3, marginTop: 2 }}>
                      {t("gaExpiresAtDisplay", { date: toJalaliDateTime(l.expiresAt) })}
                      <span style={{ color: live ? THEME.ok : THEME.danger, fontWeight: 700, marginInlineStart: 8 }}>
                        {live ? t("gaStatusActive") : l.status === "revoked" ? t("gaStatusRevoked") : t("gaStatusExpired")}
                      </span>
                    </div>
                    {l.accessCount > 0 && (
                      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2 }}>
                        {t("gaAccessCount", { count: l.accessCount })}
                        {l.lastAccessedAt ? ` — ${toJalaliDateTime(l.lastAccessedAt)}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {live && (
                      <button onClick={() => copyLink(l.token, l.id)} style={quickBtn(THEME.surface2, THEME.heading, THEME.border)}>
                        {copiedId === l.id ? t("edCopiedLink") : t("edCopyLinkBtn")}
                      </button>
                    )}
                    {live && (
                      <button onClick={() => revoke(l.id)} style={{ ...quickBtn(THEME.dangerBg, THEME.danger, THEME.danger), display: "flex", alignItems: "center", gap: 4 }}>
                        <Ban size={12} /> {t("gaRevokeBtn")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
