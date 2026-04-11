import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import type { MouseEvent } from "react";
import "mathlive";
import type { MathfieldElement } from "mathlive";

type MathFieldProps = React.HTMLAttributes<MathfieldElement> & {
  // Optional: if you ever want to set this later
  "math-virtual-keyboard-policy"?: "auto" | "manual" | "sandboxed";
};

const MathField = forwardRef<MathfieldElement, MathFieldProps>(
  (props, ref) =>
    React.createElement("math-field" as any, {
      ...props,
      ref,
    })
);

type PhaseId = "read" | "known-unknown" | "equation";

type Phase = {
  id: PhaseId;
  label: string;
  durationSec: number;
  prompts: string[];
};

const phases: Phase[] = [
  {
    id: "read",
    label: "Read & highlight",
    durationSec: 20,
    prompts: [
      "Read the whole question once without writing.",
      "Click and drag over key numbers and words to highlight them.",
      "These will become the bits you classify in the next step.",
    ],
  },
  {
    id: "known-unknown",
    label: "Classify what you found",
    durationSec: 40,
    prompts: [
      "Click a highlighted part of the question to classify it.",
      "Choose whether it is a variable (with a symbol) or a note (a fact about the situation).",
      "Press Enter after adding the symbol or note to lock it in.",
    ],
  },
  {
    id: "equation",
    label: "Write equations",
    durationSec: 60,
    prompts: [
      "Use the maths box to write equations linking your variables.",
      "Every variable you defined should appear in at least one equation.",
      "Variables turn green once they’ve been used.",
    ],
  },
];

const totalDuration = (phases: Phase[]) =>
  phases.reduce((sum, p) => sum + p.durationSec, 0);

// Palette for Step 2 variable pop-up
const GREEK_SYMBOLS = ["ω", "θ", "α", "Δ", "λ", "φ"];

// Extra palettes for the Mathlive editor (Step 3)
const EQUATION_GREEK_BUTTONS: { label: string; latex: string }[] = [
  { label: "θ", latex: "\\theta" },
  { label: "ω", latex: "\\omega" },
  { label: "α", latex: "\\alpha" },
  { label: "β", latex: "\\beta" },
  { label: "γ", latex: "\\gamma" },
  { label: "Δ", latex: "\\Delta" },
  { label: "λ", latex: "\\lambda" },
  { label: "φ", latex: "\\varphi" },
  { label: "π", latex: "\\pi" },
];

const EQUATION_MATH_BUTTONS: { label: string; latex: string }[] = [
  { label: "+", latex: "+" },
  { label: "−", latex: "-" },
  { label: "×", latex: "\\times " },
  { label: "÷", latex: "\\div " },
  { label: "=", latex: "=" },
  { label: "≈", latex: "\\approx " },
  { label: "≡", latex: "\\equiv " },
  { label: "≤", latex: "\\le " },
  { label: "≥", latex: "\\ge " },
  { label: "√", latex: "\\sqrt{}" },
  { label: "x²", latex: "^2" },
];

// Map display symbol → likely LaTeX forms inside equations
const VARIABLE_SYMBOL_LATEX_EQUIVALENTS: Record<string, string[]> = {
  θ: ["\\theta"],
  ω: ["\\omega"],
  α: ["\\alpha"],
  β: ["\\beta"],
  γ: ["\\gamma"],
  Δ: ["\\Delta"],
  λ: ["\\lambda"],
  φ: ["\\varphi", "\\phi"],
  π: ["\\pi"],
};

const VAR_PURPLE = "#7C3AED";
const VAR_USED_GREEN = "#16A34A";

interface MathsQuestionCoachProps {
  question: string;
  marks?: number;
}

