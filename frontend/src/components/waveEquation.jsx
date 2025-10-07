// src/components/WaveEquation.jsx (highlight→variables with quick-pick + colour tags + drag-and-drop equation)
// Drop-in replacement. Adds:
// - Bubble pops directly under selection
// - Quick-pick for v, f, \lambda with distinct colours
// - Colour-coded variable chips
// - Drag & drop variables/operators into a visual equation builder (live KaTeX)
// - Click to append (for accessibility / touch)

import { useMemo, useState, useEffect, useRef } from "react";
import katex from "katex";

/* ----------------------- Tiny KaTeX renderer ----------------------- */
function TeX({ latex = "", block = false, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
        throwOnError: false,
        displayMode: block,
        strict: "warn",
      });
    } catch {}
  }, [latex, block]);
  const Tag = block ? "div" : "span";
  return <Tag ref={ref} className={className} />;
}

/* ----------------------- Helpers & question gen ----------------------- */
const randBetween = (min, max, step = 1) => {
  const n = min + Math.random() * (max - min);
  return Math.round(n / step) * step;
};

const format = (num, dp = 2) => Number(num).toFixed(dp);

function genQuestion() {
  const mode = ["v", "f", "lambda"][Math.floor(Math.random() * 3)];

  // Friendly ranges
  const f = randBetween(2, 20, 1); // Hz
  const lambda = randBetween(0.2, 3.0, 0.01); // m
  const v = f * lambda; // m/s

  if (mode === "v") {
    return {
      id: crypto.randomUUID(),
      mode,
      given: { f, lambda },
      ask: "v",
      promptParts: [
        { t: "A wave has frequency " },
        { m: `${f}\\,\\mathrm{Hz}` },
        { t: " and wavelength " },
        { m: `${format(lambda, 2)}\\,\\mathrm{m}` },
        { t: ". Find its speed " },
        { m: "v" },
        { t: " in " },
        { m: "\\mathrm{m\\,s^{-1}}" },
        { t: "." },
      ],
      answer: { value: v, unit: "m/s", tolAbs: Math.max(0.02 * v, 0.05) },
    };
  }

  if (mode === "f") {
    return {
      id: crypto.randomUUID(),
      mode,
      given: { v, lambda },
      ask: "f",
      promptParts: [
        { t: "A wave travels at " },
        { m: `${format(v, 2)}\\,\\mathrm{m\\,s^{-1}}` },
        { t: " with wavelength " },
        { m: `${format(lambda, 2)}\\,\\mathrm{m}` },
        { t: ". Find its frequency " },
        { m: "f" },
        { t: " in " },
        { m: "\\mathrm{Hz}" },
        { t: "." },
      ],
      answer: { value: v / lambda, unit: "Hz", tolAbs: 0.05 },
    };
  }

  return {
    id: crypto.randomUUID(),
    mode,
    given: { v, f },
    ask: "lambda",
    promptParts: [
      { t: "A wave travels at " },
      { m: `${format(v, 2)}\\,\\mathrm{m\\,s^{-1}}` },
      { t: " with frequency " },
      { m: `${f}\\,\\mathrm{Hz}` },
      { t: ". Find its wavelength " },
      { m: "\\lambda" },
      { t: " in " },
      { m: "\\mathrm{m}" },
      { t: "." },
    ],
    answer: { value: v / f, unit: "m", tolAbs: 0.01 },
  };
}

const parseNumber = (s) => {
  if (s == null) return NaN;
  const x = String(s).trim().replace(",", ".");
  return Number(x);
};

const STORE_KEY = "wave-vfl-stats";

/* ----------------------- Selection → Variable utilities ----------------------- */
function getSelectionTextWithin(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const rect = range.getBoundingClientRect();
  return { text, rect };
}

