"use client";

/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons, small files the site and the platform serve already sized. */
import { useActionState, useRef, useState } from "react";
import { profileAction } from "@/app/community/(site)/social-actions";
import { Note } from "./forms";
import { safeImageSrc } from "./safe-url";
import type { CmWords } from "./words";

/** The member's own profile: picture, name, username, bio and skills. */
export function ProfileForm({ w, initial }: { w: CmWords; initial: { name: string; handle: string; bio: string; skills: string[]; avatarUrl: string | null } }) {
  const [state, action, pending] = useActionState(profileAction, undefined);
  // The current picture comes from the server (props); a newly chosen one is drawn on a canvas, never turned into an address.
  const current = safeImageSrc(initial.avatarUrl);
  const [chosen, setChosen] = useState(false);
  const [remove, setRemove] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = !remove && (chosen || !!current);
  return (
    <form action={action} className="cm-card">
      <h1>{w.editProfile}</h1>
      <div className="cm-row" style={{ marginTop: 16, gap: 16 }}>
        <span className="av a1" style={{ width: 84, height: 84, fontSize: 32 }}>
          <canvas ref={canvas} width={168} height={168} style={{ width: "100%", height: "100%", display: chosen && !remove ? "block" : "none" }} aria-hidden="true" />
          {!chosen && current && !remove ? <img src={current} alt="" /> : null}
          {!shown ? (initial.name[0] ?? "?").toUpperCase() : null}
        </span>
        <label className="cm-btn g">
          <span className="ms" aria-hidden="true">photo_camera</span>
          {w.changePhoto}
          <input
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className="cm-sr"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              // The picture's pixels, cropped square, drawn on the canvas: nothing from the file reaches an address or the page's HTML.
              void createImageBitmap(f).then(
                (bitmap) => {
                  const ctx = canvas.current?.getContext("2d");
                  if (ctx) {
                    const side = Math.min(bitmap.width, bitmap.height);
                    ctx.clearRect(0, 0, 168, 168);
                    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 168, 168);
                  }
                  bitmap.close();
                  setChosen(true);
                  setRemove(false);
                },
                () => setChosen(false),
              );
            }}
          />
        </label>
        {shown ? (
          <button type="button" className="cm-link" onClick={() => setRemove(true)}><span className="ms" aria-hidden="true">delete</span>{w.removePhoto}</button>
        ) : null}
        <input type="hidden" name="removeAvatar" value={remove ? "1" : "0"} />
      </div>
      <label className="cm-field">
        {w.name}
        <input name="name" required minLength={2} maxLength={60} defaultValue={initial.name} autoComplete="name" />
      </label>
      <label className="cm-field">
        {w.username}
        <input name="handle" required pattern="[a-z0-9_.]{3,30}" maxLength={30} defaultValue={initial.handle} autoCapitalize="none" spellCheck={false} />
        <small>{w.usernameHint}</small>
      </label>
      <label className="cm-field">
        {w.bio}
        <textarea name="bio" maxLength={300} defaultValue={initial.bio} style={{ minHeight: 90 }} />
      </label>
      <label className="cm-field">
        {w.skills}
        <input name="skills" maxLength={400} defaultValue={initial.skills.join(", ")} placeholder={w.skillsHint} />
      </label>
      <Note state={state} />
      <div className="cm-row" style={{ marginTop: 18 }}>
        <button type="submit" className="cm-btn o" disabled={pending}><span className="ms" aria-hidden="true">save</span>{w.saveChanges}</button>
      </div>
    </form>
  );
}
