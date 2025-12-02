// src/components/LongAnswerQuestions.tsx
import React, { useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ====== Types ======

type Point = { x: number; y: number };

type PlotPointsConfig = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep: number;
  yStep: number;
  correctPoints: Point[];
  tolerance?: number;
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  showBestFit?: boolean; // for later
  helperText?: string;
};

type QuestionPartCore = {
  id: string;               // unique key, e.g. "a", "bi"
  label?: string;           // label to show in brackets, e.g. "a", "i", "ii"
  text: string;             // question text (LaTeX allowed)
  marks?: number;           // marks for this part
  explanation?: string;     // explanation text for this part
  graph?: PlotPointsConfig; // optional interactive graph for this part
};

type QuestionPart = QuestionPartCore & {
  subparts?: QuestionPartCore[]; // nested (i), (ii), etc.
};

type LongAnswerQuestionProps = {
  id: string;
  stem: string;             // main stem (LaTeX allowed)
  parts: QuestionPart[];
  meta?: string;            // e.g. "OCR A · June 2024 · Q16"
  totalMarks?: number;      // optional – will auto-sum from parts/subparts if omitted
};

// ====== KaTeX helpers (copied from MCQ) ======

function renderPlainHtml(text: string): React.ReactNode {
  if (!text) return null;
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

function renderWithKaTeX(text: string): React.ReactNode {
  if (!text.includes("$")) {
    return renderPlainHtml(text);
  }

  const parts: React.ReactNode[] = [];
  const regex = /(\${1,2})([^$]+?)\1/g; // $...$ or $$...$$
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, delimiter, content] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      const plain = text.slice(lastIndex, matchIndex);
      parts.push(
        <React.Fragment key={key++}>{renderPlainHtml(plain)}</React.Fragment>
      );
    }

    const isDisplay = delimiter === "$$";

    try {
      const html = katex.renderToString(content, {
        throwOnError: false,
        displayMode: isDisplay,
      });

      parts.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: html }} />
      );
    } catch {
      parts.push(
        <React.Fragment key={key++}>{fullMatch}</React.Fragment>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    const plain = text.slice(lastIndex);
    parts.push(
      <React.Fragment key={key++}>{renderPlainHtml(plain)}</React.Fragment>
    );
  }

  return <>{parts}</>;
}

function sumMarks(parts: QuestionPart[]): number {
  return parts.reduce((sum, p) => {
    const self = typeof p.marks === "number" ? p.marks : 0;
    const sub = p.subparts
      ? p.subparts.reduce(
          (s, sp) => s + (typeof sp.marks === "number" ? sp.marks : 0),
          0
        )
      : 0;
    return sum + self + sub;
  }, 0);
}

// ====== Internal interactive graph component ======

