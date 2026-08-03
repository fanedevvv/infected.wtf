"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RedirectCountdown({ seconds, to }: { seconds: number; to: string }) {
  const [t, setT] = useState(seconds);
  const router = useRouter();

  useEffect(() => {
    const iv = setInterval(() => {
      setT((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          router.push(to);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [to, router]);

  return <span className="countdown">{t}</span>;
}
