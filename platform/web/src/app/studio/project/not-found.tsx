import { DashboardNotFound } from "@/components/dashboard-not-found";

/** 132.68 A Studio project's page that isn't there, in the dashboard's language and the project's menu. */
export default function NotFound() {
  return <DashboardNotFound home="/studio/project" />;
}
