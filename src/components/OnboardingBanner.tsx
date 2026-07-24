"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Step {
  label: string;
  done: boolean;
  href?: string;
}

interface Props {
  title: string;
  intro: string;
  steps: Step[];
  storageKey: string;
  color?: "orange" | "sky";
}

export function OnboardingBanner({ title, intro, steps, storageKey, color = "orange" }: Props) {
  const [dismissed, setDismissed] = useState(true);
  const allDone = steps.every(s => s.done);

  useEffect(() => {
    if (!allDone && localStorage.getItem(storageKey) !== "1") {
      setDismissed(false);
    }
  }, [storageKey, allDone]);

  if (dismissed) return null;

  const c = color === "sky"
    ? { bg: "bg-sky-50", border: "border-sky-200", h: "text-sky-900", sub: "text-sky-700" }
    : { bg: "bg-orange-50", border: "border-orange-200", h: "text-orange-900", sub: "text-orange-700" };

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl px-5 py-4 mb-6 flex gap-4`}>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${c.h} mb-0.5`}>{title}</p>
        <p className={`text-xs ${c.sub} mb-3`}>{intro}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              {step.done
                ? <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-[10px]">✓</span>
                : <span className="w-5 h-5 rounded-full border-2 border-stone-300 flex items-center justify-center text-stone-400 text-[10px] font-semibold">{i + 1}</span>
              }
              {step.href && !step.done
                ? <Link href={step.href} className="text-orange-600 hover:underline font-medium">{step.label}</Link>
                : <span className={step.done ? "text-stone-400 line-through" : "text-stone-800 font-medium"}>{step.label}</span>
              }
            </div>
          ))}
        </div>
      </div>
      <button onClick={dismiss} className="shrink-0 text-stone-400 hover:text-stone-600 text-xl leading-none mt-0.5" title="Fermer">×</button>
    </div>
  );
}
