// Keyword coverage of a CV against a job spec.
// Deliberately mechanical: it reports what is present, it does not judge what is honest to claim.

const STOP = new Set(
  ("the a an and or of to in for with on at by from as is are be will you your our we they this that " +
    "have has had can could should would may might must not no it its their them these those such other " +
    "who whom which what when where how why all any both each more most some than then there here about " +
    "into over under across within without per via using use used also including include includes " +
    "role team work working experience years year strong excellent good great ability able").split(" ")
);

const WORD = /[a-zà-ÿ][a-zà-ÿ0-9+#.-]*/g;

function tokens(text) {
  return (text.toLowerCase().match(WORD) || []).filter((w) => w.length > 2 && !STOP.has(w));
}

// Single words plus adjacent pairs, ranked by frequency in the spec.
// Thresholds scale with length: a 200-word advert repeats nothing three times,
// so a fixed cut-off returns almost no keywords for exactly the specs people paste.
export function extractKeywords(jobSpec, limit = 45) {
  const t = tokens(jobSpec);
  const wordMin = t.length >= 600 ? 3 : t.length >= 250 ? 2 : 1;
  const pairMin = t.length >= 600 ? 4 : 2;
  const freq = new Map();
  const bump = (k, w = 1) => freq.set(k, (freq.get(k) || 0) + w);
  t.forEach((w) => bump(w));
  for (let i = 0; i < t.length - 1; i++) bump(`${t[i]} ${t[i + 1]}`, 2);
  return [...freq.entries()]
    .filter(([k, n]) => (k.includes(" ") ? n >= pairMin : n >= wordMin))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
}

// Matching happens on a token stream, not on raw text. A substring test would
// score "Leverage" as a hit for "RAG", which is exactly the mistake to avoid.
export function score(cvText, keywords) {
  const stream = ` ${(cvText.toLowerCase().match(WORD) || []).join(" ")} `;
  const hit = (k) => stream.includes(` ${k.toLowerCase()} `);
  const covered = keywords.filter(hit);
  const missing = keywords.filter((k) => !hit(k));
  return {
    covered,
    missing,
    coveredCount: covered.length,
    total: keywords.length,
    percent: keywords.length ? Math.round((covered.length / keywords.length) * 100) : 0,
  };
}

// Flatten a CV data object into the text an ATS would read.
export function cvDataToText(data) {
  const parts = [];
  const walk = (v) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);
  return parts.join(" ");
}
