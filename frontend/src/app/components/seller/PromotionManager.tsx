"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { defaultPromotionRange, formatCurrency, formatDateTime, toIsoInstant } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Product, PromotionCampaign, Store } from "../../lib/types";
import { checkNumber } from "../../lib/validate";
import { Badge, Button, Card, Empty, Field, Select, TextInput } from "../ui";

type CampaignStatus = "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

function getStatus(campaign: PromotionCampaign, now: number): CampaignStatus {
  if (campaign.cancelled) return "CANCELLED";
  if (new Date(campaign.endsAt).getTime() <= now) return "EXPIRED";
  if (new Date(campaign.startsAt).getTime() > now) return "UPCOMING";
  return "ACTIVE";
}

const statusLabels: Record<CampaignStatus, string> = {
  UPCOMING: "Sắp diễn ra",
  ACTIVE: "Đang áp dụng",
  EXPIRED: "Đã hết hạn",
  CANCELLED: "Đã huỷ",
};

const statusTones: Record<CampaignStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  UPCOMING: "info",
  ACTIVE: "success",
  EXPIRED: "neutral",
  CANCELLED: "danger",
};

export function PromotionManager({
  store,
  initialProductId,
}: {
  store: Store | null;
  initialProductId?: number | null;
}) {
  const { token } = useSession();
  const notify = useNotify();
  const range = defaultPromotionRange();
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [startsAt, setStartsAt] = useState(range.startsAt);
  const [endsAt, setEndsAt] = useState(range.endsAt);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialProductId ? [initialProductId] : []);
  const [productKeyword, setProductKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [productData, campaignData] = await Promise.all([
        api<Product[]>("/api/products/mine", { token }),
        api<PromotionCampaign[]>("/api/products/mine/promotions", { token }),
      ]);
      setProducts(productData);
      setCampaigns(campaignData);
      setNow(Date.now());
    } catch (error) {
      notify(errorMessage(error, "Không thể tải khuyến mãi của shop."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  if (!store || store.status !== "ACTIVE") {
    return (
      <Card title="Khuyến mãi">
        <Empty>Cửa hàng cần được admin duyệt trước khi tạo khuyến mãi.</Empty>
      </Card>
    );
  }

  const visibleProducts = products.filter((product) =>
    product.name.toLocaleLowerCase().includes(productKeyword.trim().toLocaleLowerCase()),
  );
  const allSelected = products.length > 0 && products.every((product) => selectedIds.includes(product.id));

  const submit = async () => {
    const dateError = !startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()
      ? "Thời gian kết thúc phải sau thời gian bắt đầu."
      : new Date(endsAt).getTime() < Date.now()
        ? "Thời gian kết thúc phải ở tương lai."
        : null;
    const nextErrors = {
      name: name.trim() ? (name.trim().length <= 120 ? null : "Tên khuyến mãi tối đa 120 ký tự.") : "Tên khuyến mãi không được để trống.",
      discountPercent: checkNumber(discountPercent, "Phần trăm giảm", { min: 1, max: 90 }),
      products: selectedIds.length > 0 ? null : "Hãy chọn ít nhất một sản phẩm.",
      period: dateError,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    try {
      await api<PromotionCampaign>("/api/products/promotions/campaigns", {
        method: "POST",
        token,
        body: {
          name: name.trim(),
          productIds: selectedIds,
          discountPercent: Number(discountPercent),
          startsAt: toIsoInstant(startsAt),
          endsAt: toIsoInstant(endsAt),
        },
      });
      notify("Đã tạo khuyến mãi cho các sản phẩm đã chọn.", "success");
      setName("");
      setSelectedIds([]);
      setErrors({});
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể tạo khuyến mãi."), "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (campaign: PromotionCampaign) => {
    if (!globalThis.confirm(`Huỷ khuyến mãi “${campaign.name}”?`)) return;
    try {
      await api(`/api/products/promotions/campaigns/${encodeURIComponent(campaign.campaignId)}`, {
        method: "DELETE",
        token,
      });
      notify(`Đã huỷ khuyến mãi “${campaign.name}”.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể huỷ khuyến mãi."), "error");
    }
  };

  const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
  const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
  const visibleCampaigns = campaigns
    .filter((campaign) => campaign.name.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()))
    .filter((campaign) => !statusFilter || getStatus(campaign, now) === statusFilter)
    .filter((campaign) => from === null || new Date(campaign.endsAt).getTime() >= from)
    .filter((campaign) => to === null || new Date(campaign.startsAt).getTime() <= to)
    .sort((left, right) => {
      if (sortBy === "oldest") return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
      if (sortBy === "discount_desc") return right.discountPercent - left.discountPercent;
      if (sortBy === "discount_asc") return left.discountPercent - right.discountPercent;
      if (sortBy === "name") return left.name.localeCompare(right.name, "vi");
      return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime();
    });

  return (
    <div className="space-y-5">
      <Card title="Tạo khuyến mãi mới" className="border-t-4 border-t-amber-500">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Tên khuyến mãi" error={errors.name}>
            <TextInput value={name} onChange={setName} placeholder="Ví dụ: Ưu đãi tháng 10" invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Giảm (%) · 1–90" error={errors.discountPercent}>
            <TextInput type="number" value={discountPercent} onChange={setDiscountPercent} digitsOnly invalid={Boolean(errors.discountPercent)} />
          </Field>
          <Field label="Bắt đầu">
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full border border-stone-300 bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Kết thúc" error={errors.period}>
            <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={`w-full border bg-white px-3 py-2 text-sm ${errors.period ? "border-rose-500" : "border-stone-300"}`} />
          </Field>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sản phẩm áp dụng</p>
              {errors.products && <p className="mt-1 text-xs text-rose-600">{errors.products}</p>}
            </div>
            <span className="text-xs text-slate-500">Đã chọn {selectedIds.length}/{products.length}</span>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextInput value={productKeyword} onChange={setProductKeyword} placeholder="Tìm sản phẩm trong shop" />
            <label className="flex items-center gap-2 border border-stone-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => setSelectedIds(event.target.checked ? products.map((product) => product.id) : [])}
              />
              Áp dụng cho tất cả
            </label>
          </div>
          <div className="mt-3 max-h-64 divide-y divide-stone-100 overflow-y-auto border border-stone-200">
            {visibleProducts.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={(event) => setSelectedIds((current) => event.target.checked
                    ? [...new Set([...current, product.id])]
                    : current.filter((id) => id !== product.id))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{product.name}</span>
                  <span className="block text-xs text-slate-500">{product.categoryName} · {formatCurrency(product.effectivePrice)} · tồn {product.stockQuantity}</span>
                </span>
              </label>
            ))}
            {visibleProducts.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">Không tìm thấy sản phẩm.</p>}
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving}>
          {saving ? "Đang tạo..." : "Tạo khuyến mãi"}
        </Button>
      </Card>

      <Card title={`Danh sách khuyến mãi (${visibleCampaigns.length}/${campaigns.length})`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Tìm theo tên">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Tên khuyến mãi" />
          </Field>
          <Field label="Trạng thái">
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "UPCOMING", label: "Sắp diễn ra" },
              { value: "ACTIVE", label: "Đang áp dụng" },
              { value: "EXPIRED", label: "Đã hết hạn" },
              { value: "CANCELLED", label: "Đã huỷ" },
            ]} />
          </Field>
          <Field label="Từ ngày">
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full border border-stone-300 bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Đến ngày">
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full border border-stone-300 bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Sắp xếp">
            <Select value={sortBy} onChange={setSortBy} options={[
              { value: "newest", label: "Ngày bắt đầu mới nhất" },
              { value: "oldest", label: "Ngày bắt đầu cũ nhất" },
              { value: "discount_desc", label: "Giảm nhiều nhất" },
              { value: "discount_asc", label: "Giảm ít nhất" },
              { value: "name", label: "Tên A-Z" },
            ]} />
          </Field>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={load}>Làm mới</Button>
        </div>
        {visibleCampaigns.length === 0 ? (
          <Empty>Không có khuyến mãi phù hợp.</Empty>
        ) : (
          <div className="mt-2 divide-y divide-stone-200">
            {visibleCampaigns.map((campaign) => {
              const status = getStatus(campaign, now);
              return (
                <article key={campaign.campaignId} className="py-4 first:pt-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                        <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
                        <Badge tone="danger">-{campaign.discountPercent}%</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(campaign.startsAt)} → {formatDateTime(campaign.endsAt)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Áp dụng cho {campaign.products.length} sản phẩm: {campaign.products.map((product) => product.productName).join(", ")}
                      </p>
                    </div>
                    {status !== "CANCELLED" && status !== "EXPIRED" && (
                      <Button variant="danger" onClick={() => cancel(campaign)}>Huỷ khuyến mãi</Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
