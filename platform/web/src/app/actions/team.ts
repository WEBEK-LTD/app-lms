"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { translateKnown, type Lang } from "@/i18n";
import { recordStaffChange } from "@/lib/admin/audit";
import { authenticate } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { actorOf, chooseBusiness, clientFor, getCurrentUser, mayUseDashboard, requestIp, startSession, type ClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import { sendTemplate } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { fieldErrors, type FormState } from "@/lib/forms";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isTeamArea } from "@/lib/team/permissions";
import { acceptInvitation, businessesOf, cancelInvitation, invitationForToken, inviteMember, removeMember, resendInvitation, updateMember, type TeamDeps } from "@/lib/team/service";
import { teamInviteSchema, teamJoinExistingSchema, teamJoinNewSchema } from "@/lib/validation";

/**
 * 60 Dashboard › Team (the owner only): invitations, changing what someone
 * can do, removing them; the business switcher; and joining a team from an
 * invitation's link. The rules are in lib/team (shared with the Owner API).
 */

async function requireTeamOwner(): Promise<ClientContext> {
  const context = await clientFor("team");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

function teamDeps(store: TeamDeps["store"]): TeamDeps {
  return {
    store,
    now: new Date(),
    baseUrl: appUrl(),
    mail: (to, values, lang) => sendTemplate("team_invitation", to, values, { lang }),
    words: (lang: Lang) => {
      const t = getDashT(lang);
      return { role: (role) => t(`team.roles.${role}`), date: (date) => formatDate(lang, date, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) };
    },
  };
}

/** Role, areas and apps from the Team page's form: `apps` is "all" or "some" with `appIds`. */
function accessValues(formData: FormData) {
  return {
    role: formData.get("role"),
    areas: formData.getAll("areas").map(String).filter(isTeamArea),
    appIds: formData.get("apps") === "some" ? formData.getAll("appIds").map(String) : null,
  };
}

export interface InviteState extends FormState {
  /** The join link, shown to the owner in case the email doesn't arrive. */
  link?: string;
}

export async function inviteMemberAction(_: InviteState, formData: FormData): Promise<InviteState> {
  const context = await requireTeamOwner();
  const { lang } = await dashboardText();
  const store = await getStore();
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const result = await inviteMember(
    teamDeps(store),
    {
      client: context.client,
      owner: context.user,
      // Every app of the client: an owner may give any of them.
      apps: await store.listAppsByClient(context.client.id),
      inviter: actorOf(context),
      lang,
      values: { ...values, ...accessValues(formData) },
      parse: (input) => {
        const parsed = teamInviteSchema.safeParse(input);
        return parsed.success ? { ok: true, name: parsed.data.name, email: parsed.data.email } : { ok: false, errors: fieldErrors(parsed.error) };
      },
    },
  );
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  await recordStaffChange(context, `Invited ${result.invitation.email} to the client's team`);
  revalidatePath("/dashboard/team");
  return { ok: true, message: `Invitation sent to ${result.invitation.email}.`, link: result.link };
}

export async function resendInvitationAction(formData: FormData): Promise<void> {
  const context = await requireTeamOwner();
  const store = await getStore();
  const result = await resendInvitation(teamDeps(store), { client: context.client, owner: context.user, apps: await store.listAppsByClient(context.client.id), inviter: actorOf(context), id: String(formData.get("id") ?? "") });
  revalidatePath("/dashboard/team");
  redirect(result.ok ? `/dashboard/team?done=resent&email=${encodeURIComponent(result.invitation.email)}` : "/dashboard/team?done=closed");
}

export async function cancelInvitationAction(formData: FormData): Promise<void> {
  const context = await requireTeamOwner();
  await cancelInvitation(await getStore(), { client: context.client, actor: actorOf(context), id: String(formData.get("id") ?? "") }, new Date());
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team?done=cancelled");
}

export async function updateMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTeamOwner();
  const store = await getStore();
  const actor = actorOf(context);
  const result = await updateMember(
    store,
    { client: context.client, apps: await store.listAppsByClient(context.client.id), actor, userId: String(formData.get("userId") ?? ""), values: accessValues(formData) },
    new Date(),
  );
  if (!result.ok) return result.notFound ? { message: "This person isn't on your team." } : { errors: result.errors };
  await recordStaffChange(context, "Changed what a team member can do");
  revalidatePath("/dashboard/team");
  return { ok: true, message: "Saved. It applies at once." };
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const context = await requireTeamOwner();
  const store = await getStore();
  const userId = String(formData.get("userId") ?? "");
  const user = await store.getUserById(userId);
  const removed = await removeMember(store, { client: context.client, actor: actorOf(context), userId }, new Date());
  if (removed) await recordStaffChange(context, `Removed ${user?.email ?? "a member"} from the client's team`);
  revalidatePath("/dashboard/team");
  redirect(removed && user ? `/dashboard/team?done=removed&name=${encodeURIComponent(user.name)}` : "/dashboard/team");
}