const PlotPointsGraph: React.FC<{ id: string; config: PlotPointsConfig }> = ({
  id,
  config,
}) => {
  const {
    xMin,
    xMax,
    yMin,
    yMax,
    xStep,
    yStep,
    correctPoints,
    tolerance = 0,
    width = 380,
    height = 240,
    xLabel = "x",
    yLabel = "y",
    showBestFit = false, // not implemented yet, placeholder
    helperText,
  } = config;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [userPoints, setUserPoints] = useState<Point[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const coordToPixel = (p: Point) => {
    const xFrac = (p.x - xMin) / (xMax - xMin || 1);
    const yFrac = (p.y - yMin) / (yMax - yMin || 1);
    const px = paddingLeft + xFrac * plotWidth;
    const py = paddingTop + (1 - yFrac) * plotHeight;
    return { px, py };
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - paddingLeft;
    const y = e.clientY - rect.top - paddingTop;

    if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return;

    const xFrac = x / plotWidth;
    const yFrac = 1 - y / plotHeight;

    let xCoord = xMin + xFrac * (xMax - xMin);
    let yCoord = yMin + yFrac * (yMax - yMin);

    xCoord = Math.round(xCoord / xStep) * xStep;
    yCoord = Math.round(yCoord / yStep) * yStep;

    xCoord = Math.max(xMin, Math.min(xMax, xCoord));
    yCoord = Math.max(yMin, Math.min(yMax, yCoord));

    const snapped: Point = { x: xCoord, y: yCoord };

    const idx = userPoints.findIndex((p) => p.x === snapped.x && p.y === snapped.y);
    let next: Point[];

    if (idx !== -1) {
      next = [...userPoints];
      next.splice(idx, 1);
    } else {
      next = [...userPoints, snapped];
    }

    setUserPoints(next);
    setFeedback(null);
  };

  const handleReset = () => {
    setUserPoints([]);
    setFeedback(null);
  };

  const handleCheck = () => {
    const tol = tolerance;
    const matched = new Array(correctPoints.length).fill(false);
    let correctCount = 0;
    let extraCount = 0;

    userPoints.forEach((u) => {
      const idx = correctPoints.findIndex((c, i) => {
        if (matched[i]) return false;
        const dx = Math.abs(c.x - u.x);
        const dy = Math.abs(c.y - u.y);
        return dx <= tol && dy <= tol;
      });

      if (idx !== -1) {
        matched[idx] = true;
        correctCount++;
      } else {
        extraCount++;
      }
    });

    const missingCount = correctPoints.length - correctCount;

    let msg = `You placed ${correctCount} of ${correctPoints.length} point${
      correctPoints.length === 1 ? "" : "s"
    } correctly.`;

    if (missingCount > 0) {
      msg += ` ${missingCount} correct point${
        missingCount === 1 ? " is" : "s are"
      } missing.`;
    }
    if (extraCount > 0) {
      msg += ` ${extraCount} extra point${
        extraCount === 1 ? "" : "s"
      } do not belong on the curve.`;
    }

    setFeedback(msg);
  };

  // ====== grid + ticks: major vs minor ======
  const SUBDIV = 10; // 10 minor divisions between major grid lines

  type Tick = { value: number; isMajor: boolean };

  const xTicks: Tick[] = [];
  {
    let i = 0;
    for (let x = xMin; x <= xMax + 1e-6; x += xStep / SUBDIV) {
      xTicks.push({
        value: Number(x.toFixed(6)),
        isMajor: i % SUBDIV === 0,
      });
      i++;
    }
  }

  const yTicks: Tick[] = [];
  {
    let i = 0;
    for (let y = yMin; y <= yMax + 1e-6; y += yStep / SUBDIV) {
      yTicks.push({
        value: Number(y.toFixed(6)),
        isMajor: i % SUBDIV === 0,
      });
      i++;
    }
  }

  return (
    <div className="laq-graph" data-graph-for={id}>
      {helperText && <p className="laq-graph-helper">{helperText}</p>}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="laq-graph-svg"
        onClick={handleClick}
      >
        {/* background plot area */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={plotWidth}
          height={plotHeight}
          className="laq-graph-bg"
        />

        {/* grid: X lines */}
        {xTicks.map((tick, idx) => {
          const { value, isMajor } = tick;
          const { px } = coordToPixel({ x: value, y: yMin });
          return (
            <line
              key={`grid-x-${idx}`}
              x1={px}
              y1={paddingTop}
              x2={px}
              y2={paddingTop + plotHeight}
              className={isMajor ? "laq-grid-major" : "laq-grid-minor"}
            />
          );
        })}

        {/* grid: Y lines */}
        {yTicks.map((tick, idx) => {
          const { value, isMajor } = tick;
          const { py } = coordToPixel({ x: xMin, y: value });
          return (
            <line
              key={`grid-y-${idx}`}
              x1={paddingLeft}
              y1={py}
              x2={paddingLeft + plotWidth}
              y2={py}
              className={isMajor ? "laq-grid-major" : "laq-grid-minor"}
            />
          );
        })}

        {/* axes */}
        {/* x-axis (y=0 if in range) */}
        {(() => {
          const yAxisVal = yMin <= 0 && yMax >= 0 ? 0 : yMin;
          const { py } = coordToPixel({ x: xMin, y: yAxisVal });
          return (
            <line
              x1={paddingLeft}
              y1={py}
              x2={paddingLeft + plotWidth}
              y2={py}
              className="laq-graph-axis"
            />
          );
        })()}

        {/* y-axis (x=0 if in range) */}
        {(() => {
          const xAxisVal = xMin <= 0 && xMax >= 0 ? 0 : xMin;
          const { px } = coordToPixel({ x: xAxisVal, y: yMin });
          return (
            <line
              x1={px}
              y1={paddingTop}
              x2={px}
              y2={paddingTop + plotHeight}
              className="laq-graph-axis"
            />
          );
        })()}

        {/* tick labels: ONLY on major ticks */}
        {xTicks
          .filter((t) => t.isMajor)
          .map((t, idx) => {
            const { px } = coordToPixel({ x: t.value, y: yMin });
            return (
              <text
                key={`x-label-${idx}`}
                x={px}
                y={paddingTop + plotHeight + 16}
                className="laq-graph-label"
                textAnchor="middle"
              >
                {t.value}
              </text>
            );
          })}

        {yTicks
          .filter((t) => t.isMajor)
          .map((t, idx) => {
            const { py } = coordToPixel({ x: xMin, y: t.value });
            return (
              <text
                key={`y-label-${idx}`}
                x={paddingLeft - 8}
                y={py + 4}
                className="laq-graph-label"
                textAnchor="end"
              >
                {t.value}
              </text>
            );
          })}

        {/* axis labels */}
        <text
          x={paddingLeft + plotWidth / 2}
          y={height - 4}
          textAnchor="middle"
          className="laq-graph-label"
        >
          {xLabel}
        </text>
        <text
          x={12}
          y={paddingTop + plotHeight / 2}
          textAnchor="middle"
          className="laq-graph-label"
          transform={`rotate(-90 12 ${paddingTop + plotHeight / 2})`}
        >
          {yLabel}
        </text>

        {/* user points as X markers */}
        {userPoints.map((p, i) => {
          const { px, py } = coordToPixel(p);
          return (
            <g key={`user-${i}`}>
              <line
                x1={px - 5}
                y1={py - 5}
                x2={px + 5}
                y2={py + 5}
                className="laq-graph-point-cross-line"
              />
              <line
                x1={px - 5}
                y1={py + 5}
                x2={px + 5}
                y2={py - 5}
                className="laq-graph-point-cross-line"
              />
            </g>
          );
        })}

        {/* we can later add a best-fit line here if showBestFit is true */}
      </svg>

      <div className="laq-graph-controls">
        <button
          type="button"
          onClick={handleCheck}
          className="mcq-explanation-button"
        >
          Check points
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="mcq-explanation-button"
          style={{ opacity: 0.85 }}
        >
          Reset
        </button>
      </div>

      {feedback && <p className="laq-graph-feedback">{feedback}</p>}
    </div>
  );
};

// ====== Main LongAnswerQuestion component ======

const LongAnswerQuestion: React.FC<LongAnswerQuestionProps> = ({
  id,
  stem,
  parts,
  meta,
  totalMarks,
}) => {
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  const computedTotalMarks =
    typeof totalMarks === "number" ? totalMarks : sumMarks(parts);

  const togglePart = (key: string) => {
    setOpenParts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      className="mcq long-answer-question"
      aria-labelledby={`${id}-stem`}
      data-question-id={id}
    >
      {(meta || computedTotalMarks > 0) && (
        <div className="mcq-meta-row">
          <div className="mcq-meta">{meta}</div>
          {computedTotalMarks > 0 && (
            <div className="mcq-marks">
              {computedTotalMarks} mark
              {computedTotalMarks === 1 ? "" : "s"}
            </div>
          )}
        </div>
      )}

      <div className="mcq-header">
        <div id={`${id}-stem`} className="mcq-stem">
          {renderWithKaTeX(stem)}
        </div>
      </div>

      <ol className="question-parts">
        {parts.map((part, index) => {
          const label =
            part.label ?? String.fromCharCode("a".charCodeAt(0) + index);
          const partKey = part.id;
          const isOpen = !!openParts[partKey];

          return (
            <li key={partKey} className="question-part">
              <div className="question-part-header">
                <span className="part-label">({label})</span>
                {typeof part.marks === "number" && (
                  <span className="part-marks">
                    {part.marks} mark{part.marks === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="part-text">{renderWithKaTeX(part.text)}</div>

              {/* Graph for main part (if any) */}
              {part.graph && (
                <PlotPointsGraph
                  id={`${id}-${part.id}`}
                  config={part.graph}
                />
              )}

              {/* Explanation for main part */}
              {part.explanation && (
                <div className="mcq-explanation-wrapper">
                  <button
                    type="button"
                    className="mcq-explanation-button"
                    onClick={() => togglePart(partKey)}
                  >
                    {isOpen ? "Hide explanation ▲" : "Show explanation ▼"}
                  </button>
                  {isOpen && (
                    <div className="mcq-explanation">
                      {renderWithKaTeX(part.explanation)}
                    </div>
                  )}
                </div>
              )}

              {/* Subparts like (i), (ii) */}
              {part.subparts && part.subparts.length > 0 && (
                <ol className="question-subparts">
                  {part.subparts.map((sub, subIndex) => {
                    const subLabel =
                      sub.label ??
                      (["i", "ii", "iii", "iv", "v"][subIndex] ?? `i`);
                    const subKey = sub.id;
                    const subOpen = !!openParts[subKey];

                    return (
                      <li key={subKey} className="question-subpart">
                        <div className="question-part-header">
                          <span className="part-label">({subLabel})</span>
                          {typeof sub.marks === "number" && (
                            <span className="part-marks">
                              {sub.marks} mark
                              {sub.marks === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        <div className="part-text">
                          {renderWithKaTeX(sub.text)}
                        </div>

                        {/* Graph for subpart (e.g. b(i)) */}
                        {sub.graph && (
                          <PlotPointsGraph
                            id={`${id}-${sub.id}`}
                            config={sub.graph}
                          />
                        )}

                        {sub.explanation && (
                          <div className="mcq-explanation-wrapper">
                            <button
                              type="button"
                              className="mcq-explanation-button"
                              onClick={() => togglePart(subKey)}
                            >
                              {subOpen
                                ? "Hide explanation ▲"
                                : "Show explanation ▼"}
                            </button>
                            {subOpen && (
                              <div className="mcq-explanation">
                                {renderWithKaTeX(sub.explanation)}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default LongAnswerQuestion;
