import Faqs02 from "@/components/ui/faqs-02";

export default function Faqs02Demo() {
  return (
    <Faqs02
      faqs={[
        { q: "Are blocks responsive?", a: "Every block reads from ~380px to full desktop." },
        { q: "Do you handle dark mode?", a: "Yes — every block uses shadcn CSS variables." },
      ]}
    />
  );
}
