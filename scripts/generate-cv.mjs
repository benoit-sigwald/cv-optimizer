// Generates a one-page A4 CV (DOCX) reproducing the exact Master CV template.
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

const DARK = "1F3864";
const LIGHT = "EAF1FA";
const CONTENT_WIDTH = 11906 - 2 * 680; // A4 minus margins, in DXA

const NO_BORDER = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

const run = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 18, ...opts });
const white = (text, opts = {}) => run(text, { color: "FFFFFF", ...opts });

const sectionTitle = (text) =>
  new Paragraph({
    spacing: { before: 140, after: 60 },
    children: [run(text.toUpperCase(), { bold: true, color: DARK, size: 20 })],
  });

const cell = (children, opts = {}) =>
  new TableCell({
    children, borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 90, right: 90 }, ...opts,
  });

// ---------- Header (full-width dark blue, photo top right) ----------
const headerLeft = [
  new Paragraph({ children: [white(cv.identity.name, { bold: true, size: 40 })], spacing: { after: 40 } }),
  new Paragraph({ children: [white(cv.identity.title, { bold: true, size: 19 })], spacing: { after: 60 } }),
  new Paragraph({
    children: [white(`${cv.identity.location} • ${cv.identity.phone} • ${cv.identity.email}`, { size: 17 })],
  }),
];
const headerMid = [
  new Paragraph({ children: [white("LANGUAGES", { bold: true, size: 17 })], spacing: { after: 30 } }),
  new Paragraph({ children: [white(cv.identity.languages, { size: 17 })], spacing: { after: 60 } }),
  new Paragraph({ children: [white(`Availability ${cv.identity.availability}`, { size: 17 })] }),
  new Paragraph({ children: [white(`Age ${cv.identity.age}`, { size: 17 })] }),
];
const headerRight = [];
if (args.photo && fs.existsSync(args.photo)) {
  headerRight.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new ImageRun({
      type: path.extname(args.photo).replace(".", "") === "png" ? "png" : "jpg",
      data: fs.readFileSync(args.photo),
      transformation: { width: 95, height: 117 },
    })],
  }));
} else {
  headerRight.push(new Paragraph({ children: [white(" ")] }));
}
const headerShading = { fill: DARK, type: ShadingType.CLEAR };
const header = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [5800, 2900, 1846],
  rows: [new TableRow({
    children: [
      cell(headerLeft, { shading: headerShading, margins: { top: 140, bottom: 140, left: 160, right: 90 } }),
      cell(headerMid, { shading: headerShading, margins: { top: 140, bottom: 140, left: 90, right: 90 } }),
      cell(headerRight, { shading: headerShading, margins: { top: 100, bottom: 100, left: 90, right: 120 } }),
    ],
  })],
});

// ---------- Summary ----------
const summary = new Paragraph({
  spacing: { before: 120, after: 60 },
  children: [run(cv.summary, { size: 18 })],
});

// ---------- Key skills: 3-column grid, alternating #EAF1FA ----------
const skillCell = (skill, shaded) =>
  cell(
    [
      new Paragraph({ children: [run(skill.title, { bold: true, size: 17 })], spacing: { after: 20 } }),
      new Paragraph({ children: [run(skill.content, { size: 16 })] }),
    ],
    { shading: shaded ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined, verticalAlign: VerticalAlign.TOP },
  );
const skillRows = [];
for (let r = 0; r < Math.ceil(cv.key_skills.length / 3); r++) {
  skillRows.push(new TableRow({
    children: cv.key_skills.slice(r * 3, r * 3 + 3).map((s, c) => skillCell(s, (r + c) % 2 === 0)),
  }));
}
const skillsGrid = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [3515, 3515, 3516],
  rows: skillRows,
});

// ---------- Recent AI projects ----------
const projects = (cv.recent_ai_projects ?? []).map((p) =>
  new Paragraph({
    spacing: { after: 50 },
    children: [run(p.company, { bold: true, size: 17 }), run(` — ${p.description}`, { size: 17 })],
  })
);

// ---------- Professional career: 2-column table ----------
const careerRows = cv.career.map((job) =>
  new TableRow({
    children: [
      cell([
        new Paragraph({ children: [run(job.company, { bold: true, size: 17 })], spacing: { after: 20 } }),
        new Paragraph({ children: [run(job.dates, { size: 16 })], spacing: { after: 20 } }),
        new Paragraph({ children: [run(job.location, { size: 16 })] }),
      ], { verticalAlign: VerticalAlign.TOP }),
      cell([
        new Paragraph({ children: [run(job.role, { bold: true, size: 17 })], spacing: { after: 30 } }),
        ...job.bullets.map((b) => new Paragraph({
          spacing: { after: 30 },
          indent: { left: 200, hanging: 200 },
          children: [run(`• ${b}`, { size: 17 })],
        })),
      ], { verticalAlign: VerticalAlign.TOP }),
    ],
  })
);
const career = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [2350, 8196],
  rows: careerRows,
});

// ---------- Formation: 4 label rows, alternating fill ----------
const formationRows = cv.formation.map((f, i) =>
  new TableRow({
    children: [
      cell([new Paragraph({ children: [run(f.label, { bold: true, size: 17 })] })],
        { shading: i % 2 === 0 ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined }),
      cell([new Paragraph({ children: [run(f.content, { size: 17 })] })],
        { shading: i % 2 === 0 ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined }),
    ],
  })
);
const formation = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [1500, 9046],
  rows: formationRows,
});

// ---------- Document ----------
const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri" } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 680, right: 680, bottom: 680, left: 680 },
      },
    },
    children: [
      header,
      summary,
      sectionTitle("Key skills"),
      skillsGrid,
      sectionTitle("Recent AI projects"),
      ...projects,
      sectionTitle("Professional career"),
      career,
      sectionTitle("Formation & certifications"),
      formation,
    ],
  }],
});

fs.mkdirSync(path.dirname(args.out), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(args.out, buffer);
console.log(`OK: ${args.out} (${buffer.length} bytes)`);
