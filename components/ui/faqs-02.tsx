import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type Faq = { q: string; a: ReactNode };

interface Faqs02Props {
  faqs: Faq[];
  label?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

// Two-column FAQ block: sticky heading on the left, accordion on the right.
// Adapted from the shadcn "faqs-02" block (support card removed, content passed in as props).
export default function Faqs02({
  faqs,
  label = "FAQs",
  title = "Your questions answered",
  description,
  className,
}: Faqs02Props) {
  return (
    <section className={cn("bg-background py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div className="lg:sticky lg:top-24 flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm shadow-black/5">
              {label}
            </span>
            <h2
              className="text-balance font-semibold tracking-tight"
              style={{
                fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
              }}
            >
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>

          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
