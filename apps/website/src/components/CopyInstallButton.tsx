"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type FunctionComponent, useCallback, useState } from "react";

const CopyIcon: FunctionComponent = () => (
  <svg
    className="size-4 text-primary-400"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: FunctionComponent = () => (
  <svg
    className="size-4 text-green-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

type Props = {
  packageName: string;
};

export const CopyInstallButton: FunctionComponent<Props> = ({ packageName }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`npm i ${packageName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [packageName]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="relative grid cursor-pointer overflow-hidden rounded-lg border border-primary-900 bg-primary-950 px-4 py-2 font-mono text-primary-100 text-sm transition-colors hover:border-primary-800 hover:bg-primary-900"
    >
      {/* Invisible default content to reserve width */}
      <span className="invisible col-start-1 row-start-1 flex items-center gap-2">
        <span className="text-primary-400">$</span>
        <span>pnpm i {packageName}</span>
        <CopyIcon />
      </span>

      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            className="col-start-1 row-start-1 flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <CheckIcon />
            <span>Copied!</span>
          </motion.span>
        ) : (
          <motion.span
            key="default"
            className="col-start-1 row-start-1 flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-primary-400">$</span>
            <span>pnpm i {packageName}</span>
            <CopyIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
