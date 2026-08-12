// Generates a one-page A4 CV (DOCX) reproducing the exact Master CV template.
// Geometry, colors and typography extracted from the reference DOCX (2026.06 Master CV, Word XML):
//   header = fixed 9360-DXA table (6300+3060) filled #1F4E79, photo 60x71.3pt floating right of it,
//   section titles 11pt #1F4E79 with 1.5pt #2E75B6 bottom border (space 2),
//   skills = fixed 10590-DXA grid (3525/270/3360/345/3090), cells #F2F4F8, margins 80/140,
//   career = fixed 10380-DXA table (1980/8400), 0.75pt #2E75B6 right border on left cell,
//   bullets 9.5pt with indent left 360 hanging 240, formation = 10470-DXA table (1410/9060),
//   cells #F2F4F8 with 0.5pt #BFBFBF top/bottom borders, dates italic #595959, pale #D5E8F0,
//   page margins top 142 / left 720 / right 720 / bottom 300 twips.
// Usage: node scripts/generate-cv.mjs --data data/tailored.local.json --photo assets/photo.jpg --out output/cv.docx
import fs from "node:fs";
import path from "node:path";
import {
  BorderStyle, Document, HorizontalPositionRelativeFrom, ImageRun, LineRuleType, Packer,
  Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun,
  TextWrappingType, VerticalAlign, VerticalPositionRelativeFrom, WidthType,
} from "docx";

// Parse --flag value pairs from argv directly — values may legally contain "--" (e.g. paths).
const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { args[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
}
if (!args.data || !args.out) {
  console.error("Usage: node scripts/generate-cv.mjs --data <cv.json> [--photo <photo.jpg>] --out <file.docx>");
  process.exit(1);
}
const cv = JSON.parse(fs.readFileSync(args.data, "utf8"));

// Section headings and header labels, overridable per language via cv.headings / cv.labels
const H = {
  skills: "Key skills", projects: "Recent AI projects", career: "Professional career",
  formation: "Formation & certifications", ...(cv.headings ?? {}),
};
const L = { languages: "LANGUAGES", availability: "Availability", age: "Age", ...(cv.labels ?? {}) };

const BLUE = "1F4E79";        // header fill + all titles
const RULE_BLUE = "2E75B6";   // section rules + career vertical line
const CELL_FILL = "F2F4F8";   // skills + formation cells
const PALE = "D5E8F0";
const DATE_GRAY = "595959";
const SEP_GRAY = "BFBFBF";    // formation row separators

const NO_BORDER = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

// sizes are half-points: 20pt=40, 11=22, 10.5=21, 10=20, 9.5=19, 9=18, 8.5=17, 8=16
const run = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 19, ...opts });

const sectionTitle = (text) =>
  new Paragraph({
    spacing: { before: 140, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: RULE_BLUE, space: 2 } },
    children: [run(text.toUpperCase(), { bold: true, color: BLUE, size: 22 })],
  });

// ---------- Photo: floats to the right of the header bar, anchored to the first paragraph ----------
// Master: posH 5934075 EMU from column, posV 180975 EMU from paragraph, extent 762000x905363 EMU.
const anchorChildren = [];
if (args.photo && fs.existsSync(args.photo)) {
  anchorChildren.push(new ImageRun({
    type: path.extname(args.photo).replace(".", "") === "png" ? "png" : "jpg",
    data: fs.readFileSync(args.photo),
    transformation: { width: 58, height: 69 }, // 43.5 x 51.8 pt — same height as the slim blue bar
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: 5934075 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 180975 },
      wrap: { type: TextWrappingType.NONE },
      allowOverlap: true, behindDocument: false, layoutInCell: true,
    },
  }));
}
// Empty first paragraph (line 276, mark 11pt) — pushes the header bar to y≈21.6pt like the master.
const photoAnchor = new Paragraph({
  spacing: { before: 0, after: 0, line: 276, lineRule: LineRuleType.AUTO },
  children: [run("", { size: 22 }), ...anchorChildren],
});

// ---------- Header: 468pt dark blue bar (6300 + 3060 DXA), photo outside at right ----------
const headerShading = { fill: BLUE, type: ShadingType.CLEAR };
const headerCell = (children, margins) =>
  new TableCell({
    children, borders: NO_BORDERS, shading: headerShading,
    verticalAlign: VerticalAlign.CENTER, margins,
  });
