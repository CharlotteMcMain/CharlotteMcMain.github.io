import { useEffect, useRef } from "react";
import katex from "katex";

export default function TeX({ latex, block = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex ?? "", ref.current, {
        throwOnError: false,
        displayMode: block,
        strict: "warn",
      });
    } catch {}
  }, [latex, block]);
  return <span ref={ref} />;
}
