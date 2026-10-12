"use client";

import { useCallback, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { dayKey, downloadCsv } from "../../lib/csv";
import { formatCurrency } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order } from "../../lib/types";
import { BarChart } from "../Charts";
import { Pager, usePaging } from "../Pager";
import { Button, Card, Empty, Field, StatTile } from "../ui";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: dayKey(from), to: dayKey(to) };
}

/** Báo cáo doanh thu và phí nền tảng theo khoảng ngày, xuất được CSV. */
export function ReportPanel() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api<Order[]>("/api/orders/admin", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải dữ liệu báo cáo."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const rows = useMemo(() => {
    const byDay = new Map<string, { orders: number; revenue: number; commission: number }>();
    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      const key = dayKey(order.createdAt);
      if (key < range.from || key > range.to) continue;
      const row = byDay.get(key) ?? { orders: 0, revenue: 0, commission: 0 };
      row.orders += 1;
      row.revenue += order.totalAmount;
      row.commission += order.commissionAmount;
      byDay.set(key, row);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, row]) => ({ day, ...row }));
  }, [orders, range]);

  const totals = rows.reduce(
    (sum, row) => ({
      orders: sum.orders + row.orders,
      revenue: sum.revenue + row.revenue,
      commission: sum.commission + row.commission,
    }),
    { orders: 0, revenue: 0, commission: 0 },
  );
  const paging = usePaging([...rows].reverse(), 10, `${range.from}|${range.to}`);

  const exportCsv = () =>
    downloadCsv(`bao-cao-${range.from}_${range.to}.csv`, [
      ["Ngày", "Số đơn", "Doanh thu", "Phí nền tảng"],
      ...rows.map((row) => [row.day, row.orders, row.revenue, row.commission]),
      ["Tổng", totals.orders, totals.revenue, totals.commission],
    ]);

  return (
    <div className="space-y-5">
      <Card
        title="Báo cáo doanh thu"
        action={
          <Button variant="ghost" onClick={exportCsv} disabled={rows.length === 0}>
            Xuất CSV
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Từ ngày">
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">Không tính đơn đã huỷ.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatTile label="Số đơn" value={totals.orders} />
          <StatTile label="Doanh thu" value={formatCurrency(totals.revenue)} />
          <StatTile label="Phí nền tảng" value={formatCurrency(totals.commission)} />
        </div>
      </Card>

      <Card title="Doanh thu theo ngày">
        <BarChart
          data={rows.map((row) => ({ label: row.day.slice(5), value: row.revenue }))}
          format={formatCurrency}
        />
      </Card>

      <Card title="Chi tiết theo ngày">
        {rows.length === 0 ? (
          <Empty>Không có đơn hàng trong khoảng này.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Ngày</th>
                  <th className="py-2 pr-4">Số đơn</th>
                  <th className="py-2 pr-4">Doanh thu</th>
                  <th className="py-2">Phí nền tảng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paging.slice.map((row) => (
                  <tr key={row.day}>
                    <td className="py-2 pr-4">{row.day}</td>
                    <td className="py-2 pr-4">{row.orders}</td>
                    <td className="py-2 pr-4">{formatCurrency(row.revenue)}</td>
                    <td className="py-2">{formatCurrency(row.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      </Card>
    </div>
  );
}