/** The business switcher: someone on several businesses works on another from now on (only one they're on). */
export async function switchBusinessAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const clientId = String(formData.get("clientId") ?? "");
  const business = (await businessesOf(await getStore(), user)).find((b) => b.client.id === clientId);
  if (business) await chooseBusiness(business.client.id);
  revalidatePath("/dashboard", "layout");
  redirect(business && business.client.status !== "active" ? "/pending" : "/dashboard");
}

// Joining from the invitation's link (no session needed)

function inLang(lang: Lang, state: FormState): FormState {
  if (lang === "en") return state;
  const k = knownTranslator(lang);
  // The website's form errors (passwords), then the dashboard's known texts.
  const t = (text: string) => {
    const site = translateKnown(lang, "formErrors", text);
    return site !== text ? site : k(text);
  };
  return {
    ...state,
    ...(state.message ? { message: t(state.message) } : {}),
    ...(state.errors ? { errors: Object.fromEntries(Object.entries(state.errors).map(([key, value]) => [key, t(value)])) } : {}),
  };
}

const REASONS: Record<string, string> = {
  invalid: "This link is invalid.",
  expired: "This link is invalid.",
  used: "This invitation isn't open any more.",
  owner: "You own this business already. Sign in to open it.",
  staff: "This email is on Yallapp's team. Ask for an invitation to another email.",
};

/**
 * Joins with the link: a new account sets its name and password; an
 * existing one gives its password (checked like a sign-in, with its limits).
 * Then the person is signed in on that business.
 */
export async function joinTeamAction(_: FormState, formData: FormData): Promise<FormState> {
  const store = await getStore();
  const now = new Date();
  const token = String(formData.get("token") ?? "");
  const check = await invitationForToken(store, token, now);
  const lang = (check.ok && ["en", "ar", "tr"].includes(check.invitation.lang) ? check.invitation.lang : "en") as Lang;
  const say = (state: FormState) => inLang(lang, state);
  const limit = await hitRateLimit(store, RATE_LIMITS.teamJoinIp, await requestIp(), now);
  if (!limit.allowed) return say({ message: "Too many attempts. Please wait a few minutes and try again." });
  if (!check.ok) return say({ message: REASONS[check.reason] });

  let user = check.existing;
  if (user?.passwordHash) {
    const parsed = teamJoinExistingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return say({ errors: fieldErrors(parsed.error) });
    const byEmail = await hitRateLimit(store, RATE_LIMITS.signInEmail, user.email, now);
    if (!byEmail.allowed) return say({ message: "Too many attempts. Please wait a few minutes and try again." });
    const signedIn = await authenticate(store, user.email, parsed.data.password, now);
    if (!signedIn) return say({ errors: { password: "The password is incorrect." } });
    user = signedIn;
  } else {
    const parsed = teamJoinNewSchema.safeParse(Object.fromEntries(formData));
    const values = { name: String(formData.get("name") ?? "") };
    if (!parsed.success) return say({ errors: fieldErrors(parsed.error), values });
    const passwordHash = await hashPassword(parsed.data.password);
    if (user) {
      // An account made without a password (never finished): this sets it, and signs out any old session.
      await store.updateUser(user.id, { name: parsed.data.name, passwordHash, sessionVersion: user.sessionVersion + 1, language: user.language ?? lang }, now);
      user = { ...user, name: parsed.data.name, passwordHash, sessionVersion: user.sessionVersion + 1 };
    } else {
      try {
        user = await store.createUser({ email: check.invitation.email, name: parsed.data.name, passwordHash, now });
        await store.updateUser(user.id, { language: lang }, now);
      } catch (error) {
        if (error instanceof DuplicateEmailError) return say({ message: REASONS.used });
        throw error;
      }
    }
  }
  const joined = await acceptInvitation(store, token, user, now);
  if (!joined.ok) return say({ message: REASONS[joined.reason] });
  await startSession(user);
  await chooseBusiness(joined.client.id);
  redirect(joined.client.status === "active" ? "/dashboard" : "/pending");
}
