/**
 * 212 What every store gets beside its products, wherever they come from
 * (Yallapp's own shop, Shopify, the connected platforms): the customer's
 * wishlist, reviews with photos from customers who bought the product, and
 * "notify me when it's back". Products are known by the source's id (and a
 * variation's, for back in stock); the rows are Yallapp's own.
 */

/** A product the signed-in customer saved (one row each). */
export interface ShopWishlistItem {
  appId: string;
  userId: number;
  productId: number;
  createdAt: Date;
}

/** A customer's review of a product: one per product and customer, which they may edit. */
export interface ProductReview {
  id: number;
  appId: string;
  productId: number;
  userId: number;
  rating: number;
  text: string;
  /** Pictures of the app's Media library the customer sent with it (up to 4). */
  photoIds: string[];
  /** The short name shown ("Ahmed K."), made when it was written: never an email or a phone. */
  authorName: string;
  /** Hidden by the shop: only its author sees it. */
  hidden: boolean;
  /** The shop's one public reply. */
  replyText: string | null;
  replyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductReviewPatch = Partial<Pick<ProductReview, "hidden" | "replyText" | "replyAt" | "updatedAt">>;

export interface ProductReviewInput {
  appId: string;
  productId: number;
  userId: number;
  rating: number;
  text: string;
  photoIds: string[];
  authorName: string;
  now: Date;
}

/** "Notify me when it's back": a customer waiting for a product (or one of its variations, else 0). */
export interface StockAlert {
  id: number;
  appId: string;
  productId: number;
  /** 0: the product itself. */
  variationId: number;
  userId: number;
  /** The product's name when they asked (the push names it). */
  productName: string;
  createdAt: Date;
  /** When they were told it's back; null while waiting. */
  notifiedAt: Date | null;
}

/**
 * A product's words in another language (Yallapp's own shop): its name and
 * description, and `words` its choices' names and values ("Size" → "المقاس",
 * "Red" → "أحمر") by the main language's text. Each optional; a missing
 * one shows the main text.
 */
export interface ProductTranslation {
  name?: string;
  description?: string;
  words?: Record<string, string>;
}

/** By language code ("ar", "tr"). */
export type ProductTranslations = Record<string, ProductTranslation>;
