"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Inertial smooth scrolling for the landing page. Lenis also takes over in-page
// anchor links (#pricing, …) so they glide to the section and clear the floating navbar.
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      anchors: true, // sections already carry scroll-margin-top to clear the navbar
      stopInertiaOnNavigate: true,
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
