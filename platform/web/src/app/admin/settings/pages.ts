/** 95.1 The settings, one page each: the tabs on every settings page and the cards on the first. */
export const SETTINGS_PAGES = [
  { href: "/admin/settings/payments", label: "Payments", text: "The gateway for Yallapp's plans and its iyzico, Kashier and Fawaterk accounts." },
  { href: "/admin/settings/email", label: "Email", text: "The SMTP server every email goes out through." },
  { href: "/admin/settings/sign-in-codes", label: "Sign-in codes", text: "How apps on the hosted API send their 6-digit codes (waabek, WhatsApp or a webhook)." },
  { href: "/admin/settings/contact", label: "Contact & publishing", text: "How clients reach Yallapp, and the publishing team's email." },
  { href: "/admin/settings/invoices", label: "Invoices", text: "The company lines on Yallapp's receipts and invoices." },
  { href: "/admin/settings/store-platforms", label: "Store platforms", text: "The Salla and Zid partner apps stores connect through." },
  { href: "/admin/settings/app-defaults", label: "New apps", text: "The look and languages a new app starts with." },
  { href: "/admin/settings/server", label: "Server", text: "What comes from the Netlify variables, and the media server check." },
] as const;

export type SettingsPageHref = (typeof SETTINGS_PAGES)[number]["href"];
