import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2, Hand, Square, Circle, Hexagon, Crosshair, Plus,
  RotateCcw, RotateCw, Grid3x3, Magnet, ZoomIn, ZoomOut, Maximize2, Trash2, Copy,
} from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { EMPTY_SCENE } from "./liftingPlanApi.js";

/* ============================================================================ *
 * Lifting Plan Canvas — بومِ Mini-CAD، مختصات به «متر». مدلِ اشیا همان چیزی
 * است که موتورهای محاسبه/ایمنی مصرف می‌کنند (صاف، متری) — نه نسخه‌ی px/props.
 * قابلیت‌ها: رسمِ بار (مستطیل/دایره/آزاد)، Pick Point + CG، افزودنِ تجهیزات،
 * Move/Resize/Rotate/Copy/Delete، Zoom/Pan/Grid/Snap/Undo/Redo، و اسلینگِ
 * متصل به قلاب و Pick Pointها که Real-Time به‌روز می‌شود.
 * همه‌ی تغییرها فقط draft محلی؛ نوشتن در دیتابیس فقط با «ذخیره‌ی نقشه».
 * ============================================================================ */

const PPM = 8;          // px per metre at zoom 1
const GRID_M = 0.5;     // snap grid (m)

export const LIFTING_OBJECT_META = [
  { type: "crane", emoji: "🏗️", tool: "crane" },
  { type: "hook", emoji: "🪝", tool: "hook" },
  { type: "slingset", emoji: "🧵", tool: "slingset" },
  { type: "shackle", emoji: "🔗", tool: "shackle" },
  { type: "spreader", emoji: "➖", tool: "spreader" },
  { type: "truck", emoji: "🚛", tool: "truck" },
  { type: "structure", emoji: "🧱", tool: "structure" },
  { type: "worker", emoji: "👷", tool: "worker" },
  { type: "barrier", emoji: "🚧", tool: "barrier" },
  { type: "power_line", emoji: "⚡", tool: "power_line" },
  { type: "exclusion_zone", emoji: "⛔", tool: "exclusion_zone" },
  { type: "target", emoji: "⚑", tool: "target" },
];

let _seq = 0;
const nid = (t) => `${t}-${Date.now().toString(36)}-${(_seq += 1)}`;
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));

export function makeObject(type, at = {}) {
  const x = at.x ?? 6, y = at.y ?? 6;
  const B = { id: nid(type), type, x, y, rot: 0 };
  switch (type) {
    case "crane":
      return { ...B, model: "", weightKg: 50000, pads: 4, padArea: 0.5, craneModelId: "", chart: [], chartRef: "" };
    case "hook":
      return { ...B, weightKg: 200, wllKg: 20000, riggingH: 4 };
    case "slingset":
      return { ...B, count: 4, wllKg: 10000, weightKg: 120, len: 6 };
    case "shackle":
      return { ...B, count: 4, wllKg: 9500, weightKg: 120 };
    case "spreader":
      return { ...B, len: 4, wllKg: 16000, weightKg: 600, enabled: true };
    case "power_line":
      return { ...B, len: 30, kv: 132 };
    case "worker":
      return { ...B, role: "", personnelId: "" };
    case "truck":
      return { ...B, w: 12, h: 2.5, label: "" };
    case "structure":
      return { ...B, w: 4, h: 3, label: "" };
    case "barrier":
      return { ...B, w: 8, h: 1, label: "" };
    case "exclusion_zone":
      return { ...B, w: 10, h: 8, label: "" };
    case "target":
      return { ...B };
    case "load":
    default:
      return {
        ...B, type: "load", shape: "rect", w: 4, h: 2, weightKg: 5000, label: "",
        cg: { x: 0, y: 0 },
        picks: [{ x: -1.6, y: -0.7 }, { x: 1.6, y: -0.7 }, { x: 1.6, y: 0.7 }, { x: -1.6, y: 0.7 }],
      };
  }
}

/* -------- geometry -------- */
const rot2 = (px, py, deg) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [px * c - py * s, px * s + py * c];
};
const worldPicks = (L) =>
  (L?.picks || []).map((p) => { const r = rot2(p.x, p.y, L.rot || 0); return { x: L.x + r[0], y: L.y + r[1] }; });
