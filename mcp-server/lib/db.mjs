// PostgREST access to the cv_* tables. The service key never leaves this process.
import { fail, secrets } from "./env.mjs";

function base() {
  const { url, key } = secrets();
  if (!url || !key) {
    fail(
      "No PostgREST credentials are available, so application tracking is unavailable.",
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, or place them in " +
        "<CV_ROOT>/.env. Generation, validation and scoring tools work without them."
    );
  }
  return { rest: `${url.replace(/\/$/, "")}/rest/v1`, key };
}

async function call(path, init = {}) {
  const { rest, key } = base();
  const res = await fetch(`${rest}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    fail(
      `PostgREST returned ${res.status}: ${text.slice(0, 300)}`,
      res.status === 401 || res.status === 403
        ? "The service key is rejected. Check SUPABASE_SERVICE_ROLE_KEY."
        : "Check the column names against the cv_applications schema."
    );
  }
  return text ? JSON.parse(text) : null;
}

export const listApplications = (status, limit = 200) =>
  call(
    `/cv_applications?select=id,company,role,location,ats_score_after,status,salary_benchmark` +
      `${status ? `&status=eq.${encodeURIComponent(status)}` : ""}` +
      `&order=ats_score_after.desc.nullslast,company.asc&limit=${limit}`
  );

export const findApplication = (company) =>
  call(`/cv_applications?select=id,company,role,status&company=ilike.${encodeURIComponent(`*${company}*`)}`);

export const insertApplication = (row) =>
  call("/cv_applications", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });

export const patchApplication = (id, row) =>
  call(`/cv_applications?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });

export const getMaster = () => call("/cv_master?is_current=eq.true&select=id,version,content");

export const setMaster = (id, content, version) =>
  call(`/cv_master?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(version ? { content, version } : { content }),
  });
