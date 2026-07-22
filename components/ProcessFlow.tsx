"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, type SystemIconName } from "@/components/icons";

// The Ponte process, shown not told. Five nodes, one drawing line,
// staggered reveals. Copy is deliberately minimal: verb + three words.
const STEPS: { icon: SystemIconName; key: string }[] = [
  { icon: "post", key: "post" },
  { icon: "verify", key: "vet" },
  { icon: "ai", key: "match" },
  { icon: "room", key: "connect" },
  { icon: "check", key: "close" },
];

export default function ProcessFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const t = useTranslations("process");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`flow ${inView ? "in-view" : ""}`}>
      {/* Desktop: horizontal */}
      <div className="flow-track hidden md:block">
        <div
          className="flow-line"
          style={{ left: "6%", right: "6%", top: 25, height: 2 }}
        />
        <div className="relative grid grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.key} className="flow-step flex flex-col items-center text-center">
              <div className="flow-node">
                <Icon name={s.icon} size={20} />
              </div>
              <p className="display mt-4 text-lg text-ink">
                {t(`steps.${s.key}.label`)}
              </p>
              <p className="mt-1 text-[12px] text-muted">{t(`steps.${s.key}.micro`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical */}
      <div className="flow-track md:hidden">
        <div
          className="flow-line flow-line--v"
          style={{ left: 25, top: "4%", bottom: "4%", width: 2, transformOrigin: "center top" }}
        />
        <div className="relative space-y-8">
          {STEPS.map((s) => (
            <div key={s.key} className="flow-step flex items-center gap-5">
              <div className="flow-node shrink-0">
                <Icon name={s.icon} size={20} />
              </div>
              <div>
                <p className="display text-lg text-ink">{t(`steps.${s.key}.label`)}</p>
                <p className="text-[12px] text-muted">{t(`steps.${s.key}.micro`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
