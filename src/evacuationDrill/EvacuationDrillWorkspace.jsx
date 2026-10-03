import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Plus, Trash2 } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadMusterPoints, createMusterPoint, deleteMusterPoint, musterPointQrUrl, buildDrillCheckinLink, drillStatusMeta } from "./evacuationDrillApi.js";
import { loadAllZonesForCompany } from "../siteZones/siteZonesApi.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import EvacuationDrillLiveRoster from "./EvacuationDrillLiveRoster.jsx";

const quickBtn = (bg, color, border) => ({
  fontSize: 11.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${border}`,
  background: bg, color, cursor: "pointer", fontWeight: 600,
});

// مدیریتِ نقاطِ تجمعِ یک تمرینِ مشخص — افزودن/حذفِ نقطه، نمایشِ QR/لینکِ
// چک‌اینِ عمومیِ هر نقطه، و رسترِ زنده‌یِ حضور (EvacuationDrillLiveRoster).
export default function EvacuationDrillWorkspace({ drill, onBack, wide }) {
  const { t, dir } = useLanguage();
  const [musterPoints, setMusterPoints] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const refresh = () => loadMusterPoints(drill?.id).then((list) => { setMusterPoints(list); setLoading(false); });
  useEffect(() => { refresh(); loadAllZonesForCompany().then(setZones); /* eslint-disable-next-line */ }, [drill?.id]);

  const addPoint = async () => {
    setError("");
    const res = await createMusterPoint({ drillId: drill.id, name, zoneId });
    if (res.__error) { setError(res.message); return; }
    setName(""); setZoneId("");
    refresh();
  };

  const removePoint = async (id) => {
    if (!window.confirm(t("edConfirmDeleteMuster"))) return;
    await deleteMusterPoint(id);
    refresh();
  };

  const copyLink = (token, id) => {
    const link = buildDrillCheckinLink(token);
    try {
      navigator.clipboard?.writeText(link).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(""), 1500);
      });
    } catch { /* ignore */ }
  };

  const sm = drillStatusMeta(drill?.status);

  return (
    <div style={{ maxWidth: wide ? 900 : 640, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "10px 0 4px" }}>{drill?.title}</h2>
      <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 16 }}>
        {drill?.scheduledAt ? toJalaliDateTime(drill.scheduledAt) : "—"}
        <span style={{ color: sm.color, fontWeight: 700, marginInlineStart: 8 }}>{t(sm.labelKey)}</span>
      </div>

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, marginBottom: 8 }}>{t("edAddMusterPointTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 10 }}>
          <div>
            <label style={styles.label}>{t("edMusterNameLabel")}</label>
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} dir={dir} placeholder={t("edMusterNamePlaceholder")} />
          </div>
          {zones.length > 0 && (
            <div>
              <label style={styles.label}>{t("afZone")}</label>
              <select style={styles.input} value={zoneId} onChange={(e) => setZoneId(e.target.value)} dir={dir}>
                <option value="">{t("szLinkNone")}</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {error && <p style={{ color: THEME.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
        <button onClick={addPoint} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, ...quickBtn(THEME.heading, "#fff", THEME.heading) }}>
          <Plus size={14} /> {t("edAddMusterBtn")}
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : musterPoints.length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("edNoMusterPoints")}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 12, marginBottom: 20 }}>
          {musterPoints.map((mp) => (
            <div key={mp.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: THEME.heading, marginBottom: 8 }}>{mp.name}</div>
              <img src={musterPointQrUrl(mp.checkinToken, 160)} alt="QR" style={{ width: 140, height: 140, margin: "0 auto 8px", borderRadius: 8, border: `1px solid ${THEME.border}` }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                <button onClick={() => copyLink(mp.checkinToken, mp.id)} style={quickBtn(THEME.surface2, THEME.heading, THEME.border)}>
                  {copiedId === mp.id ? t("edCopiedLink") : t("edCopyLinkBtn")}
                </button>
                <button onClick={() => removePoint(mp.id)} style={quickBtn(THEME.surface2, THEME.danger, THEME.border)} aria-label={t("commonDelete")}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EvacuationDrillLiveRoster drillId={drill?.id} musterPoints={musterPoints} />
    </div>
  );
}
