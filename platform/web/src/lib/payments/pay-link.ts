/**
 * 186 The payment link the apps are handed: `<platform>/pay/<token>/in-app`,
 * which goes straight on to the payment page (`/pay/<token>`).
 *
 * The apps open it in their own web view, inside the app, as before 170.
 * Release 10's apps (170) open only the payment page itself, a link of two
 * parts (`/pay/<token>`), in the phone's browser sheet: this link has a
 * third, so those apps keep it in the app's view with no new build. The
 * sheet stays in the app, unused; a link to the page itself would open it
 * again.
 */
export const IN_APP_VIEW = "in-app";

export function payLinkForApps(platformUrl: string, token: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/pay/${token}/${IN_APP_VIEW}`;
}
