import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getRequestClientIp, writeAuditLog } from '@/lib/auditLog';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  getHighlightableMenuStructure,
  getMenuHighlightConfig,
  MENU_HIGHLIGHT_ROLE_OPTIONS,
  saveMenuHighlightConfig,
} from '@/lib/menuHighlight';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = await getMenuHighlightConfig();
  const menus = {};
  for (const { key, label } of MENU_HIGHLIGHT_ROLE_OPTIONS) {
    menus[key] = {
      label,
      sections: getHighlightableMenuStructure(key),
    };
  }

  return NextResponse.json({
    highlightColor: config.highlightColor,
    selectedItems: config.selectedItems,
    selectedEntities: config.selectedEntities,
    updatedAt: config.updatedAt,
    menus,
    roles: MENU_HIGHLIGHT_ROLE_OPTIONS,
  });
}

async function __platform_PUT(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const saved = await saveMenuHighlightConfig({
    highlightColor: payload?.highlightColor,
    selectedItems: payload?.selectedItems,
    selectedEntities: payload?.selectedEntities,
  });

  void writeAuditLog({
    userId: auth.session.user.id,
    tenantId: null,
    action: 'UPDATE_MENU_HIGHLIGHT',
    entityType: 'menu_highlight_config',
    entityId: null,
    oldValues: null,
    newValues: {
      highlightColor: saved.highlightColor,
      itemCounts: Object.fromEntries(
        Object.entries(saved.selectedItems).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
      ),
      entityCount: saved.selectedEntities.length,
    },
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({
    success: true,
    message: 'Menu highlighting saved',
    highlightColor: saved.highlightColor,
    selectedItems: saved.selectedItems,
    selectedEntities: saved.selectedEntities,
    updatedAt: saved.updatedAt,
  });
}

const __platformApiHandlers = withApiHandlers(
  {
    GET: __platform_GET,
    PUT: __platform_PUT,
  },
  { context: 'api_admin_menu_highlight' },
);
export const GET = __platformApiHandlers.GET;
export const PUT = __platformApiHandlers.PUT;
