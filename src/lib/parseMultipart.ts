type LeafMap = Record<string, string>;
type ParentMap = Record<string, string>;

export function parseMultipart(body: string): {
  stem: string;
  prompts: LeafMap;
  parentPrompts: ParentMap;
  schemes: LeafMap;
  explanations: LeafMap;
} {
  const stem = body.split(/###\s*\([^)]+\)/)[0].trim();

  const mainSection =
    body.match(/([\s\S]*?)(?=\n##\s*Mark scheme|\n##\s*Explanation|$)/i)?.[1] ??
    body;

  const extractMainBlocks = (text: string) => {
    const blocks: Record<string, string> = {};
    const re = /###\s*\(([^)]+)\)\s*([\s\S]*?)(?=\n###\s*\(|$)/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      blocks[m[1].trim().toLowerCase()] = m[2].trim();
    }
    return blocks;
  };

  const splitMain = (text: string) => {
    const idx = text.search(/\n####\s*\([^)]+\)/);
    const parentText = (idx === -1 ? text : text.slice(0, idx)).trim();

    const leaves: LeafMap = {};
    const re = /####\s*\(([^)]+)\)\s*([\s\S]*?)(?=\n####\s*\(|$)/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const roman = m[1].trim().toLowerCase();
      const content = m[2].trim();
      if (content) leaves[roman] = content;
    }

    return { parentText, leaves };
  };

  const prompts: LeafMap = {};
  const parentPrompts: ParentMap = {};

  const mainBlocks = extractMainBlocks(mainSection);

  for (const [mainId, content] of Object.entries(mainBlocks)) {
    const { parentText, leaves } = splitMain(content);

    if (Object.keys(leaves).length > 0) {
      if (parentText) parentPrompts[mainId] = parentText;
      for (const [roman, txt] of Object.entries(leaves)) {
        prompts[`${mainId}${roman}`] = txt;
      }
    } else if (content) {
      prompts[mainId] = content;
    }
  }

  const extractLeavesFromSection = (sectionName: string) => {
    const section =
      body.match(
        new RegExp(
          `##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
          "i"
        )
      )?.[1] ?? "";

    const out: LeafMap = {};
    const blocks = extractMainBlocks(section);

    for (const [mainId, content] of Object.entries(blocks)) {
      const { leaves } = splitMain(content);
      if (Object.keys(leaves).length > 0) {
        for (const [roman, txt] of Object.entries(leaves)) {
          out[`${mainId}${roman}`] = txt;
        }
      } else if (content) {
        out[mainId] = content;
      }
    }

    return out;
  };

  return {
    stem,
    prompts,
    parentPrompts,
    schemes: extractLeavesFromSection("Mark scheme"),
    explanations: extractLeavesFromSection("Explanation"),
  };
}