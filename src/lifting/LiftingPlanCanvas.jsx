import React, { useCallback, useMemo, useRef, useState } from "react";
import { Trash2, RotateCw, Grid3x3, Maximize2 } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { LIFTING_OBJECT_TYPES, EMPTY_SCENE } from "./liftingPlanApi.js";

/* ============================================================================ *
 * Lifting Plan Canvas — بومِ دوبعدیِ نمای بالا (Plan View)، داده‌محور.
 * هر شیء در scene.objects: { id, type, x, y, w, h, rot, props:{...} }.
 * جابه‌جایی / تغییرِ اندازه / چرخش با Pointer Events؛ همه‌ی تغییرها فقط در
 * state محلی (onChange) — نوشتن در دیتابیس فقط با دکمه‌ی «ذخیره‌ی نقشه» در
 * Workspace (قانونِ draft-first پروژه). بدونِ کتابخانه‌ی خارجی، SVG خالص.
 * ============================================================================ */

const VB_W = 1000;
const VB_H = 640;
const GRID = 10;

// آیکونِ کوتاهِ هر نوع برای پالت — با labelKey برای i18n
export const LIFTING_OBJECT_META = [
  { type: "crane", emoji: "🏗️" },
  { type: "load", emoji: "📦" },
  { type: "hook", emoji: "🪝" },
  { type: "sling", emoji: "🧵" },
  { type: "shackle", emoji: "🔗" },
  { type: "spreader_beam", emoji: "➖" },
  { type: "structure", emoji: "🧱" },
  { type: "truck", emoji: "🚛" },
  { type: "power_line", emoji: "⚡" },
  { type: "worker", emoji: "👷" },
  { type: "barrier", emoji: "🚧" },
  { type: "exclusion_zone", emoji: "⛔" },
];

const OBJ_DEFAULTS = {
  crane:          { w: 92,  h: 92,  props: { model: "", boomLengthM: 30, boomAngleDeg: 60, craneModelId: "", chartRef: "" } },
  load:           { w: 74,  h: 50,  props: { label: "", weightKg: 0 } },
  hook:           { w: 26,  h: 26,  props: { weightKg: 0, wllKg: 0 } },
  sling:          { w: 64,  h: 64,  props: { wllKg: 0, weightKg: 0, count: 4, angleDeg: 60 } },
  shackle:        { w: 24,  h: 24,  props: { wllKg: 0, count: 4 } },
  spreader_beam:  { w: 120, h: 16,  props: { wllKg: 0, lengthM: 4, weightKg: 0 } },
  structure:      { w: 130, h: 84,  props: { label: "" } },
  truck:          { w: 150, h: 48,  props: { label: "" } },
  power_line:     { w: 360, h: 14,  props: { voltageKv: 132, clearanceM: 4.6 } },
  worker:         { w: 20,  h: 20,  props: { role: "", personnelId: "" } },
  barrier:        { w: 180, h: 12,  props: { label: "" } },
  exclusion_zone: { w: 200, h: 150, props: { label: "" } },
};

const MIN_W = 14, MIN_H = 8;

let _seq = 0;
function newId(type) {
  _seq += 1;
  return `${type}-${Date.now().toString(36)}-${_seq}`;
}

export function makeObject(type, at) {
  const d = OBJ_DEFAULTS[type] || { w: 60, h: 40, props: {} };
  return {
    id: newId(type),
    type,
    x: Math.round((at?.x ?? VB_W / 2 - d.w / 2) / GRID) * GRID,
    y: Math.round((at?.y ?? VB_H / 2 - d.h / 2) / GRID) * GRID,
    w: d.w,
    h: d.h,
    rot: 0,
    props: { ...d.props },
  };
}

