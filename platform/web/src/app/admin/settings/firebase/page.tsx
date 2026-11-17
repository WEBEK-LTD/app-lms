import type { Metadata } from "next";
import { retryFirebaseProjectAction } from "@/app/actions/admin-firebase";
import { SubmitButton } from "@/components/form";
import { ReadOnly } from "@/components/read-only";
import { Badge, formatDateTime, Notice } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FirebaseProject } from "@/lib/data/types";
import { appUrl, yallappFirebaseEnv } from "@/lib/env";
import { poolParent } from "@/lib/firebase/env";
import { POOL_LOW_ROOM, poolLow, poolOf, poolRoom } from "@/lib/firebase/pool";
import { PROJECT_STEPS, stepText } from "@/lib/firebase/projects";
import { oidcIssuer } from "@/lib/google/platform-keys";
import { platformSetting } from "@/lib/settings/platform";
import { Row, Section } from "../parts";
import { AddFirebaseProjectForm, FirebaseCheckForm, FirebaseParentForm, FirebaseProjectForm, MakeNextProjectForm } from "./forms";

export const metadata: Metadata = { title: "Yallapp Firebase projects · Settings" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<FirebaseProject["status"], "success" | "warn" | "neutral" | "info"> = { open: "success", full: "warn", closed: "neutral", creating: "info" };

/**
 * 136 Settings › Yallapp Firebase projects: the pool apps in "Yallapp sets
 * up notifications" are registered in, each project's room, the one the
 * platform is making (with Google's exact words when a step failed), where
 * new ones are made, and the Check that signs in to Google without a key.
 */
export default async function FirebaseSettingsPage() {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const env = yallappFirebaseEnv();
  const projects = await store.listFirebaseProjects();
  const counts = await store.countAppFirebaseAppsByProject();
  const pool = poolOf(projects, counts);
  const room = poolRoom(pool);
  const parent = await poolParent(store);
  const savedParent = (await platformSetting(store, "firebasePool", { fresh: true }))?.value.parent ?? "";
  const creating = projects.find((p) => p.status === "creating") ?? null;
  const issuer = oidcIssuer(appUrl());
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change Yallapp's Firebase projects">
      {!env ? (
        <Notice tone="neutral" icon="info">
          Yallapp&apos;s Firebase isn&apos;t set up on this server: every app uses its own Firebase, as before, and nothing calls Google. Set GOOGLE_WIF_PROVIDER, GOOGLE_PUSH_SERVICE_ACCOUNT and GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT in Netlify (LAUNCH-CHECKLIST 7z8).
        </Notice>
      ) : poolLow(pool) ? (
        <Notice tone="warn" icon="warning" role="status">
          The pool is nearly full: room for {room} more {room === 1 ? "app" : "apps"} (under {POOL_LOW_ROOM}).{" "}
          {creating ? `The platform is making ${creating.projectId}.` : parent ? "The platform makes the next project at its next run, or press “Make the next project now”." : "Set where new projects are made below, or add one made by hand."}
        </Notice>
      ) : null}

      <Section
        id="h-firebase-pool"
        title="The pool"
        text="Apps in “Yallapp sets up notifications” are registered in these projects, each client's apps in one (up to six: the customers' app and its second apps, on Android and iOS). A project takes new clients while it's open and has room; Firebase advises at most 30 apps a project."
      >
        {projects.length === 0 ? (
          <p className="m-0 text-sm text-muted">No project yet.</p>
        ) : (
          <ul aria-label="Yallapp Firebase projects" className="m-0 flex list-none flex-col gap-3 p-0">
            {pool.map(({ project, used, room: left }) => (
              <li key={project.projectId} aria-label={project.projectId} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold" dir="ltr">
                    {project.projectId}
                  </span>
                  <Badge tone={STATUS_TONE[project.status]}>{project.status === "creating" ? "Being made" : project.status[0]!.toUpperCase() + project.status.slice(1)}</Badge>
                  <span className="text-sm text-muted">{project.createdBy === "platform" ? "Made by the platform" : "Added by the team"}</span>
                </div>
                {project.status === "creating" && project.creation ? (
                  <div className="flex flex-col gap-2">
                    <p className="m-0 text-sm">
                      Step {PROJECT_STEPS.indexOf(project.creation.step) + 1} of {PROJECT_STEPS.length}: {stepText(project.creation.step)}
                      {project.creation.operation ? ", waiting for Google" : ""}.
                    </p>
                    {project.creation.problem ? (
                      <Notice tone="danger" icon="error" role="alert">
                        Google said: <span dir="ltr">{project.creation.problem}</span>
                        {project.creation.nextTryAt ? ` The platform tries again after ${formatDateTime(new Date(project.creation.nextTryAt))}.` : ""}
                      </Notice>
                    ) : null}
                    <form action={retryFirebaseProjectAction}>
                      <input type="hidden" name="projectId" value={project.projectId} />
                      <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                        Try again now
                      </SubmitButton>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        {used} of {project.maxApps} apps · room for {left} more
                      </span>
                      <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-label={`${project.projectId}: apps in it`} aria-valuemin={0} aria-valuemax={project.maxApps} aria-valuenow={Math.min(used, project.maxApps)}>
                        <div className={`h-full rounded-full ${used >= project.maxApps ? "bg-danger" : "bg-ember"}`} style={{ width: `${Math.min(100, (used / Math.max(1, project.maxApps)) * 100)}%` }} />
                      </div>
                    </div>
                    <p className="m-0 text-sm text-muted">
                      Number <span dir="ltr">{project.projectNumber}</span> · API key <span dir="ltr">{project.apiKeyId}</span>
                      {project.checkedAt ? ` · Checked ${formatDateTime(project.checkedAt)}: ${project.checkProblem ?? "Firebase answers for it."}` : " · Not checked yet."}
                    </p>
                    <FirebaseProjectForm projectId={project.projectId} status={project.status} maxApps={project.maxApps} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {env ? <MakeNextProjectForm canMake={Boolean(parent)} /> : null}
      </Section>

      <Section
        id="h-firebase-check"
        title="Check"
        text="Signs in to Google through Workload Identity Federation as the push sender and the apps account (no key exists anywhere), reads each project, and asks whether new projects can be made. Nothing is changed at Google."
      >
        <div>
          <Row label="Issuer" ok={issuer.startsWith("https://")} value={issuer} />
          <Row label="Provider" ok={Boolean(env)} value={env?.provider ?? "GOOGLE_WIF_PROVIDER isn't set"} />
          <Row label="Push sender" ok={Boolean(env)} value={env?.pushAccount ?? "GOOGLE_PUSH_SERVICE_ACCOUNT isn't set"} />
          <Row label="Apps account" ok={Boolean(env)} value={env?.appsAccount ?? "GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT isn't set"} />
          <Row label="New projects under" ok={Boolean(parent)} value={parent ?? "Nowhere yet: set it below, or GOOGLE_FIREBASE_PROJECT_PARENT"} />
        </div>
        {env ? <FirebaseCheckForm /> : null}
      </Section>

      <Section
        id="h-firebase-parent"
        title="Where new projects are made"
        text="The organization or folder the apps account creates the pool's next projects in, with the Project Creator role there. Saved here, it's used over GOOGLE_FIREBASE_PROJECT_PARENT."
      >
        <FirebaseParentForm parent={savedParent} />
      </Section>

      <Section id="h-firebase-add" title="Add a project made by hand" text="Only needed when the platform can't make projects itself: a project with Firebase added, its push-only API key and the two service accounts' roles (LAUNCH-CHECKLIST 7z8).">
        <AddFirebaseProjectForm />
      </Section>
    </ReadOnly>
  );
}
