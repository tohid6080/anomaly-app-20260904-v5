import React, { useState, useEffect, useRef } from "react";
import { List, LayoutGrid, ArrowUpDown, Search, Bookmark, Plus, Trash2 } from "lucide-react";
import { styles, THEME, getCurrentCompanyId } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const VIEW_MODE_KEY = "ihms_view_mode";
const VIRTUALIZE_THRESHOLD = 80; // زیرِ این تعداد، مزیتِ مجازی‌سازی ارزشِ پیچیدگی‌اش را ندارد
const VIRTUAL_ROW_H = 40; // تقریبِ ارتفاعِ هر ردیف به پیکسل (padding: 8px + فونتِ 12.5)

/**
 * Shared list/grid renderer used across every module (Personnel, Anomaly,
 * Machinery, Scaffold, BowTie, ...) so the whole app shares one visual
 * language instead of each module inventing its own list UI.
 *
 * This component owns: view-mode toggle (persisted globally in
 * localStorage — a real browser app, not a Claude.ai artifact, so this is
 * the correct, standard way to remember a UI preference), search input,
 * sort dropdown, bulk-select + bulk action bar, row numbering, and the
 * actual List/Grid rendering shell.
 *
 * Each module supplies its OWN field definitions and business logic —
 * this component never knows what "status" or "approve" means for any
 * given module. That keeps every module's real logic exactly where it
 * already lives, instead of centralizing business rules into a shared
 * component where they don't belong.
 *
 * Props:
 *   items            — already filtered+sorted array from the parent
 *   getId(item)       — unique id extractor
 *   columns           — [{ key, label, render(item), width? }] for List view
 *   renderCard(item, {selected, onToggleSelect}) — Grid view card renderer
 *   renderRowActions(item) — action buttons, List view (row-end) + Grid (card footer)
 *   expandedId         — id (matched against getId(item)) of the row whose
 *                        detail/action panel is currently open, or null
 *   renderExpanded(item) — detail panel content; rendered inline *directly
 *                        under the matching row* (List: a full-width row right
 *                        after it; Grid: a full-width block right after the
 *                        card) instead of after the whole list, so the panel
 *                        always stays next to the record it belongs to
 *   searchQuery / onSearchChange / searchPlaceholder
 *   sortOptions       — [{ value, label }] (omit to hide the sort control)
 *   sortValue / onSortChange
 *   filterSlot        — arbitrary JSX the parent wants next to search/sort
 *   bulkActions       — [{ label, onClick(selectedIds), danger? }] (omit to hide bulk select)
 *   emptyMessage
 *   filterState        — plain serializable object of the parent's current
 *                        search/sort/filter values (parent decides what's
 *                        included). Together with onApplyFilterState and
 *                        savedViewsKey, enables the "Saved Views" picker —
 *                        a named snapshot the user can restore later. Any
 *                        one of the three omitted hides the feature.
 *   onApplyFilterState(state) — parent applies a restored snapshot back onto
 *                        its own search/sort/filter useState setters
 *   savedViewsKey      — stable key (module + optionally user) views are
 *                        stored under in localStorage; must be unique per module/user
 *   virtualize         — opt-in (default false): for List view only, once
 *                        `items.length` passes VIRTUALIZE_THRESHOLD, render
 *                        only the rows near the visible scroll area instead
 *                        of the whole table, so very large lists (hundreds+
 *                        of rows) stay smooth to scroll. Falls back to the
 *                        normal full render whenever a row is expanded
 *                        (renderExpanded), since that needs variable row
 *                        height. Off by default — every existing call site
 *                        is unaffected unless it opts in.
 */
