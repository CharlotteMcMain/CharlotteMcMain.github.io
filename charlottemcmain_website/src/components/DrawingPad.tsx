// src/components/DrawingPad.tsx
import { ReactSketchCanvas } from "react-sketch-canvas";

const canvasStyles = {
  border: "1px solid rgba(0,0,0,0.2)",
  borderRadius: "12px",
  width: "100%",
  height: "300px",
};

export default function DrawingPad() {
  return (
    <div style={{ maxWidth: "600px", margin: "1rem auto" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>Sketch your diagram</h3>
      <ReactSketchCanvas
        style={canvasStyles}
        strokeWidth={3}
        strokeColor="#203f9a" // your brand navy
        withTimestamp={true}
      />
      <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
        Use your mouse or finger to draw.
      </p>
    </div>
  );
}
