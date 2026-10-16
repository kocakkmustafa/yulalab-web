"use client";

import { createElement, type ElementType } from "react";
import { useReveal } from "./useReveal";

type Props = {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
  as?: ElementType;
};

export function StaggerWords({
  text,
  delay = 0,
  stagger = 40,
  className = "",
  as: Tag = "span",
}: Props) {
  const { ref, ready, seen } = useReveal({ threshold: 0.2, rootMargin: "0px" });

  const words = text.split(" ");

  return createElement(
    Tag,
    { ref, className },
    words.map((word, i) => (
      <span
        key={i}
        className={`word${ready ? " is-ready" : ""}${seen ? " is-in" : ""}`}
        style={{ transitionDelay: `${delay + i * stagger}ms` }}
      >
        {word}
        {i < words.length - 1 ? " " : ""}
      </span>
    )),
  );
}