export default function DataView({
  items,
  getId,
  columns,
  renderCard,
  renderRowActions,
  expandedId = null,
  renderExpanded,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  sortOptions,
  sortValue,
  onSortChange,
  filterSlot,
  bulkActions,
  emptyMessage,
  filterState,
  onApplyFilterState,
  savedViewsKey,
  virtualize = false,
}) {
  const { t, dir } = useLanguage();
  const finalSearchPlaceholder = searchPlaceholder ?? t("dvSearchDefault");
  const finalEmptyMessage = emptyMessage ?? t("dvNoItemsFoundDefault");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) || "list";
    } catch {
      return "list";
    }
  });
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* بی‌اهمیت اگر ذخیره نشد */ }
  }, [viewMode]);

  // نماهای فیلترشدهٔ ذخیره‌شونده — یک اسنپ‌شاتِ نام‌گذاری‌شده از
  // searchQuery/sortValue/فیلترهای خودِ ماژول که بعداً با یک کلیک بازیابی
  // می‌شود. کاملاً محلی (localStorage)، هیچ تماسِ بک‌اندی ندارد.
  const savedViewsEnabled = !!savedViewsKey && !!onApplyFilterState;
  // به ازای هر شرکت جدا ذخیره می‌شود — وگرنه روی مرورگرِ مشترک، ویوهایِ
  // ذخیره‌شده‌ی یک شرکت (که می‌توانند مقادیرِ فیلترِ اختصاصیِ آن شرکت را
  // در خود داشته باشند) برایِ کاربرِ شرکتِ دیگری هم قابل‌مشاهده می‌شد.
  const savedViewsStorageKey = `ihms_saved_views_${savedViewsKey}_${getCurrentCompanyId() || "none"}`;
  const [savedViews, setSavedViews] = useState([]);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [namingView, setNamingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const viewsWrapRef = useRef(null);

  useEffect(() => {
    if (!savedViewsEnabled) return;
    try {
      const raw = localStorage.getItem(savedViewsStorageKey);
      setSavedViews(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedViews([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedViewsStorageKey, savedViewsEnabled]);

  useEffect(() => {
    if (!viewsOpen) return;
    const onDocPointer = (e) => {
      if (viewsWrapRef.current && !viewsWrapRef.current.contains(e.target)) { setViewsOpen(false); setNamingView(false); }
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
    };
  }, [viewsOpen]);

  const persistViews = (next) => {
    setSavedViews(next);
    try { localStorage.setItem(savedViewsStorageKey, JSON.stringify(next)); } catch { /* بی‌اهمیت */ }
  };
  const handleSaveView = () => {
    const name = newViewName.trim();
    if (!name) return;
    persistViews([...savedViews, { id: `v${Date.now()}`, name, state: filterState, createdAt: new Date().toISOString() }]);
    setNewViewName("");
    setNamingView(false);
  };
  const handleApplyView = (view) => {
    onApplyFilterState(view.state || {});
    setViewsOpen(false);
  };
  const handleDeleteView = (id, e) => {
    e.stopPropagation();
    persistViews(savedViews.filter((v) => v.id !== id));
  };

  // با عوض‌شدن لیست (فیلتر/جستجوی جدید)، انتخاب‌های قبلی که دیگر توی نتیجه نیستند پاک شوند
  useEffect(() => {
    const idSet = new Set(items.map(getId));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => idSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map(getId))));
  };
  const clearSelection = () => setSelected(new Set());

  const hasBulk = !!bulkActions && bulkActions.length > 0;

  return (
    <div>
      {/* نوار ابزار: جستجو، فیلتر، مرتب‌سازی، تاگل نما */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {onSearchChange && (
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <Search size={14} color={THEME.text3} style={{ position: "absolute", insetInlineStart: 10, top: 11 }} />
            <input
              style={{ ...styles.input, paddingInlineStart: 30 }}
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={finalSearchPlaceholder}
              dir={dir}
            />
          </div>
        )}
        {filterSlot}
        {sortOptions && sortOptions.length > 0 && (
          <div style={{ position: "relative" }}>
            <select
              style={{ ...styles.filterSelect, paddingInlineStart: 26 }}
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              dir={dir}
            >
              {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ArrowUpDown size={13} color={THEME.text3} style={{ position: "absolute", insetInlineStart: 8, top: 10, pointerEvents: "none" }} />
          </div>
        )}
        {savedViewsEnabled && (
          <div ref={viewsWrapRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setViewsOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: THEME.surface, border: `1.5px solid ${THEME.border}`,
                borderRadius: 9, padding: "0 12px", height: 36, cursor: "pointer", color: THEME.text2, fontSize: 12.5, fontWeight: 600, fontFamily: THEME.font,
              }}
            >
              <Bookmark size={14} color={THEME.text3} />
              {t("dvSavedViews")}
              {savedViews.length > 0 && (
                <span style={{ background: THEME.tealSoft, color: THEME.tealDeep, borderRadius: 999, padding: "1px 6px", fontSize: 10.5, fontWeight: 700 }}>{savedViews.length}</span>
              )}
            </button>

            {viewsOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0, minWidth: 250, maxWidth: 300,
                  background: "linear-gradient(155deg, rgba(255,255,255,.035), rgba(255,255,255,0) 45%), rgba(14,38,52,0.9)",
                  backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)",
                  border: `1px solid ${THEME.borderStrong}`, borderRadius: 10,
                  boxShadow: "0 16px 36px -12px rgba(0,0,0,0.5)", zIndex: 30, padding: 10,
                }}
              >
                {savedViews.length === 0 && !namingView && (
                  <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: "6px 0" }}>{t("dvSavedViewsEmpty")}</p>
                )}
                {savedViews.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: 220, overflowY: "auto" }}>
                    {savedViews.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => handleApplyView(v)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                          background: THEME.bg, borderRadius: 8, padding: "7px 9px", cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 12, color: THEME.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                        <Trash2
                          size={13} color={THEME.text3} style={{ flexShrink: 0, cursor: "pointer" }}
                          title={t("dvDeleteViewTitle")}
                          onClick={(e) => handleDeleteView(v.id, e)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {namingView ? (
                  <div>
                    <input
                      autoFocus
                      style={{ ...styles.input, fontSize: 12, marginBottom: 6 }}
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveView(); if (e.key === "Escape") setNamingView(false); }}
                      placeholder={t("dvViewNamePlaceholder")}
                      dir={dir}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={handleSaveView} disabled={!newViewName.trim()} style={{ ...styles.smallButton, flex: 1, opacity: newViewName.trim() ? 1 : 0.5 }}>{t("dvSaveViewConfirm")}</button>
                      <button type="button" onClick={() => { setNamingView(false); setNewViewName(""); }} style={{ ...styles.smallButton, flex: 1, background: THEME.text3 }}>{t("dvSaveViewCancel")}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNamingView(true)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                      background: "transparent", border: `1px dashed ${THEME.border}`, borderRadius: 8, padding: "7px 0",
                      color: THEME.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font,
                    }}
                  >
                    <Plus size={13} /> {t("dvSaveCurrentView")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", background: THEME.surface, border: `1.5px solid ${THEME.border}`, borderRadius: 9, overflow: "hidden" }}>
          <ViewToggleButton active={viewMode === "list"} onClick={() => setViewMode("list")} icon={List} title={t("dvListView")} />
          <ViewToggleButton active={viewMode === "grid"} onClick={() => setViewMode("grid")} icon={LayoutGrid} title={t("dvGridView")} />
        </div>
      </div>

      {/* نوار عملیات گروهی */}
      {hasBulk && selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.tealSoft, border: `1px solid ${THEME.teal}`, borderRadius: 9, padding: "8px 12px", marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: THEME.tealDeep }}>{t("dvItemsSelected", { count: selected.size })}</span>
          {bulkActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => a.onClick([...selected])}
              style={{ ...styles.smallButton, background: a.danger ? THEME.danger : THEME.teal }}
            >
              {a.label}
            </button>
          ))}
          <button type="button" onClick={clearSelection} style={{ ...styles.smallButton, background: THEME.text3, marginInlineStart: "auto" }}>
            {t("dvCancelSelection")}
          </button>
        </div>
      )}

      {items.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: "24px 0" }}>{finalEmptyMessage}</p>}

      {items.length > 0 && viewMode === "list" && (
        virtualize && items.length > VIRTUALIZE_THRESHOLD && expandedId == null ? (
          <VirtualizedListTable
            items={items}
            getId={getId}
            columns={columns}
            renderRowActions={renderRowActions}
            hasBulk={hasBulk}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
          />
        ) : (
          <ListTable
            items={items}
            getId={getId}
            columns={columns}
            renderRowActions={renderRowActions}
            expandedId={expandedId}
            renderExpanded={renderExpanded}
            hasBulk={hasBulk}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
          />
        )
      )}

      {items.length > 0 && viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {items.map((item) => {
            const id = getId(item);
            const isExpanded = renderExpanded && expandedId != null && id === expandedId;
            return (
              <React.Fragment key={id}>
                <div style={{ position: "relative" }}>
                  {hasBulk && (
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleSelect(id)}
                      style={{ position: "absolute", top: 10, insetInlineStart: 10, zIndex: 2, width: 16, height: 16 }}
                    />
                  )}
                  {renderCard(item, { selected: selected.has(id) })}
                </div>
                {isExpanded && (
                  // درست زیر همان کارت انتخاب‌شده، تمام‌عرض — نه انتهای کل لیست
                  <div style={{ gridColumn: "1 / -1" }}>{renderExpanded(item)}</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ViewToggleButton({ active, onClick, icon: Icon, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
        background: active ? THEME.teal : "#fff", border: "none", cursor: "pointer",
      }}
    >
      <Icon size={15} color={active ? "#fff" : THEME.text3} />
    </button>
  );
}

function ListTable({ items, getId, columns, renderRowActions, expandedId, renderExpanded, hasBulk, selected, toggleSelect, toggleSelectAll }) {
  // تعداد ستون‌های واقعی جدول — برای colSpan ردیفِ جزئیاتِ تمام‌عرض
  const totalCols = (hasBulk ? 1 : 0) + 1 /* # */ + columns.length + (renderRowActions ? 1 : 0);
  return (
    <div style={{
      background: "linear-gradient(155deg, rgba(255,255,255,.03), rgba(255,255,255,0) 40%), rgba(14,38,52,0.74)",
      backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)",
      border: `1px solid ${THEME.borderStrong}`, borderRadius: 10, overflow: "hidden",
    }}>
      {/* دسکتاپ: جدول واقعی. موبایل: همون ساختار با اسکرول افقی برای اطلاعات کم‌اهمیت */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
          <thead>
            <tr style={{ background: THEME.bg, borderBottom: `1px solid ${THEME.border}` }}>
              {hasBulk && (
                <th style={{ width: 34, padding: "9px 8px" }}>
                  <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleSelectAll} />
                </th>
              )}
              <th style={{ width: 40, padding: "9px 8px", textAlign: "center", color: THEME.text3, fontWeight: 600 }}>#</th>
              {columns.map((col) => (
                <th key={col.key} style={{ padding: "9px 10px", textAlign: "start", color: THEME.text2, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {col.label}
                </th>
              ))}
              {renderRowActions && <th style={{ padding: "9px 10px" }} />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const id = getId(item);
              const isExpanded = renderExpanded && expandedId != null && id === expandedId;
              return (
                <React.Fragment key={id}>
                  <tr style={{ borderBottom: isExpanded ? "none" : `1px solid ${THEME.border}` }}>
                    {hasBulk && (
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} />
                      </td>
                    )}
                    <td style={{ padding: "8px", textAlign: "center", color: THEME.text3 }}>{idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: "8px 10px", color: THEME.text, verticalAlign: "middle" }}>
                        {col.render(item)}
                      </td>
                    ))}
                    {renderRowActions && (
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {renderRowActions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    // پنل جزئیات/عملیات دقیقاً زیر همان ردیف، تمام‌عرض جدول
                    <tr style={{ borderBottom: `1px solid ${THEME.border}`, background: THEME.bg }}>
                      <td colSpan={totalCols} style={{ padding: 0 }}>
                        <div style={{ padding: 12 }}>{renderExpanded(item)}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// نسخه‌ی مجازی‌سازی‌شده‌ی ListTable — فقط ردیف‌های نزدیکِ ناحیه‌ی دیدِ
// اسکرول رندر می‌شوند (به‌علاوه‌ی چند ردیفِ overscan) تا فهرست‌های خیلی
// بزرگ (صدها ردیف) نرم اسکرول شوند. عمداً از ListTable جدا نگه داشته شده
// (کمی تکرارِ کد، اما بدون هیچ ریسکی برای فراخوانی‌های موجودِ ListTable که
// این ویژگی را فعال نکرده‌اند) و پشتیبانی از renderExpanded ندارد — چون
// ارتفاعِ متغیرِ پنلِ جزئیات با محاسبه‌ی ارتفاعِ ثابتِ ردیف در تضاد است؛
// DataView در چنین حالتی خودش به ListTable معمولی برمی‌گردد.
function VirtualizedListTable({ items, getId, columns, renderRowActions, hasBulk, selected, toggleSelect, toggleSelectAll }) {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(560);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const OVERSCAN = 8;
  const startIdx = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_H) - OVERSCAN);
  const endIdx = Math.min(items.length, Math.ceil((scrollTop + viewportH) / VIRTUAL_ROW_H) + OVERSCAN);
  const visible = items.slice(startIdx, endIdx);
  const topPad = startIdx * VIRTUAL_ROW_H;
  const bottomPad = (items.length - endIdx) * VIRTUAL_ROW_H;

  return (
    <div style={{
      background: "linear-gradient(155deg, rgba(255,255,255,.03), rgba(255,255,255,0) 40%), rgba(14,38,52,0.74)",
      backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)",
      border: `1px solid ${THEME.borderStrong}`, borderRadius: 10, overflow: "hidden",
    }}>
      <div ref={scrollRef} style={{ overflow: "auto", maxHeight: 560 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
          <thead>
            <tr style={{ background: THEME.bg, borderBottom: `1px solid ${THEME.border}`, position: "sticky", top: 0, zIndex: 1 }}>
              {hasBulk && (
                <th style={{ width: 34, padding: "9px 8px", background: THEME.bg }}>
                  <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleSelectAll} />
                </th>
              )}
              <th style={{ width: 40, padding: "9px 8px", textAlign: "center", color: THEME.text3, fontWeight: 600, background: THEME.bg }}>#</th>
              {columns.map((col) => (
                <th key={col.key} style={{ padding: "9px 10px", textAlign: "start", color: THEME.text2, fontWeight: 600, whiteSpace: "nowrap", background: THEME.bg }}>
                  {col.label}
                </th>
              ))}
              {renderRowActions && <th style={{ padding: "9px 10px", background: THEME.bg }} />}
            </tr>
          </thead>
          <tbody>
            {topPad > 0 && <tr aria-hidden style={{ height: topPad }}><td colSpan={(hasBulk ? 1 : 0) + 1 + columns.length + (renderRowActions ? 1 : 0)} style={{ padding: 0, border: "none" }} /></tr>}
            {visible.map((item, i) => {
              const id = getId(item);
              return (
                <tr key={id} style={{ borderBottom: `1px solid ${THEME.border}`, height: VIRTUAL_ROW_H }}>
                  {hasBulk && (
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} />
                    </td>
                  )}
                  <td style={{ padding: "8px", textAlign: "center", color: THEME.text3 }}>{startIdx + i + 1}</td>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: "8px 10px", color: THEME.text, verticalAlign: "middle" }}>
                      {col.render(item)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {renderRowActions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {bottomPad > 0 && <tr aria-hidden style={{ height: bottomPad }}><td colSpan={(hasBulk ? 1 : 0) + 1 + columns.length + (renderRowActions ? 1 : 0)} style={{ padding: 0, border: "none" }} /></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// نشان وضعیت — برای هماهنگی رنگ‌بندی در هر دو نما، در همه‌ی ماژول‌ها یکسان استفاده شود
export function StatusPill({ label, color, bg }) {
  return (
    <span style={{ ...styles.badge, color, background: bg, whiteSpace: "nowrap" }}>{label}</span>
  );
}
