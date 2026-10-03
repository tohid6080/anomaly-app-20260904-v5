import React, { useRef, useState, useCallback } from "react";
import { THEME } from "../shared.js";

// بومِ مشترکِ نقشه‌یِ سایت — یک <img> با مارکرهایِ موقعیت‌یافته‌بر‌اساسِ
// کسرِ عرض/ارتفاع (x_frac/y_frac، نه پیکسلِ مطلق)، تا با هر سایزِ نمایشی
// سازگار بماند. الگویِ drag از LiftingPlanCanvas.jsx الگوبرداری شده ولی
// بسیار ساده‌تر است (یک <div> معمولی، نه SVG) چون اینجا فقط نقطه‌گذاری
// لازم است، نه رسمِ اشکال. mode="edit": کلیک رویِ تصویر یک pin تازه
// می‌سازد (onZonePlace)، و خودِ pinها قابلِ‌کشیدن‌اند (onZoneDrag).
// mode="view": فقط نمایش، رنگ/محتوایِ هر pin را renderZone تعیین می‌کند.
export default function SiteMapCanvas({ imageUrl, zones, mode = "view", onZonePlace, onZoneDrag, renderZone, onZoneClick }) {
  const imgRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const liveFracRef = useRef({});

  const fracFromEvent = useCallback((e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const handleImageClick = (e) => {
    if (mode !== "edit" || !onZonePlace) return;
    const frac = fracFromEvent(e);
    if (frac) onZonePlace(frac.x, frac.y);
  };

  const beginDrag = (e, zoneId) => {
    if (mode !== "edit" || !onZoneDrag) return;
    e.stopPropagation();
    setDragId(zoneId);
    const onMove = (ev) => {
      const frac = fracFromEvent(ev);
      if (frac) {
        liveFracRef.current[zoneId] = frac;
        const el = document.getElementById(`sz-pin-${zoneId}`);
        if (el) { el.style.left = `${frac.x * 100}%`; el.style.top = `${frac.y * 100}%`; }
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
      const frac = liveFracRef.current[zoneId];
      if (frac) onZoneDrag(zoneId, frac.x, frac.y);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 10, overflow: "hidden", border: `1px solid ${THEME.border}`, background: THEME.surface2 }}>
      <img
        ref={imgRef} src={imageUrl} alt=""
        onClick={handleImageClick}
        style={{ width: "100%", display: "block", cursor: mode === "edit" ? "crosshair" : "default", userSelect: "none" }}
        draggable={false}
      />
      {zones.map((z) => (
        <div
          key={z.id} id={`sz-pin-${z.id}`}
          onPointerDown={(e) => beginDrag(e, z.id)}
          onClick={(e) => { e.stopPropagation(); onZoneClick && onZoneClick(z); }}
          style={{
            position: "absolute", left: `${z.xFrac * 100}%`, top: `${z.yFrac * 100}%`,
            transform: "translate(-50%, -50%)", cursor: mode === "edit" ? "grab" : onZoneClick ? "pointer" : "default",
            opacity: dragId === z.id ? 0.6 : 1, touchAction: "none",
          }}
        >
          {renderZone ? renderZone(z) : (
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: THEME.danger, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }} />
          )}
        </div>
      ))}
    </div>
  );
}
