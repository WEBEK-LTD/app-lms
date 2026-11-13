import { readZip } from "../market/sheets/zip";

/**
 * 124.17 The version a Yallapp plugin zip says it is: the `Version:` line of
 * `yallapp/yallapp.php`'s header, as WordPress reads it. Null when the file
 * isn't a zip, isn't the Yallapp plugin, or has no version. Admin › Releases
 * takes the version from the zip itself, so a mistyped one (4.18.1 for
 * 0.4.18) can't become every site's "newest".
 */
export function pluginZipVersion(bytes: Uint8Array): string | null {
  let files: ReturnType<typeof readZip>;
  try {
    files = readZip(bytes);
  } catch {
    return null;
  }
  const main = files.get("yallapp/yallapp.php");
  if (!main) return null;
  let text: string;
  try {
    text = new TextDecoder().decode(main().subarray(0, 8192));
  } catch {
    return null;
  }
  const match = /^[ \t/*#@]*Version:[ \t]*([0-9][0-9A-Za-z.+-]*)[ \t]*$/m.exec(text);
  return match ? match[1]! : null;
}
