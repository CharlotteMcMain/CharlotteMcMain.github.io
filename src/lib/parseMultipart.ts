type LeafMap = Record<string, string>;

function romanToNum(r: string): number | null {
  const s = r.trim().toLowerCase();
  const map: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };
  return map[s] ?? null;
}

function numToRoman(n: number): string {
  const map = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return map[n] ?? String(n);
}

/**
 * Extract leaf blocks from a section that may contain:
 *  - ### (a) ... (possibly with #### (i)/(ii) ... inside)
 *  - ### (b) ...
 *
 * Returns a map keyed by:
 *  - "a" if there are no subparts for (a)
 *  - "ai", "aii", "aiii" if there are #### (i)/(ii)/(iii) within (a)
 */
function extractLeavesFromText(text: string): LeafMap {
  const out: LeafMap = {};

  // Match each main part: ### (a) ... until next ### (x) or end
  const mainRe = /###\s*\(([^)]+)\)\s*([\s\S]*?)(?=\n###\s*\(|$)/g;
  let main: RegExpExecArray | null;

  while ((main = mainRe.exec(text)) !== null) {
    const mainIdRaw = main[1].trim();
    const mainId = mainIdRaw.replace(/\s+/g, "").toLowerCase(); // "a", "b", "c"
    const mainBody = (main[2] ?? "").trim();

    // Find subparts inside this main body: #### (i) ... until next #### (x) or end
    const subRe = /####\s*\(([^)]+)\)\s*([\s\S]*?)(?=\n####\s*\(|$)/g;
    let sub: RegExpExecArray | null;
    const subLeaves: LeafMap = {};
    let subCount = 0;

    while ((sub = subRe.exec(mainBody)) !== null) {
      const romanRaw = sub[1].trim();
      const romanNorm = romanRaw.replace(/\s+/g, "").toLowerCase(); // "i", "ii"
      const subText = (sub[2] ?? "").trim();
      if (!subText) continue;

      const n = romanToNum(romanNorm);
      // If it looks like roman numerals, use it; otherwise just append raw
      const suffix = n ? numToRoman(n) : romanNorm;

      // leaf id like "ai", "aii"
      const leafId = `${mainId}${suffix}`;
      subLeaves[leafId] = subText;
      subCount++;
    }

    if (subCount > 0) {
      // Use subparts instead of the main block
      Object.assign(out, subLeaves);
    } else {
      // No subparts; leaf is just "a"
      if (mainBody) out[mainId] = mainBody;
    }
  }

  return out;
}

/**
 * Splits out a named section like "Mark scheme" or "Explanation".
 * Returns the text inside that section (without the heading).
 */
function extractSection(body: string, heading: string): string {
  // Capture from "## Heading" to the next "## SomethingElse" or end
  const re = new RegExp(
    `##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i"
  );
  return (body.match(re)?.[1] ?? "").trim();
}

export function parseMultipart(body: string) {
  // STEM = everything before the first main part heading "### (a)"
  const stem = body.split(/###\s*\([^)]+\)/)[0].trim();

  // PROMPTS come from everything BEFORE "## Mark scheme" or "## Explanation"
  const cutoff =
    body.match(/([\s\S]*?)(?=\n##\s*Mark scheme|\n##\s*Explanation|$)/i)?.[1] ??
    body;

  const prompts = extractLeavesFromText(cutoff);

  // MARK SCHEME leaves
  const msText = extractSection(body, "Mark scheme");
  const schemes = msText ? extractLeavesFromText(msText) : {};

  // EXPLANATION leaves
  const expText = extractSection(body, "Explanation");
  const explanations = expText ? extractLeavesFromText(expText) : {};

  return { stem, prompts, schemes, explanations };
}