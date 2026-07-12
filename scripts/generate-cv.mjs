// Generates a one-page A4 CV (DOCX) reproducing the exact Master CV template.
// Geometry, colors and typography extracted from the reference PDF (2026.06 Master CV):
//   header fill #1F4E78 (y22..94pt), photo 60x71pt flush right, titles #1F4E79,
//   2pt #2E74B5 rules under section titles, 1pt #2E74B5 vertical line in career,
//   skills cells #F1F4F7 (42pt, gutters 14/17pt), formation rows #F1F4F7 with 1pt #BEBEBE lines,
//   dates italic #595959, pale header text #D5E8F0, "·" separators, margins L36/R37/T22pt.
// Usage: node scripts/generate-cv.mjs --data data/tailored.local.json --photo assets/photo.jpg --out output/cv.docx
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((s) => { const i = s.indexOf(" "); return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; })
);
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

const HEADER_FILL = "1F4E78";
const TITLE_BLUE = "1F4E79";
const RULE_BLUE = "2E74B5";
const CELL_FILL = "F1F4F7";
const PALE = "D5E8F0";
const DATE_GRAY = "595959";
const LINE_GRAY = "BEBEBE";

const NO_BORDER = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

// sizes are half-points: 20pt=40, 11=22, 10.5=21, 10=20, 9.5=19, 9=18, 8.5=17, 8=16
const run = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 19, ...opts });

const sectionTitle = (text) =>
  new Paragraph({
    spacing: { before: 120, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: RULE_BLUE, space: 3 } },
    children: [run(text.toUpperCase(), { bold: true, color: TITLE_BLUE, size: 22 })],
  });

const cell = (children, opts = {}) =>
  new TableCell({
    children, borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 110, right: 110 }, ...opts,
  });

// ---------- Header: dark blue bar, photo flush right at full header height ----------
const headerShading = { fill: HEADER_FILL, type: ShadingType.CLEAR };
const headerLeft = [
  new Paragraph({ children: [run(cv.identity.name, { bold: true, size: 40, color: "FFFFFF" })], spacing: { after: 60 } }),
  new Paragraph({ children: [run(cv.identity.title, { size: 19, color: "FFFFFF" })], spacing: { after: 70 } }),
  new Paragraph({
    children: [run(`${cv.identity.location} · ${cv.identity.phone} · ${cv.identity.email}`, { size: 16, color: PALE })],
  }),
];
const headerMid = [
  new Paragraph({ children: [run(L.languages, { bold: true, size: 19, color: "FFFFFF" })], spacing: { after: 30 } }),
  new Paragraph({ children: [run(cv.identity.languages, { size: 17, color: PALE })], spacing: { after: 50 } }),
  new Paragraph({
    children: [run(L.availability, { bold: true, size: 19, color: "FFFFFF" }), run(` ${cv.identity.availability}`, { size: 17, color: PALE })],
    spacing: { after: 20 },
  }),
  new Paragraph({
    children: [run(L.age, { bold: true, size: 19, color: "FFFFFF" }), run(` ${cv.identity.age}`, { size: 17, color: PALE })],
  }),
];
const headerRight = [];
if (args.photo && fs.existsSync(args.photo)) {
  headerRight.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new ImageRun({
      type: path.extname(args.photo).replace(".", "") === "png" ? "png" : "jpg",
      data: fs.readFileSync(args.photo),
      transformation: { width: 80, height: 95 }, // 60 x 71.2 pt
    })],
  }));
} else {
  headerRight.push(new Paragraph({ children: [run(" ", { color: "FFFFFF" })] }));
}
const header = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [6250, 3000, 1200],
  rows: [new TableRow({
    children: [
      cell(headerLeft, { shading: headerShading, margins: { top: 150, bottom: 150, left: 220, right: 90 } }),
      cell(headerMid, { shading: headerShading, margins: { top: 150, bottom: 150, left: 90, right: 90 } }),
      new TableCell({
        children: headerRight, borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }, shading: headerShading,
      }),
    ],
  })],
});

// ---------- Summary ----------
const summary = new Paragraph({
  spacing: { before: 130, after: 20 },
  children: [run(cv.summary, { size: 19 })],
});

