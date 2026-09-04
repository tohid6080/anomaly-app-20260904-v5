import React, { useState, useEffect } from "react";
import { Briefcase, Plus, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadAllJobPositions, insertJobPosition, updateJobPosition } from "./jobPositionsApi.js";

// استاندارد سراسری ذخیره‌سازی: تغییر وضعیت فعال/غیرفعال و ترتیب فقط در
// این آرایه‌ی محلی (Draft) اعمال می‌شوند؛ هیچ Writeای تا کلیک روی «ثبت
// تغییرات» انجام نمی‌شود — کاربر می‌تواند چند بار جابه‌جا/تغییر کند و فقط
// آخرین وضعیت یک‌جا ذخیره شود.
function draftKey(list) {
  return JSON.stringify(list.map((p) => ({ id: p.id, isActive: p.isActive })));
}

export default function JobPositionManager({ onBack }) {
  const [positions, setPositions] = useState([]);
  const [draftPositions, setDraftPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [committing, setCommitting] = useState(false);

  const load = async () => {
    const rows = await loadAllJobPositions();
    setPositions(rows);
    setDraftPositions(rows);
  };

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    setError("");
    const result = await insertJobPosition(newTitle.trim());
    setAdding(false);
    if (result?.__error) { setError(result.message); return; }
    setNewTitle("");
    await load();
  };

  const toggleActiveDraft = (id) => {
    setDraftPositions((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  const startEdit = (pos) => { setEditingId(pos.id); setEditTitle(pos.title); };
  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    const result = await updateJobPosition(id, { title: editTitle.trim() });
    if (result?.__error) { alert(result.message); return; }
    setEditingId(null);
    await load();
  };

  const moveDraft = (index, dir) => {
    const other = index + dir;
    if (other < 0 || other >= draftPositions.length) return;
    setDraftPositions((prev) => {
      const next = [...prev];
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  };

  const isDirty = draftKey(draftPositions) !== draftKey(positions)
    || draftPositions.some((p, idx) => positions[idx]?.id !== p.id);

  const discardDraft = () => setDraftPositions(positions);

  const commitChanges = async () => {
    setCommitting(true);
    const updates = [];
    draftPositions.forEach((p, idx) => {
      const orig = positions.find((o) => o.id === p.id);
      const fields = {};
      if (orig && orig.isActive !== p.isActive) fields.isActive = p.isActive;
      if (positions[idx]?.id !== p.id) fields.orderIndex = idx;
      if (Object.keys(fields).length > 0) updates.push(updateJobPosition(p.id, fields));
    });
    await Promise.all(updates);
    setCommitting(false);
    await load();
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>در حال بارگذاری...</div>;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>← بازگشت به منو</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Briefcase size={20} color={THEME.teal} />
        <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>مدیریت عناوین شغلی</h2>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 18 }}>
        عناوین شغلی که هنگام ساخت حساب کارفرما/پیمانکار قابل انتخاب هستند. غیرفعال کردن یک عنوان، حساب‌های قبلی را تغییر نمی‌دهد؛ فقط از لیست انتخاب برای حساب‌های جدید حذف می‌شود.
      </p>

      <div style={styles.card}>
        <label style={styles.label}>افزودن عنوان شغلی جدید</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...styles.input, flex: 1 }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} dir="rtl" placeholder="مثال: HSE Manager" />
          <button type="button" style={{ ...styles.smallButton, background: THEME.teal }} onClick={handleAdd} disabled={adding}>
            <Plus size={14} />
          </button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {isDirty && (
        <div style={{ position: "sticky", top: 8, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "8px 14px", marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, color: "#92400e", fontWeight: 600 }}>تغییرات ترتیب/وضعیت هنوز ثبت نشده‌اند</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={discardDraft} disabled={committing}>انصراف</button>
            <button type="button" style={styles.smallButton} onClick={commitChanges} disabled={committing}>{committing ? "در حال ثبت..." : "ثبت تغییرات"}</button>
          </div>
        </div>
      )}

      {draftPositions.map((pos, idx) => (
        <div key={pos.id} style={{ ...styles.card, width: "auto", marginBottom: 8, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            {editingId === pos.id ? (
              <>
                <input style={{ ...styles.input, flex: 1 }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} dir="rtl" />
                <button type="button" onClick={() => saveEdit(pos.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Check size={16} color={THEME.teal} /></button>
                <button type="button" onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color={THEME.text3} /></button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button type="button" onClick={() => moveDraft(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, padding: 0 }}>
                    <ArrowUp size={13} color={THEME.text3} />
                  </button>
                  <button type="button" onClick={() => moveDraft(idx, 1)} disabled={idx === draftPositions.length - 1} style={{ background: "none", border: "none", cursor: idx === draftPositions.length - 1 ? "default" : "pointer", opacity: idx === draftPositions.length - 1 ? 0.3 : 1, padding: 0 }}>
                    <ArrowDown size={13} color={THEME.text3} />
                  </button>
                </div>
                <span style={{ fontSize: 13.5, color: pos.isActive ? THEME.text : THEME.text3, flex: 1, textDecoration: pos.isActive ? "none" : "line-through" }}>{pos.title}</span>
                <button type="button" onClick={() => startEdit(pos)} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={14} color={THEME.text3} /></button>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: THEME.text2, cursor: "pointer" }}>
                  <input type="checkbox" checked={pos.isActive} onChange={() => toggleActiveDraft(pos.id)} />
                  فعال
                </label>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
