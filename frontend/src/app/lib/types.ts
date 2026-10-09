export type Role = "BUYER" | "SELLER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "LOCKED";
export type ProductStatus = "ACTIVE" | "HIDDEN" | "OUT_OF_STOCK";
export type StoreStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export type OrderStatus =
  "PENDING" | "CONFIRMED" | "PACKING" | "SHIPPING" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "COD" | "BANK_TRANSFER" | "MOMO" | "CREDIT_CARD";

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  userId: number;
  email: string;
  roles: Role[];
};

export type Account = {
  id: number;
  email: string;
  roles: Role[];
  status: AccountStatus;
};

export type AccountStats = {
  totalAccounts: number;
  activeAccounts: number;
  lockedAccounts: number;
  buyers: number;
  sellers: number;
  admins: number;
};

export type Profile = {
  userId: number;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
};

export type Address = {
  id: number;
  recipientName: string;
  phoneNumber: string;
  detail: string;
  ward: string;
  district: string;
  city: string;
  defaultAddress: boolean;
};

export type Category = { id: number; name: string; description: string | null };

export type Product = {
  id: number;
  sellerId: number;
  storeId: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  discountPercent: number;
  effectivePrice: number;
  stockQuantity: number;
  imageUrl: string | null;
  status: ProductStatus;
  hiddenByStore: boolean;
};

export type Promotion = {
  id: number;
  productId: number;
  campaignId: string;
  name: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  cancelled: boolean;
};

export type PromotionCampaign = {
  campaignId: string;
  name: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  cancelled: boolean;
  products: { productId: number; productName: string }[];
};

export type Store = {
  id: number;
  ownerId: number;
  name: string;
  description: string | null;
  address: string;
  phoneNumber: string;
  logoUrl: string | null;
  status: StoreStatus;
};

export type StoreStats = {
  totalStores: number;
  pendingStores: number;
  activeStores: number;
  rejectedStores: number;
  suspendedStores: number;
};

export type CatalogStats = {
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
  activePromotions: number;
};

export type CartItem = {
  productId: number;
  storeId: number;
  productName: string;
  unitPrice: number;
  originalPrice: number;
  discountPercent: number;
  quantity: number;
  stockQuantity: number;
  imageUrl: string | null;
};

export type OrderItem = {
  productId: number;
  storeId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  reviewed: boolean;
};

export type Order = {
  id: number;
  buyerId: number;
  storeId: number;
  totalAmount: number;
  discountAmount: number;
  voucherCode: string | null;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

export type OrderStats = {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalReviews: number;
  averageRating: number;
  ordersByStatus: Record<string, number>;
};

export type Review = {
  id: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ReviewSummary = {
  productId: number;
  averageRating: number;
  reviewCount: number;
};

export type Voucher = {
  id: number;
  code: string;
  discountPercent: number;
  minimumOrderAmount: number;
  remainingUses: number;
  startsAt: string;
  endsAt: string;
};
