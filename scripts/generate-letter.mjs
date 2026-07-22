// Generates a one-page A4 cover letter (DOCX), Calibri, sober, with the same
// blue contact header (#1F4E79) as the CV. Body is read from a plain-text file:
//   first line   -> "Re: ..." subject (bold, blue)
//   "- " lines   -> bullet list
//   blank line   -> paragraph break
//   last line    -> signature (bold) if it is just the name
// Usage: node scripts/generate-letter.mjs --body letter.txt --name "Benoît SIGWALD" \
//        --contact "Mougins, France · +33 6 13 70 53 21 · mail · github" --out file.docx
import fs from "node:fs";
import {
  AlignmentType, Document, Packer, Paragraph, ShadingType, TextRun, WidthType,
  Table, TableCell, TableRow, TableLayoutType, BorderStyle,
} from "docx";

const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { args[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
}
if (!args.body || !args.out || !args.name) {
  console.error("Usage: node scripts/generate-letter.mjs --body <txt> --name <name> --contact <line> --out <docx>");
  process.exit(1);
}

const BLUE = "1F4E79";
const raw = fs.readFileSync(args.body, "utf8").replace(/\r\n/g, "\n").trimEnd();
const lines = raw.split("\n");

const run = (text, opts = {}) => new TextRun({ text, font: "Calibri", ...opts });

// ---- Header: name (white bold) + contact (white small) on a blue band ----
const bandShading = { type: ShadingType.CLEAR, fill: BLUE, color: "auto" };
const headerCell = new TableCell({
  shading: bandShading,
  margins: { top: 120, bottom: 120, left: 200, right: 200 },
  children: [
    // Paragraph-level shading too, so the band survives renderers (e.g. Google Docs)
    // that drop table-cell background on .docx import.
    new Paragraph({ shading: bandShading, children: [run(args.name, { bold: true, size: 30, color: "FFFFFF" })], spacing: { after: 40 } }),
    new Paragraph({ shading: bandShading, children: [run(args.contact ?? "", { size: 17, color: "FFFFFF" })] }),
  ],
});
const header = new Table({
  width: { size: 9360, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [new TableRow({ children: [headerCell] })],
});

// ---- Body ----
const body = [];
body.push(new Paragraph({ spacing: { after: 200 }, children: [] })); // gap after header

let signatureName = null;
if (lines.length && lines[lines.length - 1].trim() === args.name) {
  signatureName = lines.pop();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
}

let subjectDone = false;
for (const line of lines) {
  const t = line.trim();
  if (t === "") { body.push(new Paragraph({ spacing: { after: 120 }, children: [] })); continue; }
  if (!subjectDone && /^re:/i.test(t)) {
    body.push(new Paragraph({ spacing: { after: 160 }, children: [run(t, { bold: true, size: 21, color: BLUE })] }));
    subjectDone = true;
    continue;
  }
  if (t.startsWith("- ")) {
    body.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80, line: 264, lineRule: "auto" },
      children: [run(t.slice(2), { size: 21 })],
    }));
    continue;
  }
  body.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 276, lineRule: "auto" },
    children: [run(t, { size: 21 })],
  }));
}

if (signatureName) {
  body.push(new Paragraph({ spacing: { before: 200 }, children: [run(signatureName, { bold: true, size: 21, color: BLUE })] }));
}

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
    children: [header, ...body],
  }],
});

const out = args.out;
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log(`OK: ${out} (${buf.length} bytes)`);
});
