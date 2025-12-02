import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Option = {
  id: string;
  label: string; // supports LaTeX + simple HTML
};

type MultipleChoiceQuestionProps = {
  id: string;
  stem: string;   // supports LaTeX + simple HTML
  options: Option[];
  correctId: string;
  marks?: number;
  meta?: string;              // e.g. "OCR A · June 2024 · A-4"
  children?: React.ReactNode; // explanation content
};

// Render plain text, allowing basic HTML (including <img>) and line breaks
function renderPlainHtml(text: string): React.ReactNode {
  if (!text) return null;
  // If you want \n to act as line breaks, uncomment the next line:
  // text = text.replace(/\n/g, "<br />");
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

// Render inline or display LaTeX segments inside normal text
function renderWithKaTeX(text: string): React.ReactNode {
  if (!text.includes("$")) {
    // no math at all – just render HTML
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

    // Plain HTML before this math segment
    if (matchIndex > lastIndex) {
      const plain = text.slice(lastIndex, matchIndex);
      parts.push(
        <React.Fragment key={key++}>
          {renderPlainHtml(plain)}
        </React.Fragment>
      );
    }

    const isDisplay = delimiter === "$$";

    try {
      const html = katex.renderToString(content, {
        throwOnError: false,
        displayMode: isDisplay,
      });

      parts.push(
        <span
          key={key++}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      parts.push(
        <React.Fragment key={key++}>{fullMatch}</React.Fragment>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Any remaining plain HTML after the last math segment
  if (lastIndex < text.length) {
    const plain = text.slice(lastIndex);
    parts.push(
      <React.Fragment key={key++}>
        {renderPlainHtml(plain)}
      </React.Fragment>
    );
  }

  return <>{parts}</>;
}

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  id,
  stem,
  options,
  correctId,
  marks,
  meta,
  children,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const isCorrect = submitted && selected === correctId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mcq" aria-labelledby={`${id}-stem`}>
      {/* Meta + marks row */}
      {(meta || typeof marks === "number") && (
        <div className="mcq-meta-row">
          <div className="mcq-meta">{meta}</div>
          {typeof marks === "number" && (
            <div className="mcq-marks">
              {marks} mark{marks === 1 ? "" : "s"}
            </div>
          )}
        </div>
      )}

      {/* Stem */}
      <div className="mcq-header">
        <div id={`${id}-stem`} className="mcq-stem">
          {renderWithKaTeX(stem)}
        </div>
      </div>

      {/* Options */}
      <div className="mcq-options">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const showCorrect = submitted && opt.id === correctId;
          const showIncorrect = submitted && isSelected && !showCorrect;

          return (
            <button
              key={opt.id}
              type="button"
              className={[
                "mcq-option",
                isSelected ? "mcq-option--selected" : "",
                showCorrect ? "mcq-option--correct" : "",
                showIncorrect ? "mcq-option--incorrect" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSelected(opt.id);
                setSubmitted(false);
              }}
            >
              <span className="mcq-option-label">{opt.id}.</span>
              <span className="mcq-option-text">
                {renderWithKaTeX(opt.label)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Check answer */}
      <div className="mcq-actions">
        <button
          type="submit"
          className="mcq-submit"
          disabled={!selected || submitted}
        >
          {submitted ? "Marked" : "Check answer"}
        </button>

        {submitted && (
          <span
            className={`mcq-result ${
              isCorrect ? "mcq-result--correct" : "mcq-result--incorrect"
            }`}
          >
            {isCorrect ? "Correct ✅" : "Not quite ❌"}
          </span>
        )}
      </div>

      {/* Explanation toggle */}
      {children && (
        <div className="mcq-explanation-wrapper">
          <button
            type="button"
            className="mcq-explanation-button"
            onClick={() => setShowExplanation((s) => !s)}
          >
            {showExplanation ? "Hide explanation ▲" : "Show explanation ▼"}
          </button>

          {showExplanation && (
            <div className="mcq-explanation">
              {children}
            </div>
          )}
        </div>
      )}
    </form>
  );
};

export default MultipleChoiceQuestion;