const CSS = `
.lpc-svg{width:100%;height:100%;display:block;background:var(--ihms-canvas-bg,#0b2029);touch-action:none;direction:ltr}
.lpc-obj{cursor:grab}
.lpc-obj[data-ro="1"]{cursor:pointer}
.lpc-obj:hover [data-hit]{stroke:var(--ihms-teal,#14b8a6)}
.lpc-h{cursor:nwse-resize}
.lpc-r{cursor:grab}
.lpc-shape{transition:none}
`;

function clientToVB(svg, clientX, clientY) {
  const r = svg.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VB_W,
    y: ((clientY - r.top) / r.height) * VB_H,
  };
}
const snap = (v, on) => (on ? Math.round(v / GRID) * GRID : Math.round(v));

/* -------------------------- شکلِ هر نوعِ شیء -------------------------- */
function Shape({ o }) {
  const { w, h, type } = o;
  const teal = THEME.teal, ink = THEME.text3, steel = THEME.text2;
  switch (type) {
    case "crane":
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 2} fill={THEME.surface2} stroke={steel} strokeWidth="1.5" />
          <rect data-hit x={w / 2 - 16} y={h / 2 - 12} width="32" height="24" rx="4" fill={teal} stroke={THEME.tealDeep} strokeWidth="2" />
          <line x1={w / 2} y1={h / 2} x2={w} y2="0" stroke={steel} strokeWidth="4" strokeLinecap="round" />
          {[[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]].map(([cx, cy], i) => (
            <rect key={i} x={cx - 5} y={cy - 5} width="10" height="10" fill="none" stroke={steel} strokeWidth="1.5" />
          ))}
        </g>
      );
    case "load":
      return <rect data-hit x="0" y="0" width={w} height={h} rx="3" fill={teal} fillOpacity="0.9" stroke={THEME.tealDeep} strokeWidth="2" />;
    case "hook":
      return (
        <g stroke={ink} strokeWidth="2" fill="none">
          <rect data-hit x="1" y="1" width={w - 2} height={h - 6} rx="3" fill={THEME.surface2} />
          <path d={`M${w / 2} ${h - 6}q-5 6 0 6q5 -6 0 -6`} />
        </g>
      );
    case "sling":
      return (
        <g stroke={THEME.warn} strokeWidth="2.5">
          <line data-hit x1={w / 2} y1="0" x2="2" y2={h} />
          <line x1={w / 2} y1="0" x2={w - 2} y2={h} />
          <line x1={w / 2} y1="0" x2={w * 0.35} y2={h} opacity="0.7" />
          <line x1={w / 2} y1="0" x2={w * 0.65} y2={h} opacity="0.7" />
        </g>
      );
    case "shackle":
      return <circle data-hit cx={w / 2} cy={h / 2} r={w / 2 - 2} fill="none" stroke={ink} strokeWidth="3" />;
    case "spreader_beam":
      return <rect data-hit x="0" y="0" width={w} height={h} rx="3" fill={steel} stroke={ink} strokeWidth="1.5" />;
    case "structure":
      return <rect data-hit x="0" y="0" width={w} height={h} rx="4" fill={ink} fillOpacity="0.16" stroke={ink} strokeWidth="1.5" />;
    case "truck":
      return (
        <g>
          <rect data-hit x="0" y="0" width={w} height={h} rx="4" fill={ink} fillOpacity="0.14" stroke={ink} strokeWidth="1.5" />
          <rect x="0" y="0" width={Math.min(30, w * 0.22)} height={h} rx="4" fill={ink} fillOpacity="0.32" />
        </g>
      );
    case "power_line":
      return (
        <g>
          <rect x="0" y={-h * 2} width={w} height={h * 5} fill={THEME.warn} opacity="0.12" />
          <line data-hit x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={THEME.warn} strokeWidth="3" />
          <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={THEME.warn} strokeWidth="10" opacity="0" />
        </g>
      );
    case "worker":
      return <circle data-hit cx={w / 2} cy={h / 2} r={w / 2 - 1} fill={THEME.warn} stroke="#fff" strokeWidth="1.5" />;
    case "barrier":
      return (
        <g stroke={THEME.danger} strokeWidth="2">
          <rect data-hit x="0" y="0" width={w} height={h} fill="none" opacity="0" />
          {Array.from({ length: Math.max(2, Math.round(w / 26)) }).map((_, i) => (
            <path key={i} d={`M${8 + i * 26} ${h / 2 - 5}l8 5-8 5`} />
          ))}
        </g>
      );
    case "exclusion_zone":
      return <rect data-hit x="0" y="0" width={w} height={h} rx="6" fill={THEME.danger} fillOpacity="0.10" stroke={THEME.danger} strokeWidth="2" strokeDasharray="9 6" />;
    default:
      return <rect data-hit x="0" y="0" width={w} height={h} fill={teal} fillOpacity="0.5" stroke={THEME.tealDeep} strokeWidth="2" />;
  }
}

