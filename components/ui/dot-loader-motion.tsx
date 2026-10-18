"use client";
import { motion } from "motion/react";
import React from "react";

const DotLoaderMotion = () => {
  const transition = (x: number) => {
    return {
      duration: 1,
      repeat: Infinity,
      repeatType: "loop" as const,
      delay: x * 0.2,
      ease: "easeInOut",
    };
  };
  const dotClass =
    "h-4 w-4 rounded-full border border-border bg-gradient-to-b from-foreground/70 to-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, 10, 0] }}
        transition={transition(0) as any}
        className={dotClass}
      />
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, 10, 0] }}
        transition={transition(1) as any}
        className={dotClass}
      />
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, 10, 0] }}
        transition={transition(2) as any}
        className={dotClass}
      />
    </div>
  );
};

export default DotLoaderMotion;