// ---------- Key skills: 3 columns of #F1F4F7 blocks with white gutters ----------
const skillCell = (skill) =>
  cell(
    [
      new Paragraph({ children: [run(skill.title, { bold: true, size: 19, color: TITLE_BLUE })], spacing: { after: 30 } }),
      new Paragraph({ children: [run(skill.content, { size: 17 })] }),
    ],
    { shading: { fill: CELL_FILL, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 110, right: 110 } },
  );
const gapCell = () => cell([new Paragraph({ children: [] })], { margins: { top: 0, bottom: 0, left: 0, right: 0 } });
const skillRow = (skills) =>
  new TableRow({
    children: [skillCell(skills[0]), gapCell(), skillCell(skills[1]), gapCell(), skillCell(skills[2])],
  });
const spacerRow = () =>
  new TableRow({
    height: { value: 200, rule: "exact" },
    children: [gapCell(), gapCell(), gapCell(), gapCell(), gapCell()],
  });
const skillsGrid = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [3480, 275, 3320, 335, 3040],
  rows: [skillRow(cv.key_skills.slice(0, 3)), spacerRow(), skillRow(cv.key_skills.slice(3, 6))],
});

// ---------- Recent AI projects: blue bold company + em-dash + text ----------
const projects = (cv.recent_ai_projects ?? []).map((p) =>
  new Paragraph({
    spacing: { after: 50 },
    children: [run(`${p.company} — `, { bold: true, size: 20, color: TITLE_BLUE }), run(p.description, { size: 20 })],
  })
);

// ---------- Professional career: narrow left column, blue vertical line, roles in blue ----------
const roleRuns = (role) => {
  const i = role.indexOf("(");
  if (i === -1) return [run(role, { bold: true, size: 21, color: TITLE_BLUE })];
  return [
    run(role.slice(0, i), { bold: true, size: 21, color: TITLE_BLUE }),
    run(role.slice(i), { italics: true, size: 19, color: TITLE_BLUE }),
  ];
};
const careerRows = cv.career.map((job, i) =>
  new TableRow({
    children: [
      cell([
        new Paragraph({ children: [run(job.company, { bold: true, size: 20, color: TITLE_BLUE })], spacing: { after: 30 } }),
        new Paragraph({ children: [run(job.dates, { italics: true, size: 18, color: DATE_GRAY })], spacing: { after: 20 } }),
        new Paragraph({ children: [run(job.location, { italics: true, size: 18, color: DATE_GRAY })] }),
      ], { margins: { top: 40, bottom: 60, left: 0, right: 90 } }),
      new TableCell({
        verticalAlign: VerticalAlign.TOP,
        borders: { ...NO_BORDERS, left: { style: BorderStyle.SINGLE, size: 8, color: RULE_BLUE } },
        margins: { top: 40, bottom: 60, left: 130, right: 0 },
        children: [
          new Paragraph({ children: roleRuns(job.role), spacing: { after: 30 } }),
          ...job.bullets.map((b) => new Paragraph({
            spacing: { after: 30 },
            indent: { left: 340, hanging: 170 },
            children: [run(`• ${b}`, { size: 20 })],
          })),
        ],
      }),
    ],
  })
);
const career = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [2000, 8446],
  rows: careerRows,
});

// ---------- Formation: all rows #F1F4F7, 1pt gray separators ----------
const GRAY_LINE = { style: BorderStyle.SINGLE, size: 8, color: LINE_GRAY };
const formationRows = cv.formation.map((f) =>
  new TableRow({
    children: [
      cell([new Paragraph({ children: [run(f.label, { bold: true, size: 18, color: TITLE_BLUE })] })],
        { shading: { fill: CELL_FILL, type: ShadingType.CLEAR }, margins: { top: 35, bottom: 35, left: 110, right: 90 } }),
      cell([new Paragraph({ children: [run(f.content, { size: 18 })] })],
        { shading: { fill: CELL_FILL, type: ShadingType.CLEAR }, margins: { top: 35, bottom: 35, left: 110, right: 90 } }),
    ],
  })
);
const formation = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: GRAY_LINE, bottom: GRAY_LINE, left: NO_BORDER, right: NO_BORDER,
    insideHorizontal: GRAY_LINE, insideVertical: NO_BORDER,
  },
  columnWidths: [2400, 8046],
  rows: formationRows,
});

// ---------- Document (margins from reference: T22/L36/R37pt) ----------
const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri" } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 440, right: 740, bottom: 440, left: 720 },
      },
    },
    children: [
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
