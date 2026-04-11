export function parseMCQ(body: string) {
  const section = (title: string) => {
    const re = new RegExp(`###\\s+${title}\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|$)`, "i");
    return (body.match(re)?.[1] ?? "").trim();
  };

  const stem = section("Question");

  const optionsBlock = section("Options");
  const options = optionsBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"))
    .map((line) => {
      // "- (A) blah"
      const m = line.match(/-\s*\(([^)]+)\)\s*(.*)$/);
      return {
        id: (m?.[1] ?? "").trim(),
        label: (m?.[2] ?? "").trim(),
      };
    })
    .filter((o) => o.id && o.label);

  const correctId = section("Answer").replace(/\s+/g, "").trim(); // "B"
  const explanation = section("Explanation");

  if (!stem) throw new Error("parseMCQ: Missing ### Question section");
  if (options.length < 2) throw new Error("parseMCQ: Missing or invalid ### Options section");
  if (!correctId) throw new Error("parseMCQ: Missing ### Answer section");

  return { stem, options, correctId, explanation };
}