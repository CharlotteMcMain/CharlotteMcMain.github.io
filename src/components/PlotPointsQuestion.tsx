import React, { useRef, useState } from "react";

type Point = { x: number; y: number };

interface PlotPointsQuestionProps {
  id: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep: number;
  yStep: number;
  correctPoints: Point[];       // the “mark scheme” points
  tolerance?: number;           // allowed difference in coordinate units (default 0)
  width?: number;
  height?: number;
  questionText?: string;        // optional text shown above the graph
}

type CheckResult = {
  correctCount: number;
  total: number;
  extraCount: number;
  missingCount: number;
};

const PlotPointsQuestion: React.FC<PlotPointsQuestionProps> = ({
  id,
  xMin,
  xMax,
  yMin,
  yMax,
  xStep,
  yStep,
  correctPoints,
  tolerance = 0,
  width = 400,
  height = 260,
  questionText,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [userPoints, setUserPoints] = useState<Point[]>([]);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const plotPadding = 40; // space for axes labels etc.
  const plotWidth = width - 2 * plotPadding;
  const plotHeight = height - 2 * plotPadding;

  // map from coord -> pixels
  const coordToPixel = (p: Point) => {
    const xFrac = (p.x - xMin) / (xMax - xMin || 1);
    const yFrac = (p.y - yMin) / (yMax - yMin || 1);
    const px = plotPadding + xFrac * plotWidth;
    const py = plotPadding + (1 - yFrac) * plotHeight; // y axis inverted
    return { px, py };
  };

  // snap click position to nearest grid point
  const handleClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left - plotPadding;
    const clickY = e.clientY - rect.top - plotPadding;

    if (clickX < 0 || clickX > plotWidth || clickY < 0 || clickY > plotHeight) {
      return;
    }

    const xFrac = clickX / plotWidth;
    const yFrac = 1 - clickY / plotHeight;

    let xCoord = xMin + xFrac * (xMax - xMin);
    let yCoord = yMin + yFrac * (yMax - yMin);

    // snap to nearest step
    xCoord = Math.round(xCoord / xStep) * xStep;
    yCoord = Math.round(yCoord / yStep) * yStep;

    // bound in range
    xCoord = Math.max(xMin, Math.min(xMax, xCoord));
    yCoord = Math.max(yMin, Math.min(yMax, yCoord));

    const snapped: Point = { x: xCoord, y: yCoord };

    // if click is near an existing point, remove it (toggle)
    const existingIndex = userPoints.findIndex(
      (p) => p.x === snapped.x && p.y === snapped.y
    );

    if (existingIndex !== -1) {
      const next = [...userPoints];
      next.splice(existingIndex, 1);
      setUserPoints(next);
    } else {
      setUserPoints([...userPoints, snapped]);
    }

    setCheckResult(null); // clear previous result when they change points
  };

  const handleReset = () => {
    setUserPoints([]);
    setCheckResult(null);
  };

  const handleCheck = () => {
    // simple exact comparison (since we snap to step); add tolerance if needed
    const tol = tolerance;

    const correctMatched = new Array(correctPoints.length).fill(false);
    let correctCount = 0;
    let extraCount = 0;

    userPoints.forEach((u) => {
      const idx = correctPoints.findIndex((c, i) => {
        if (correctMatched[i]) return false;
        const dx = Math.abs(c.x - u.x);
        const dy = Math.abs(c.y - u.y);
        return dx <= tol && dy <= tol;
      });

      if (idx !== -1) {
        correctMatched[idx] = true;
        correctCount += 1;
      } else {
        extraCount += 1;
      }
    });

    const total = correctPoints.length;
    const missingCount = total - correctCount;

    setCheckResult({
      correctCount,
      total,
      extraCount,
      missingCount,
    });
  };

  // 10 subdivisions per major grid step
  const SUBDIV = 10;

  const xTicks: number[] = [];
  for (let x = xMin; x <= xMax + 1e-6; x += xStep / SUBDIV) {
    xTicks.push(Number(x.toFixed(6)));
  }

  const yTicks: number[] = [];
  for (let y = yMin; y <= yMax + 1e-6; y += yStep / SUBDIV) {
    yTicks.push(Number(y.toFixed(6)));
  }
  
  return (
    <div className="plot-question" data-plot-id={id}>
      {questionText && <p className="plot-question-text">{questionText}</p>}

      <div className="plot-graph-wrapper">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="plot-graph-svg"
          onClick={handleClick}
        >
          {/* background */}
          <rect
            x={plotPadding}
            y={plotPadding}
            width={plotWidth}
            height={plotHeight}
            className="plot-background"
          />

          {/* grid lines */}
          {xTicks.map((x) => {
            const { px } = coordToPixel({ x, y: yMin });
            return (
              <line
                key={`x-grid-${x}`}
                x1={px}
                y1={plotPadding}
                x2={px}
                y2={plotPadding + plotHeight}
                className="plot-grid-line"
              />
            );
          })}
          {yTicks.map((y) => {
            const { py } = coordToPixel({ x: xMin, y });
            return (
              <line
                key={`y-grid-${y}`}
                x1={plotPadding}
                y1={py}
                x2={plotPadding + plotWidth}
                y2={py}
                className="plot-grid-line"
              />
            );
          })}

          {/* axes */}
          {/* x-axis (y=0 if in range, else bottom) */}
          {(() => {
            const yAxisVal = yMin <= 0 && yMax >= 0 ? 0 : yMin;
            const { py } = coordToPixel({ x: xMin, y: yAxisVal });
            return (
              <line
                x1={plotPadding}
                y1={py}
                x2={plotPadding + plotWidth}
                y2={py}
                className="plot-axis"
              />
            );
          })()}
          {/* y-axis (x=0 if in range, else left) */}
          {(() => {
            const xAxisVal = xMin <= 0 && xMax >= 0 ? 0 : xMin;
            const { px } = coordToPixel({ x: xAxisVal, y: yMin });
            return (
              <line
                x1={px}
                y1={plotPadding}
                x2={px}
                y2={plotPadding + plotHeight}
                className="plot-axis"
              />
            );
          })()}

          {/* tick labels */}
          {xTicks.map((x) => {
            const { px } = coordToPixel({ x, y: yMin });
            return (
              <text
                key={`x-label-${x}`}
                x={px}
                y={plotPadding + plotHeight + 16}
                className="plot-label"
                textAnchor="middle"
              >
                {x}
              </text>
            );
          })}
          {yTicks.map((y) => {
            const { py } = coordToPixel({ x: xMin, y });
            return (
              <text
                key={`y-label-${y}`}
                x={plotPadding - 8}
                y={py + 4}
                className="plot-label"
                textAnchor="end"
              >
                {y}
              </text>
            );
          })}

          {/* user points */}
          {userPoints.map((p, i) => {
            const { px, py } = coordToPixel(p);
            return (
              <circle
                key={`user-${i}`}
                cx={px}
                cy={py}
                r={5}
                className="plot-user-point"
              />
            );
          })}
        </svg>
      </div>

      <div className="plot-controls">
        <button type="button" onClick={handleCheck} className="plot-btn">
          Check points
        </button>
        <button type="button" onClick={handleReset} className="plot-btn secondary">
          Reset
        </button>
      </div>

      {checkResult && (
        <div className="plot-feedback">
          <p>
            You placed <strong>{checkResult.correctCount}</strong> out of{" "}
            <strong>{checkResult.total}</strong> points correctly.
          </p>
          {checkResult.missingCount > 0 && (
            <p>{checkResult.missingCount} correct point(s) are missing.</p>
          )}
          {checkResult.extraCount > 0 && (
            <p>{checkResult.extraCount} extra point(s) that shouldn't be there.</p>
          )}
        </div>
      )}

      {userPoints.length > 0 && (
        <div className="plot-coords">
          <p>Your points:</p>
          <ul>
            {userPoints.map((p, i) => (
              <li key={`coord-${i}`}>
                ({p.x}, {p.y})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlotPointsQuestion;
