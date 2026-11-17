"use client";

import { useState } from "react";
import { KitSwitch } from "./client";

/**
 * 132.143, 132.170 A setting's switch inside a form: the console's one
 * switch (KitSwitch, named by its visible label `labelledBy`), sending
 * `name` as a ticked checkbox would ("on") while it is on, and nothing
 * while it is off. Saved with the form's own button.
 */
export function KitFormSwitch({ name, defaultChecked, labelledBy, describedBy, disabled = false }: { name: string; defaultChecked: boolean; labelledBy: string; describedBy?: string; disabled?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <>
      {on ? <input type="hidden" name={name} value="on" /> : null}
      <KitSwitch checked={on} onChange={setOn} labelledBy={labelledBy} describedBy={describedBy} disabled={disabled} />
    </>
  );
}
