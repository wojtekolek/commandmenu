import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { type FunctionComponent, useEffect, useRef, useState } from "react";
import { ease } from "../utils/styles";
import { CheckIcon, CopyIcon } from "./icons";

const PACKAGE_MANAGER = "pnpm";

const swap = {
  initial: { opacity: 0, y: 8, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
  transition: { duration: 0.3, ease },
};

type CopyInstallButtonProps = {
  packageName: string;
};

export const CopyInstallButton: FunctionComponent<CopyInstallButtonProps> = ({ packageName }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const command = `${PACKAGE_MANAGER} i ${packageName}`;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = () => {
    // Only confirm once the write lands: the Clipboard API is missing on
    // insecure origins and can be refused by permissions.
    navigator.clipboard
      ?.writeText(command)
      .then(() => {
        clearTimeout(timerRef.current);
        setCopied(true);
        timerRef.current = setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  const content = (
    <>
      <span className="text-primary-500">$</span>
      <span>{command}</span>
      <CopyIcon className="size-4 text-primary-500 transition-colors duration-200 group-hover:text-primary-300" />
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy "${command}"`}
        className="group relative grid cursor-pointer overflow-hidden rounded-full bg-primary-950 px-5 py-2.5 font-mono text-[13px] text-primary-100 shadow-[0_12px_32px_-12px_rgb(41_41_41/0.55),inset_0_1px_0_rgb(255_255_255/0.08)] transition-[background-color,transform] duration-300 ease-sail hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-secondary-500 focus-visible:outline-offset-2 active:scale-95"
      >
        {/* Holds the width steady while the two states swap. */}
        <span className="invisible col-start-1 row-start-1 flex items-center gap-2.5">
          {content}
        </span>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied" : "idle"}
            {...swap}
            className="col-start-1 row-start-1 flex items-center justify-center gap-2.5"
          >
            {copied ? (
              <>
                <CheckIcon className="size-4 text-secondary-300" />
                <span>Copied, have fun!</span>
              </>
            ) : (
              content
            )}
          </motion.span>
        </AnimatePresence>

        <span role="status" className="sr-only">
          {copied ? "Install command copied" : ""}
        </span>
      </button>
    </MotionConfig>
  );
};
