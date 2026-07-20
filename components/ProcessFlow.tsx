"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  ShieldCheck,
  Search,
  FileSignature,
  Handshake,
} from "lucide-react";

// The Ponte process, shown not told. Five nodes, one drawing line,
// staggered reveals. Copy is deliberately minimal: verb + three words.
const STEPS = [
  { icon: FileText, label: "Submit", micro: "Your deal, your documents" },
  { icon: ShieldCheck, label: "Vet", micro: "Facts and papers verified" },
  { icon: Search, label: "Match", micro: "Anonymized to the network" },
  { icon: FileSignature, label: "Paper", micro: "NCNDA and fee terms" },
  { icon: Handshake, label: "Close", micro: "Fee only on success" },
];

export default function ProcessFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

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
            <div key={s.label} className="flow-step flex flex-col items-center text-center">
              <div className="flow-node">
                <s.icon className="h-5 w-5 text-gold" />
              </div>
              <p className="serif text-white mt-4 text-lg" style={{ fontWeight: 500 }}>
                {s.label}
              </p>
              <p className="mt-1 text-[12px] text-gray-2">{s.micro}</p>
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
            <div key={s.label} className="flow-step flex items-center gap-5">
              <div className="flow-node shrink-0">
                <s.icon className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="serif text-white text-lg" style={{ fontWeight: 500 }}>{s.label}</p>
                <p className="text-[12px] text-gray-2">{s.micro}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
