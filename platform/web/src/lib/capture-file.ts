/**
 * Local runs and tests only (YALLAPP_MAIL_DIR, YALLAPP_OWNER_PUSH_DIR, never
 * on Netlify): writes a captured email or push as one JSON file in `dir`,
 * whole or not at all. It is written next to the folder first and then
 * renamed into it, so a test reading the folder never finds a file that is
 * still being written (an empty file failed JSON.parse in admin-app-moves).
 */
export async function writeCaptureFile(dir: string, name: string, content: string): Promise<void> {
  const { mkdir, rename, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const staging = `${dir.replace(/[\\/]+$/, "")}.writing`;
  await Promise.all([mkdir(dir, { recursive: true }), mkdir(staging, { recursive: true })]);
  const draft = path.join(staging, name);
  await writeFile(draft, content);
  await rename(draft, path.join(dir, name));
}
