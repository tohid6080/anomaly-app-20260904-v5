import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Siren, Plus, Trash2 } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { toJalaliDateTime, JalaliDateTimeInput } from "../personnel/jalaliDate.jsx";
import { loadDrills, createDrill, updateDrillStatus, deleteDrill, drillStatusMeta } from "./evacuationDrillApi.js";
import { loadSiteMaps } from "../siteZones/siteZonesApi.js";
import EvacuationDrillWorkspace from "./EvacuationDrillWorkspace.jsx";

const quickBtn = (bg, color, border) => ({
  fontSize: 11.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${border}`,
  background: bg, color, cursor: "pointer", fontWeight: 600,
});

// داشبوردِ «تمرینِ تخلیه» — فهرستِ تمرین‌ها + فرمِ ثبتِ تمرینِ تازه. ورود به هر
// تمرین، مدیریتِ نقاطِ تجمع/QR/رستر را در EvacuationDrillWorkspace باز می‌کند.
export default function EvacuationDrillDashboard({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const [drills, setDrills] = useState([]);
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDrillId, setOpenDrillId] = useState(null);

  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [siteMapId, setSiteMapId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => loadDrills().then((list) => { setDrills(list); setLoading(false); });
  useEffect(() => { refresh(); loadSiteMaps().then(setMaps); }, []);

  if (openDrillId) {
    const drill = drills.find((d) => d.id === openDrillId);
    return <EvacuationDrillWorkspace drill={drill} onBack={() => { setOpenDrillId(null); refresh(); }} wide={wide} />;
  }

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await createDrill({ title, scheduledAt, siteMapId });
    setSaving(false);
    if (res.__error) { setError(res.message); return; }
    setTitle(""); setScheduledAt(""); setSiteMapId("");
    refresh();
  };

  const changeStatus = async (id, status) => { await updateDrillStatus(id, status); refresh(); };
  const removeDrill = async (id) => {
    if (!window.confirm(t("edConfirmDelete"))) return;
    await deleteDrill(id);
    refresh();
  };

  return (
    <div style={{ maxWidth: wide ? 820 : 640, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <Siren size={18} color={THEME.danger} /> {t("edTitle")}
      </h2>

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 10 }}>
          <div>
            <label style={styles.label}>{t("edDrillTitleLabel")}</label>
            <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} dir={dir} placeholder={t("edDrillTitlePlaceholder")} />
          </div>
          <div>
            <label style={styles.label}>{t("edScheduledAtLabel")}</label>
            <JalaliDateTimeInput value={scheduledAt} onChange={setScheduledAt} />
          </div>
          {maps.length > 0 && (
            <div>
              <label style={styles.label}>{t("edSiteMapLabel")}</label>
              <select style={styles.input} value={siteMapId} onChange={(e) => setSiteMapId(e.target.value)} dir={dir}>
                <option value="">{t("szLinkNone")}</option>
                {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {error && <p style={{ color: THEME.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
        <button onClick={submit} disabled={saving} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, ...quickBtn(THEME.heading, "#fff", THEME.heading) }}>
          <Plus size={14} /> {t("edAddDrillBtn")}
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : drills.length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("edNoDrills")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {drills.map((d) => {
            const sm = drillStatusMeta(d.status);
            return (
              <div key={d.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ cursor: "pointer", minWidth: 0 }} onClick={() => setOpenDrillId(d.id)}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: THEME.heading }}>{d.title}</div>
                    <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 2 }}>
                      {d.scheduledAt ? toJalaliDateTime(d.scheduledAt) : "—"}
                      <span style={{ color: sm.color, fontWeight: 700, marginInlineStart: 8 }}>{t(sm.labelKey)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {d.status === "planned" && <button style={quickBtn(THEME.okBg, THEME.ok, THEME.ok)} onClick={() => changeStatus(d.id, "in_progress")}>{t("edStartBtn")}</button>}
                    {d.status === "in_progress" && <button style={quickBtn(THEME.surface2, THEME.text3, THEME.border)} onClick={() => changeStatus(d.id, "completed")}>{t("edCompleteBtn")}</button>}
                    {(d.status === "planned" || d.status === "in_progress") && <button style={quickBtn(THEME.dangerBg, THEME.danger, THEME.danger)} onClick={() => changeStatus(d.id, "cancelled")}>{t("edCancelBtn")}</button>}
                    <button style={quickBtn(THEME.surface2, THEME.danger, THEME.border)} onClick={() => removeDrill(d.id)} aria-label={t("commonDelete")}><Trash2 size={13} /></button>
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