const worldCG = (L) => { const c = L?.cg || { x: 0, y: 0 }; const r = rot2(c.x, c.y, L?.rot || 0); return { x: L.x + r[0], y: L.y + r[1] }; };

const CSS = `
.lpc-toolbar{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px}
.lpc-tb{width:32px;height:32px;border-radius:8px;border:1px solid var(--ihms-border,#1e3d4d);background:var(--ihms-surface,#0f2a3a);
  color:var(--ihms-text2,#9fb4c0);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.lpc-tb.on{background:var(--ihms-teal,#14b8a6);border-color:var(--ihms-teal,#14b8a6);color:#fff}
.lpc-tb:disabled{opacity:.4;cursor:default}
.lpc-tb .sep{width:1px}
.lpc-wrap{width:100%;height:clamp(360px,58vh,600px);border:1px solid var(--ihms-border,#1e3d4d);border-radius:12px;overflow:hidden;background:var(--ihms-bg,#0b1a24)}
.lpc-svg{width:100%;height:100%;display:block;touch-action:none;direction:ltr;cursor:crosshair}
.lpc-svg.pan{cursor:grab}.lpc-svg.panning{cursor:grabbing}.lpc-svg.sel{cursor:default}
`;

function screenToWorld(svg, cx, cy, zoom, pan) {
  const r = svg.getBoundingClientRect();
  return { x: (cx - r.left - pan.x) / (zoom * PPM), y: (cy - r.top - pan.y) / (zoom * PPM) };
}

