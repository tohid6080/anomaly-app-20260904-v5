import { sb, sbOk, getCurrentCompanyId, uid } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

export const ZONE_TYPES = [
  { value: "hazard", labelKey: "zoneTypeHazard" },
  { value: "permit", labelKey: "zoneTypePermit" },
  { value: "scaffold", labelKey: "zoneTypeScaffold" },
  { value: "muster_point", labelKey: "zoneTypeMusterPoint" },
  { value: "general", labelKey: "zoneTypeGeneral" },
];

function mapFromRow(r) {
  return {
    id: r.id,
    name: r.name || "",
    imageUrl: r.image_url || "",
    isActive: !!r.is_active,
    createdAt: r.created_at,
  };
}

function zoneFromRow(r) {
  return {
    id: r.id,
    siteMapId: r.site_map_id,
    name: r.name || "",
    zoneType: r.zone_type || "general",
    xFrac: Number(r.x_frac),
    yFrac: Number(r.y_frac),
    linkedPermitId: r.linked_permit_id || "",
    linkedScaffoldId: r.linked_scaffold_id || "",
    meta: r.meta || {},
  };
}

export async function loadSiteMaps() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`site_maps?select=*&order=created_at.desc${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(mapFromRow);
}

export async function createSiteMap({ name, imageUrl }) {
  if (!imageUrl) return { __error: true, message: tr("szErrImageRequired") };
  const id = uid("sitemap");
  const res = await offlineWrite({
    module: "siteMaps", table: "site_maps", action: "insert", id,
    payload: { name: name || "", image_url: imageUrl, company_id: getCurrentCompanyId() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("szErrSave") };
  return { ok: true, record: res.record };
}

// برایِ فرم‌هایِ کوتاهی مثلِ فرمِ حادثه که انتخابِ نقشه ندارند — همه‌یِ
// zoneهایِ شرکت (رویِ هر نقشه‌ای) را تخت برمی‌گرداند، تا کاربر بتواند بدونِ
// اول‌انتخاب‌کردنِ یک نقشه، مستقیم zone را انتخاب کند.
export async function loadAllZonesForCompany() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`site_zones?select=*&order=name.asc${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(zoneFromRow);
}

export async function loadSiteZones(siteMapId) {
  if (!siteMapId) return [];
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`site_zones?select=*&site_map_id=eq.${siteMapId}${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(zoneFromRow);
}

export async function createZone({ siteMapId, name, zoneType, xFrac, yFrac, linkedPermitId, linkedScaffoldId }) {
  const id = uid("zone");
  const res = await offlineWrite({
    module: "siteZones", table: "site_zones", action: "insert", id,
    payload: {
      site_map_id: siteMapId, company_id: getCurrentCompanyId(),
      name: name || "", zone_type: zoneType || "general",
      x_frac: xFrac, y_frac: yFrac,
      linked_permit_id: linkedPermitId || null, linked_scaffold_id: linkedScaffoldId || null,
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("szErrSave") };
  return { ok: true, record: res.record };
}

export async function updateZone(id, patch) {
  const payload = {};
  if ("name" in patch) payload.name = patch.name;
  if ("zoneType" in patch) payload.zone_type = patch.zoneType;
  if ("xFrac" in patch) payload.x_frac = patch.xFrac;
  if ("yFrac" in patch) payload.y_frac = patch.yFrac;
  if ("linkedPermitId" in patch) payload.linked_permit_id = patch.linkedPermitId || null;
  if ("linkedScaffoldId" in patch) payload.linked_scaffold_id = patch.linkedScaffoldId || null;
  payload.updated_at = new Date().toISOString();
  const res = await offlineWrite({ module: "siteZones", table: "site_zones", action: "update", id, payload });
  if (!res?.ok) return { __error: true, message: res?.error || tr("szErrSave") };
  return { ok: true };
}

export async function deleteZone(id) {
  const res = await offlineWrite({ module: "siteZones", table: "site_zones", action: "delete", id, payload: {} });
  if (!res?.ok) return { __error: true, message: res?.error || tr("szErrSave") };
  return { ok: true };
}

// دیجیتال‌توئین: وضعیتِ زنده‌یِ مجوز/اسکفلدِ متصل به هر zone را هم برمی‌گرداند
// (نه یک snapshot) — با یک کوئریِ سبکِ in.(...)، بدونِ N+1.
export async function loadZonesWithLiveStatus(siteMapId) {
  const zones = await loadSiteZones(siteMapId);
  const permitIds = zones.filter((z) => z.linkedPermitId).map((z) => z.linkedPermitId);
  const scaffoldIds = zones.filter((z) => z.linkedScaffoldId).map((z) => z.linkedScaffoldId);
  const [permitRows, scaffoldRows] = await Promise.all([
    permitIds.length ? sb(`permits?select=id,status,title&id=in.(${permitIds.join(",")})`) : Promise.resolve([]),
    scaffoldIds.length ? sb(`scaffold_tags?select=id,status,tag_number&id=in.(${scaffoldIds.join(",")})`) : Promise.resolve([]),
  ]);
  const permitMap = new Map((sbOk(permitRows) ? permitRows : []).map((p) => [p.id, p]));
  const scaffoldMap = new Map((sbOk(scaffoldRows) ? scaffoldRows : []).map((s) => [s.id, s]));
  return zones.map((z) => ({
    ...z,
    linkedPermitStatus: z.linkedPermitId ? permitMap.get(z.linkedPermitId)?.status || "" : "",
    linkedPermitTitle: z.linkedPermitId ? permitMap.get(z.linkedPermitId)?.title || "" : "",
    linkedScaffoldStatus: z.linkedScaffoldId ? scaffoldMap.get(z.linkedScaffoldId)?.status || "" : "",
    linkedScaffoldTagNumber: z.linkedScaffoldId ? scaffoldMap.get(z.linkedScaffoldId)?.tag_number || "" : "",
  }));
}
