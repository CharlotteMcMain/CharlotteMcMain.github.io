import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fig2Svg } from "../src/diagrams/circuits/fig2";

const outDir = resolve("public/assets/exam-pictures/generated");
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "fig2.svg"), fig2Svg(), "utf8");
console.log("Wrote fig2.svg");