export default function LiftingPlanCanvas({ scene, onChange, selectedId, onSelect, readOnly = false, simActive = false, simState = null }) {
  const locked = readOnly || simActive;
  const { t } = useLanguage();
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const histRef = useRef({ undo: [], redo: [] });
  const spaceRef = useRef(false);
  const [, force] = useState(0);
  const redraw = () => force((n) => n + 1);

  const [tool, setTool] = useState("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [grid, setGrid] = useState(scene?.canvas?.grid !== false);
  const [snap, setSnap] = useState(true);
  const [poly, setPoly] = useState(null); // draft polygon load

  const objs = Array.isArray(scene?.objects) ? scene.objects : [];
  const sel = objs.find((o) => o.id === selectedId) || null;
  const snapV = useCallback((v) => (snap ? Math.round(v / GRID_M) * GRID_M : Math.round(v * 100) / 100), [snap]);

  const commit = useCallback((nextObjs, pushHistory = true) => {
    if (pushHistory) { histRef.current.undo.push(clone(objs)); if (histRef.current.undo.length > 60) histRef.current.undo.shift(); histRef.current.redo = []; }
    onChange({ ...(scene || EMPTY_SCENE), objects: nextObjs });
  }, [objs, scene, onChange]);

  const patch = useCallback((id, next, push = false) => {
    commit(objs.map((o) => (o.id === id ? { ...o, ...next } : o)), push);
  }, [objs, commit]);

  const undo = useCallback(() => {
    const h = histRef.current;
    if (!h.undo.length) return;
    h.redo.push(clone(objs));
    onChange({ ...(scene || EMPTY_SCENE), objects: h.undo.pop() });
  }, [objs, scene, onChange]);
  const redo = useCallback(() => {
    const h = histRef.current;
    if (!h.redo.length) return;
    h.undo.push(clone(objs));
    onChange({ ...(scene || EMPTY_SCENE), objects: h.redo.pop() });
  }, [objs, scene, onChange]);

  const addAt = (type, at) => {
    const o = makeObject(type === "target" ? "target" : type, at);
    let next = objs;
    if (type === "target") next = objs.filter((x) => x.type !== "target");
    commit([...next, o]);
    onSelect(o.id);
    setTool("select");
  };

  const removeSel = useCallback(() => {
    if (!sel) return;
    commit(objs.filter((o) => o.id !== sel.id));
    onSelect(null);
  }, [sel, objs, commit, onSelect]);

  const copySel = () => {
    if (!sel) return;
    const c = { ...clone(sel), id: nid(sel.type), x: sel.x + 1.5, y: sel.y + 1.5 };
    commit([...objs, c]); onSelect(c.id);
  };

  const fitView = useCallback(() => {
    const wr = wrapRef.current; if (!wr) return;
    const W = wr.clientWidth, H = wr.clientHeight;
    if (!objs.length) { setZoom(1); setPan({ x: W / 2, y: H / 2 }); return; }
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    objs.forEach((o) => {
      const ext = o.w ? Math.max(o.w, o.h || 0) / 2 + 1 : o.r ? o.r + 1 : 2;
      minx = Math.min(minx, o.x - ext); maxx = Math.max(maxx, o.x + ext);
      miny = Math.min(miny, o.y - ext); maxy = Math.max(maxy, o.y + ext);
    });
    const z = Math.max(0.3, Math.min(4, Math.min(W / ((maxx - minx) * PPM), H / ((maxy - miny) * PPM)) * 0.9));
    setZoom(z);
    setPan({ x: W / 2 - ((minx + maxx) / 2) * PPM * z, y: H / 2 - ((miny + maxy) / 2) * PPM * z });
  }, [objs]);

  useEffect(() => { fitView(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const wr = wrapRef.current;
    if (!wr || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(wr);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const kd = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { spaceRef.current = true; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      if ((e.key === "Delete" || e.key === "Backspace") && sel && !readOnly) { e.preventDefault(); removeSel(); }
      if (e.key === "Escape") { setPoly(null); setTool("select"); }
      if (e.key === "v" || e.key === "V") setTool("select");
      if (e.key === "h" || e.key === "H") setTool("pan");
    };
    const ku = (e) => { if (e.code === "Space") spaceRef.current = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [undo, redo, removeSel, sel, readOnly]);

  /* ---------------- pointer ---------------- */
  const down = (e) => {
    if (locked) {
      if (readOnly && !simActive) {
        const id = e.target?.getAttribute?.("data-id") || e.target?.parentNode?.getAttribute?.("data-id");
        if (id) onSelect(id);
      }
      // اجازه‌ی Pan حتی در حالتِ شبیه‌سازی
      if (tool === "pan" || spaceRef.current || e.button === 1) {
        dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
        svgRef.current.classList.add("panning");
      }
      return;
    }
    svgRef.current.setPointerCapture?.(e.pointerId);
    const w = screenToWorld(svgRef.current, e.clientX, e.clientY, zoom, pan);
    const tgt = e.target;
    const hId = tgt?.getAttribute?.("data-id") || tgt?.parentNode?.getAttribute?.("data-id");
    const hHandle = tgt?.getAttribute?.("data-h");
    const hPick = tgt?.getAttribute?.("data-pick");

    if (tool === "pan" || spaceRef.current || e.button === 1) {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
      svgRef.current.classList.add("panning"); return;
    }
    if (tool === "draw-rect" || tool === "draw-circle") {
      dragRef.current = { mode: tool === "draw-rect" ? "new-rect" : "new-circle", start: { x: snapV(w.x), y: snapV(w.y) } };
      return;
    }
    if (tool === "draw-poly") {
      if (!poly) setPoly({ x: snapV(w.x), y: snapV(w.y), pts: [{ x: 0, y: 0 }] });
      else setPoly({ ...poly, pts: [...poly.pts, { x: snapV(w.x) - poly.x, y: snapV(w.y) - poly.y }] });
      return;
    }
    if (tool === "pick") {
      const L = sel?.type === "load" ? sel : objs.find((o) => o.type === "load");
      if (L) { const r = rot2(w.x - L.x, w.y - L.y, -(L.rot || 0)); patch(L.id, { picks: [...(L.picks || []), { x: +r[0].toFixed(2), y: +r[1].toFixed(2) }] }, true); }
      setTool("select"); return;
    }
    if (tool === "cg") {
      const L = sel?.type === "load" ? sel : objs.find((o) => o.type === "load");
      if (L) { const r = rot2(w.x - L.x, w.y - L.y, -(L.rot || 0)); patch(L.id, { cg: { x: +r[0].toFixed(2), y: +r[1].toFixed(2) } }, true); }
      setTool("select"); return;
    }
    if (tool !== "select") { addAt(tool, { x: snapV(w.x), y: snapV(w.y) }); return; }

    if (hHandle && sel) {
      histRef.current.undo.push(clone(objs)); histRef.current.redo = [];
      dragRef.current = { mode: hHandle, o: sel, start: w, ow: sel.w, oh: sel.h, orr: sel.r };
      return;
    }
    if (hPick) {
      const [lid, idx] = hPick.split(":");
      histRef.current.undo.push(clone(objs)); histRef.current.redo = [];
      dragRef.current = { mode: "pick", lid, idx: +idx };
      onSelect(lid); return;
    }
    if (hId) {
      const o = objs.find((x) => x.id === hId);
      onSelect(hId);
      histRef.current.undo.push(clone(objs)); histRef.current.redo = [];
      dragRef.current = { mode: "move", o, dx: w.x - o.x, dy: w.y - o.y };
      return;
    }
    onSelect(null);
  };

  const move = (e) => {
    const d = dragRef.current; if (!d) return;
    const w = screenToWorld(svgRef.current, e.clientX, e.clientY, zoom, pan);
    if (d.mode === "pan") { setPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) }); return; }
    if (d.mode === "move") { patch(d.o.id, { x: snapV(w.x - d.dx), y: snapV(w.y - d.dy) }); return; }
    if (d.mode === "pick") {
      const L = objs.find((o) => o.id === d.lid); if (!L) return;
      const r = rot2(w.x - L.x, w.y - L.y, -(L.rot || 0));
      const picks = (L.picks || []).slice(); picks[d.idx] = { x: snapV(r[0]), y: snapV(r[1]) };
      patch(L.id, { picks });
      return;
    }
    if (d.mode === "resize") {
      const o = d.o; const lr = rot2(w.x - o.x, w.y - o.y, -(o.rot || 0));
      if (o.shape === "circle") patch(o.id, { r: Math.max(0.3, Math.hypot(lr[0], lr[1])) });
      else if (o.type === "power_line" || o.type === "slingset" || o.type === "spreader") patch(o.id, { len: Math.max(0.5, Math.abs(lr[0]) * 2) });
      else patch(o.id, { w: Math.max(0.3, Math.abs(lr[0]) * 2), h: Math.max(0.3, Math.abs(lr[1]) * 2) });
      return;
    }
    if (d.mode === "rotate") {
      const o = d.o;
      let ang = Math.atan2(w.y - o.y, w.x - o.x) * 180 / Math.PI + 90;
      if (!e.shiftKey) ang = Math.round(ang / 15) * 15;
      patch(o.id, { rot: Math.round(ang) });
      return;
    }
  };
  const up = (e) => { try { svgRef.current.releasePointerCapture?.(e.pointerId); } catch { /* noop */ } svgRef.current.classList.remove("panning"); dragRef.current = null; };

  const wheel = (e) => {
    e.preventDefault();
    const r = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - pan.x) / (zoom * PPM), wy = (my - pan.y) / (zoom * PPM);
    const z2 = Math.max(0.25, Math.min(6, zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    setPan({ x: mx - wx * z2 * PPM, y: my - wy * z2 * PPM });
    setZoom(z2);
  };
  const dbl = () => { if (poly) finishPoly(); };

  const rubberEnd = (e) => {
    const d = dragRef.current;
    if (d && (d.mode === "new-rect" || d.mode === "new-circle")) {
      const w = screenToWorld(svgRef.current, e.clientX, e.clientY, zoom, pan);
      const cx = (d.start.x + snapV(w.x)) / 2, cy = (d.start.y + snapV(w.y)) / 2;
      const ww = Math.max(0.5, Math.abs(snapV(w.x) - d.start.x)), hh = Math.max(0.5, Math.abs(snapV(w.y) - d.start.y));
      const o = makeObject("load", { x: cx, y: cy });
      if (d.mode === "new-circle") { o.shape = "circle"; o.r = Math.max(0.5, Math.max(ww, hh) / 2); delete o.w; delete o.h; o.picks = [{ x: -o.r * 0.7, y: 0 }, { x: o.r * 0.7, y: 0 }]; }
      else { o.w = ww; o.h = hh; o.picks = [{ x: -ww / 2 * 0.8, y: -hh / 2 * 0.8 }, { x: ww / 2 * 0.8, y: -hh / 2 * 0.8 }, { x: ww / 2 * 0.8, y: hh / 2 * 0.8 }, { x: -ww / 2 * 0.8, y: hh / 2 * 0.8 }]; }
      commit([...objs, o]); onSelect(o.id); setTool("select");
    }
    up(e);
  };

  const finishPoly = () => {
    if (!poly) return;
    if (poly.pts.length >= 3) {
      const o = makeObject("load", { x: poly.x, y: poly.y });
      o.shape = "poly"; o.pts = poly.pts.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) }));
      delete o.w; delete o.h;
      o.picks = poly.pts.slice(0, 4).map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) }));
      commit([...objs, o]); onSelect(o.id);
    }
    setPoly(null); setTool("select");
  };

  /* ---------------- render ---------------- */
  const hookState = useMemo(() => {
    // static view: hook sits at its own object; no phase animation here
    const hk = objs.find((o) => o.type === "hook");
    return hk ? { x: hk.x, y: hk.y } : null;
  }, [objs]);

  const P = useMemo(() => `translate(${pan.x} ${pan.y}) scale(${zoom})`, [pan, zoom]);
  const m = (v) => v * PPM; // metre → local px (inside the scaled group)

  const TB = ({ id, on, disabled, title, children }) => (
    <button type="button" className={"lpc-tb" + (on ? " on" : "")} disabled={disabled}
      title={title} aria-label={title}
      onClick={() => {
        if (id === "grid") { setGrid((g) => { onChange({ ...(scene || EMPTY_SCENE), canvas: { ...(scene?.canvas || {}), grid: !g }, objects: objs }); return !g; }); return; }
        if (id === "snap") { setSnap((s) => !s); return; }
        if (id === "undo") return undo();
        if (id === "redo") return redo();
        if (id === "zin") { setZoom((z) => Math.min(6, z * 1.2)); return; }
        if (id === "zout") { setZoom((z) => Math.max(0.25, z * 0.83)); return; }
        if (id === "fit") return fitView();
        if (id === "del") return removeSel();
        if (id === "copy") return copySel();
        setTool(id);
      }}>{children}</button>
  );

  return (
    <div style={{ direction: "ltr" }}>
      <style>{CSS}</style>

      {!locked && (
        <div className="lpc-toolbar">
          <TB id="select" on={tool === "select"} title={t("lpToolSelect")}><MousePointer2 size={15} /></TB>
          <TB id="pan" on={tool === "pan"} title={t("lpToolPan")}><Hand size={15} /></TB>
          <span style={{ width: 6 }} />
          <TB id="draw-rect" on={tool === "draw-rect"} title={t("lpToolRect")}><Square size={15} /></TB>
          <TB id="draw-circle" on={tool === "draw-circle"} title={t("lpToolCircle")}><Circle size={15} /></TB>
          <TB id="draw-poly" on={tool === "draw-poly"} title={t("lpToolPoly")}><Hexagon size={15} /></TB>
          <TB id="pick" on={tool === "pick"} title={t("lpToolPick")}><Plus size={15} /></TB>
          <TB id="cg" on={tool === "cg"} title={t("lpToolCg")}><Crosshair size={15} /></TB>
          <span style={{ width: 6 }} />
          {LIFTING_OBJECT_META.map((o) => (
            <TB key={o.type} id={o.tool} on={tool === o.tool} title={t("lpObj_" + o.type)}>
              <span style={{ fontSize: 13 }}>{o.emoji}</span>
            </TB>
          ))}
          <span style={{ width: 6 }} />
          <TB id="grid" on={grid} title={t("lpGridSnap")}><Grid3x3 size={15} /></TB>
          <TB id="snap" on={snap} title="Snap"><Magnet size={15} /></TB>
          <TB id="undo" disabled={!histRef.current.undo.length} title={t("lpUndo")}><RotateCcw size={15} /></TB>
          <TB id="redo" disabled={!histRef.current.redo.length} title={t("lpRedo")}><RotateCw size={15} /></TB>
          <TB id="copy" disabled={!sel} title={t("lpDuplicate")}><Copy size={15} /></TB>
          <TB id="del" disabled={!sel} title={t("lpDeleteObject")}><Trash2 size={15} /></TB>
          <span style={{ flex: 1 }} />
          <TB id="zout" title="Zoom out"><ZoomOut size={15} /></TB>
          <TB id="zin" title="Zoom in"><ZoomIn size={15} /></TB>
          <TB id="fit" title={t("lpFitView")}><Maximize2 size={15} /></TB>
        </div>
      )}

      <div className="lpc-wrap" ref={wrapRef}>
        <svg ref={svgRef} className={"lpc-svg" + (tool === "pan" ? " pan" : tool === "select" ? " sel" : "")}
          onPointerDown={down} onPointerMove={move} onPointerUp={rubberEnd} onPointerCancel={up}
          onWheel={wheel} onDoubleClick={dbl}>
          {grid && <GridLayer pan={pan} zoom={zoom} wrapRef={wrapRef} />}
          <g transform={P}>
            {/* origin cross */}
            <line x1={-10000} y1={0} x2={10000} y2={0} stroke={THEME.border} strokeWidth={1 / zoom} />
            <line x1={0} y1={-10000} x2={0} y2={10000} stroke={THEME.border} strokeWidth={1 / zoom} />

            {(() => {
              // در حالتِ شبیه‌سازی: بار و قلاب روی موقعیتِ محاسبه‌شده‌ی مرحله می‌نشینند.
              const sim = simActive && simState ? simState : null;
              const L0 = objs.find((o) => o.type === "load");
              const dx = sim && L0 ? sim.x - sim.pick.x : 0;
              const dy = sim && L0 ? sim.y - sim.pick.y : 0;
              const hookPos = sim ? { x: sim.x, y: sim.y } : (objs.find((o) => o.type === "hook") || null);
              return (
                <>
                  {objs.map((o) => {
                    const off = sim && o.type === "load" ? { ox: o.x + dx, oy: o.y + dy } : (sim && o.type === "hook" ? { ox: sim.x, oy: sim.y } : null);
                    return <ObjView key={o.id} o={o} sel={o.id === selectedId} zoom={zoom} m={m} readOnly={locked} off={off} />;
                  })}

                  {/* rigging: hook → load pick points (real-time) */}
                  {(() => {
                    const L = L0;
                    if (!hookPos || !L) return null;
                    const Lm = sim ? { ...L, x: L.x + dx, y: L.y + dy } : L;
                    return worldPicks(Lm).map((p, i) => (
                      <line key={i} x1={m(hookPos.x)} y1={m(hookPos.y)} x2={m(p.x)} y2={m(p.y)} stroke={THEME.warn} strokeWidth={2 / zoom} />
                    ));
                  })()}

                  {/* load travel path pick → target */}
                  {(() => {
                    const L = L0;
                    const tg = objs.find((o) => o.type === "target");
                    if (!L || !tg) return null;
                    return <line x1={m(L.x)} y1={m(L.y)} x2={m(tg.x)} y2={m(tg.y)} stroke="#a78bfa" strokeWidth={2 / zoom} strokeDasharray={`${3 / zoom} ${5 / zoom}`} />;
                  })()}

                  {/* slew arc (شبیه‌سازی) */}
                  {sim && (() => {
                    const c = objs.find((o) => o.type === "crane");
                    if (!c) return null;
                    const r = Math.hypot(sim.x - c.x, sim.y - c.y);
                    return <circle cx={m(c.x)} cy={m(c.y)} r={m(r)} fill="none" stroke="#a78bfa" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} opacity="0.7" />;
                  })()}
                </>
              );
            })()}

            {/* polygon draft */}
            {poly && (
              <polyline points={poly.pts.map((p) => `${m(poly.x + p.x)},${m(poly.y + p.y)}`).join(" ")}
                fill="none" stroke={THEME.teal} strokeWidth={2 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
            )}

            {/* selection handles */}
            {sel && !locked && <Handles o={sel} zoom={zoom} m={m} />}
          </g>
        </svg>
      </div>

      <p style={{ margin: "6px 2px 0", fontSize: 11, color: THEME.text3, fontFamily: THEME.font, direction: "ltr" }}>
        {Math.round(zoom * 100)}% · {objs.length} {t("lpObjectsCount")}
        {tool === "draw-poly" && ` · ${t("lpPolyHint")}`}
        {sel && ` · ${t("lpObj_" + sel.type)} @ ${sel.x.toFixed(1)},${sel.y.toFixed(1)} m`}
      </p>
    </div>
  );
}

