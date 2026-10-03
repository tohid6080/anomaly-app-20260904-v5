import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Flame } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadSiteMaps } from "../siteZones/siteZonesApi.js";
import { loadHeatmapData, heatLevel } from "./incidentHeatmapApi.js";
import SiteMapCanvas from "../siteZones/SiteMapCanvas.jsx";

const LEVEL_COLOR = { none: THEME.text3, low: THEME.ok, medium: THEME.warn, high: THEME.danger };
const LEVEL_SIZE = { none: 12, low: 16, medium: 22, high: 30 };

// نقشه‌یِ حرارتیِ آنومالی/حادثه — هر zoneِ تگ‌شده یک دایره به‌اندازه/رنگِ
// متناسب با تراکمِ رکوردهایش می‌گیرد. فقط خواندنی.
export default function IncidentHeatmapDashboard({ onBack, wide }) {
  const { t, dir } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [activeMapId, setActiveMapId] = useState("");
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSiteMaps().then((list) => {
      setMaps(list);
      if (list.length > 0) setActiveMapId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeMapId) { setZones([]); return; }
    loadHeatmapData(activeMapId).then(setZones);
  }, [activeMapId]);

  const activeMap = maps.find((m) => m.id === activeMapId);

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <Flame size={18} color={THEME.danger} /> {t("ihTitle")}
      </h2>

      {maps.length > 1 && (
        <select style={{ marginBottom: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${THEME.border}`, fontSize: 13 }} value={activeMapId} onChange={(e) => setActiveMapId(e.target.value)}>
          {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : !activeMap ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("ihNoMaps")}</p>
      ) : zones.every((z) => z.score === 0) ? (
        <>
          <SiteMapCanvas imageUrl={activeMap.imageUrl} zones={[]} mode="view" />
          <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 16 }}>{t("ihNoTaggedRecords")}</p>
        </>
      ) : (
        <SiteMapCanvas
          imageUrl={activeMap.imageUrl} zones={zones} mode="view"
          renderZone={(z) => {
            const level = heatLevel(z.score);
            const size = LEVEL_SIZE[level];
            return (
              <div title={`${z.name}: ${z.anomalyCount + z.incidentCount}`} style={{
                width: size, height: size, borderRadius: "50%", background: LEVEL_COLOR[level],
                opacity: 0.75, border: "2px solid #fff", boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
              }} />
            );
          }}
        />
      )}

      {zones.some((z) => z.score > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {[...zones].sort((a, b) => b.score - a.score).filter((z) => z.score > 0).map((z) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: "8px 12px" }}>
              <span style={{ fontSize: 12.5, color: THEME.heading, fontWeight: 600 }}>{z.name}</span>
              <span style={{ fontSize: 11, color: THEME.text3 }}>{t("ihZoneCounts", { anomalies: z.anomalyCount, incidents: z.incidentCount })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
