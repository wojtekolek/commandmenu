import { LazyMotion, MotionConfig } from "framer-motion";
import type { FunctionComponent, ReactNode } from "react";

const loadFeatures = () => import("./motionFeatures").then((mod) => mod.default);

// Every island renders `m.*` under this. The animation features arrive in one
// chunk the islands share, after hydration, so motion stays off the critical
// path. `strict` catches a stray `motion.*` that would pull them back in.
export const MotionProvider: FunctionComponent<{ children: ReactNode }> = ({ children }) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