/* ---------------- sub views ---------------- */
function GridLayer({ pan, zoom, wrapRef }) {
  const W = wrapRef.current?.clientWidth || 900;
  const H = wrapRef.current?.clientHeight || 500;
  let step = PPM * zoom; while (step < 26) step *= 2;
  const ox = ((pan.x % step) + step) % step, oy = ((pan.y % step) + step) % step;
  const lines = [];
  for (let x = ox; x < W; x += step) lines.push(<line key={"x" + x} x1={x} y1={0} x2={x} y2={H} stroke={THEME.border} strokeWidth="1" opacity="0.4" />);
  for (let y = oy; y < H; y += step) lines.push(<line key={"y" + y} x1={0} y1={y} x2={W} y2={y} stroke={THEME.border} strokeWidth="1" opacity="0.4" />);
  return <g>{lines}</g>;
}

function ObjView({ o: o0, sel, zoom, m, readOnly, off }) {
  const o = off ? { ...o0, x: off.ox, y: off.oy } : o0;
  const sw = (n) => n / zoom;
  const teal = THEME.teal, ink = THEME.text3, steel = THEME.text2;
  const wrap = (children) => (
    <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)}) rotate(${o.rot || 0})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
      {children}
    </g>
  );
  const lbl = (txt, dy) => <text x="0" y={dy} fill={steel} fontSize={sw(11)} textAnchor="middle" fontFamily={THEME.font}>{txt}</text>;

  if (o.type === "crane") {
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)}) rotate(${o.rot || 0})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        <circle data-hit r={m(2.4)} fill={THEME.surface2} stroke={steel} strokeWidth={sw(1.5)} />
        <rect x={m(-1.4)} y={m(-1.1)} width={m(2.8)} height={m(2.2)} rx={m(0.3)} fill={teal} stroke={THEME.tealDeep} strokeWidth={sw(2)} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
          <rect key={i} x={m(sx * 2.2) - sw(4)} y={m(sy * 2.2) - sw(4)} width={sw(8)} height={sw(8)} fill="none" stroke={steel} strokeWidth={sw(1.5)} />
        ))}
        {lbl(o.model || "Crane", m(3.2))}
      </g>
    );
  }
  if (o.type === "load") {
    let shapeEl;
    if (o.shape === "circle") shapeEl = <circle data-hit r={m(o.r || 1.5)} fill={teal} fillOpacity="0.8" stroke={THEME.tealDeep} strokeWidth={sw(2)} />;
    else if (o.shape === "poly") shapeEl = <polygon data-hit points={(o.pts || []).map((p) => `${m(p.x)},${m(p.y)}`).join(" ")} fill={teal} fillOpacity="0.8" stroke={THEME.tealDeep} strokeWidth={sw(2)} />;
    else shapeEl = <rect data-hit x={m(-(o.w || 4) / 2)} y={m(-(o.h || 2) / 2)} width={m(o.w || 4)} height={m(o.h || 2)} rx={m(0.15)} fill={teal} fillOpacity="0.8" stroke={THEME.tealDeep} strokeWidth={sw(2)} />;
    const cg = o.cg || { x: 0, y: 0 };
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)}) rotate(${o.rot || 0})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        {shapeEl}
        <g stroke={THEME.danger} strokeWidth={sw(2)}>
          <line x1={m(cg.x) - sw(7)} y1={m(cg.y)} x2={m(cg.x) + sw(7)} y2={m(cg.y)} />
          <line x1={m(cg.x)} y1={m(cg.y) - sw(7)} x2={m(cg.x)} y2={m(cg.y) + sw(7)} />
          <circle cx={m(cg.x)} cy={m(cg.y)} r={sw(6)} fill="none" />
        </g>
        {(o.picks || []).map((p, i) => (
          <circle key={i} data-pick={`${o.id}:${i}`} cx={m(p.x)} cy={m(p.y)} r={sw(4.5)} fill={THEME.warn} stroke="#fff" strokeWidth={sw(1.5)} style={{ cursor: "pointer" }} />
        ))}
        {lbl(`${o.label || "بار"} · ${(o.weightKg || 0).toLocaleString("en-US")} kg`, m(-(o.h || (o.r || 1.5) * 2) / 2) - sw(6))}
      </g>
    );
  }
  if (o.type === "hook") {
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        <rect data-hit x={sw(-8)} y={sw(-7)} width={sw(16)} height={sw(14)} rx={sw(3)} fill={THEME.surface2} stroke={ink} strokeWidth={sw(2)} />
        <path d={`M0 ${sw(7)} q ${sw(-6)} ${sw(6)} 0 ${sw(6)} q ${sw(6)} ${sw(-6)} 0 ${sw(-6)}`} fill="none" stroke={ink} strokeWidth={sw(2)} />
        {sel && <circle r={sw(13)} fill="none" stroke={THEME.teal} strokeWidth={sw(1.5)} strokeDasharray={`${sw(4)} ${sw(3)}`} />}
      </g>
    );
  }
  if (o.type === "power_line") {
    const end = rot2(o.len || 30, 0, o.rot || 0);
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        <line data-hit x1="0" y1="0" x2={m(end[0])} y2={m(end[1])} stroke={THEME.warn} strokeWidth={sw(3)} />
        <circle r={sw(5)} fill={THEME.warn} />
        <text x={m(end[0] / 2)} y={m(end[1] / 2) - sw(8)} fill={THEME.warn} fontSize={sw(10)} textAnchor="middle" fontFamily={THEME.font}>{(o.kv || 132) + "kV"}</text>
      </g>
    );
  }
  if (o.type === "worker") {
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        <circle data-hit r={sw(7)} fill={THEME.warn} stroke="#fff" strokeWidth={sw(1.5)} />
        {sel && <circle r={sw(11)} fill="none" stroke={THEME.teal} strokeWidth={sw(1.5)} strokeDasharray={`${sw(4)} ${sw(3)}`} />}
        {o.role ? <text y={sw(20)} fill={THEME.warn} fontSize={sw(9.5)} textAnchor="middle" fontFamily={THEME.font}>{o.role}</text> : null}
      </g>
    );
  }
  if (o.type === "target") {
    return (
      <g data-id={o.id} transform={`translate(${m(o.x)} ${m(o.y)})`} style={{ cursor: readOnly ? "pointer" : "move" }}>
        <path data-hit d={`M0 ${sw(10)} V ${sw(-14)} h ${sw(12)} l ${sw(-4)} ${sw(5)} l ${sw(4)} ${sw(5)} h ${sw(-12)}`} fill="#a78bfa" stroke="#a78bfa" />
      </g>
    );
  }
  // rect-like: structure / truck / barrier / exclusion_zone
  const dashed = o.type === "exclusion_zone";
  const col = o.type === "exclusion_zone" ? THEME.danger : ink;
  return wrap(
    <>
      <rect data-hit x={m(-(o.w || 4) / 2)} y={m(-(o.h || 2) / 2)} width={m(o.w || 4)} height={m(o.h || 2)} rx={m(0.2)}
        fill={col} fillOpacity={dashed ? "0.09" : "0.14"} stroke={col} strokeWidth={sw(dashed ? 2 : 1.6)}
        strokeDasharray={dashed ? `${sw(9)} ${sw(6)}` : ""} />
      {o.label ? lbl(o.label, 0) : null}
    </>
  );
}