const QUICK = [
  { key: "v", label: "v", latex: "v", color: "blue", bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  { key: "f", label: "f", latex: "f", color: "green", bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200" },
  { key: "lambda", label: "λ", latex: "\\lambda", color: "purple", bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
];

/* ----------------------- Main component ----------------------- */
export default function WaveEquation() {
  const [q, setQ] = useState(genQuestion);
  const [ans, setAns] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{"correct":0,"total":0}');
    } catch {
      return { correct: 0, total: 0 };
    }
  });

  // Visual equation: built by dropping tokens
  const [eqParts, setEqParts] = useState([]); // array of latex strings
  const eqLatex = eqParts.join(" ");

  // Variables the learner created
  const [variables, setVariables] = useState([]); // {id,label,latex,valueText,color}

  const [bubble, setBubble] = useState(null); // {x,y,text}
  const promptRef = useRef(null);

  const accuracy = useMemo(
    () => (stats.total ? Math.round((100 * stats.correct) / stats.total) : 0),
    [stats]
  );

  const check = () => {
    const val = parseNumber(ans);
    if (Number.isNaN(val)) {
      setFeedback({ type: "error", msg: "Please enter a number (e.g. 12.5)." });
      return;
    }
    const ok = Math.abs(val - q.answer.value) <= q.answer.tolAbs;
    const next = { correct: stats.correct + (ok ? 1 : 0), total: stats.total + 1 };
    setStats(next);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setFeedback({
      type: ok ? "success" : "error",
      msg: ok
        ? "✅ Correct!"
        : `❌ Not quite. Expected ≈ ${q.answer.value.toFixed(2)} ${q.answer.unit}.`,
    });
  };

  const newQ = () => {
    setQ(genQuestion());
    setAns("");
    setFeedback(null);
    setVariables([]);
    setBubble(null);
    setEqParts([]);
  };

  const onMouseUpPrompt = () => {
    const sel = getSelectionTextWithin(promptRef.current);
    if (!sel) return setBubble(null);
    const { text, rect } = sel;
    // place bubble just below the selection; clamp X
    const x = Math.min(window.innerWidth - 260, Math.max(12, rect.left + rect.width / 2 - 130));
    const y = rect.bottom + window.scrollY + 8;
    setBubble({ x, y, text });
  };

  const addVariable = (quick) => {
    if (!bubble) return;
    const id = crypto.randomUUID();
    setVariables((v) => [
      ...v,
      {
        id,
        label: quick.label,
        latex: quick.latex,
        valueText: bubble.text,
        color: quick.color,
      },
    ]);
    setBubble(null);
  };

  // Drag & Drop handlers
  const onDragStart = (e, latex) => {
    e.dataTransfer.setData("text/plain", latex);
    e.dataTransfer.effectAllowed = "copy";
  };
  const onDropEq = (e) => {
    e.preventDefault();
    const latex = e.dataTransfer.getData("text/plain");
    if (!latex) return;
    setEqParts((arr) => [...arr, latex]);
  };
  const onDragOverEq = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const operatorPalette = [
    { k: "=", latex: "=", title: "equals" },
    { k: "×", latex: "\\times", title: "multiply" },
    { k: "·", latex: "\\,", title: "thin space" },
    { k: "(", latex: "(", title: "(" },
    { k: ")", latex: ")", title: ")" },
  ];

  const removeLast = () => setEqParts((p) => p.slice(0, -1));
  const clearEq = () => setEqParts([]);

  const appendLatex = (latex) => setEqParts((arr) => [...arr, latex]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wave Equation Practice</h1>
        <div className="text-sm text-gray-600">
          Score: <span className="font-medium">{stats.correct}</span> / {stats.total} ({accuracy}%)
        </div>
      </header>

      <div className="p-6 bg-white rounded-2xl shadow space-y-5 relative">
        <div className="text-gray-700 select-text">
          <TeX latex={"v = f\\,\\lambda"} block className="mb-2" />
          <p
            className="text-lg leading-relaxed cursor-text"
            ref={promptRef}
            onMouseUp={onMouseUpPrompt}
          >
            {q.promptParts.map((part, i) =>
              part.m ? <TeX key={i} latex={part.m} /> : <span key={i}>{part.t}</span>
            )}
          </p>
        </div>

        {/* Floating quick-pick bubble */}
        {bubble && (
          <div
            className="absolute z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-md p-3"
            style={{ left: bubble.x, top: bubble.y }}
          >
            <div className="text-sm text-gray-600 mb-2">Label this highlight as:</div>
            <div className="flex gap-2">
              {QUICK.map((qk) => (
                <button
                  key={qk.key}
                  onClick={() => addVariable(qk)}
                  className={`flex-1 ${qk.bg} ${qk.text} border rounded-lg px-3 py-2 text-sm hover:ring-2 ${qk.ring}`}
                >
                  <TeX latex={qk.latex} />
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2 line-clamp-2">“{bubble.text}”</div>
          </div>
        )}

        {/* Palette & Variables */}
        <div className="space-y-3">
          <div className="text-sm text-gray-700">Variables from your highlights:</div>
          <div className="flex flex-wrap gap-2">
            {variables.length === 0 && (
              <div className="text-xs text-gray-500">Select text in the question to create v, f, or \lambda.</div>
            )}
            {variables.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={(e) => onDragStart(e, v.latex)}
                onClick={() => appendLatex(v.latex)}
                title={`Drag or click ${v.label} into the equation`}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border ${
                  v.color === "blue"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : v.color === "green"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-purple-50 border-purple-200 text-purple-700"
                } cursor-grab active:cursor-grabbing select-none`}
              >
                <TeX latex={v.latex} />
                <span className="text-xs opacity-80">{v.valueText}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVariables((arr) => arr.filter((x) => x.id !== v.id));
                  }}
                  className="ml-1 text-xs opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-700">Operators:</div>
            <div className="flex flex-wrap gap-2">
              {operatorPalette.map((op) => (
                <div
                  key={op.k}
                  draggable
                  onDragStart={(e) => onDragStart(e, op.latex)}
                  onClick={() => appendLatex(op.latex)}
                  title={`Drag or click ${op.title}`}
                  className="px-2.5 py-1.5 rounded-lg border bg-gray-50 text-gray-800 cursor-grab active:cursor-grabbing"
                >
                  <TeX latex={op.latex} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equation drop zone */}
        <div>
          <label className="text-sm text-gray-700 mb-1 block">Build your equation by dragging tokens below:</label>
          <div
            onDrop={onDropEq}
            onDragOver={onDragOverEq}
            className={`min-h-16 rounded-2xl border-2 p-4 bg-gray-50 transition ${
              eqParts.length ? "border-indigo-300" : "border-dashed border-gray-300"
            }`}
          >
            <TeX latex={eqLatex || "\\text{Drag variables and operators here.}"} />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={removeLast} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm">Backspace</button>
            <button onClick={clearEq} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm">Clear</button>
          </div>
        </div>

        {/* Numeric answer check */}
        <div className="flex items-center gap-2 pt-2">
          <input
            value={ans}
            onChange={(e) => setAns(e.target.value)}
            inputMode="decimal"
            placeholder={q.answer.unit}
            className="border border-gray-300 rounded-xl px-3 py-2 w-44"
          />
          <button
            onClick={check}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Check
          </button>
          <button
            onClick={newQ}
            className="px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            New question
          </button>
        </div>

        {feedback && (
          <div
            className={`text-sm rounded-lg px-3 py-2 border-l-4 ${
              feedback.type === "success"
                ? "bg-green-50 border-green-600 text-green-700"
                : "bg-red-50 border-red-600 text-red-700"
            }`}
          >
            {feedback.msg}
            <div className="text-xs text-gray-600 mt-1">
              Tolerance: ±{q.answer.tolAbs.toFixed(2)} {q.answer.unit}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          Keep units in SI: <TeX latex={"v\\,[\\mathrm{m\\,s^{-1}}],\\ f\\,[\\mathrm{Hz}],\\ \\lambda\\,[\\mathrm{m}]"} />
        </div>
      </div>

      {/* Tiny help */}
      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">Tips for highlighting & dragging</summary>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Drag to select text in the prompt → choose v, f, or \lambda from the popup.</li>
          <li>Drag coloured chips and operator tiles into the equation area (or click them).</li>
          <li>Use Backspace/Clear to adjust your build. The equation renders live.</li>
        </ul>
      </details>
    </div>
  );
}
