import { MotionConfig } from "framer-motion";
import type { FunctionComponent } from "react";
import { CommandMenu } from "./components/CommandMenu";
import { Toaster } from "./components/Toaster";

// The menu stands on a frosted plate in the header's light, the way cards sit
// on wojtekolek.com: a hairline, a little of the page showing through, and a
// long soft drop. Providers live here, above the menu, so its renders don't
// re-run them.
export const Demo: FunctionComponent = () => (
  <MotionConfig reducedMotion="user">
    <section
      aria-label="Live demo"
      className="rounded-[28px] border border-primary-950/6 bg-primary-0/60 p-2 shadow-[0_40px_90px_-45px_rgb(41_41_41/0.5)] backdrop-blur-sm"
    >
      <CommandMenu />
    </section>
    <Toaster />
  </MotionConfig>
);
