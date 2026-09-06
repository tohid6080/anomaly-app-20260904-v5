import React from "react";
import { Clock, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const META = {
  pending: { labelKey: "syncBadgePending", color: "#b45309", bg: "#fef3c7", Icon: Clock, spin: false },
  syncing: { labelKey: "syncBadgeSyncing", color: "#1d4ed8", bg: "#dbeafe", Icon: RefreshCw, spin: true },
  synced: { labelKey: "syncBadgeSynced", color: "#166534", bg: "#dcfce7", Icon: Check, spin: false },
  failed: { labelKey: "syncBadgeFailed", color: "#c92a2a", bg: "#fdecec", Icon: AlertTriangle, spin: false },
  conflict: { labelKey: "syncBadgeConflict", color: "#c92a2a", bg: "#fdecec", Icon: AlertTriangle, spin: false },
};

export default function SyncStatusBadge({ status = "synced", onRetry }) {
  const { t } = useLanguage();
  const m = META[status] || META.synced;
  const label = t(m.labelKey);
  const { Icon } = m;
  return (
    <span
      onClick={status === "failed" || status === "conflict" ? onRetry : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600,
        color: m.color, background: m.bg, borderRadius: 999, padding: "2px 8px",
        cursor: onRetry && (status === "failed" || status === "conflict") ? "pointer" : "default",
      }}
      title={status === "failed" ? t("syncBadgeRetryHint") : label}
    >
      <Icon size={11} style={m.spin ? { animation: "ihms-spin 1s linear infinite" } : undefined} />
      {label}
      {m.spin && <style>{`@keyframes ihms-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>}
    </span>
  );
}
