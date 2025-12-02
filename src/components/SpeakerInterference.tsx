import { useState, useEffect } from "react";

export default function SpeakerInterference() {
  const [micY, setMicY] = useState(0); // -1 = P1, 0 = P2, +1 = P3
  const [showWaves, setShowWaves] = useState(false);
  const [time, setTime] = useState(0); // animation time

  // Simple animation clock
  useEffect(() => {
    let frameId: number;
    const start = performance.now();

    const loop = (now: number) => {
      const t = (now - start) / 1000; // seconds
      setTime(t);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ---- Physics model -------------------------------------------------------
  // FIXED wavelength / frequency. Moving the microphone only changes
  // the phase difference between the two waves at M, not the wavelength.
  const wavelengthPx = 30; // visible wavelength in pixels
  const k = (2 * Math.PI) / wavelengthPx; // fixed spatial frequency
  const A = 1;

  // Design Δ/λ so that P1 and P3 are maxima, P2 is a minimum.
  // micY: -1 -> 0, 0 -> 0.5, +1 -> 1  (in units of λ)
  const deltaOverLambda = (micY + 1) / 2;
  const phaseOffset = 2 * Math.PI * deltaOverLambda; // φ = 2π Δ/λ

  // Resultant amplitude for oscilloscope
  const Ares = 2 * A * Math.cos(phaseOffset / 2);

  // Oscilloscope trace
  const oscSamples = 200;
  const oscWave = Array.from({ length: oscSamples }, (_, n) => {
    const t = (n / oscSamples) * 2 * Math.PI;
    return {
      x: n,
      y: 40 - 30 * Math.sin(t) * Ares,          // resultant
      y1: 40 - 20 * Math.sin(t),                // from X
      y2: 40 - 20 * Math.sin(t + phaseOffset),  // from Y (phase-shifted)
    };
  });

  // ---- Geometry for left-hand diagram -------------------------------------
  const micX = 220;
  const micSvgY = 150 + micY * -110;

  const speakerX = { x: 202, y: 70 };
  const speakerY = { x: 202, y: 230 };

  // We draw transverse waves along the straight line from each speaker
  // to the microphone. To keep the wavelength visually CONSTANT, we use
  // a fixed "phase length" Lref independent of the actual distance.
  const Lref = 200; // reference length for phase progression
  const ampPx = 6;  // visual transverse amplitude

  function makeWavePath(
    sx: number,
    sy: number,
    phaseExtra: number
  ): string {
    const mx = micX;
    const my = micSvgY;
    const segs = 80;

    const dx = mx - sx;
    const dy = my - sy;

    // unit vectors along the path and perpendicular to it
    const lengthGeom = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / lengthGeom;
    const uy = dy / lengthGeom;
    const nx = -uy;
    const ny = ux;

    let d = "";
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;        // 0 → 1 along the line
      const s = u * Lref;        // "phase distance" (fixed scale!)
      const baseX = sx + ux * (u * lengthGeom);
      const baseY = sy + uy * (u * lengthGeom);

      // travelling wave with fixed wavelengthPx
      const disp = ampPx * Math.sin(k * s - 4 * time + phaseExtra);
      const x = baseX + nx * disp;
      const y = baseY + ny * disp;

      d += (i === 0 ? "M " : "L ") + x + " " + y + " ";
    }
    return d.trim();
  }

  return (
    <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
      {/* LEFT: speakers, microphone, and fixed-wavelength paths */}
      <svg
        width="450"
        height="520"
        viewBox="0 0 260 300"
        style={{ border: "1px solid #ccc" }}
      >
        {/* Signal generator */}
        <rect
          x="20"
          y="110"
          width="90"
          height="80"
          stroke="#000"
          fill="white"
          strokeWidth="2"
        />
        <text x="65" y="135" textAnchor="middle" fontSize="10">
          Signal
        </text>
        <text x="65" y="150" textAnchor="middle" fontSize="10">
          generator
        </text>

        {/* Output terminals */}
        <circle cx="35" cy="185" r="3" fill="white" stroke="#000" />
        <circle cx="55" cy="185" r="3" fill="white" stroke="#000" />

        {/* Wiring to speakers */}
        <polyline
          points="55,185 110,185 110,70 170,70"
          fill="none"
          stroke="#000"
          strokeWidth="2"
        />
        <polyline
          points="35,185 110,185 110,230 170,230"
          fill="none"
          stroke="#000"
          strokeWidth="2"
        />

        {/* Speaker X */}
        <rect
          x="170"
          y="60"
          width="18"
          height="20"
          stroke="#000"
          fill="white"
          strokeWidth="2"
        />
        <polygon
          points="188,60 202,70 202,70 188,80"
          stroke="#000"
          fill="white"
          strokeWidth="2"
        />
        <text x="194" y="55" textAnchor="middle" fontSize="10">
          X
        </text>

        {/* Speaker Y */}
        <rect
          x="170"
          y="220"
          width="18"
          height="20"
          stroke="#000"
          fill="white"
          strokeWidth="2"
        />
        <polygon
          points="188,220 202,230 202,230 188,240"
          stroke="#000"
          fill="white"
          strokeWidth="2"
        />
        <text x="194" y="215" textAnchor="middle" fontSize="10">
          Y
        </text>

        {/* Microphone track + points */}
        <line x1={micX} y1={40} x2={micX} y2={260} stroke="#000" strokeWidth="2" />
        <circle cx={micX} cy={260} r="4" fill="black" />
        <circle cx={micX} cy={150} r="4" fill="black" />
        <circle cx={micX} cy={40} r="4" fill="black" />
        <text x={micX + 10} y={264} fontSize="10">
          P1
        </text>
        <text x={micX + 10} y={154} fontSize="10">
          P2
        </text>
        <text x={micX + 10} y={44} fontSize="10">
          P3
        </text>

        {/* Transverse waves with FIXED wavelength from each speaker to M */}
        <path
          d={makeWavePath(speakerX.x, speakerX.y, 0)}
          fill="none"
          stroke="#ff4444"
          strokeWidth="1.5"
        />
        <path
          d={makeWavePath(speakerY.x, speakerY.y, phaseOffset)}
          fill="none"
          stroke="#448aff"
          strokeWidth="1.5"
        />

        {/* Microphone M */}
        <circle
          cx={micX}
          cy={micSvgY}
          r="10"
          fill="#2c7be5"
          style={{ cursor: "grab" }}
          onMouseDown={(e) => {
            const svg = (e.currentTarget as SVGCircleElement).ownerSVGElement!;
            const move = (ev: MouseEvent) => {
              const rect = svg.getBoundingClientRect();
              const y = ev.clientY - rect.top;
              const clamped = Math.max(40, Math.min(260, y));
              const norm = -(clamped - 150) / 110;
              setMicY(norm);
            };
            const up = () => {
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
        />
        <text x={micX - 15} y={micSvgY + 4} fontSize="10">
          M
        </text>
      </svg>

      {/* RIGHT: oscilloscope */}
      <svg width="300" height="120" style={{ border: "2px solid #000" }}>
        <polyline
          fill="none"
          stroke="#00aa00"
          strokeWidth="2"
          points={oscWave.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {showWaves && (
          <>
            <polyline
              fill="none"
              stroke="#ff4444"
              strokeWidth="1"
              points={oscWave.map((p) => `${p.x},${p.y1}`).join(" ")}
            />
            <polyline
              fill="none"
              stroke="#448aff"
              strokeWidth="1"
              points={oscWave.map((p) => `${p.x},${p.y2}`).join(" ")}
            />
          </>
        )}
      </svg>

      <div>
        <label>
          <input
            type="checkbox"
            checked={showWaves}
            onChange={(e) => setShowWaves(e.target.checked)}
          />
          Show individual waves
        </label>
        <div>Amplitude: {Ares.toFixed(2)}</div>
        <div>Δ/λ ≈ {deltaOverLambda.toFixed(2)}</div>
      </div>
    </div>
  );
}
