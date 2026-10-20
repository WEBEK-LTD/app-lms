/**
 * What the audit log records (roadmap 11.7): an action key per kind of
 * change, with the label the Audit log page shows.
 */
export const AUDIT_ACTIONS = {
  "client.add": "Client added",
  "client.activate": "Client activated",
  "client.renew": "License extended or plan changed",
  "client.suspend": "Client suspended",
  "client.reinstate": "Client reinstated",
  "client.details": "Client details edited",
  "client.hosted_api": "Hosted API switched",
  "client.wordpress_ready": "WordPress site ready",
  "client.license_key": "New license key",
  "client.release_site": "Website released",
  "client.manage_app": "Client's dashboard opened",
  "client.app_settings": "Client's app changed",
  "client.email": "Email sent again",
  "client.app_users": "App users changed",
  "client.notification": "Notification sent",
  "build.rerun": "Build run again",
  "build.mark_failed": "Build marked as not finished",
  // 46
  "crash.status": "Crash marked resolved or opened again",
  "publishing.status": "Publishing status changed",
  "publishing.notes": "Publishing notes saved",
  "release.upload": "Plugin release uploaded",
  "release.publish": "Plugin release published",
  "release.unpublish": "Plugin release unpublished",
  "release.delete": "Plugin release deleted",
  "payout.release": "Payout released",
  // 47
  "payment.refund": "Payment refunded",
  "settings.save": "Platform setting saved",
  "settings.reset": "Platform setting removed",
  "plan.save": "Plan saved",
  "plan.reset": "Plan back to default",
  "plan.limits": "Plan features and limits changed",
  "plan.availability": "Plan availability changed",
  "switches.save": "Switches changed",
  "team.invite": "Team member invited",
  "team.role": "Team role changed",
  "team.remove": "Team member removed",
  "content.update": "Website content saved",
  "content.reset": "Website content back to default",
  "email_template.update": "Email template saved",
  "email_template.reset": "Email template back to default",
  "coupon.create": "Coupon created",
  "coupon.update": "Coupon saved",
  "coupon.enable": "Coupon turned on",
  "coupon.disable": "Coupon turned off",
  "announcement.create": "Announcement created",
  "announcement.update": "Announcement saved",
  "announcement.email": "Announcement emailed",
  "announcement.end": "Announcement ended",
  "announcement.delete": "Announcement deleted",
  "demo.setup": "Demo apps created or refreshed",
  "demo.build": "Demo app build started",
  "demo.download": "Demo download changed",
  // 51 Media storage
  "storage.add": "Storage pack added",
  "storage.remove": "Storage pack removed",
  // 66 Deleting a Yallapp account
  "account_deletion.done": "Account deleted",
  "account_deletion.cancelled": "Account deletion request cancelled",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const AUDIT_TARGETS = {
  client: "Client",
  app: "App",
  build: "Build",
  release: "Plugin release",
  order: "Shop order",
  donation: "Donation",
  setting: "Platform setting",
  plan: "Plan",
  switches: "Switches",
  admin: "Team member",
  content: "Website content",
  email_template: "Email template",
  coupon: "Coupon",
  announcement: "Announcement",
  account_deletion: "Account deletion request",
} as const;

export type AuditTargetType = keyof typeof AUDIT_TARGETS;

export function auditActionLabel(action: string): string {
  return (AUDIT_ACTIONS as Record<string, string>)[action] ?? action;
}
