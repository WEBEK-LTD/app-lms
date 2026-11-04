"use client";

import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import type { MailBlockType } from "@/lib/mailing/types";

/** 114 The blocks an email is built from, as the builder's left panel lists them. */
export const BLOCK_INFO: Record<MailBlockType, { label: string; hint: string; icon: IconName; group: "Basics" | "Layout" | "Marketing" | "More" }> = {
  header: { label: "Logo & links", hint: "Yallapp's logo at the top", icon: "web_asset", group: "Basics" },
  heading: { label: "Heading", hint: "A title", icon: "title", group: "Basics" },
  text: { label: "Text", hint: "Paragraphs, links, lists", icon: "description", group: "Basics" },
  image: { label: "Picture", hint: "With a link if you like", icon: "image", group: "Basics" },
  button: { label: "Button", hint: "The one thing to do", icon: "smart_button", group: "Basics" },
  list: { label: "Checklist", hint: "Points with a check", icon: "task_alt", group: "Basics" },
  divider: { label: "Line", hint: "Between parts", icon: "horizontal_rule", group: "Layout" },
  spacer: { label: "Space", hint: "Room to breathe", icon: "space_bar", group: "Layout" },
  columns: { label: "Columns", hint: "1, 2 or 3 side by side", icon: "view_column", group: "Layout" },
  imageText: { label: "Picture + text", hint: "Side by side", icon: "view_agenda", group: "Layout" },
  cards: { label: "Cards", hint: "Features, plans, steps", icon: "grid_view", group: "Marketing" },
  coupon: { label: "Coupon", hint: "A code to use", icon: "confirmation_number", group: "Marketing" },
  quote: { label: "Testimonial", hint: "A customer's words", icon: "format_quote", group: "Marketing" },
  video: { label: "Video", hint: "A thumbnail that opens it", icon: "smart_display", group: "Marketing" },
  badges: { label: "App stores", hint: "Where to get the app", icon: "download", group: "Marketing" },
  social: { label: "Social links", hint: "Your profiles", icon: "share", group: "More" },
  html: { label: "HTML", hint: "Your own code", icon: "code", group: "More" },
  footer: { label: "Footer", hint: "A last word", icon: "label", group: "More" },
};

const GROUPS = ["Basics", "Layout", "Marketing", "More"] as const;

export const NEW_BLOCK_TYPE = "application/x-yallapp-mail-block";

export function BlockLibrary({ onAdd }: { onAdd: (type: MailBlockType) => void }) {
  return (
    <div className="flex flex-col gap-4 p-3" data-testid="block-library">
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="m-0 px-1 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">{group}</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BLOCK_INFO) as MailBlockType[])
              .filter((t) => BLOCK_INFO[t].group === group)
              .map((type) => (
                <button
                  key={type}
                  type="button"
                  draggable
                  data-block-type={type}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(NEW_BLOCK_TYPE, type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(type)}
                  title={`${BLOCK_INFO[type].hint}. Drag it onto the email, or click to add it.`}
                  className="group flex cursor-grab flex-col items-center gap-1.5 rounded-[12px] border border-line bg-white px-1.5 pt-3 pb-2.5 text-center text-midnight hover:border-midnight hover:shadow-[0_4px_14px_rgba(14,13,36,0.08)] active:cursor-grabbing"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-sand text-ink-3 group-hover:bg-peach group-hover:text-accent">
                    <Icon name={BLOCK_INFO[type].icon} size={21} />
                  </span>
                  <span className="text-[12px] leading-tight font-bold">{BLOCK_INFO[type].label}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
