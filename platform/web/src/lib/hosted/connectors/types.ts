import type { HostedUser, OrderDelivery } from "../../data/types";
import type { DisplayCurrency } from "../../money/display";

/** What a connector answers with: the same shape as the hosted API's own handlers. */
export interface ConnectorResult {
  status: number;
  body?: unknown;
}

export interface ConnectorRequest {
  method: string;
  path: string[];
  query: URLSearchParams;
  body: unknown;
  /** The signed-in customer, when the request has a valid access token. */
  user: HostedUser | null;
  now: Date;
  /** 43 The language the app asks in ("ar"), for labels the connector writes; null or missing: English. */
  lang?: string | null;
  /**
   * 133.5 The customer's currency the app asked for (`?currency=` or
   * `X-Currency`) with the day's rates: Yallapp's own selling connectors add
   * each price in it (lib/money/display.ts); null or missing: none asked.
   */
  display?: DisplayCurrency | null;
  /**
   * 131 `POST /store/checkout-link` of a store: the delivery day and slot,
   * the people and the card the customer chose, checked (lib/selling/store.ts),
   * as a note and as attributes, for a platform whose order takes them.
   */
  order?: { note: string; attributes: { key: string; value: string }[]; delivery: OrderDelivery };
}

/**
 * A platform that serves an app's content through the hosted API (Shopify
 * for Store apps, others later). The hosted API keeps sign-in, accounts and
 * notifications; the connector answers the content endpoints.
 */
export interface Connector {
  /** Added to GET /config, for example `store` and `features.orders`. */
  config(): Promise<{
    store?: unknown;
    bookings?: unknown;
    /** Config.listings (10.7). */
    listings?: unknown;
    /** 23 Config.news. */
    news?: { show_author: boolean; show_dates: boolean; breaking_news_push: boolean };
    /** 28 Config.events. */
    events?: unknown;
    /** 29 Config.donations. */
    donations?: { currency: string; ios_mode: "browser" | "off"; monthly: boolean; updates_push: boolean };
    /** 104 Config.delivery. */
    delivery?: unknown;
    /** 105.1 Config.food. */
    food?: unknown;
    /** 115 Config.market. */
    market?: unknown;
    /** 105.2 Config.rides. */
    rides?: unknown;
    /** 105.9 Config.taxi. */
    taxi?: unknown;
    /** 126 Config.travel. */
    travel?: unknown;
    features?: Record<string, unknown>;
    purchases?: { enroll_button: boolean; free_enrollment: boolean };
  }>;
  /** The response for a content endpoint, or null when it isn't one of this connector's. */
  handle(request: ConnectorRequest): Promise<ConnectorResult | null>;
  /** 131 The IDs of the platform's products with a tag (the owner's gift add-ons); only where the platform gives tags (Shopify). */
  taggedProducts?(tag: string): Promise<number[]>;
}

export class ConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorError";
  }
}