function Handles({ o, zoom, m }) {
  const sw = (n) => n / zoom;
  if (["hook", "worker", "target", "slingset", "shackle"].includes(o.type)) {
    return <circle cx={m(o.x)} cy={m(o.y)} r={sw(14)} fill="none" stroke={THEME.teal} strokeWidth={sw(1.5)} strokeDasharray={`${sw(5)} ${sw(4)}`} />;
  }
  const w = o.shape === "circle" ? (o.r || 1.5) * 2 : (o.type === "power_line" || o.type === "spreader") ? (o.len || 4) : (o.w || 4);
  const h = o.shape === "circle" ? (o.r || 1.5) * 2 : (o.h || 2);
  return (
    <g transform={`translate(${m(o.x)} ${m(o.y)}) rotate(${o.rot || 0})`}>
      <rect x={m(-w / 2) - sw(3)} y={m(-h / 2) - sw(3)} width={m(w) + sw(6)} height={m(h) + sw(6)} fill="none" stroke={THEME.teal} strokeWidth={sw(1.5)} strokeDasharray={`${sw(5)} ${sw(4)}`} />
      {o.type !== "crane" && (
        <>
          <rect data-h="resize" x={m(w / 2) - sw(4)} y={m(h / 2) - sw(4)} width={sw(12)} height={sw(12)} rx={sw(2)} fill={THEME.teal} style={{ cursor: "nwse-resize" }} />
          <line x1="0" y1={m(-h / 2) - sw(3)} x2="0" y2={m(-h / 2) - sw(20)} stroke={THEME.teal} strokeWidth={sw(1.5)} />
          <circle data-h="rotate" cx="0" cy={m(-h / 2) - sw(22)} r={sw(6)} fill={THEME.teal} style={{ cursor: "grab" }} />
        </>
      )}
    </g>
  );
}