export default function LiftingPlanCanvas({ scene, onChange, selectedId, onSelect, readOnly = false }) {
  const { t } = useLanguage();
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [gridOn, setGridOn] = useState(scene?.canvas?.grid !== false);

  const objects = Array.isArray(scene?.objects) ? scene.objects : [];
  const sel = objects.find((o) => o.id === selectedId) || null;

  const patch = useCallback((id, next) => {
    onChange({
      ...(scene || EMPTY_SCENE),
      objects: objects.map((o) => (o.id === id ? { ...o, ...next } : o)),
    });
  }, [scene, objects, onChange]);

  const onPointerDownObj = (e, o, mode) => {
    if (readOnly) { onSelect(o.id); return; }
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onSelect(o.id);
    const p = clientToVB(svgRef.current, e.clientX, e.clientY);
    dragRef.current = {
      id: o.id, mode, startP: p,
      start: { x: o.x, y: o.y, w: o.w, h: o.h, rot: o.rot || 0 },
      cx: o.x + o.w / 2, cy: o.y + o.h / 2,
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const p = clientToVB(svgRef.current, e.clientX, e.clientY);
    const dx = p.x - d.startP.x, dy = p.y - d.startP.y;
    if (d.mode === "move") {
      patch(d.id, {
        x: Math.max(-40, Math.min(VB_W - 8, snap(d.start.x + dx, gridOn))),
        y: Math.max(-40, Math.min(VB_H - 8, snap(d.start.y + dy, gridOn))),
      });
    } else if (d.mode === "resize") {
      patch(d.id, {
        w: Math.max(MIN_W, snap(d.start.w + dx, gridOn)),
        h: Math.max(MIN_H, snap(d.start.h + dy, gridOn)),
      });
    } else if (d.mode === "rotate") {
      const ang = (Math.atan2(p.y - d.cy, p.x - d.cx) * 180) / Math.PI + 90;
      patch(d.id, { rot: Math.round(ang / (e.shiftKey ? 1 : 15)) * (e.shiftKey ? 1 : 15) });
    }
  };

  const endDrag = (e) => {
    if (dragRef.current) {
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
      dragRef.current = null;
    }
  };

  const removeSel = () => {
    if (!sel) return;
    onChange({ ...(scene || EMPTY_SCENE), objects: objects.filter((o) => o.id !== sel.id) });
    onSelect(null);
  };

  const toggleGrid = () => {
    const g = !gridOn;
    setGridOn(g);
    onChange({ ...(scene || EMPTY_SCENE), canvas: { ...(scene?.canvas || {}), grid: g } });
  };

  return (
    <div style={{ direction: "ltr" }}>
      <style>{CSS}</style>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", direction: "ltr" }}>
        <button type="button" onClick={toggleGrid} title={t("lpGridSnap")}
          style={btn(gridOn)}><Grid3x3 size={13} /> {t("lpGridSnap")}</button>
        <button type="button" onClick={() => sel && patch(sel.id, { rot: ((sel.rot || 0) + 15) % 360 })}
          disabled={!sel || readOnly} title={t("lpRotate")} style={btn(false, !sel || readOnly)}>
          <RotateCw size={13} /> {t("lpRotate")}
        </button>
        <button type="button" onClick={removeSel} disabled={!sel || readOnly} title={t("lpDeleteObject")}
          style={{ ...btn(false, !sel || readOnly), color: THEME.danger, borderColor: `${THEME.danger}66` }}>
          <Trash2 size={13} /> {t("lpDeleteObject")}
        </button>
        <span style={{ marginInlineStart: "auto", fontSize: 11, color: THEME.text3, alignSelf: "center", fontFamily: THEME.font }}>
          <Maximize2 size={11} style={{ verticalAlign: "-1px" }} /> {objects.length} {t("lpObjectsCount")}
        </span>
      </div>

      <div style={{
        width: "100%", aspectRatio: `${VB_W} / ${VB_H}`, border: `1px solid ${THEME.border}`,
        borderRadius: 12, overflow: "hidden", background: THEME.bg,
      }}>
        <svg ref={svgRef} className="lpc-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet"
          onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
          onPointerDown={() => { if (!readOnly) onSelect(null); }}>
          <defs>
            <pattern id="lpc-grid" width={GRID * 3} height={GRID * 3} patternUnits="userSpaceOnUse">
              <path d={`M${GRID * 3} 0H0V${GRID * 3}`} fill="none" stroke={THEME.border} strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>
          {gridOn && <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#lpc-grid)" />}

          {objects.map((o) => {
            const isSel = o.id === selectedId;
            const cx = o.w / 2, cy = o.h / 2;
            return (
              <g key={o.id} className={"lpc-obj"} data-ro={readOnly ? "1" : "0"}
                transform={`translate(${o.x} ${o.y}) rotate(${o.rot || 0} ${cx} ${cy})`}
                onPointerDown={(e) => onPointerDownObj(e, o, "move")}>
                <Shape o={o} />
                {isSel && (
                  <>
                    <rect x="-3" y="-3" width={o.w + 6} height={o.h + 6} fill="none"
                      stroke={THEME.teal} strokeWidth="1.5" strokeDasharray="5 4" />
                    {!readOnly && (
                      <>
                        <line x1={cx} y1="-3" x2={cx} y2="-20" stroke={THEME.teal} strokeWidth="1.5" />
                        <circle className="lpc-r" cx={cx} cy="-22" r="6" fill={THEME.teal}
                          onPointerDown={(e) => onPointerDownObj(e, o, "rotate")} />
                        <rect className="lpc-h" x={o.w - 4} y={o.h - 4} width="12" height="12" rx="2"
                          fill={THEME.teal} onPointerDown={(e) => onPointerDownObj(e, o, "resize")} />
                      </>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {sel && (
        <p style={{ margin: "8px 2px 0", fontSize: 11, color: THEME.text3, fontFamily: THEME.font, direction: "ltr" }}>
          {t("lpObj_" + sel.type)} — x:{Math.round(sel.x)} y:{Math.round(sel.y)} · {Math.round(sel.w)}×{Math.round(sel.h)} · {sel.rot || 0}°
        </p>
      )}
    </div>
  );
}

function btn(on, disabled) {
  return {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
    fontFamily: THEME.font, padding: "6px 11px", borderRadius: 8, cursor: disabled ? "default" : "pointer",
    border: `1px solid ${on ? THEME.teal : THEME.border}`,
    background: on ? THEME.teal : THEME.surface,
    color: on ? "#fff" : THEME.text2, opacity: disabled ? 0.5 : 1,
  };
}

// نگاشتِ نوع → کلیدِ i18n (برای پالت و Inspector در Workspace)
export const LIFTING_OBJECT_TYPE_KEYS = LIFTING_OBJECT_TYPES.reduce((m, ty) => {
  m[ty] = "lpObj_" + ty;
  return m;
}, {});
