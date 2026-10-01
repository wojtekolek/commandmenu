import { MotionConfig, motion } from "framer-motion";
import { type FunctionComponent, useEffect, useState } from "react";
import { site } from "../utils/site";
import { cn, floatingPill } from "../utils/styles";
import { ArrowUpRightIcon } from "./icons";

const NAV = [
  { label: "Demo", href: "#demo" },
  { label: "Features", href: "#features" },
  { label: "Usage", href: "#usage" },
];

const ITEM =
  "relative flex items-center rounded-full font-medium text-[13px] text-primary-600 transition-colors duration-200 hover:text-primary-950";

// True once the page has moved more than `threshold` pixels, for chrome that
// only needs a frame when something scrolls under it.
const useScrolled = (threshold = 8) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Scroll fires every frame; only hand React a value when it actually flips.
    let last: boolean | undefined;
    const update = () => {
      const next = window.scrollY > threshold;
      if (next === last) return;
      last = next;
      setIsScrolled(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return isScrolled;
};

// Pinned to the top, the same menu as wojtekolek.com's: bare while it floats
// over the header, framed once the page scrolls under it. One highlight glides
// between the items rather than each lighting up on its own.
export const TopMenu: FunctionComponent = () => {
  const isScrolled = useScrolled();
  const [hovered, setHovered] = useState<string | null>(null);

  const hoverProps = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered(null),
  });

  const highlight = (id: string) =>
    hovered === id && (
      <motion.span
        layoutId="nav-highlight"
        className="absolute inset-0 rounded-full bg-primary-950/6"
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
      />
    );

  return (
    <MotionConfig reducedMotion="user">
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4">
        <nav
          aria-label="Sections"
          data-scrolled={isScrolled || undefined}
          onMouseLeave={() => setHovered(null)}
          className={cn(floatingPill, "flex animate-fade-down items-center gap-0.5 p-1")}
        >
          {NAV.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              {...hoverProps(href)}
              className={cn(ITEM, "px-2.5 py-1.5 sm:px-3.5")}
            >
              {highlight(href)}
              <span className="relative">{label}</span>
            </a>
          ))}

          <span className="mx-1 h-4 w-px bg-primary-950/10" aria-hidden="true" />

          <a
            href={site.githubUrl}
            target="_blank"
            rel="noreferrer"
            {...hoverProps("github")}
            className={cn(ITEM, "group gap-1 px-2.5 py-1.5 sm:px-3.5")}
          >
            {highlight("github")}
            <span className="relative">GitHub</span>
            <ArrowUpRightIcon className="relative size-3.5 opacity-50 transition-transform duration-300 ease-sail group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href={site.npmUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Version ${site.version} on npm`}
            {...hoverProps("npm")}
            className={cn(ITEM, "px-2.5 py-1.5 tabular-nums sm:px-3")}
          >
            {highlight("npm")}
            <span className="relative">v{site.version}</span>
          </a>
        </nav>
      </header>
    </MotionConfig>
  );
};
