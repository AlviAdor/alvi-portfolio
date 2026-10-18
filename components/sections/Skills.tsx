"use client";

import dynamic from "next/dynamic";
import SectionHeading from "@/components/ui/SectionHeading";

const SkillGraph = dynamic(() => import("@/components/canvas/SkillGraph"), {
  ssr: false,
  loading: () => <div className="glass h-[520px] animate-pulse sm:h-[600px]" />,
});

export default function Skills() {
  return (
    <section id="skills" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index="08 / 09"
        eyebrow="Neural skill graph"
        title={
          <>
            The stack is a network, <span className="text-mute">not a list.</span>
          </>
        }
        lede="PyTorch feeds EfficientNet, EfficientNet feeds TinyML, TinyML needs C++, and C++ and OpenGL lead straight to WebGL. Hover a node to see which skills it connects to."
      />
      <div data-reveal>
        <SkillGraph />
      </div>
    </section>
  );
}
