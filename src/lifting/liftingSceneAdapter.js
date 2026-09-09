/* ============================================================================ *
 * Scene Adapter — مدلِ بومِ فعلی (scene.objects: مختصات به پیکسلِ viewBox،
 * فیلدها زیرِ props) را به مدلِ صافِ متری‌ای که liftingCalcEngine /
 * liftingSafetyEngine انتظار دارند تبدیل می‌کند. توابعِ خالص، بدونِ React.
 *
 * چرا جدا: بومِ نسخه‌ی CAD (فاز بعد) مستقیماً همین مدلِ متری را می‌سازد و
 * این آداپتور کنار گذاشته می‌شود؛ فعلاً پلی است تا موتورها روی همین بوم
 * ساده هم عدد بدهند.
 * ============================================================================ */

export function sceneToEngineObjects(scene, opts = {}) {
  const mPerPx = scene?.canvas?.scale_m_per_px || 0.1;
  const craneModels = Array.isArray(opts.craneModels) ? opts.craneModels : [];
  const objs = Array.isArray(scene?.objects) ? scene.objects : [];

  return objs.map((o) => {
    const p = o.props || {};
    const wm = (o.w || 0) * mPerPx;
    const hm = (o.h || 0) * mPerPx;
    const base = {
      id: o.id, type: o.type, rot: o.rot || 0,
      x: (o.x || 0) * mPerPx, y: (o.y || 0) * mPerPx,
      w: wm, h: hm,
    };

    switch (o.type) {
      case "load":
        return {
          ...base,
          shape: "rect",
          label: p.label || "",
          weightKg: +p.weightKg || 0,
          cg: { x: 0, y: 0 },
          // چهار نقطه‌ی Pick در گوشه‌های بار (۸۰٪ ابعاد) تا زاویه‌ی اسلینگ واقعی شود
          picks: [
            { x: -wm / 2 * 0.8, y: -hm / 2 * 0.8 },
            { x: wm / 2 * 0.8, y: -hm / 2 * 0.8 },
            { x: wm / 2 * 0.8, y: hm / 2 * 0.8 },
            { x: -wm / 2 * 0.8, y: hm / 2 * 0.8 },
          ],
        };
      case "crane": {
        const model = craneModels.find((m) => m.id === p.craneModelId) || null;
        const chart = model && Array.isArray(model.loadChart) && model.loadChart.length
          ? model.loadChart
          : Array.isArray(p.chart) ? p.chart : [];
        return {
          ...base,
          model: p.model || model?.model || "",
          weightKg: +p.weightKg || 0,
          pads: +p.pads || 4,
          padArea: +p.padArea || 0.5,
          chart,
          chartRef: p.chartRef || model?.chartSource || "",
        };
      }
      case "hook":
        return { ...base, weightKg: +p.weightKg || 0, wllKg: +p.wllKg || 0, riggingH: +p.riggingH || 4 };
      case "sling":
        return { ...base, type: "slingset", count: +p.count || 4, wllKg: +p.wllKg || 0, weightKg: +p.weightKg || 0, len: +p.lengthM || 6 };
      case "shackle":
        return { ...base, count: +p.count || 4, wllKg: +p.wllKg || 0, weightKg: +p.weightKg || 0 };
      case "spreader_beam":
        return { ...base, type: "spreader", enabled: true, len: +p.lengthM || 4, wllKg: +p.wllKg || 0, weightKg: +p.weightKg || 0 };
      case "power_line":
        return { ...base, kv: +p.voltageKv || 132, len: wm || 40 };
      case "worker":
        return { ...base, role: p.role || "" };
      case "structure":
      case "truck":
      case "barrier":
      case "exclusion_zone":
        return { ...base, label: p.label || "" };
      default:
        return { ...base, label: p.label || "" };
    }
  });
}
