import { type FunctionComponent, useSyncExternalStore } from "react";
import { CheckIcon } from "../../../components/icons";

type Toast = { id: number; message: string };

// A tiny store outside React, so showing and hiding a toast re-renders the toast alone, not
// the menu that triggered it.
let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => current;
const getServerSnapshot = () => null;

// A fresh id per call, so the same message twice still plays its entrance.
export const showToast = (message: string) => {
  clearTimeout(timer);
  current = { id: (current?.id ?? 0) + 1, message };
  emit();
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 2000);
};

export const Toaster: FunctionComponent = () => {
  const toast = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="flex animate-toast-in items-center gap-2 rounded-full bg-primary-950 py-2.5 pr-5 pl-4 text-primary-50 text-sm shadow-[0_16px_40px_-14px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.08)]"
        >
          <CheckIcon className="size-4 text-secondary-300" />
          {toast.message}
        </div>
      )}
    </div>
  );
};
