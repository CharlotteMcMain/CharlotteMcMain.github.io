function extractPartBlocks(sectionText: string) {
  const out: Record<string, string> = {};
  const re = /###\s*\(([^)]+)\)\s*([\s\S]*?)(?=###\s*\(|$)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(sectionText)) !== null) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

export function parseMultipart(body: string) {
  // prompts from the main question area
  const prompts: Record<string, string> = {};
  const promptRe =
    /###\s*\(([^)]+)\)\s*([\s\S]*?)(?=###\s*\(|##\s*Mark scheme|##\s*Explanation|$)/g;

  let m: RegExpExecArray | null;
  while ((m = promptRe.exec(body)) !== null) {
    prompts[m[1].trim()] = m[2].trim();
  }

  // stem: before first part heading
  const stem = body.split(/###\s*\([^)]+\)/)[0].trim();

  // mark scheme section
  const msSection = body.match(/##\s*Mark scheme([\s\S]*?)(?=##\s*Explanation|$)/i)?.[1] ?? "";
  const schemes = extractPartBlocks(msSection);

  // explanation section
  const expSection = body.match(/##\s*Explanation([\s\S]*)$/i)?.[1] ?? "";
  const explanations = extractPartBlocks(expSection);

  return { stem, prompts, schemes, explanations };
}