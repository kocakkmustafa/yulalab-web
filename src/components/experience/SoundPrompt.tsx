"use client";

import { useEffect, useState } from "react";
import styles from "./Experience.module.css";

export const SOUND_PROMPT_KEY = "yula.sound.prompted.v1";

function readAnswered(): boolean {
  try {
    return window.sessionStorage.getItem(SOUND_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberAnswered(): void {
  try {
    window.sessionStorage.setItem(SOUND_PROMPT_KEY, "1");
  } catch {
    // Blocked storage only means the question may be asked again.
  }
}

/**
 * One opt-in question for the journey's ambient sound, asked once per tab
 * after the opening card. Sound never starts without the visitor's click:
 * "Sound on" is the user gesture the AudioContext needs. The header toggle
 * keeps working either way.
 */
export function SoundPrompt({
  copy,
  soundEnabled,
  onSoundToggle,
}: {
  copy: { prompt: string; on: string; skip: string };
  soundEnabled: boolean;
  onSoundToggle: () => void;
}) {
  // Rendered only after mount, so server markup never carries the prompt.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!readAnswered()) setOpen(true);
  }, []);

  if (!open || soundEnabled) return null;

  const answer = (enable: boolean) => {
    rememberAnswered();
    setOpen(false);
    if (enable) onSoundToggle();
  };

  return (
    <div className={styles.soundPrompt} role="region" aria-label={copy.prompt}>
      <span className={styles.soundPromptMark} aria-hidden="true" />
      <p>{copy.prompt}</p>
      <button type="button" className={styles.soundPromptOn} onClick={() => answer(true)}>
        {copy.on}
      </button>
      <button type="button" className={styles.soundPromptSkip} onClick={() => answer(false)}>
        {copy.skip}
      </button>
    </div>
  );
}
