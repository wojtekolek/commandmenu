import { type ClassNameValue, twMerge } from "tailwind-merge";

export type ClassName = string | null | undefined;

export const cn = (...inputs: ClassNameValue[]) => twMerge(inputs);

// Type roles shared with wojtekolek.com, so section headers read the same on
// both: a small spaced-out label, then the heading proper. An <em> in a
// heading is its quieter second voice.
export const eyebrow = "text-primary-600 text-xs uppercase tracking-[0.2em]";
export const h2 =
  "text-balance text-4xl text-primary-900 tracking-tight lg:text-6xl [&_em]:text-primary-500 [&_em]:not-italic";

// Inline padding for full-bleed bands (the footer): their content lines up
// with `section-spacing` content, and past the 2xl breakpoint with the edge of
// the centred 1440px body.
export const bandInset = "px-8 md:px-16 lg:px-32 2xl:px-[calc(50vw-720px+8rem)]";

// The floating pill behind the top menu, after wojtekolek.com's: no frame at
// the top of the page, where it floats over the header; once the page scrolls
// under it, a frosted fill, a hairline and a soft drop. Toggle with
// `data-scrolled`.
export const floatingPill =
  "rounded-full border border-transparent transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out data-scrolled:border-primary-950/8 data-scrolled:bg-primary-50/70 data-scrolled:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)] data-scrolled:backdrop-blur-md data-scrolled:backdrop-saturate-150";

// The site's one curve, for motion/react: quick to leave, long to settle.
// Mirrors `--ease-sail` in globals.css.
export const ease = [0.22, 1, 0.36, 1] as const;