// The job title must stay on ONE line (master style). Available width in the left header
// cell ≈ 287pt (6300 DXA minus 360+200 twips margins); Calibri uppercase ≈ 0.52em/char.
// Shrink from 9.5pt down to 8pt if needed; below that, the title itself must be shortened.
const TITLE_WIDTH_PT = 287;
const titleWidth = (halfPoints) => cv.identity.title.length * (halfPoints / 2) * 0.52;
let titleSize = 19;
while (titleSize > 16 && titleWidth(titleSize) > TITLE_WIDTH_PT) titleSize--;
if (titleWidth(titleSize) > TITLE_WIDTH_PT) {
  console.warn(`WARN: header title is ${cv.identity.title.length} chars and will wrap to 2 lines even at 8pt — shorten it (aim <= 55 chars).`);
}
const headerLeft = [
  new Paragraph({ children: [run(cv.identity.name, { bold: true, size: 32, color: "FFFFFF" })], spacing: { after: 20 } }),
  new Paragraph({ children: [run(cv.identity.title, { size: titleSize, color: "FFFFFF" })], spacing: { after: 20 } }),
  new Paragraph({
    children: [run(`${cv.identity.location} · ${cv.identity.phone} · ${cv.identity.email}${cv.identity.github ? " · " + cv.identity.github : ""}`, { size: 16, color: PALE })],
  }),
];
const headerMid = [
  new Paragraph({ children: [run(L.languages, { bold: true, size: 18, color: "FFFFFF" })], spacing: { after: 20 } }),
  new Paragraph({ children: [run(cv.identity.languages, { size: 16, color: PALE })], spacing: { after: 20 } }),
  new Paragraph({
    children: [run(`${L.availability} `, { bold: true, size: 18, color: "FFFFFF" }), run(cv.identity.availability, { size: 16, color: PALE })],
    spacing: { after: 20 },
  }),
  new Paragraph({
    children: [run(`${L.age} `, { bold: true, size: 18, color: "FFFFFF" }), run(cv.identity.age, { size: 16, color: PALE })],
    spacing: { after: 0 },
  }),
];
const header = new Table({
  width: { size: 9360, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,
  borders: NO_BORDERS,
  columnWidths: [6300, 3060],
  rows: [new TableRow({
    height: { value: 1000, rule: "atLeast" },
    children: [
      headerCell(headerLeft, { top: 20, bottom: 20, left: 360, right: 200 }),
      headerCell(headerMid, { top: 20, bottom: 20, left: 200, right: 200 }),
    ],
  })],
});

// ---------- Summary ----------
const summary = new Paragraph({
  spacing: { before: 160, after: 120 },
  children: [run(cv.summary, { size: 20 })],
});

// ---------- Key skills: 3 columns of #F2F4F8 blocks with white gutters ----------
const skillCell = (skill) =>
  new TableCell({
    borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
    shading: { fill: CELL_FILL, type: ShadingType.CLEAR },
    margins: { top: 70, bottom: 70, left: 140, right: 140 },
    children: [
      new Paragraph({ children: [run(skill.title, { bold: true, size: 20, color: BLUE })], spacing: { after: 40 } }),
      new Paragraph({ children: [run(skill.content, { size: 18, color: "000000" })] }),
    ],
  });
const gapCell = (spacing = {}) =>
  new TableCell({
    borders: NO_BORDERS, margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [new Paragraph({ spacing, children: [] })],
  });
const skillRow = (skills, height) =>
  new TableRow({
    ...(height ? { height: { value: height, rule: "atLeast" } } : {}),
    children: [skillCell(skills[0]), gapCell(), skillCell(skills[1]), gapCell(), skillCell(skills[2])],
  });
// Master spacer row: empty paragraphs (after 20) in the content columns — ~13pt white gap.
const spacerRow = () =>
  new TableRow({
    children: [
      gapCell({ after: 20 }), gapCell(), gapCell({ after: 20 }), gapCell(), gapCell({ after: 20 }),
    ],
  });
const skillsGrid = new Table({
  width: { size: 10590, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,
  borders: NO_BORDERS,
  columnWidths: [3525, 270, 3360, 345, 3090],
  rows: [skillRow(cv.key_skills.slice(0, 3), 387), spacerRow(), skillRow(cv.key_skills.slice(3, 6))],
});

// ---------- Recent AI projects: blue bold company + em-dash + text ----------
const projects = (cv.recent_ai_projects ?? []).map((p) =>
  new Paragraph({
    spacing: { before: 0, after: 90 },
    children: [run(`${p.company}: `, { bold: true, size: 20, color: BLUE }), run(p.description, { size: 20, color: "000000" })],
  })
);

// ---------- Professional career: narrow left column, blue vertical line, roles in blue ----------
const roleRuns = (role) => {
  const i = role.indexOf("(");
  if (i === -1) return [run(role, { bold: true, size: 21, color: BLUE })];
  return [
    run(role.slice(0, i), { bold: true, size: 21, color: BLUE }),
    run(role.slice(i), { bold: true, size: 19, color: BLUE }),
  ];
};
const bulletPara = (text) =>
  new Paragraph({
    spacing: { before: 0, after: 60, line: 240, lineRule: LineRuleType.AUTO },
    indent: { left: 360, hanging: 240 },
    tabStops: [{ type: "left", position: 360 }],
    children: [run("•\t", { size: 20 }), run(text, { size: 19, color: "000000" })],
  });
const careerRows = cv.career.map((job) =>
  new TableRow({
    children: [
      new TableCell({
        verticalAlign: VerticalAlign.TOP,
        borders: { ...NO_BORDERS, right: { style: BorderStyle.SINGLE, size: 6, color: RULE_BLUE } },
        margins: { top: 40, bottom: 70, left: 0, right: 160 },
        children: [
          new Paragraph({ children: [run(job.company, { bold: true, size: 20, color: BLUE })], spacing: { after: 40 } }),
          new Paragraph({ children: [run(job.dates, { italics: true, size: 18, color: DATE_GRAY })], spacing: { after: 40 } }),
          new Paragraph({ children: [run(job.location, { italics: true, size: 18, color: DATE_GRAY })] }),
        ],
      }),
      new TableCell({
        verticalAlign: VerticalAlign.TOP,
        borders: NO_BORDERS,
        margins: { top: 40, bottom: 70, left: 200, right: 0 },
        children: [
          new Paragraph({ children: roleRuns(job.role), spacing: { after: 40 } }),
          ...job.bullets.map(bulletPara),
        ],
      }),
    ],
  })
);
const career = new Table({
  width: { size: 10380, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,
  borders: NO_BORDERS,
  columnWidths: [1980, 8400],
  rows: careerRows,
});

// ---------- Formation: all cells #F2F4F8, 0.5pt #BFBFBF top/bottom separators, centered ----------
const SEP_LINE = { style: BorderStyle.SINGLE, size: 4, color: SEP_GRAY };
const formationCell = (children) =>
  new TableCell({
    children, verticalAlign: VerticalAlign.CENTER,
    shading: { fill: CELL_FILL, type: ShadingType.CLEAR },
    margins: { top: 55, bottom: 55, left: 140, right: 140 },
    borders: { ...NO_BORDERS, top: SEP_LINE, bottom: SEP_LINE },
  });
const formationRows = cv.formation.map((f) =>
  new TableRow({
    children: [
      formationCell([new Paragraph({ children: [run(f.label, { bold: true, size: 19, color: BLUE })] })]),
      formationCell([new Paragraph({ children: [run(f.content, { size: 18, color: "000000" })] })]),
    ],
  })
);
const formation = new Table({
  width: { size: 10470, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,
  borders: NO_BORDERS,
  columnWidths: [1410, 9060],
  rows: formationRows,
});

// ---------- Document (margins from reference DOCX: T142/L720/R720/B300 twips) ----------
const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri" } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 142, right: 720, bottom: 300, left: 720 },
      },
    },
    children: [
      photoAnchor,
      header,
      summary,
      sectionTitle(H.skills),
      skillsGrid,
      sectionTitle(H.projects),
      ...projects,
      sectionTitle(H.career),
      career,
      sectionTitle(H.formation),
      formation,
    ],
  }],
});

fs.mkdirSync(path.dirname(args.out), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(args.out, buffer);
console.log(`OK: ${args.out} (${buffer.length} bytes)`);
