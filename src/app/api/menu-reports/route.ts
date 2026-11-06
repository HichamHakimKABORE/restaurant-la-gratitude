import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryMenuHistory,
  getMemoryOrders,
  invalidateMenuHistoryCache,
  type DailyMenuRecord
} from '@/lib/db';
import { isAdminRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const sql = await ensureNeonSchema();

    if (sql) {
      let rows: any[] = [];
      if (startDate && endDate) {
        rows = await sql`
          SELECT id, TO_CHAR(menu_date, 'YYYY-MM-DD') AS menu_date, dishes_json, total_dishes, notes, created_at
          FROM daily_menu_history
          WHERE menu_date >= ${startDate}::date AND menu_date <= ${endDate}::date
          ORDER BY menu_date DESC
        `;
      } else {
        rows = await sql`
          SELECT id, TO_CHAR(menu_date, 'YYYY-MM-DD') AS menu_date, dishes_json, total_dishes, notes, created_at
          FROM daily_menu_history
          ORDER BY menu_date DESC
        `;
      }

      // Fetch order stats per date
      const orderStats = await sql`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS order_date, COUNT(*)::int AS count, COALESCE(SUM(total_cfa), 0)::int AS revenue
        FROM orders
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      `;

      const statsMap = new Map<string, { count: number; revenue: number }>();
      for (const st of orderStats) {
        statsMap.set(st.order_date, { count: st.count, revenue: st.revenue });
      }

      const reports: DailyMenuRecord[] = rows.map(r => ({
        id: r.id,
        menu_date: r.menu_date,
        dishes_json: Array.isArray(r.dishes_json) ? r.dishes_json : JSON.parse(r.dishes_json || '[]'),
        total_dishes: r.total_dishes || 0,
        notes: r.notes || '',
        created_at: r.created_at,
        orders_count: statsMap.get(r.menu_date)?.count || 0,
        revenue_cfa: statsMap.get(r.menu_date)?.revenue || 0
      }));

      return NextResponse.json({ reports });
    }

    // Memory fallback
    let history = getMemoryMenuHistory();
    const orders = getMemoryOrders();

    const statsMap = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const d = o.created_at.slice(0, 10);
      const curr = statsMap.get(d) || { count: 0, revenue: 0 };
      statsMap.set(d, { count: curr.count + 1, revenue: curr.revenue + o.total_cfa });
    }

    if (startDate && endDate) {
      history = history.filter(h => h.menu_date >= startDate && h.menu_date <= endDate);
    }

    const reports: DailyMenuRecord[] = history.map(h => ({
      ...h,
      orders_count: statsMap.get(h.menu_date)?.count || 0,
      revenue_cfa: statsMap.get(h.menu_date)?.revenue || 0
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('API menu-reports GET error:', error);
    return NextResponse.json({ reports: getMemoryMenuHistory() });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const todayStr = new Date().toISOString().slice(0, 10);
    const menuDate = body.menu_date || todayStr;
    const dishesList = Array.isArray(body.dishes) ? body.dishes : [];
    const notes = body.notes || 'Enregistré depuis l’espace Admin';
    const totalDishes = dishesList.length;

    const sql = await ensureNeonSchema();

    if (sql) {
      await sql`
        INSERT INTO daily_menu_history (menu_date, dishes_json, total_dishes, notes, updated_at)
        VALUES (${menuDate}, ${JSON.stringify(dishesList)}::jsonb, ${totalDishes}, ${notes}, NOW())
        ON CONFLICT (menu_date) DO UPDATE
        SET dishes_json = EXCLUDED.dishes_json,
            total_dishes = EXCLUDED.total_dishes,
            notes = EXCLUDED.notes,
            updated_at = NOW()
      `;

      invalidateMenuHistoryCache();
      return NextResponse.json({ success: true, message: 'Rapport du jour enregistré avec succès' });
    }

    // Memory fallback
    const history = getMemoryMenuHistory();
    const existingIdx = history.findIndex(h => h.menu_date === menuDate);
    if (existingIdx >= 0) {
      history[existingIdx] = {
        ...history[existingIdx],
        dishes_json: dishesList,
        total_dishes: totalDishes,
        notes
      };
    } else {
      history.unshift({
        id: Date.now(),
        menu_date: menuDate,
        dishes_json: dishesList,
        total_dishes: totalDishes,
        notes,
        created_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, message: 'Rapport du jour enregistré avec succès' });
  } catch (error: any) {
    console.error('API menu-reports POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
