import type { StudioNode } from "../pages/types";
import { mapTree } from "./tree";

/**
 * 180.11 What the app shows of a page for a person signed in or signed out:
 * an element marked for the other state is left out, as the app leaves it
 * out. Studio's canvas drew both, so Safra's cover had its question for a
 * new customer over the next trip of a signed-in one. The same node when
 * nothing on the page is marked.
 */
export function shownWhen(body: StudioNode, signedIn: boolean): StudioNode {
  const hidden = signedIn ? "signed_out" : "signed_in";
  const marked = (node: StudioNode): boolean => node.visibility === hidden || (node.children ?? []).some(marked) || (node.card ? marked(node.card) : false);
  if (!marked(body)) return body;
  // The page's own column always stays, whatever it is marked.
  return mapTree(body, (node) => (node.id !== body.id && node.visibility === hidden ? null : node)) ?? body;
}
