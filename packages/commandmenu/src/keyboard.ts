import type { KeyboardEvent } from "react";
import type { Config } from "./types";

/** `"⇧ S"`, `"s"` and `"⇧ s"` all mean the same shortcut. */
const normalize = (shortcut: string) => shortcut.toUpperCase();

/** Maps each shortcut to the first enabled item that has it. */
export const buildShortcuts = <T extends Config>(items: Iterable<T>): Map<string, T> => {
  const shortcuts = new Map<string, T>();
  for (const item of items) {
    if (!item.shortcut || item.disabled) continue;
    const key = normalize(item.shortcut);
    if (!shortcuts.has(key)) shortcuts.set(key, item);
  }
  return shortcuts;
};

/**
 * The item a Cmd/Ctrl key event triggers, if any. Tries the character the key types first
 * (follows the layout, so AZERTY's A is "A"), then the physical key (so "F" still works on a
 * Cyrillic layout, and "1" when Shift turns the key into "!").
 */
export const matchShortcut = <T>(shortcuts: Map<string, T>, e: KeyboardEvent): T | undefined => {
  const prefix = e.shiftKey ? "⇧ " : "";
  const typed = e.key.length === 1 ? shortcuts.get(prefix + e.key.toUpperCase()) : undefined;
  const physical = e.code.replace(/^(Key|Digit|Numpad)/, "").toUpperCase();
  return typed ?? (physical ? shortcuts.get(prefix + physical) : undefined);
};

/**
 * Mid-composition keys belong to the IME. Safari fires `compositionend` before the keydown that
 * commits, so that one only shows up as keyCode 229.
 */
export const isComposing = (e: KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229;

/**
 * Navigation belongs to the search input (the element that controls the list) or the menu
 * element itself. Keys pressed in any other control inside the menu, like a button, are left
 * to that control.
 */
export const isFromSearch = (e: KeyboardEvent, listId: string) =>
  e.target === e.currentTarget || (e.target as Element).getAttribute("aria-controls") === listId;
