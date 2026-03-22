import { twMerge } from "tailwind-merge";

export type ClassName = string | null | undefined;

export const cn = (...inputs: ClassName[]) => twMerge(inputs);

export const focusClasses: ClassName =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2";
