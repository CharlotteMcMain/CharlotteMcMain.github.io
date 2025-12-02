import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Option = {
  id: string;   // "A", "B", "C"...
  label: string; // we'll allow LaTeX in here
};

type MultipleChoiceQuestionProps = {
  id: string;
  stem: string;
  options: Option[];
  correctId: string;
  explanation?: string;
};

function renderLabel(label: string): React.ReactNode {
  const trimmed = label.trim();

  const isDisplay = trimmed.startsWith("$$") && trimmed.endsWith("$$");
  const isInline =
    !isDisplay && trimmed.startsWith("$") && trimmed.endsWith("$");

  if (!isInline && !isDisplay) {
    // just plain text, no LaTeX delimiters
    return label;
  }

  const latex = trimmed.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1);

  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: isDisplay,
    });

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (e) {
    // if KaTeX chokes for some reason, fall back to the raw text
    return label;
  }
}

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  id,
  stem,
  options,
  correctId,
  explanation,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = submitted && selected === correctId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitted(true);
  }

  function handleChange(optionId: string) {
    setSelected(optionId);
    setSubmitted(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mcq"
      aria-labelledby={`${id}-stem`}
    >
      <p id={`${id}-stem`} className="mcq-stem">
        {stem}
      </p>

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
              onClick={() => handleChange(opt.id)}
            >
              <span className="mcq-option-label">{opt.id}.</span>
              <span className="mcq-option-text">
                {renderLabel(opt.label)}
              </span>
            </button>
          );
        })}
      </div>

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

      {submitted && explanation && (
        <div className="mcq-explanation">
          <strong>Explanation: </strong>
          {explanation}
        </div>
      )}
    </form>
  );
};

export default MultipleChoiceQuestion;
