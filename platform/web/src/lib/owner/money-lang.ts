import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 175 The language an Owner API answer writes its amounts in (`Money.formatted`):
 * the signed-in person's, for the request being answered (lib/owner/service.ts),
 * so Yallapp Business shows "1,234.50 د.م." in Arabic instead of "MAD 1,234.50".
 * English outside a request.
 */
const MONEY_LANG = new AsyncLocalStorage<string>();

export function inMoneyLang<T>(lang: string, run: () => T): T {
  return MONEY_LANG.run(lang, run);
}

export function moneyLang(): string | undefined {
  return MONEY_LANG.getStore();
}
