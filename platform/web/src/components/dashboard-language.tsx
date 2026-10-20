import { setDashboardLanguageAction } from "@/app/actions/dashboard-language";
import { LANG_INFO, LANGS, type Lang } from "@/i18n/config";
import { Icon } from "./icon";

/**
 * 56 The dashboard's language choice, in the account area of the sidebar
 * (in the Menu sheet on phones): "English · العربية · Türkçe", each name in
 * its own language. A form, so it works before the page's scripts load.
 */
export function DashboardLanguage({ lang, label }: { lang: Lang; label: string }) {
  return (
    <form action={setDashboardLanguageAction} className="flex items-center gap-2" data-dashboard-languages>
      <Icon name="language" size={20} className="text-muted" />
      <ul aria-label={label} className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0">
        {LANGS.map((to, i) => (
          <li key={to} className="flex items-center gap-1">
            {i > 0 ? (
              <span aria-hidden="true" className="text-faint">
                ·
              </span>
            ) : null}
            <button
              type="submit"
              name="lang"
              value={to}
              lang={to}
              aria-pressed={to === lang}
              className={`cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-1 text-sm hover:bg-ivory hover:text-midnight ${
                to === lang ? "font-bold text-midnight" : "text-ink-3"
              }`}
            >
              {LANG_INFO[to].nativeName}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
