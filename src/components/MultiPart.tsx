import React, { useMemo, useState } from "react";
import MD from "./MD";

/* =======================
   Types
======================= */

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
      explanation?: string;
    };

export type MPModel = {
  id: string;
  meta?: string;
  stem: string;
  parts: MPPart[];
  parentPrompts?: Record<string, string>; // a → "Calculate..."
  marks?: number;
};

/* =======================
   Helpers
======================= */

function parseNumber(s: string) {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isSubPart(id: string) {
  return /^[a-z][ivx]+$/i.test(id); // ai, aii
}

function mainLetter(id: string) {
  return id.trim().toLowerCase()[0];
}

function romanSuffix(id: string) {
  return id.trim().toLowerCase().slice(1);
}

function romanToNum(r: string) {
  const map: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };
  return map[r] ?? 999;
}

/* =======================
   Component
======================= */

export default function MultiPart({ q }: { q: MPModel }) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const totalMarks =
    typeof q.marks === "number"
      ? q.marks
      : q.parts.reduce(
          (sum, p) => sum + (typeof p.marks === "number" ? p.marks : 0),
          0
        );

  /* =======================
     Group parts by a / b / c
  ======================= */

  const { groupKeys, groups, groupMarks } = useMemo(() => {
    const g = q.parts.reduce<Record<string, MPPart[]>>((acc, p) => {
      const k = mainLetter(p.id);
      (acc[k] ??= []).push(p);
      return acc;
    }, {});

    const keys = Object.keys(g).sort();

    for (const k of keys) {
      g[k] = g[k].slice().sort((p1, p2) => {
        const s1 = isSubPart(p1.id) ? romanToNum(romanSuffix(p1.id)) : 0;
        const s2 = isSubPart(p2.id) ? romanToNum(romanSuffix(p2.id)) : 0;
        return s1 - s2;
      });
    }

    const marksFn = (k: string) =>
      g[k].reduce(
        (sum, p) => sum + (typeof p.marks === "number" ? p.marks : 0),
        0
      );

    return { groupKeys: keys, groups: g, groupMarks: marksFn };
  }, [q.parts]);

  /* =======================
     Render
  ======================= */

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

      {groupKeys.map((k) => {
        const group = groups[k];
        const hasSubparts = group.some((p) => isSubPart(p.id));
        const parentText = q.parentPrompts?.[k];

        /* =======================
           CASE 1: (a) with (i)/(ii)
        ======================= */

        if (hasSubparts) {
          return (
            <div key={k} className="mpgroup">
              <div className="mpgroup-box">
                <div className="mpgroup-head">
                  <strong>({k})</strong>
                  {groupMarks(k) > 0 && (
                    <span className="qmarks">{groupMarks(k)} marks</span>
                  )}
                </div>

                {parentText && (
                  <div className="mpgroup-parenttext">
                    <MD text={parentText} />
                  </div>
                )}

                {group.map((p) => {
                  const isOpen = !!reveal[p.id];

                  return (
                    <div key={p.id} className="mpart mpart-sub">
                      <div className="mphead">
                        <strong>({romanSuffix(p.id)})</strong>
                        {typeof p.marks === "number" && (
                          <span className="qmarks">{p.marks} marks</span>
                        )}
                      </div>

                      <div className="mpprompt">
                        <MD text={p.prompt} />
                      </div>

                      {renderAnswerUI({
                        p,
                        isOpen,
                        input,
                        setInput,
                        checked,
                        setChecked,
                        reveal,
                        setReveal,
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        /* =======================
           CASE 2: single (a)
        ======================= */

        return group.map((p) => {
          const isOpen = !!reveal[p.id];

          return (
            <div key={p.id} className="mpart mpart-main">
              <div className="mphead">
                <strong>({p.id})</strong>
                {typeof p.marks === "number" && (
                  <span className="qmarks">{p.marks} marks</span>
                )}
              </div>

              <div className="mpprompt">
                <MD text={p.prompt} />
              </div>

              {renderAnswerUI({
                p,
                isOpen,
                input,
                setInput,
                checked,
                setChecked,
                reveal,
                setReveal,
              })}
            </div>
          );
        });
      })}
    </section>
  );
}

/* =======================
   Shared answer UI
======================= */

function renderAnswerUI({
  p,
  isOpen,
  input,
  setInput,
  checked,
  setChecked,
  reveal,
  setReveal,
}: any) {
  if (p.kind === "numeric") {
    return (
      <>
        <div className="mpinput">
          <input
            value={input[p.id] ?? ""}
            onChange={(e) =>
              setInput((s: any) => ({ ...s, [p.id]: e.target.value }))
            }
            placeholder="Enter a number"
            inputMode="decimal"
          />
          {p.units && <span className="mpunits">{p.units}</span>}
        </div>

        <div className="qactions">
          <button onClick={() => setChecked((c: any) => ({ ...c, [p.id]: true }))}>
            Check
          </button>
          <button onClick={() => setReveal((r: any) => ({ ...r, [p.id]: !r[p.id] }))}>
            {isOpen ? "Hide solution" : "Reveal solution"}
          </button>

          {checked[p.id] &&
            (() => {
              const n = parseNumber(input[p.id] ?? "");
              if (n === null) return <span>Enter a number</span>;
              const tol = p.tolerance ?? 0;
              const ok = Math.abs(n - p.answer) <= tol;
              return (
                <span>
                  {ok ? "✅ Correct" : `❌ Answer: ${p.answer}${p.units ? " " + p.units : ""}`}
                </span>
              );
            })()}
        </div>

        {isOpen && (p.scheme || p.explanation) && (
          <div className="qexp">
            {p.scheme && (
              <>
                <strong>Mark scheme</strong>
                <MD text={p.scheme} />
              </>
            )}
            {p.explanation && (
              <>
                <strong className="qexp-title">Explanation</strong>
                <MD text={p.explanation} />
              </>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="qactions">
        <button onClick={() => setReveal((r: any) => ({ ...r, [p.id]: !r[p.id] }))}>
          {isOpen ? "Hide answer" : "Reveal answer"}
        </button>
      </div>

      {isOpen && (p.scheme || p.explanation) && (
        <div className="qexp">
          {p.scheme && (
            <>
              <strong>Mark scheme</strong>
              <MD text={p.scheme} />
            </>
          )}
          {p.explanation && (
            <>
              <strong className="qexp-title">Explanation</strong>
              <MD text={p.explanation} />
            </>
          )}
        </div>
      )}
    </>
  );
}