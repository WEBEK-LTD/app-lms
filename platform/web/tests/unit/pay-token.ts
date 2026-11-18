/** 186 The payment's token in a payment link (`/pay/<token>`, `/pay/<token>/in-app`). */
export const payToken = (url: string): string => /\/pay\/([A-Za-z0-9_-]+)/.exec(url)![1]!;
