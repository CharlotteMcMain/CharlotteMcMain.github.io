// assets/js/mathpad.js
export class MathPad {
  constructor({ mount, input, rows = MathPad.defaultRows(), onInsert }){
    this.mount = mount;               // HTMLElement where buttons go
    this.input = input;               // <input> or <textarea>
    this.rows  = rows;                // array of arrays of buttons
    this.onInsert = onInsert || (()=>{});
    this.render();
  }

  static defaultRows(){
    return [
      // Variables / Greek
      ["v","f","λ","t","x","Δ","π","Ω","μ"],
      // Operators
      ["=","+","−","·","×","/","^","√","(",")"],
      // Extra
      ["<","≤",">","≥","≈","≠","↔","→"],
      // Controls
      ["Back","Clear"]
    ];
  }

  insert(text){
    const el = this.input;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after  = el.value.slice(end);

    if (text === "Back") {
      el.value = before.slice(0, -1) + after;
      el.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
    } else if (text === "Clear") {
      el.value = "";
      el.setSelectionRange(0, 0);
    } else {
      el.value = before + text + after;
      const caret = start + text.length;
      el.setSelectionRange(caret, caret);
    }
    el.focus();
    this.onInsert(text, el.value);
  }

  render(){
    const pad = document.createElement("div");
    pad.className = "mathpad";
    this.rows.forEach(row => {
      const r = document.createElement("div");
      r.className = "mathpad-row";
      row.forEach(label => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mathpad-key";
        b.textContent = label;
        b.addEventListener("click", () => this.insert(label));
        r.appendChild(b);
      });
      pad.appendChild(r);
    });
    this.mount.innerHTML = "";
    this.mount.appendChild(pad);
  }
}
