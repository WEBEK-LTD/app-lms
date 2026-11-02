/**
 * 82.4 The Pages & look editor's saves, counted. Each change to the draft
 * gets the next number; a save (or a publish) carries the last one. An answer
 * to a call older than one already answered is behind it and is left out (its
 * draft is older), and the draft is saved once the call carrying the last
 * change is answered. A call that replaces the draft with the server's (an
 * earlier publish, the published pages, a design) is a change of its own, so
 * the saves sent before it no longer count.
 */
export class DraftSaves {
  private last = 0;
  private answered = 0;
  private saved = 0;

  /** A change to the draft. */
  change(): void {
    this.last += 1;
  }

  /** Changes the server doesn't have yet. */
  get dirty(): boolean {
    return this.saved < this.last;
  }

  /** A save or a publish of the draft as it is: the change it carries. */
  send(): number {
    return this.last;
  }

  /** A call that replaces the draft with the server's. */
  sendReplace(): number {
    this.last += 1;
    return this.last;
  }

  /** No change since the call sent at `sent`. */
  isLast(sent: number): boolean {
    return sent === this.last;
  }

  /**
   * The answer to the call sent at `sent`: "behind" a later call answered
   * already (left out), the "last" change's, or an "earlier" one's (later
   * changes are still to save).
   */
  answer(sent: number, ok: boolean): "behind" | "earlier" | "last" {
    if (sent < this.answered) return "behind";
    this.answered = sent;
    if (ok) this.saved = Math.max(this.saved, sent);
    return sent === this.last ? "last" : "earlier";
  }

  /** The editor took the server's draft as its own: nothing left to save. */
  replaced(): void {
    this.saved = this.last;
    this.answered = this.last;
  }
}
