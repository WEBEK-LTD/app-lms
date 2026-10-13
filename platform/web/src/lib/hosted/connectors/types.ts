import type { HostedUser } from "../../data/types";

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
}

/**
 * A platform that serves an app's content through the hosted API (Shopify
 * for Store apps, others later). The hosted API keeps sign-in, accounts and
 * notifications; the connector answers the content endpoints.
 */
export interface Connector {
  /** Added to GET /config, for example `store` and `features.orders`. */
  config(): Promise<{ store?: unknown; features?: Record<string, unknown> }>;
  /** The response for a content endpoint, or null when it isn't one of this connector's. */
  handle(request: ConnectorRequest): Promise<ConnectorResult | null>;
}

export class ConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorError";
  }
}
