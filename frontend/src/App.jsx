// src/App.jsx
import "./styles/theme.css"; // ensure path is correct
import WavePractice from "./components/waveEquation";

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="container" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <strong style={{ fontSize: "1.1rem" }}>EduLab</strong>
          <span className="pill info">GCSE</span>
        </div>
      </header>

      <main className="content">
        <div className="container">
          <section className="card">
            <WavePractice />
          </section>
        </div>
      </main>
    </>
  );
}
