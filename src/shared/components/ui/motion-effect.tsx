// @ts-nocheck
"use client";

import * as React from "react";
import {
  motion,
  useInView,
  type HTMLMotionProps,
  type UseInViewOptions,
  type Transition,
  type Variant,
} from "motion/react";

type MotionEffectProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  className?: string;
  transition?: Transition;
  delay?: number;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  inViewOnce?: boolean;
  blur?: string | boolean;
  slide?:
    | {
        direction?: "up" | "down" | "left" | "right";
        offset?: number;
      }
    | boolean;
  fade?: { initialOpacity?: number; opacity?: number } | boolean;
  zoom?:
    | {
        initialScale?: number;
        scale?: number;
      }
    | boolean;
};

function MotionEffect({
  ref,
  children,
  className,
  transition,
  delay = 0,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  blur = false,
  slide = false,
  fade = false,
  zoom = false,
  ...props
}: MotionEffectProps) {
  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  // Check for reduced motion preference (Base accessibility requirement)
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Base's standard easing curve and duration (120-240ms)
  // Default: 200ms with cubic-bezier(0.4, 0, 0.2, 1)
  const defaultTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : (transition ?? {
        type: "tween",
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1], // Base's standard curve
      });

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  const hiddenVariant: Variant = {};
  const visibleVariant: Variant = {};

  if (slide && !prefersReducedMotion) {
    // Base's "playful restraint": reduce offset from 100px to 20px
    const offset = typeof slide === "boolean" ? 20 : (slide.offset ?? 20);
    const direction =
      typeof slide === "boolean" ? "left" : (slide.direction ?? "left");
    const axis = direction === "up" || direction === "down" ? "y" : "x";
    hiddenVariant[axis] =
      direction === "left" || direction === "up" ? -offset : offset;
    visibleVariant[axis] = 0;
  }

  if (fade && !prefersReducedMotion) {
    hiddenVariant.opacity =
      typeof fade === "boolean" ? 0 : (fade.initialOpacity ?? 0);
    visibleVariant.opacity =
      typeof fade === "boolean" ? 1 : (fade.opacity ?? 1);
  }

  if (zoom && !prefersReducedMotion) {
    hiddenVariant.scale =
      typeof zoom === "boolean" ? 0.5 : (zoom.initialScale ?? 0.5);
    visibleVariant.scale = typeof zoom === "boolean" ? 1 : (zoom.scale ?? 1);
  }

  if (blur && !prefersReducedMotion) {
    hiddenVariant.filter =
      typeof blur === "boolean" ? "blur(10px)" : `blur(${blur})`;
    visibleVariant.filter = "blur(0px)";
  }

  // If reduced motion is preferred, disable all animations
  const effectiveTransition = prefersReducedMotion
    ? { duration: 0 }
    : {
        ...defaultTransition,
        delay: (defaultTransition?.delay ?? 0) + delay,
      };

  return (
    <motion.div
      ref={localRef}
      data-slot="motion-effect"
      initial={prefersReducedMotion ? false : "hidden"}
      animate={prefersReducedMotion ? false : isInView ? "visible" : "hidden"}
      variants={
        prefersReducedMotion
          ? undefined
          : {
              hidden: hiddenVariant,
              visible: visibleVariant,
            }
      }
      transition={effectiveTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { MotionEffect, type MotionEffectProps };
