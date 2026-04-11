import { useState } from "react";

// Utility
const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const TOTAL_QUESTIONS = 5;

// ---------------------------------------------------------
// LEVEL 1 — Basic °C → K
// ---------------------------------------------------------
function level1() {
  const c = rand(-50, 80);
  const templates = [
    `Convert ${c}°C to kelvin.`,
    `What is ${c}°C in kelvin?`,
    `A thermometer reads ${c}°C. What is the temperature in K?`,
    `Find T(K) if T(°C) = ${c}.`,
    `Calculate the kelvin temperature of ${c}°C.`
  ];
  return { prompt: templates[rand(0,4)], answer: c + 273.15, type: "number" };
}

// ---------------------------------------------------------
// LEVEL 2 — Reverse K → °C
// ---------------------------------------------------------
function level2() {
  const k = rand(200, 400);
  const templates = [
    `Convert ${k} K to °C.`,
    `What is ${k} K in degrees Celsius?`,
    `A sample has a temperature of ${k} K. What is this in °C?`,
    `Find T(°C) if T(K) = ${k}.`,
    `Calculate the Celsius temperature equivalent to ${k} K.`
  ];
  return { prompt: templates[rand(0,4)], answer: k - 273.15, type: "number" };
}

// ---------------------------------------------------------
// LEVEL 3 — Real-world context
// ---------------------------------------------------------
function level3() {
  const scenarios = [
    { min: -30, max: -5, text: c => `A freezer is at ${c}°C. What is this in K?` },
    { min: -20, max: 5, text: c => `The air on a mountain is ${c}°C. Convert to kelvin.` },
    { min: 15, max: 25, text: c => `A classroom is at ${c}°C. What is this in kelvin?` },
    { min: 40, max: 80, text: c => `A hot surface is ${c}°C. What is this in kelvin?` },
    { min: -50, max: 100, text: c => `A scientist records ${c}°C. Convert to kelvin.` }
  ];

  const ctx = scenarios[rand(0,4)];
  const c = rand(ctx.min, ctx.max);
  return { prompt: ctx.text(c), answer: c + 273.15, type: "number" };
}

// ---------------------------------------------------------
// LEVEL 4 — Comparison (C vs K)
// ---------------------------------------------------------
function level4() {
  function template(colderOrHotter) {
    const c = rand(-80, 120);
    const k = rand(180, 450);
    const result =
      colderOrHotter === "colder"
        ? (c + 273.15 < k ? c : k)
        : (c + 273.15 > k ? c : k);

    return {
      prompt: `Which is ${colderOrHotter}: ${c}°C or ${k} K? Enter the temperature (e.g. ${result}, ${result}K).`,
      answer: result,
      type: "compare",
    };
  }

  const options = [
    () => template("colder"),
    () => template("hotter"),
    () => template("hotter"),
  ];

  return options[rand(0, options.length - 1)]();
}

// ---------------------------------------------------------
// LEVEL 5 — % more energy
// ---------------------------------------------------------
function level5() {
  const c1 = rand(-50, 100);
  const c2 = c1 + rand(20, 60);

  const T1 = c1 + 273.15;
  const T2 = c2 + 273.15;

  const pct = ((T2 - T1) / T1) * 100;
  const rounded = parseFloat(pct.toFixed(1));

  const templates = [
    `A gas is heated from ${c1}°C to ${c2}°C. What **percentage more energy** does it have (energy ∝ T)?`,
    `If a substance warms from ${c1}°C to ${c2}°C, by what **percentage does its internal energy increase**?`,
    `A system is heated from ${c1}°C to ${c2}°C. What % **more thermal energy** does it have?`,
    `From ${c1}°C to ${c2}°C, by what **percentage** does its thermal energy rise?`,
    `A vessel goes from ${c1}°C to ${c2}°C. What is the % **increase in energy**?`,
  ];

  return { prompt: templates[rand(0,4)], answer: rounded, type: "percent" };
}

// Level routing
function makeQuestion(level) {
  return [null, level1, level2, level3, level4, level5][level]();
}

// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------
export default function CtoKPractice() {
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState(makeQuestion(1));
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  function normaliseTemperatureInput(input) {
    const m = input.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function checkAnswer() {
    const user = answer.trim();
    let correct = false;

    if (question.type === "compare") {
      const parsed = normaliseTemperatureInput(user);
      correct = parsed !== null && Math.abs(parsed - question.answer) < 0.01;
    } 
    
    else if (question.type === "percent") {
      const cleaned = user
        .toLowerCase()
        .replace(/percent|per\s*cent|pc|%/g, "")
        .trim();
      const parsed = parseFloat(cleaned);
      correct = !Number.isNaN(parsed) && Math.abs(parsed - question.answer) < 0.1;
    } 
    
    else if (question.type === "number") {
      const parsed = parseFloat(user);
      correct = !Number.isNaN(parsed) && Math.abs(parsed - question.answer) < 0.01;
    }

    setIsCorrect(correct);
    setChecked(true);
    if (correct) setScore(s => s + 1);
  }

  function nextQuestion() {
    if (level >= TOTAL_QUESTIONS) {
      setFinished(true);
      return;
    }
    const next = level + 1;
    setLevel(next);
    setQuestion(makeQuestion(next));
    setAnswer("");
    setChecked(false);
    setIsCorrect(null);
  }

  function restart() {
    setLevel(1);
    setQuestion(makeQuestion(1));
    setAnswer("");
    setChecked(false);
    setIsCorrect(null);
    setScore(0);
    setFinished(false);
  }

  // progress bar %
  const completed = level - 1 + (checked ? 1 : 0);
  const progressPercent = (completed / TOTAL_QUESTIONS) * 100;

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      !checked ? checkAnswer() : nextQuestion();
    }
  }

  // button style matching your site's .share-inline button
  const btnStyle = {
    border: "1px solid var(--border, rgba(0,0,0,.1))",
    background: "var(--bg, #fff)",
    color: "var(--text, #2A2A3A)",
    padding: "6px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: ".85rem",
    boxShadow: "var(--shadow, 0 4px 16px rgba(0,0,0,.06))",
    transition: "transform .1s ease",
  };

  const btnHoverStyle = { transform: "translateY(-1px)" };

  return (
    <div
      style={{
        maxWidth: "460px",
        margin: "2rem auto",
        padding: "1.5rem",
        border: "1px solid var(--border, #ccc)",
        borderRadius: "12px",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: "6px",
          background: "rgba(0,0,0,0.08)",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "var(--brand-pink)",
            transition: "width .25s ease-out",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <h3 style={{ margin: 0 }}>Temperature Practice</h3>
        <div style={{ opacity: 0.7 }}>
          Score: {score}/{TOTAL_QUESTIONS}
        </div>
      </div>

      {!finished ? (
        <>
          <p style={{ marginTop: "1rem" }}>{question.prompt}</p>

          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (checked) {
                setChecked(false);
                setIsCorrect(null);
              }
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              marginTop: "0.5rem",
              padding: "6px",
              borderRadius: "8px",
              border: "1px solid var(--border, rgba(0,0,0,.1))",
              fontSize: "1rem",
            }}
          />

          {checked && (
            <div style={{ marginTop: "0.75rem" }}>
              {isCorrect ? (
                <span style={{ color: "green" }}>✓ Correct</span>
              ) : question.type === "compare" ? (
                <span style={{ color: "red" }}>
                  ✗ Incorrect — correct temperature: {question.answer}
                </span>
              ) : question.type === "percent" ? (
                <span style={{ color: "red" }}>
                  ✗ Incorrect — correct % increase in energy: {question.answer}%
                </span>
              ) : (
                <span style={{ color: "red" }}>
                  ✗ Incorrect — answer: {question.answer.toFixed(2)}
                </span>
              )}
            </div>
          )}

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
            <button
              onClick={checkAnswer}
              disabled={checked}
              style={btnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.transform = btnHoverStyle.transform)}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              Check
            </button>

            <button
              onClick={nextQuestion}
              disabled={!checked}
              style={btnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.transform = btnHoverStyle.transform)}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              {level === TOTAL_QUESTIONS ? "Finish" : "Next"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>You scored {score}/{TOTAL_QUESTIONS}.</p>
          <button
            onClick={restart}
            style={btnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.transform = btnHoverStyle.transform)}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
