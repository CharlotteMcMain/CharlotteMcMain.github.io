// src/diagrams/parts.ts

type Attrs = Record<string, string | number | undefined>;

function attrs(a: Attrs) {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(" ");
}

export function group(x: number, y: number, inner: string, extra: Attrs = {}) {
  return `<g transform="translate(${x} ${y})" ${attrs(extra)}>${inner}</g>`;
}

// ===== Primitives =====

export function wire(x1: number, y1: number, x2: number, y2: number, cls = "w") {
  return `<path class="${cls}" d="M${x1} ${y1} L${x2} ${y2}" />`;
}

export function hWire(x: number, y: number, len: number, cls = "w") {
  return `<path class="${cls}" d="M${x} ${y} h${len}" />`;
}

export function vWire(x: number, y: number, len: number, cls = "w") {
  return `<path class="${cls}" d="M${x} ${y} v${len}" />`;
}

export function node(x: number, y: number, r = 8, hollow = true) {
  // hollow exam node (middle cut out)
  return hollow
    ? `<circle cx="${x}" cy="${y}" r="${r}" class="node" />`
    : `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" />`;
}

export function label(x: number, y: number, text: string, cls = "ts") {
  return `<text x="${x}" y="${y}" class="${cls}">${text}</text>`;
}

// ===== Components =====

// Capacitor centered at (0,0), vertical (series) or horizontal (parallel branch)
export function capacitor({
  plate = 80,      // length of each plate
  gap = 28,        // distance between plates
  lead = 18,       // length of wire coming out of plates
  vertical = true, // orientation
  cls = "w",
}: {
  plate?: number;
  gap?: number;
  lead?: number;
  vertical?: boolean;
  cls?: string;
}) {
  if (vertical) {
    // Vertical capacitor (series)
    // Plates are horizontal, wires go up/down

    const x1 = -plate / 2;
    const x2 = plate / 2;

    const yTopPlate = -gap / 2;
    const yBotPlate = gap / 2;

    return [
      // top lead
      `<path class="${cls}" d="M0 ${yTopPlate - lead} V${yTopPlate}" />`,

      // top plate
      `<path class="${cls}" d="M${x1} ${yTopPlate} H${x2}" />`,

      // bottom plate
      `<path class="${cls}" d="M${x1} ${yBotPlate} H${x2}" />`,

      // bottom lead
      `<path class="${cls}" d="M0 ${yBotPlate} V${yBotPlate + lead}" />`,
    ].join("");
  } else {
    // Horizontal capacitor (parallel branch)
    // Plates are vertical, wires go left/right

    const y1 = -plate / 2;
    const y2 = plate / 2;

    const xLeftPlate = -gap / 2;
    const xRightPlate = gap / 2;

    return [
      // left lead
      `<path class="${cls}" d="M${xLeftPlate - lead} 0 H${xLeftPlate}" />`,

      // left plate
      `<path class="${cls}" d="M${xLeftPlate} ${y1} V${y2}" />`,

      // right plate
      `<path class="${cls}" d="M${xRightPlate} ${y1} V${y2}" />`,

      // right lead
      `<path class="${cls}" d="M${xRightPlate} 0 H${xRightPlate + lead}" />`,
    ].join("");
  }
}

// Simple voltmeter centered at (0,0)
export function voltmeter(r = 44) {
  return [
    `<circle cx="0" cy="0" r="${r}" class="w" />`,
    `<text x="-12" y="12" class="ts">V</text>`,
  ].join("");
}

// Simple SPST switch symbol around origin.
// You can extend this later (SPDT etc.)
export function switchSpst({
  armLen = 70,
  contactGap = 30,
}: {
  armLen?: number;
  contactGap?: number;
}) {
  // Two contacts on a horizontal line + angled arm
  // Contacts at (-contactGap/2, 0) and (+contactGap/2, 0)
  const left = -contactGap / 2;
  const right = contactGap / 2;

  return [
    node(left, 0, 8, true),
    node(right, 0, 8, true),
    // arm from left contact up-right (open)
    `<path class="w" d="M${left} 0 l${armLen} -${armLen * 0.35}" />`,
  ].join("");
}