import React, { useState } from "react";
import MD from "./MD";

export type MPPart =
  | {
      id: string;
      marks?: number;
      kind: "numeric";
      answer: number;
      tolerance?: number;
      units?: string;
      prompt: string;
      scheme?: string;
      explanation?: string;
    }
  | {
      id: string;
      marks?: number;
      kind: "written";
      prompt: string;
      scheme?: string;
    };

export type MPModel = {
  id: string;
  meta?: string;
  stem: string;
  parts: MPPart[];
  marks?: number;
};

function parseNumber(s: string) {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatPartLabel(id: string) {
  const s = id.trim().toLowerCase();

  // matches: a, b, c... optionally followed by roman numerals i/ii/iii...
  const m = s.match(/^([a-z])([ivx]+)?$/i);
  if (!m) return `(${id})`;

  const main = m[1];
  const sub = m[2];

  if (!sub) return `(${main})`;
  return `(${main})(${sub})`;
}

function isSubPart(id: string) {
  return /^[a-z][ivx]+$/i.test(id); // ai, aii, biv...
}

function getSubLabel(id: string) {
  // ai -> i, aii -> ii
  return id.slice(1);
}

function getMainLabel(id: string) {
  return id[0];
}

export default function MultiPart({ q }: { q: MPModel }) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const totalMarks =
    typeof q.marks === "number"
      ? q.marks
      : q.parts.reduce((sum, p) => sum + (typeof p.marks === "number" ? p.marks : 0), 0);

  return (
    <section className="qbox">
      <div className="qmeta">
        {q.meta ? <span className="qtag">{q.meta}</span> : null}
        <span className="qid">{q.id}</span>
        {totalMarks > 0 ? <span className="qmarks">{totalMarks} marks</span> : null}
      </div>

      <div className="qstem"><MD text={q.stem} /></div>

      {q.parts.map((p) => {
        const isOpen = !!reveal[p.id];

        return (
          <div
            className={`mpart ${isSubPart(p.id) ? "mpart-sub" : "mpart-main"}`}
            key={p.id}
          >
            <div
              className={`mphead ${isSubPart(p.id) ? "is-subpart" : "is-mainpart"}`}
            >
              <strong>
                {isSubPart(p.id)
                  ? `(${getSubLabel(p.id)})`
                  : `(${getMainLabel(p.id)})`}
              </strong>

              {typeof p.marks === "number" ? (
                <span className="qmarks">{p.marks} marks</span>
              ) : null}
            </div>

            <div className="mpprompt"><MD text={p.prompt} /></div>

            {p.kind === "numeric" ? (
              <>
                <div className="mpinput">
                  <input
                    value={input[p.id] ?? ""}
                    onChange={(e) => setInput((s) => ({ ...s, [p.id]: e.target.value }))}
                    placeholder="Enter a number"
                    inputMode="decimal"
                  />
                  {p.units ? <span className="mpunits">{p.units}</span> : null}
                </div>

                <div className="qactions">
                  <button type="button" onClick={() => setChecked((c) => ({ ...c, [p.id]: true }))}>
                    Check
                  </button>
                  <button type="button" onClick={() => setReveal((r) => ({ ...r, [p.id]: !r[p.id] }))}>
                    {isOpen ? "Hide solution" : "Reveal solution"}
                  </button>

                  {checked[p.id] ? (() => {
                    const n = parseNumber(input[p.id] ?? "");
                    if (n === null) return <span>Enter a number</span>;
                    const tol = p.tolerance ?? 0;
                    const ok = Math.abs(n - p.answer) <= tol;
                    return <span>{ok ? "✅ Correct" : `❌ Answer: ${p.answer}${p.units ? " " + p.units : ""}`}</span>;
                  })() : null}
                </div>

                {isOpen && (p.scheme || p.explanation) ? (
                  <div className="qexp">
                    {p.scheme ? (
                      <>
                        <strong>Mark scheme</strong>
                        <MD text={p.scheme} />
                      </>
                    ) : null}

                    {p.explanation ? (
                      <>
                        <strong style={{ display: "block", marginTop: "10px" }}>Explanation</strong>
                        <MD text={p.explanation} />
                      </>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="qactions">
                  <button type="button" onClick={() => setReveal((r) => ({ ...r, [p.id]: !r[p.id] }))}>
                    {isOpen ? "Hide answer" : "Reveal answer"}
                  </button>
                </div>

                {isOpen && p.scheme ? (
                  <div className="qexp">
                    <strong>Mark scheme</strong>
                    <MD text={p.scheme} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}