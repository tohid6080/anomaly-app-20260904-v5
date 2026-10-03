import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Boxes, X } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadZonesWithLiveStatus, loadSiteMaps, ZONE_TYPES } from "../siteZones/siteZonesApi.js";
import SiteMapCanvas from "../siteZones/SiteMapCanvas.jsx";
import { STATUS_META as PERMIT_STATUS_META } from "../permit/permitModel.js";
import { scaffoldStatusMeta } from "../scaffold/scaffoldApi.js";

const TONE_COLOR = { gray: THEME.text3, teal: "#1d4ed8", ok: THEME.ok, warn: THEME.warn, danger: THEME.danger };
const ZONE_TYPE_LABEL = Object.fromEntries(ZONE_TYPES.map((z) => [z.value, z.labelKey]));

function pinColor(z) {
  if (z.zoneType === "permit" && z.linkedPermitId) {
    const sm = PERMIT_STATUS_META[z.linkedPermitStatus] || {};
    return TONE_COLOR[sm.tone] || THEME.text3;
  }
  if (z.zoneType === "scaffold" && z.linkedScaffoldId) {
    return scaffoldStatusMeta(z.linkedScaffoldStatus).color || THEME.text3;
  }
  if (z.zoneType === "hazard") return THEME.danger;
  if (z.zoneType === "muster_point") return "#2563eb";
  return THEME.text3;
}

// دیجیتال‌توئینِ سبکِ سایت — همان zoneهایِ Site Zones را با وضعیتِ زنده‌یِ
// مجوز/اسکفلدِ متصل (نه یک snapshot) رویِ نقشه نشان می‌دهد. فقط خواندنی.
export default function DigitalTwinDashboard({ onBack, wide, onNavigate }) {
  const { t, dir } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [activeMapId, setActiveMapId] = useState("");
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    loadSiteMaps().then((list) => {
      setMaps(list);
      if (list.length > 0) setActiveMapId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setSelectedZone(null);
    if (!activeMapId) { setZones([]); return; }
    loadZonesWithLiveStatus(activeMapId).then(setZones);
  }, [activeMapId]);

  const activeMap = maps.find((m) => m.id === activeMapId);

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <Boxes size={18} color={THEME.heading} /> {t("dtTitle")}
      </h2>

      {maps.length > 1 && (
        <select style={{ marginBottom: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${THEME.border}`, fontSize: 13 }} value={activeMapId} onChange={(e) => setActiveMapId(e.target.value)}>
          {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : !activeMap ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("dtNoMaps")}</p>
      ) : (
        <SiteMapCanvas
          imageUrl={activeMap.imageUrl} zones={zones} mode="view"
          onZoneClick={(z) => setSelectedZone(z)}
          renderZone={(z) => (
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: pinColor(z),
              opacity: 0.85, border: "2px solid #fff", boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
            }} />
          )}
        />
      )}

      {selectedZone && (
        <div style={{ marginTop: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.heading }}>{selectedZone.name}</div>
              <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 2 }}>{t(ZONE_TYPE_LABEL[selectedZone.zoneType] || "zoneTypeGeneral")}</div>
            </div>
            <button onClick={() => setSelectedZone(null)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.text3, padding: 4 }} aria-label={t("commonClose")}>
              <X size={16} />
            </button>
          </div>

          {selectedZone.zoneType === "permit" && selectedZone.linkedPermitId && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: THEME.heading }}>
                {selectedZone.linkedPermitTitle || "—"}
                <span style={{ color: TONE_COLOR[PERMIT_STATUS_META[selectedZone.linkedPermitStatus]?.tone] || THEME.text3, fontWeight: 600, marginInlineStart: 8 }}>
                  {t(PERMIT_STATUS_META[selectedZone.linkedPermitStatus]?.key || "pmStDraft")}
                </span>
              </span>
              {onNavigate && (
                <button onClick={() => onNavigate({ module: "permitToWork" })} style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: THEME.surface2, color: THEME.heading, cursor: "pointer" }}>
                  {t("dtViewInPermitModule")}
                </button>
              )}
            </div>
          )}

          {selectedZone.zoneType === "scaffold" && selectedZone.linkedScaffoldId && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: THEME.heading, direction: "ltr", display: "inline-block" }}>
                {selectedZone.linkedScaffoldTagNumber || "—"}
                <span style={{ color: scaffoldStatusMeta(selectedZone.linkedScaffoldStatus).color, fontWeight: 600, marginInlineStart: 8 }}>
                  {t(scaffoldStatusMeta(selectedZone.linkedScaffoldStatus).labelKey)}
                </span>
              </span>
              {onNavigate && (
                <button onClick={() => onNavigate({ module: "scaffold" })} style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, background: THEME.surface2, color: THEME.heading, cursor: "pointer" }}>
                  {t("dtViewInScaffoldModule")}
                </button>
              )}
            </div>
          )}

          {!((selectedZone.zoneType === "permit" && selectedZone.linkedPermitId) || (selectedZone.zoneType === "scaffold" && selectedZone.linkedScaffoldId)) && (
            <div style={{ marginTop: 10, fontSize: 12, color: THEME.text3 }}>{t("dtNoLink")}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, padding: "10px 4px", borderTop: `1px solid ${THEME.border}` }}>
        {[
          { color: THEME.danger, labelKey: "zoneTypeHazard" },
          { color: "#2563eb", labelKey: "zoneTypeMusterPoint" },
          { color: THEME.text3, labelKey: "zoneTypeGeneral" },
        ].map((l) => (
          <div key={l.labelKey} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: THEME.text3 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: l.color, display: "inline-block" }} />
            {t(l.labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
}
