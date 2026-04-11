// src/components/MCQ.tsx
import React, { useMemo, useState } from "react";
import MD from "./MD";

/* =======================
   Types
======================= */

// parseMCQ returns { id, label } so we support that directly.
// (If you prefer { id, text }, keep both and coerce below.)
export type MCQOption = {
  id: string; // "A", "B", ...
  label: string; // markdown/latex string
};

export type MCQModel = {
  id: string;
  meta?: string;

  stem: string; // from ### Question
  options: MCQOption[]; // from ### Options
  correctId: string; // from ### Answer

  marks?: number;

  // from ### Mark scheme / ### Explanation (parsed from body)
  scheme?: string;
  explanation?: string;
};

/* =======================
   Helpers
======================= */

function normalizeId(s: string) {
  return (s ?? "").trim().toUpperCase();
}

/* =======================
   Component
======================= */

export default function MCQ({ q }: { q: MCQModel }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [reveal, setReveal] = useState(false);

  const totalMarks = typeof q.marks === "number" ? q.marks : 1;
  const correctId = normalizeId(q.correctId);

  const correctOption = useMemo(
    () => q.options.find((o) => normalizeId(o.id) === correctId),
    [q.options, correctId]
  );

  const isCorrect =
    checked && selected !== null && normalizeId(selected) === correctId;

  return (
    <section className="qbox">
      <div className="qmeta">
        {q.meta && <span className="qtag">{q.meta}</span>}
        <span className="qid">{q.id}</span>
        {totalMarks > 0 && <span className="qmarks">{totalMarks} marks</span>}
      </div>

      <div className="qstem">
        <MD text={q.stem} />
      </div>

      <div className="mcq">
        <ul className="mcq-options">
          {q.options.map((opt) => {
            const oid = normalizeId(opt.id);
            const picked = selected !== null && normalizeId(selected) === oid;

            const stateClass = [
              picked && !checked ? "is-selected" : "",
              checked && oid === correctId ? "is-correct" : "",
              checked && picked && oid !== correctId ? "is-wrong" : "",
            ].join(" ");


            return (
              <li key={opt.id} className={`mcq-option ${stateClass}`}>
                <label className="mcq-label">
                  <input
                    className="mcq-radio"
                    type="radio"
                    name={`mcq-${q.id}`}
                    value={oid}
                    checked={picked}
                    onChange={() => {
                      setSelected(oid);
                      if (checked) setChecked(false);
                    }}
                  />
                  <span className="mcq-letter">{oid}.</span>
                  <span className="mcq-text">
                    <MD text={opt.label} />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="qactions">
          <button
            type="button"
            onClick={() => {
              if (!selected) return;
              setChecked(true);
            }}
            disabled={!selected}
          >
            Check
          </button>

          <button type="button" onClick={() => setReveal((r) => !r)}>
            {reveal ? "Hide solution" : "Reveal solution"}
          </button>

          
        </div>

        {reveal && (q.scheme || q.explanation) && (
          <div className="qexp">
            {q.scheme && (
              <>
                <strong>Mark scheme</strong>
                <MD text={q.scheme} />
              </>
            )}
            {q.explanation && (
              <>
                <strong className="qexp-title">Explanation</strong>
                <MD text={q.explanation} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
