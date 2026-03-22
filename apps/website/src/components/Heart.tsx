"use client";

import { motion, type Transition } from "framer-motion";
import type { FunctionComponent } from "react";

const TIMES = [0.1, 0.15, 0.2, 0.25, 0.3, 0.45, 0.55, 1];

const BASE_ANIMATION = [1, 1, 1, 1, 1, 0, 1, 1];

const SCALE_ANIMATION = [1, 1.15, 1, 1.15, 1, 1, 1, 1];

const TRANSITION: Transition = {
  duration: 16,
  times: TIMES,
  ease: "easeInOut",
  repeat: Number.POSITIVE_INFINITY,
  repeatType: "loop",
  repeatDelay: 1,
};

export const Heart: FunctionComponent = () => (
  <motion.svg
    className="text-[#c74e4e]/80"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={{ opacity: 1 }}
    animate={{ opacity: BASE_ANIMATION, scale: SCALE_ANIMATION }}
    transition={TRANSITION}
  >
    <motion.path
      initial={{ pathLength: 1 }}
      animate={{ pathLength: BASE_ANIMATION }}
      transition={TRANSITION}
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
    />
  </motion.svg>
);
