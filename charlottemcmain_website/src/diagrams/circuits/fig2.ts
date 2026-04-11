// src/diagrams/circuits/fig2.ts
import { group, wire, hWire, vWire, capacitor, voltmeter, node, label, switchSpst } from "../parts";

export function fig2Svg() {
  const W = 900, H = 520;

  // Styling: uses currentColor so it matches your theme if inlined
  const style = `
  <style>
    .w{stroke:currentColor;stroke-width:6;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .node{fill:var(--content-bg,#fff);stroke:currentColor;stroke-width:6}
    .t{font-family:"Fredoka",system-ui,sans-serif;font-size:36px;font-weight:500;fill:currentColor}
    .ts{font-family:"Fredoka",system-ui,sans-serif;font-size:34px;font-weight:700;fill:currentColor}
  </style>`;

  // Coordinate system: use absolute positions for the *main anchors*
  const topY = 120;
  const botY = 430;
  const leftX = 170;
  const rightX = 760;

  // Place the two series capacitors vertically centered (equal split)
  const midY = (topY + botY) / 2;     // 275
  const capGap = 60;                  // distance between cap centers
  const capAY = midY - capGap / 2;    // upper
  const capBY = midY + capGap / 2;    // lower

  const parts: string[] = [];

  // Rails + left return wire
  parts.push(hWire(leftX, topY, 650));
  parts.push(hWire(leftX, botY, 650));
  parts.push(vWire(leftX, topY, botY - topY));

  // Voltmeter branch (center-ish)
  const vmX = 425;
  parts.push(vWire(vmX, 200, 60)); // down to meter
  parts.push(group(vmX, 320, voltmeter()));
  parts.push(vWire(vmX, 364, botY - 364)); // down to bottom rail

  // Switch near top (simple symbol)
  const swX = 420, swY = 160;
  parts.push(group(swX, swY, switchSpst({ armLen: 80, contactGap: 40 })));
  parts.push(label(swX - 10, swY - 55, "S"));

  // Right side series capacitors + vertical wire
  // Wire from top rail down to cap A top lead
  parts.push(wire(rightX, topY, rightX, capAY - 40));
  // Capacitor A centered at (rightX, capAY)
  parts.push(group(rightX, capAY, capacitor({ vertical: true })));
  parts.push(label(rightX + 55, capAY + 10, "A"));

  // Connecting wire between A and B (from A bottom to B top)
  parts.push(wire(rightX, capAY + 14, rightX, capBY - 14));

  // Capacitor B
  parts.push(group(rightX, capBY, capacitor({ vertical: true })));
  parts.push(label(rightX + 55, capBY + 10, "B"));

  // Wire from B bottom to bottom rail
  parts.push(wire(rightX, capBY + 40, rightX, botY));

  // Optional figure label
  parts.push(label(430, 505, "Fig. 2"));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${style}${parts.join("")}</svg>`;
}