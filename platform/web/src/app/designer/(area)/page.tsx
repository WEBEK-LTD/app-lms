import { redirect } from "next/navigation";

/** 106.1 The designer area opens on the designer's templates. */
export default function DesignerHome() {
  redirect("/designer/templates");
}
