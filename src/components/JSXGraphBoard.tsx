// src/components/JSXGraphBoard.tsx
import { useEffect, useRef } from "react";

export default function JSXGraphBoard() {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically load JSXGraph from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraphcore.js";
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      const JXG = window.JXG;

      if (!boardRef.current) return;

      const board = JXG.JSXGraph.initBoard(boardRef.current.id, {
        boundingbox: [-4, 4, 4, -4],
        axis: true,
      });

      // Example: draggable point + circle
      const A = board.create("point", [1, 1], { name: "A" });
      board.create("circle", [A, 2]);
    };

    document.body.appendChild(script);

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css";
    document.head.appendChild(link);

    return () => {
      // Nothing to clean
    };
  }, []);

  return (
    <div
      id="jxg-board"
      ref={boardRef}
      style={{
        width: "380px",
        height: "380px",
        margin: "1rem auto",
        background: "var(--brand-sand-lighter, #fafafa)",
      }}
    />
  );
}
