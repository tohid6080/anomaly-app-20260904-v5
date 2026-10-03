import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { styles, THEME, resizeImageFile } from "../shared.js";
import { uploadBase64ToStorage } from "../offline/storageUpload.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadSiteMaps, createSiteMap, loadSiteZones, createZone, updateZone, deleteZone, ZONE_TYPES } from "./siteZonesApi.js";
import SiteMapCanvas from "./SiteMapCanvas.jsx";
import { loadPermits } from "../permit/permitApi.js";
import { loadScaffoldTags } from "../scaffold/scaffoldApi.js";

const primaryBtnStyle = { border: "none", background: THEME.teal, color: "#06231f", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const secondaryBtnStyle = { border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.text2, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };

const ZONE_COLOR = { hazard: THEME.danger, permit: "#2563eb", scaffold: "#eab308", muster_point: THEME.ok, general: THEME.text3 };

// مدیریتِ «Site Zones» — فقط سرپرست: یک نقشه‌یِ سایت آپلود می‌کند، بعد با
// کلیک رویِ تصویر pinهایِ hazard/permit/scaffold/muster_point می‌سازد. هر
// pin فقط یک نقطه + نام/نوع است؛ اتصالِ اختیاری به یک مجوز/اسکفلدِ واقعی
// (برایِ دیجیتال‌توئینِ وضعیتِ زنده) فقط وقتی نوعِ pin متناظر انتخاب شود
// نمایش داده می‌شود — بدونِ آن، فقط یک مارکرِ نام‌دارِ ساده است.
export default function SiteZonesEditor({ onBack, wide }) {
  const { t, dir } = useLanguage();
  const [maps, setMaps] = useState([]);
  const [activeMapId, setActiveMapId] = useState("");
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [error, setError] = useState("");

  const [pendingPoint, setPendingPoint] = useState(null); // {x,y} در انتظارِ فرمِ نام‌گذاری
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("general");
  const [formLinkId, setFormLinkId] = useState("");
  const [permits, setPermits] = useState([]);
  const [scaffolds, setScaffolds] = useState([]);
  const [editingZoneId, setEditingZoneId] = useState(null);

  const loadMaps = async () => {
    setLoading(true);
    const list = await loadSiteMaps();
    setMaps(list);
    if (!activeMapId && list.length > 0) setActiveMapId(list[0].id);
    setLoading(false);
  };
  useEffect(() => { loadMaps(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadZonesForMap = async (mapId) => {
    setZones(mapId ? await loadSiteZones(mapId) : []);
  };
  useEffect(() => { loadZonesForMap(activeMapId); }, [activeMapId]);

  useEffect(() => {
    loadPermits().then(setPermits).catch(() => setPermits([]));
    loadScaffoldTags().then(setScaffolds).catch(() => setScaffolds([]));
  }, []);

  const handleUploadMap = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const base64 = await resizeImageFile(file);
      const url = await uploadBase64ToStorage("site-maps", `map-${Date.now()}.jpg`, base64, "image/jpeg");
      const result = await createSiteMap({ name: newMapName.trim() || file.name, imageUrl: url });
      if (result?.__error) { setError(result.message); setUploading(false); return; }
      setNewMapName("");
      await loadMaps();
      setActiveMapId(result.record.id);
    } catch (err) {
      setError(err?.message || t("szErrSave"));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handlePlace = (x, y) => {
    setPendingPoint({ x, y });
    setFormName(""); setFormType("general"); setFormLinkId("");
    setEditingZoneId(null);
  };

  const handleZoneClick = (z) => {
    setEditingZoneId(z.id);
    setPendingPoint({ x: z.xFrac, y: z.yFrac });
    setFormName(z.name); setFormType(z.zoneType);
    setFormLinkId(z.linkedPermitId || z.linkedScaffoldId || "");
  };

  const commitPin = async () => {
    if (!formName.trim()) return;
    const payload = {
      siteMapId: activeMapId, name: formName.trim(), zoneType: formType,
      xFrac: pendingPoint.x, yFrac: pendingPoint.y,
      linkedPermitId: formType === "permit" ? formLinkId : "",
      linkedScaffoldId: formType === "scaffold" ? formLinkId : "",
    };
    const result = editingZoneId ? await updateZone(editingZoneId, payload) : await createZone(payload);
    if (result?.__error) { setError(result.message); return; }
    setPendingPoint(null);
    setEditingZoneId(null);
    loadZonesForMap(activeMapId);
  };

  const handleDrag = async (zoneId, x, y) => {
    await updateZone(zoneId, { xFrac: x, yFrac: y });
    loadZonesForMap(activeMapId);
  };

  const handleDeletePin = async () => {
    if (!editingZoneId) return;
    await deleteZone(editingZoneId);
    setPendingPoint(null);
    setEditingZoneId(null);
    loadZonesForMap(activeMapId);
  };

  const activeMap = maps.find((m) => m.id === activeMapId);

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px" }}>
        <MapPin size={18} color={THEME.teal} /> {t("szTitle")}
      </h2>

      {maps.length > 0 && (
        <select style={{ ...styles.input, marginBottom: 10 }} value={activeMapId} onChange={(e) => { setActiveMapId(e.target.value); setPendingPoint(null); }}>
          {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...styles.input, flex: 1, minWidth: 160 }} dir={dir} placeholder={t("szNewMapNamePlaceholder")} value={newMapName} onChange={(e) => setNewMapName(e.target.value)} />
        <label style={{ ...primaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> {uploading ? t("commonSaving") : t("szUploadMapBtn")}
          <input type="file" accept="image/*" onChange={handleUploadMap} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>

      {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : !activeMap ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("szNoMapsYet")}</p>
      ) : (
        <>
          <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 8 }}>{t("szClickToPlaceHint")}</p>
          <SiteMapCanvas
            imageUrl={activeMap.imageUrl} zones={zones} mode="edit"
            onZonePlace={handlePlace} onZoneDrag={handleDrag} onZoneClick={handleZoneClick}
            renderZone={(z) => (
              <div title={z.name} style={{ width: 16, height: 16, borderRadius: "50%", background: ZONE_COLOR[z.zoneType] || THEME.text3, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }} />
            )}
          />

          {pendingPoint && (
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginTop: 12 }}>
              <input style={{ ...styles.input, marginBottom: 8 }} dir={dir} placeholder={t("szPinNamePlaceholder")} value={formName} onChange={(e) => setFormName(e.target.value)} />
              <select style={{ ...styles.input, marginBottom: 8 }} value={formType} onChange={(e) => { setFormType(e.target.value); setFormLinkId(""); }}>
                {ZONE_TYPES.map((zt) => <option key={zt.value} value={zt.value}>{t(zt.labelKey)}</option>)}
              </select>
              {formType === "permit" && (
                <select style={{ ...styles.input, marginBottom: 8 }} value={formLinkId} onChange={(e) => setFormLinkId(e.target.value)}>
                  <option value="">{t("szLinkNone")}</option>
                  {permits.map((p) => <option key={p.id} value={p.id}>{p.title || p.permitNo}</option>)}
                </select>
              )}
              {formType === "scaffold" && (
                <select style={{ ...styles.input, marginBottom: 8 }} value={formLinkId} onChange={(e) => setFormLinkId(e.target.value)}>
                  <option value="">{t("szLinkNone")}</option>
                  {scaffolds.map((s) => <option key={s.id} value={s.id}>{s.tagNumber || s.location}</option>)}
                </select>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={primaryBtnStyle} onClick={commitPin}>{t("commonSave")}</button>
                <button type="button" style={secondaryBtnStyle} onClick={() => { setPendingPoint(null); setEditingZoneId(null); }}>{t("commonCancel")}</button>
                {editingZoneId && (
                  <button type="button" style={{ ...secondaryBtnStyle, color: THEME.danger, borderColor: THEME.danger, display: "flex", alignItems: "center", gap: 6 }} onClick={handleDeletePin}>
                    <Trash2 size={13} /> {t("commonDelete")}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
