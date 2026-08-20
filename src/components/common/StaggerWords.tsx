"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
  /**
   * A closed list rather than `ElementType`: the r3f v9 JSX augmentation
   * (src/types/three-jsx.d.ts) adds three.js tags to the global
   * IntrinsicElements, and a bare `ElementType` then unions in elements
   * without ref/className, collapsing this component's props to `never`.
   * No caller passes anything but the default today; widen deliberately
   * if one ever needs to.
   */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
};

export function StaggerWords({
  text,
  delay = 0,
  stagger = 40,
  className = "",
  as: Tag = "span",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            io.unobserve(node);
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [text]);

  const words = text.split(" ");

  return (
    // Callback ref: with `as` a union of tags, an object ref would need the
    // exact per-tag element type; a callback accepting the broader
    // HTMLElement is assignable to every member (parameter contravariance).
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className={"word" + (seen ? " is-in" : "")}
          style={{ transitionDelay: `${delay + i * stagger}ms` }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
