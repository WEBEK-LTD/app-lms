"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { listChatLibraryAction, saveChatSettingsAction, sendChatReplyAction, type ChatLibraryFile } from "@/app/actions/chat";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

const newClientId = () => `dash-${crypto.randomUUID()}`;

/** 77 The business's answer: text, a file from the Media library, or both. A new `client` ID after each one sent, so a retry never sends twice. */
export function ChatReplyForm({ conversationId, business }: { conversationId: string; business: string }) {
  const t = useDashT();
  const [state, action] = useActionState(sendChatReplyAction, initialFormState);
  const [clientId, setClientId] = useState(newClientId);
  const [file, setFile] = useState<ChatLibraryFile | null>(null);
  // After each answer sent: a new ID, no file, an empty box (keyed on the ID).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) {
      setFile(null);
      setClientId(newClientId());
    }
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
      <input type="hidden" name="conversation" value={conversationId} />
      <input type="hidden" name="client" value={clientId} />
      <input type="hidden" name="media" value={file?.id ?? ""} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-chat-text" className="text-sm font-semibold">
          {t("chat.reply")}
        </label>
        <textarea
          key={clientId}
          id="f-chat-text"
          name="text"
          rows={3}
          maxLength={4000}
          defaultValue={state.ok ? "" : state.values?.text}
          className="input min-h-20 py-3"
          aria-invalid={state.errors?.text ? true : undefined}
          aria-describedby={state.errors?.text ? "f-chat-text-error" : "f-chat-text-hint"}
        />
        <span id="f-chat-text-hint" className="text-[13px] text-muted">
          {t("chat.replyHint", { business })}
        </span>
        <FieldError id="f-chat-text-error" error={state.errors?.text} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <LibraryPicker onPick={setFile} />
          {file ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-sand px-3 py-1.5 text-sm">
              {t("chat.attached", { name: file.name })}
              <button type="button" onClick={() => setFile(null)} className="font-semibold text-danger">
                {t("chat.removeAttachment")}
              </button>
            </span>
          ) : null}
        </div>
        <SubmitButton className="h-10" pendingText={t("chat.sending")}>
          <Icon name="send" size={18} />
          {t("chat.send")}
        </SubmitButton>
      </div>
    </form>
  );
}

const KIND_ICON = { image: "image", video: "smart_display", pdf: "assignment" } as const;

function LibraryPicker({ onPick }: { onPick: (file: ChatLibraryFile) => void }) {
  const t = useDashT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<ChatLibraryFile[] | null>(null);
  const [pending, start] = useTransition();
  const open = () => {
    dialog.current?.showModal();
    start(async () => setItems(await listChatLibraryAction()));
  };
  return (
    <>
      <button type="button" onClick={open} className={`${btn.secondary} h-10 px-3.5 text-sm`}>
        <Icon name="attach_file" size={18} />
        {t("chat.attach")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t("chat.chooseFile")}
        className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-white p-0 backdrop:bg-midnight/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-bold">{t("chat.chooseFile")}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className={`${btn.ghost} h-9 px-2`} aria-label={t("common.close")}>
              <Icon name="close" size={20} />
            </button>
          </div>
          {items === null ? (
            <p className="m-0 text-sm text-muted">{pending ? t("chat.loadingFiles") : ""}</p>
          ) : items.length === 0 ? (
            <p className="m-0 text-[15px] text-ink-4">{t("chat.noFiles")}</p>
          ) : (
            <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-1.5 overflow-y-auto p-0">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item);
                      dialog.current?.close();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-start hover:border-midnight"
                  >
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt="" className="h-11 w-11 flex-none rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-ivory">
                        <Icon name={KIND_ICON[item.kind as keyof typeof KIND_ICON] ?? "description"} size={22} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{item.name}</span>
                      <span className="text-[13px] text-muted">{item.size}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}

/** A submit button that asks first (deleting). */
export function ConfirmButton({ children, confirm, label, className }: { children: React.ReactNode; confirm: string; label?: string; className: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** 77 Chat on or off, and an academy's course groups. */
export function ChatSettingsForm({ enabled, courseGroups, academy }: { enabled: boolean; courseGroups: boolean; academy: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveChatSettingsAction, initialFormState);
  const on = (name: string, saved: boolean) => (state.values ? state.values[name] === "on" : saved);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="enabled" defaultChecked={on("enabled", enabled)} className="mt-1 h-4 w-4" aria-describedby="f-chat-enabled-hint" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{t("chat.enabled")}</span>
          <span id="f-chat-enabled-hint" className="text-sm text-muted">
            {t("chat.enabledHint")}
          </span>
        </span>
      </label>
      {academy ? (
        <label className="flex items-start gap-3">
          <input type="checkbox" name="courseGroups" defaultChecked={on("courseGroups", courseGroups)} className="mt-1 h-4 w-4" aria-describedby="f-chat-groups-hint" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{t("chat.courseGroups")}</span>
            <span id="f-chat-groups-hint" className="text-sm text-muted">
              {t("chat.courseGroupsHint")}
            </span>
          </span>
        </label>
      ) : null}
      <div>
        <SubmitButton className="h-10" pendingText={t("chat.saving")}>
          {t("chat.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
