"use client";

import { useEffect, useState } from "react";

const phrases = ["made clear.", "made easier.", "in one place.", "built to flow."];
const typingSpeed = 65;
const deletingSpeed = 38;

export function RotatingTagline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIndex];
    const complete = text === phrase;
    const empty = text.length === 0;
    const delay = complete && !deleting ? 1750 : deleting && empty ? 320 : deleting ? deletingSpeed : typingSpeed;
    const timer = window.setTimeout(() => {
      if (complete && !deleting) setDeleting(true);
      else if (deleting && empty) { setDeleting(false); setPhraseIndex((current) => (current + 1) % phrases.length); }
      else setText((current) => deleting ? current.slice(0, -1) : phrase.slice(0, current.length + 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [deleting, phraseIndex, text]);

  return <span className="text-primary"><span aria-hidden="true">{text}</span><span className="tagline-caret" aria-hidden="true">|</span><span className="sr-only">{phrases[phraseIndex]}</span></span>;
}