export default function MathsQuestionCoach({
  question,
  marks,
}: MathsQuestionCoachProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(phases[0].durationSec);
  const [isRunning, setIsRunning] = useState(false);

  // For positioning the popup relative to the question text
  const questionRef = useRef<HTMLDivElement | null>(null);

  // Reference to the Mathlive field for Step 3
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  // Tokenisation:
  //  - split into words + spaces
  //  - merge "number + space + unit-word" into a single token (e.g. "18 revolutions")
  const tokens = useMemo(() => {
    const parts = question.split(/(\s+)/);
    const combined: string[] = [];

    const isNumber = (s: string) => /^[0-9]+(\.[0-9]+)?$/.test(s);
    const isUnitLike = (s: string) =>
      /^[a-zA-Zµμ°\/^_\-]+s?\.?,?$/.test(s.replace(/[,\.]+$/, ""));

    let i = 0;
    while (i < parts.length) {
      const part = parts[i];

      if (part.trim().length === 0) {
        combined.push(part);
        i += 1;
        continue;
      }

      if (isNumber(part) && i + 2 < parts.length) {
        const space = parts[i + 1];
        const nextWord = parts[i + 2];

        if (
          space.match(/^\s+$/) &&
          nextWord.trim().length > 0 &&
          isUnitLike(nextWord.trim())
        ) {
          combined.push(part + space + nextWord);
          i += 3;
          continue;
        }
      }

      combined.push(part);
      i += 1;
    }

    return combined;
  }, [question]);

  // Highlighting state (per token index)
  const [selectedTokenIndices, setSelectedTokenIndices] = useState<Set<number>>(
    () => new Set()
  );

  // Drag-selection state for step 1
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);

  // Groups: consecutive highlighted tokens -> one group/pill
  type LabelGroup = {
    id: string; // e.g. "5-7"
    start: number;
    end: number;
    text: string;
  };

  const labelGroups: LabelGroup[] = useMemo(() => {
    const indices = Array.from(selectedTokenIndices).sort((a, b) => a - b);
    if (indices.length === 0) return [];

    const groups: LabelGroup[] = [];
    let groupStart = indices[0];
    let prev = indices[0];

    for (let i = 1; i < indices.length; i++) {
      const idx = indices[i];

      // Allow a single "gap" for a space token: difference of 2 is fine
      if (idx - prev <= 2) {
        prev = idx;
      } else {
        const id = `${groupStart}-${prev}`;
        const text = tokens.slice(groupStart, prev + 1).join("");
        groups.push({ id, start: groupStart, end: prev, text });
        groupStart = idx;
        prev = idx;
      }
    }

    const finalId = `${groupStart}-${prev}`;
    const finalText = tokens.slice(groupStart, prev + 1).join("");
    groups.push({ id: finalId, start: groupStart, end: prev, text: finalText });

    return groups;
  }, [selectedTokenIndices, tokens]);

  // Map token index -> group id for easy lookup
  const tokenToGroupId: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    for (const g of labelGroups) {
      for (let i = g.start; i <= g.end; i++) {
        map[i] = g.id;
      }
    }
    return map;
  }, [labelGroups]);

  // Classification + labels for groups
  type GroupType = "variable" | "note";

  const [groupTypes, setGroupTypes] = useState<Record<string, GroupType>>({});
  const [groupSymbols, setGroupSymbols] = useState<Record<string, string>>({});
  const [groupSymbolEditing, setGroupSymbolEditing] = useState<Set<string>>(
    () => new Set()
  );
  const [groupNotes, setGroupNotes] = useState<Record<string, string>>({});
  const [noteEditingGroups, setNoteEditingGroups] = useState<Set<string>>(
    () => new Set()
  );
  const [groupCommitted, setGroupCommitted] = useState<Set<string>>(
    () => new Set()
  );

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ left: number; top: number } | null>(
    null
  );

  // Step 3: equations as LaTeX from Mathlive
  const [equationsLatex, setEquationsLatex] = useState("");

  const activeGroup =
    activeGroupId && labelGroups.find((g) => g.id === activeGroupId)
      ? labelGroups.find((g) => g.id === activeGroupId)!
      : null;

  // Reset when question changes
  useEffect(() => {
    setSelectedTokenIndices(new Set());
    setGroupTypes({});
    setGroupSymbols({});
    setGroupSymbolEditing(new Set());
    setGroupNotes({});
    setNoteEditingGroups(new Set());
    setGroupCommitted(new Set());
    setActiveGroupId(null);
    setPopupPos(null);
    setEquationsLatex("");
    setCurrentIndex(0);
    setTimeLeft(phases[0].durationSec);
    setIsRunning(false);
  }, [question]);

  // When highlights change, clear classifications (because groups change)
  useEffect(() => {
    setGroupTypes({});
    setGroupSymbols({});
    setGroupSymbolEditing(new Set());
    setGroupNotes({});
    setNoteEditingGroups(new Set());
    setGroupCommitted(new Set());
    setActiveGroupId(null);
    setPopupPos(null);
    setEquationsLatex("");
  }, [selectedTokenIndices]);

  // Timer – per phase, no auto-advance
  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      setIsRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const currentPhase = phases[currentIndex];

  const allSeconds = totalDuration(phases);
  const secondsCompleted =
    phases
      .slice(0, currentIndex)
      .reduce((sum, p) => sum + p.durationSec, 0) +
    (currentPhase.durationSec - timeLeft);
  const progress = Math.min(
    100,
    Math.max(0, (secondsCompleted / allSeconds) * 100)
  );

  const prettyTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const reset = () => {
    setCurrentIndex(0);
    setTimeLeft(phases[0].durationSec);
    setIsRunning(false);
    setSelectedTokenIndices(new Set());
    setGroupTypes({});
    setGroupSymbols({});
    setGroupSymbolEditing(new Set());
    setGroupNotes({});
    setNoteEditingGroups(new Set());
    setGroupCommitted(new Set());
    setActiveGroupId(null);
    setPopupPos(null);
    setEquationsLatex("");
  };

  // ---- Drag selection helpers for Step 1 ----

  const startDrag = (index: number) => {
    if (tokens[index].trim().length === 0) return;

    setIsDragging(true);
    setDragStartIndex(index);

    setSelectedTokenIndices((prev) => {
      const already = prev.has(index);
      setDragMode(already ? "remove" : "add");
      const next = new Set(prev);
      if (already) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const updateDrag = (index: number) => {
    if (!isDragging || dragStartIndex == null || dragMode == null) return;
    if (tokens[index].trim().length === 0) return;

    const start = Math.min(dragStartIndex, index);
    const end = Math.max(dragStartIndex, index);

    setSelectedTokenIndices((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        if (tokens[i].trim().length === 0) continue;
        if (dragMode === "add") next.add(i);
        if (dragMode === "remove") next.delete(i);
      }
      return next;
    });
  };

  const endDrag = () => {
    setIsDragging(false);
    setDragMode(null);
    setDragStartIndex(null);
  };

  // ---- Popup positioning ----

  const openPopupForGroup = (
    groupId: string,
    event: MouseEvent<HTMLSpanElement>
  ) => {
    setActiveGroupId(groupId);

    const pillRect = (event.currentTarget as HTMLSpanElement).getBoundingClientRect();
    const containerRect = questionRef.current
      ? questionRef.current.getBoundingClientRect()
      : null;

    if (containerRect) {
      const centerX = pillRect.left + pillRect.width / 2;
      const topY = pillRect.top;

      setPopupPos({
        left: centerX - containerRect.left,
        top: topY - containerRect.top,
      });
    } else {
      setPopupPos({ left: 0.5, top: 0 });
    }
  };

  const commitGroup = (groupId: string) => {
    setGroupCommitted((prev) => {
      const copy = new Set(prev);
      copy.add(groupId);
      return copy;
    });
    setActiveGroupId(null);
    setPopupPos(null);
  };

  // ---- Navigation ----

  const canAdvance =
    currentPhase.id === "read" || currentPhase.id === "known-unknown";

  const goToNextPhase = () => {
    if (!canAdvance) return;
    if (currentIndex >= phases.length - 1) return;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setTimeLeft(phases[nextIndex].durationSec);
    setIsRunning(false);
    setActiveGroupId(null);
    setPopupPos(null);
  };

  const escapeRegExp = (s: string) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Lists for the summary and usage checking
  const committedVariables = labelGroups.filter(
    (g) => groupCommitted.has(g.id) && groupTypes[g.id] === "variable"
  );
  const committedNotes = labelGroups.filter(
    (g) => groupCommitted.has(g.id) && groupTypes[g.id] === "note"
  );

  // Which variables are used in equations (by symbol / LaTeX)
  const usedVariableIds = useMemo(() => {
    const used = new Set<string>();
    if (!equationsLatex.trim()) return used;

    committedVariables.forEach((g) => {
      const displaySym = (groupSymbols[g.id] || "").trim();
      if (!displaySym) return;

      const variants = [
        displaySym,
        ...(VARIABLE_SYMBOL_LATEX_EQUIVALENTS[displaySym] || []),
      ];

      for (const v of variants) {
        if (!v) continue;
        const pattern = new RegExp(escapeRegExp(v));
        if (pattern.test(equationsLatex)) {
          used.add(g.id);
          break;
        }
      }
    });

    return used;
  }, [equationsLatex, committedVariables, groupSymbols]);

  const allVarsUsed =
    committedVariables.length > 0 &&
    committedVariables.every((g) => usedVariableIds.has(g.id));

  const [finished, setFinished] = useState(false);

  const handleFinish = () => {
    if (!allVarsUsed) return;
    setFinished(true);
    setIsRunning(false);
  };

  // Insert snippets (Greek / maths) into the Mathlive field
  const insertIntoMathfield = (latexSnippet: string) => {
    const mf = mathfieldRef.current;
    if (!mf) return;
    try {
      // Insert latex at current caret
      (mf as any).insert
        ? (mf as any).insert(latexSnippet)
        : (mf as any).executeCommand?.("insert", latexSnippet);
      mf.focus();
    } catch {
      // If anything odd happens, ignore instead of crashing the widget
    }
  };

  return (
    <div
      className="exam-question-coach"
      style={{
        borderRadius: "16px",
        padding: "1rem 1.25rem 1.25rem",
        background: "var(--brand-sand-lighter, #f4f4f7)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        maxWidth: "700px",
        margin: "1.5rem auto",
        fontSize: "0.95rem",
      }}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {/* Question header */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: 0.7,
            marginBottom: "0.25rem",
          }}
        >
          Practice question (calculation)
          {marks != null ? ` · ${marks} mark${marks === 1 ? "" : "s"}` : ""}
        </div>
      </div>

      {/* Question block + popup anchor */}
      <div
        style={{
          marginBottom: "0.75rem",
          position: "relative",
        }}
      >
        {/* Popup for classification / view in Step 2 – centred over clicked pill */}
        {currentPhase.id === "known-unknown" && activeGroup && popupPos && (
          <PopupForGroup
            activeGroup={activeGroup}
            popupPos={popupPos}
            groupTypes={groupTypes}
            groupSymbols={groupSymbols}
            groupNotes={groupNotes}
            groupCommitted={groupCommitted}
            groupSymbolEditing={groupSymbolEditing}
            noteEditingGroups={noteEditingGroups}
            setGroupTypes={setGroupTypes}
            setGroupSymbols={setGroupSymbols}
            setGroupSymbolEditing={setGroupSymbolEditing}
            setGroupNotes={setGroupNotes}
            setNoteEditingGroups={setNoteEditingGroups}
            close={() => {
              setActiveGroupId(null);
              setPopupPos(null);
              setGroupSymbolEditing(new Set());
              setNoteEditingGroups(new Set());
            }}
            commitGroup={commitGroup}
          />
        )}

        {/* Question text with in-place pills */}
        <div
          ref={questionRef}
          style={{
            fontSize: "0.98rem",
            lineHeight: 1.5,
            cursor: "text",
            userSelect: "none",
          }}
        >
          {tokens.map((part, idx) => {
            const isBlank = part.trim().length === 0;
            const groupId = tokenToGroupId[idx];
            const type = groupId ? groupTypes[groupId] : undefined;
            const isInGroup = !!groupId;
            const isCommitted = groupId ? groupCommitted.has(groupId) : false;
            const isUsed = groupId ? usedVariableIds.has(groupId) : false;

            let background = "transparent";
            let border = "2px dotted transparent";

            if (isInGroup) {
              if (!isCommitted) {
                background = "rgba(235, 71, 151, 0.12)";
                border = "2px solid var(--brand-pink, #EB4797)";
              } else if (type === "variable") {
                if (isUsed && currentPhase.id === "equation") {
                  background = "rgba(22, 163, 74, 0.18)";
                  border = `2px solid ${VAR_USED_GREEN}`;
                } else {
                  background = "rgba(124, 58, 237, 0.18)";
                  border = `2px solid ${VAR_PURPLE}`;
                }
              } else if (type === "note") {
                background = "rgba(78, 124, 178, 0.18)";
                border = "2px solid var(--brand-steel, #4E7CB2)";
              }
            }

            const handleMouseDown = (e: MouseEvent<HTMLSpanElement>) => {
              if (currentPhase.id === "read") {
                if (isBlank) return;
                e.preventDefault();
                startDrag(idx);
                return;
              }

              if (currentPhase.id === "known-unknown") {
                if (!groupId) return;
                e.preventDefault();
                openPopupForGroup(groupId, e);
              }
            };

            const handleMouseEnter = () => {
              if (currentPhase.id !== "read") return;
              if (isBlank) return;
              updateDrag(idx);
            };

            return (
              <span
                key={idx}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                style={{
                  cursor:
                    currentPhase.id === "read"
                      ? isBlank
                        ? "default"
                        : "pointer"
                      : groupId
                      ? "pointer"
                      : "default",
                  padding: "0 1px",
                  borderRadius: "4px",
                  background,
                  borderBottom: border,
                  transition:
                    "background 0.15s ease, border-bottom 0.15s ease",
                }}
              >
                {part}
              </span>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "6px",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "var(--brand-pink, #EB4797)",
            transition: "width 0.3s ease-out",
          }}
        />
      </div>

      {/* Phase card */}
      <div
        style={{
          borderRadius: "12px",
          padding: "0.75rem 0.9rem",
          background: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            alignItems: "baseline",
            marginBottom: "0.35rem",
          }}
        >
          <div style={{ fontWeight: 600 }}>
            Step {currentIndex + 1} of {phases.length}: {currentPhase.label}
          </div>
          <div
            style={{
              fontVariantNumeric: "tabular-nums",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
              fontSize: "0.9rem",
            }}
          >
            {prettyTime(timeLeft)}
          </div>
        </div>

        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
          {currentPhase.prompts.map((p) => (
            <li key={p} style={{ marginBottom: "0.25rem" }}>
              {p}
            </li>
          ))}
        </ul>

        {currentPhase.id === "known-unknown" && labelGroups.length === 0 && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              opacity: 0.8,
            }}
          >
            Highlight parts of the question in step 1, then come back here to
            classify them by clicking on the highlighted phrases.
          </div>
        )}

        {/* Step 3 equation area using Mathlive */}
        {currentPhase.id === "equation" && (
          <div style={{ marginTop: "0.75rem" }}>
            <label
              style={{
                fontWeight: 600,
                display: "block",
                marginBottom: "0.35rem",
              }}
            >
              Write your equations:
            </label>

            {/* Symbol toolbar */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                  marginBottom: "0.1rem",
                }}
              >
                Quick symbols:
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.25rem",
                }}
              >
                {EQUATION_GREEK_BUTTONS.map(({ label, latex }) => (
                  <button
                    key={`g-${label}`}
                    type="button"
                    onClick={() => insertIntoMathfield(latex)}
                    style={{
                      border: "1px solid rgba(0,0,0,0.15)",
                      borderRadius: "999px",
                      padding: "0.1rem 0.45rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
                {EQUATION_MATH_BUTTONS.map(({ label, latex }) => (
                  <button
                    key={`m-${label}`}
                    type="button"
                    onClick={() => insertIntoMathfield(latex)}
                    style={{
                      border: "1px solid rgba(0,0,0,0.15)",
                      borderRadius: "999px",
                      padding: "0.1rem 0.45rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                }}
              >
                You can also use the little keyboard icon on the right of the
                maths box for more symbols.
              </div>
            </div>

            <div
              style={{
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.15)",
                padding: "0.4rem 0.5rem",
                background: "#fafafa",
              }}
            >
              <MathField
                ref={mathfieldRef}
                onInput={(evt: any) => {
                  const value =
                    (evt.target as MathfieldElement | undefined)?.value || "";
                  setEquationsLatex(value);
                  setFinished(false);
                }}
                style={{
                  minHeight: "2.4rem",
                  width: "100%",
                  fontSize: "1rem",
                }}
              />
            </div>

            {/* Variable usage status */}
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.85rem",
              }}
            >
              {committedVariables.length === 0 ? (
                <span style={{ opacity: 0.8 }}>
                  Define at least one variable in step 2 to track usage here.
                </span>
              ) : allVarsUsed ? (
                <span
                  style={{
                    color: VAR_USED_GREEN,
                    fontWeight: 600,
                  }}
                >
                  ✅ All your variables appear in your equations.
                </span>
              ) : (
                <span style={{ color: "#b91c1c" }}>
                  You still need to use all of your variables in at least one
                  equation. Variables turn green once they&apos;re used.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary list of committed variables/notes */}
        {(currentPhase.id === "known-unknown" ||
          currentPhase.id === "equation") &&
          (committedVariables.length > 0 || committedNotes.length > 0) && (
            <div
              style={{
                marginTop: "0.6rem",
                paddingTop: "0.5rem",
                borderTop: "1px dashed rgba(0,0,0,0.12)",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Your setup so far:
              </div>

              {committedVariables.length > 0 && (
                <div style={{ marginBottom: "0.25rem" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: VAR_PURPLE,
                      marginBottom: "0.1rem",
                    }}
                  >
                    Variables
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1rem",
                    }}
                  >
                    {committedVariables.map((g) => {
                      const used = usedVariableIds.has(g.id);
                      return (
                        <li key={`var-${g.id}`}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              marginRight: "0.25rem",
                            }}
                          >
                            {groupSymbols[g.id]} =
                          </span>
                          <span>{g.text}</span>
                          {currentPhase.id === "equation" && (
                            <span
                              style={{
                                marginLeft: "0.4rem",
                                fontSize: "0.8rem",
                                color: used ? VAR_USED_GREEN : "#b91c1c",
                              }}
                            >
                              {used ? "used" : "not used yet"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {committedNotes.length > 0 && (
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--brand-steel, #4E7CB2)",
                      marginBottom: "0.1rem",
                    }}
                  >
                    Notes
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1rem",
                    }}
                  >
                    {committedNotes.map((g) => (
                      <li key={`note-${g.id}`}>
                        <span
                          style={{
                            fontStyle: "italic",
                            marginRight: "0.25rem",
                          }}
                        >
                          {g.text} →
                        </span>
                        <span>{groupNotes[g.id]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        {currentPhase.id === "equation" && finished && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              color: VAR_USED_GREEN,
              fontWeight: 600,
            }}
          >
            Nice – you&apos;ve written equations that use all of your
            variables. You&apos;re ready to calculate.
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className="exam-coach-btn"
          >
            {isRunning ? "Pause" : "Start"}
          </button>

          {currentPhase.id !== "equation" && (
            <button
              type="button"
              onClick={goToNextPhase}
              className="exam-coach-btn"
            >
              Next step
            </button>
          )}

          {currentPhase.id === "equation" && (
            <button
              type="button"
              onClick={handleFinish}
              className="exam-coach-btn"
              disabled={!allVarsUsed}
            >
              Finish
            </button>
          )}
        </div>

        <button type="button" onClick={reset} className="exam-coach-btn ghost">
          Reset
        </button>
      </div>
    </div>
  );
}

/* --- Popup component wrapper --- */

type PopupForGroupProps = {
  activeGroup: { id: string; text: string };
  popupPos: { left: number; top: number };
  groupTypes: Record<string, "variable" | "note" | undefined>;
  groupSymbols: Record<string, string>;
  groupNotes: Record<string, string>;
  groupCommitted: Set<string>;
  groupSymbolEditing: Set<string>;
  noteEditingGroups: Set<string>;
  setGroupTypes: React.Dispatch<
    React.SetStateAction<Record<string, "variable" | "note">>
  >;
  setGroupSymbols: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setGroupSymbolEditing: React.Dispatch<React.SetStateAction<Set<string>>>;
  setGroupNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setNoteEditingGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  close: () => void;
  commitGroup: (id: string) => void;
};

function PopupForGroup({
  activeGroup,
  popupPos,
  groupTypes,
  groupSymbols,
  groupNotes,
  groupCommitted,
  groupSymbolEditing,
  noteEditingGroups,
  setGroupTypes,
  setGroupSymbols,
  setGroupSymbolEditing,
  setGroupNotes,
  setNoteEditingGroups,
  close,
  commitGroup,
}: PopupForGroupProps) {
  const isCommitted = groupCommitted.has(activeGroup.id);
  const type = groupTypes[activeGroup.id];

  return (
    <div
      style={{
        position: "absolute",
        left: popupPos.left,
        top: popupPos.top,
        transform: "translate(-50%, -110%)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          padding: "0.5rem 0.7rem 0.6rem",
          minWidth: "260px",
          border: "1px solid rgba(0,0,0,0.08)",
          fontSize: "0.85rem",
        }}
      >
        {isCommitted ? (
          <>
            {/* View mode for committed items */}
            {type === "variable" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.4rem",
                  alignItems: "center",
                  marginBottom: "0.35rem",
                }}
              >
                <div>
                  <strong>Variable:</strong>{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    {groupSymbols[activeGroup.id]} = {activeGroup.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGroupSymbolEditing((prev) => {
                      const copy = new Set(prev);
                      copy.add(activeGroup.id);
                      return copy;
                    })
                  }
                  style={{
                    borderRadius: "999px",
                    padding: "0.1rem 0.5rem",
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Edit
                </button>
              </div>
            )}

            {type === "note" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.4rem",
                  alignItems: "flex-start",
                  marginBottom: "0.35rem",
                }}
              >
                <div>
                  <strong>Note:</strong>{" "}
                  <span>{groupNotes[activeGroup.id]}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNoteEditingGroups((prev) => {
                      const copy = new Set(prev);
                      copy.add(activeGroup.id);
                      return copy;
                    })
                  }
                  style={{
                    borderRadius: "999px",
                    padding: "0.1rem 0.5rem",
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit
                </button>
              </div>
            )}

            {/* Editing views */}
            {type === "variable" &&
              groupSymbolEditing.has(activeGroup.id) && (
                <VariablePopupBody
                  groupId={activeGroup.id}
                  groupText={activeGroup.text}
                  symbol={groupSymbols[activeGroup.id] ?? ""}
                  editing={true}
                  setGroupSymbols={setGroupSymbols}
                  setGroupSymbolEditing={setGroupSymbolEditing}
                  onCommit={() => commitGroup(activeGroup.id)}
                />
              )}

            {type === "note" &&
              noteEditingGroups.has(activeGroup.id) && (
                <NotePopupBody
                  groupId={activeGroup.id}
                  note={groupNotes[activeGroup.id] ?? ""}
                  setGroupNotes={setGroupNotes}
                  onCommit={() => commitGroup(activeGroup.id)}
                />
              )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "0.2rem",
              }}
            >
              <button
                type="button"
                onClick={close}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  opacity: 0.65,
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Uncommitted: choose type + enter symbol/note */}
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "0.35rem",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setGroupTypes((prev) => ({
                    ...prev,
                    [activeGroup.id]: "variable",
                  }))
                }
                style={{
                  borderRadius: "999px",
                  padding: "0.15rem 0.6rem",
                  border:
                    type === "variable"
                      ? `1px solid ${VAR_PURPLE}`
                      : "1px solid rgba(0,0,0,0.12)",
                  background:
                    type === "variable"
                      ? "rgba(124, 58, 237, 0.12)"
                      : "#ffffff",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Variable
              </button>
              <button
                type="button"
                onClick={() =>
                  setGroupTypes((prev) => ({
                    ...prev,
                    [activeGroup.id]: "note",
                  }))
                }
                style={{
                  borderRadius: "999px",
                  padding: "0.15rem 0.6rem",
                  border:
                    type === "note"
                      ? "1px solid var(--brand-steel, #4E7CB2)"
                      : "1px solid rgba(0,0,0,0.12)",
                  background:
                    type === "note"
                      ? "rgba(78, 124, 178, 0.12)"
                      : "#ffffff",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Note
              </button>
            </div>

            {type === "variable" && (
              <VariablePopupBody
                groupId={activeGroup.id}
                groupText={activeGroup.text}
                symbol={groupSymbols[activeGroup.id] ?? ""}
                editing={groupSymbolEditing.has(activeGroup.id)}
                setGroupSymbols={setGroupSymbols}
                setGroupSymbolEditing={setGroupSymbolEditing}
                onCommit={() => commitGroup(activeGroup.id)}
              />
            )}

            {type === "note" && (
              <NotePopupBody
                groupId={activeGroup.id}
                note={groupNotes[activeGroup.id] ?? ""}
                setGroupNotes={setGroupNotes}
                onCommit={() => commitGroup(activeGroup.id)}
              />
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "0.2rem",
              }}
            >
              <button
                type="button"
                onClick={close}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  opacity: 0.65,
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --- Popup subcomponents --- */

type VariablePopupBodyProps = {
  groupId: string;
  groupText: string;
  symbol: string;
  editing: boolean;
  setGroupSymbols: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setGroupSymbolEditing: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCommit: () => void;
};

function VariablePopupBody({
  groupId,
  groupText,
  symbol,
  editing,
  setGroupSymbols,
  setGroupSymbolEditing,
  onCommit,
}: VariablePopupBodyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        fontSize: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          flexWrap: "wrap",
        }}
      >
        {!editing ? (
          <button
            type="button"
            onClick={() =>
              setGroupSymbolEditing((prev) => {
                const copy = new Set(prev);
                copy.add(groupId);
                return copy;
              })
            }
            style={{
              borderRadius: "999px",
              padding: "0.15rem 0.6rem",
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#ffffff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {symbol || "Click to add symbol"}
            </span>
            {symbol && <span>=</span>}
          </button>
        ) : (
          <>
            <input
              type="text"
              autoFocus
              value={symbol}
              maxLength={4}
              onChange={(e) => {
                const value = e.target.value;
                setGroupSymbols((prev) => ({
                  ...prev,
                  [groupId]: value,
                }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if ((symbol || "").trim().length > 0) {
                    setGroupSymbolEditing((prev) => {
                      const copy = new Set(prev);
                      copy.delete(groupId);
                      return copy;
                    });
                    onCommit();
                  }
                }
              }}
              placeholder="e.g. t"
              style={{
                width: "3.2rem",
                padding: "0.25rem 0.35rem",
                borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.15)",
                fontSize: "0.8rem",
              }}
            />
            <span>=</span>
          </>
        )}

        <span>{groupText}</span>
      </div>

      {(editing || !symbol) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.25rem",
            marginLeft: "0.1rem",
          }}
        >
          {GREEK_SYMBOLS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGroupSymbols((prev) => ({
                  ...prev,
                  [groupId]: g,
                }));
                setGroupSymbolEditing((prev) => {
                  const copy = new Set(prev);
                  copy.delete(groupId);
                  return copy;
                });
                onCommit(); // clicking a Greek symbol counts as commit
              }}
              style={{
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: "999px",
                padding: "0.1rem 0.45rem",
                fontSize: "0.8rem",
                background:
                  symbol === g ? "var(--brand-sand, #EFE8E0)" : "#ffffff",
                cursor: "pointer",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type NotePopupBodyProps = {
  groupId: string;
  note: string;
  setGroupNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCommit: () => void;
};

function NotePopupBody({
  groupId,
  note,
  setGroupNotes,
  onCommit,
}: NotePopupBodyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        fontSize: "0.85rem",
      }}
    >
      <label
        style={{
          fontSize: "0.8rem",
          opacity: 0.8,
        }}
      >
        Write what this tells you (press Enter to lock it in):
      </label>
      <textarea
        rows={2}
        value={note}
        onChange={(e) =>
          setGroupNotes((prev) => ({
            ...prev,
            [groupId]: e.target.value,
          }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if ((note || "").trim().length > 0) {
              onCommit();
            }
          }
        }}
        placeholder="e.g. circular motion → speed is constant, velocity changes"
        style={{
          width: "100%",
          padding: "0.35rem 0.45rem",
          borderRadius: "8px",
          border: "1px solid rgba(0,0,0,0.15)",
          fontSize: "0.8rem",
          resize: "vertical",
        }}
      />
    </div>
  );
}
