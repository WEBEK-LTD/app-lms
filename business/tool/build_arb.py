"""59 Writes lib/l10n/app_{en,ar,tr}.arb from the string tables (strings_*.py).

Run from business/: python3 tool/build_arb.py, then flutter gen-l10n.
Every key has the three languages; placeholders are declared once.
"""
import json
import pathlib
import re
import sys

here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here))
import strings_a, strings_b, strings_c  # noqa: E402

INTS = {
    "bellUnread": ["count"],
    "unreadCount": ["count"],
    "buildVersion": ["number"],
    "usersMatches": ["matches", "total"],
    "ticketsInLabel": ["used", "issued"],
}
ORDER = {"planEnds": ["date", "days"]}

rows = strings_a.S + strings_b.S + strings_c.S
plurals = {k: p for (k, p, *_rest) in strings_c.P}
for (k, p, en, ar, tr) in strings_c.P:
    rows.append((k, en, ar, tr))

keys = [r[0] for r in rows]
dupes = {k for k in keys if keys.count(k) > 1}
if dupes:
    sys.exit(f"Duplicate keys: {sorted(dupes)}")

def names(message):
    # Top-level {name} and {name, plural, …} arguments, in order.
    found, depth, i = [], 0, 0
    while i < len(message):
        c = message[i]
        if c == "{":
            if depth == 0:
                m = re.match(r"\{\s*([A-Za-z_][A-Za-z0-9_]*)", message[i:])
                if m and m.group(1) not in found:
                    found.append(m.group(1))
            depth += 1
        elif c == "}":
            depth -= 1
        i += 1
    return found

out = {lang: {"@@locale": lang} for lang in ("en", "ar", "tr")}
for key, en, ar, tr in rows:
    params = ORDER.get(key, names(en))
    for lang, text in (("ar", ar), ("tr", tr)):
        extra = set(names(text)) - set(params)
        if extra:
            sys.exit(f"{key} ({lang}) has unknown placeholders {extra}")
    out["en"][key] = en
    out["ar"][key] = ar
    out["tr"][key] = tr
    if params:
        ints = set(INTS.get(key, []))
        if key in plurals:
            ints.add(plurals[key])
        out["en"]["@" + key] = {
            "placeholders": {
                p: {"type": "int"} if p in ints else {"type": "String"} for p in params
            }
        }

for lang, data in out.items():
    (here.parent / "lib" / "l10n" / f"app_{lang}.arb").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

used = set()
for path in (here.parent / "lib").rglob("*.dart"):
    if "/l10n/app_localizations" in str(path):
        continue
    used |= set(re.findall(r"l10n\??\.([a-zA-Z0-9_]+)", path.read_text(encoding="utf-8")))
used.discard("dart")
missing = sorted(used - set(keys))
unused = sorted(set(keys) - used - {"appTitle"})
print(f"{len(keys)} strings in en, ar, tr")
if missing:
    sys.exit(f"Missing: {missing}")
if unused:
    print(f"Unused: {unused}")
