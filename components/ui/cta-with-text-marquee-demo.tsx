import CTAWithVerticalMarquee from "@/components/ui/cta-with-text-marquee";

export default function DemoOne() {
  return (
    <CTAWithVerticalMarquee
      title="Start With One Agent"
      description="Pick one workflow. We build a fixed-scope agent against an acceptance test agreed upfront."
      items={["Lead capture", "Operations", "Customer support", "Voice agents", "Rescue & Migration"].map((t) => (
        <span key={t} className="text-5xl font-light tracking-tight">{t}</span>
      ))}
    />
  );
}
