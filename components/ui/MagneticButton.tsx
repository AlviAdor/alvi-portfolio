"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import { playCue } from "@/lib/audio";

interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  external?: boolean;
  className?: string;
  ariaLabel?: string;
}

const STRENGTH = 0.32;

/** CTA that leans toward the cursor; plain button/link on touch and keyboard. */
export default function MagneticButton({ children, href, onClick, variant = "primary", external, className = "", ariaLabel }: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const ix = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const iy = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });

  const move = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(dx * STRENGTH);
    y.set(dy * STRENGTH);
    ix.set(dx * STRENGTH * 0.45);
    iy.set(dy * STRENGTH * 0.45);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
    ix.set(0);
    iy.set(0);
  };

  const styles =
    variant === "primary"
      ? "bg-neon text-obsidian hover:shadow-[0_0_40px_-6px_rgb(0_240_255/0.7)]"
      : "glass text-ink hover:border-neon/50 hover:text-neon";

  const shared = {
    style: { x, y },
    onPointerMove: move,
    onPointerLeave: reset,
    onPointerEnter: () => playCue("hover"),
    "aria-label": ariaLabel,
    className: `relative inline-flex items-center gap-3 px-6 py-3.5 font-mono text-xs font-medium tracking-[0.14em] uppercase transition-[box-shadow,color,border-color] duration-300 ${styles} ${className}`,
  };
  const inner = (
    <motion.span style={{ x: ix, y: iy }} className="inline-flex items-center gap-3">
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <motion.a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={() => {
          playCue("click");
          onClick?.();
        }}
        {...shared}
      >
        {inner}
      </motion.a>
    );
  }
  return (
    <motion.button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      onClick={() => {
        playCue("click");
        onClick?.();
      }}
      {...shared}
    >
      {inner}
    </motion.button>
  );
}
