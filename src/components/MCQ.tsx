import React, { useMemo, useState } from "react";
import MD from "./MD";

export type MCQModel = {
  id: string;
  stem: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation?: string;
  marks?: number;
  meta?: string;
};

export default function MCQ({ q }: { q: MCQModel }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const correct = useMemo(() => picked && picked === q.correctId, [picked, q.correctId]);

  return (
    <section className="qbox">
      <div className="qmeta">
        {q.meta ? <span className="qtag">{q.meta}</span> : null}
        <span className="qid">{q.id}</span>
        {typeof q.marks === "number" ? <span className="qmarks">{q.marks} marks</span> : null}
      </div>

      <div className="qstem"><MD text={q.stem} /></div>

      <div className="qopts">
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={[
              "qopt",
              picked === o.id ? "is-selected" : "",
              reveal && o.id === q.correctId ? "is-correct" : "",
              reveal && picked === o.id && o.id !== q.correctId ? "is-wrong" : "",
            ].join(" ")}
            onClick={() => {
              setPicked((prev) => {
                if (prev === o.id) {
                  setReveal(false);   // hide feedback when unselecting
                  return null;
                }
                return o.id;
              });
            }}
          >
            <span className="qkey">{o.id}</span>
            <span className="qlabel"><MD text={o.label} /></span>
          </button>
        ))}
      </div>

      <div className="qactions">
        <button type="button" onClick={() => setReveal(true)} disabled={!picked}>Check</button>
        {reveal && picked ? <span>{correct ? "✅ Correct" : `❌ Answer: ${q.correctId}`}</span> : null}
      </div>

      {reveal && q.explanation ? (
        <div className="qexp">
          <strong>Explanation</strong>
          <MD text={q.explanation} />
        </div>
      ) : null}
    </section>
  );
}