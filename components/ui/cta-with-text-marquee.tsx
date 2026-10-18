"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
  onItemsRef?: (items: HTMLElement[]) => void;
}

export function VerticalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 30,
  onItemsRef,
}: VerticalMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onItemsRef && containerRef.current) {
      const items = Array.from(containerRef.current.querySelectorAll(".marquee-item")) as HTMLElement[];
      onItemsRef(items);
    }
  }, [onItemsRef]);

  return (
    <div
      ref={containerRef}
      className={cn("group flex flex-col overflow-hidden", className)}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

interface CTAWithVerticalMarqueeProps {
  title: ReactNode;
  description: ReactNode;
  /** Call-to-action area under the description (buttons, a form, …). */
  action?: ReactNode;
  /** Items scrolling on the right; each one is wrapped in a `.marquee-item`. */
  items: ReactNode[];
  speed?: number;
  className?: string;
}

export default function CTAWithVerticalMarquee({ title, description, action, items, speed = 20, className }: CTAWithVerticalMarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Fade items out the further they drift from the vertical centre.
  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const marqueeItems = marqueeContainer.querySelectorAll(".marquee-item");
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      marqueeItems.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const opacity = 1 - normalizedDistance * 0.75;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    let frame = 0;
    const animationFrame = () => {
      updateOpacity();
      frame = requestAnimationFrame(animationFrame);
    };
    frame = requestAnimationFrame(animationFrame);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={cn("bg-background text-foreground flex items-center justify-center px-6 py-12 overflow-hidden", className)}>
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left Content */}
          <div className="space-y-8 max-w-xl">
            <h2 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground">{title}</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">{description}</p>
            {action && <div className="flex flex-wrap gap-4">{action}</div>}
          </div>

          {/* Right Marquee */}
          <div ref={marqueeRef} className="relative h-[480px] lg:h-[600px] flex items-center justify-center">
            <div className="relative w-full h-full">
              <VerticalMarquee speed={speed} className="h-full">
                {items.map((item, idx) => (
                  <div key={idx} className="py-5 marquee-item">
                    {item}
                  </div>
                ))}
              </VerticalMarquee>

              {/* Top vignette */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background via-background/50 to-transparent z-10"></div>

              {/* Bottom vignette */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/50 to-transparent z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
