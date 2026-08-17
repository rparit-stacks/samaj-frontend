import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Live on-screen-keyboard height in px, so fixed-position UI (bottom nav,
 * chat compose bar) can react as the keyboard opens/closes instead of
 * relying on `resize: "body"` + 100dvh, which recomputes on a lag and leaves
 * a stale gap between the reserved padding and where the keyboard actually is.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { Keyboard } = await import("@capacitor/keyboard");
      if (cancelled) return;

      const showHandle = await Keyboard.addListener("keyboardWillShow", (info) => {
        setInset(info.keyboardHeight);
      });
      const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
        setInset(0);
      });
      removeShow = () => void showHandle.remove();
      removeHide = () => void hideHandle.remove();
    })();

    return () => {
      cancelled = true;
      removeShow?.();
      removeHide?.();
    };
  }, []);

  return inset;
}
