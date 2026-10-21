/**
 * 73 The light or dark choice this browser made with the switch
 * (components/theme-switch.tsx), kept in `localStorage`. This small script
 * runs in <head> before the page paints, so a page never flashes in the
 * other theme; without a choice the page follows the system setting
 * (globals.css). Kept as plain text: nothing else may run this early.
 */
export const THEME_KEY = "yallapp-theme";

export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export function ThemeScript() {
  return <script id="yallapp-theme" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
