// Pings Supabase daily to prevent free-tier pausing.
// Hits the REST API (real DB query) — auth/health alone doesn't count as activity.

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  async fetch(request, env) {
    const result = await ping(env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: { "content-type": "application/json" },
    });
  },
};

async function ping(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars" };
  }

  const results = [];

  // Primary: REST query against a known table — this counts as DB activity for pause logic.
  // `projects` is the oldest table in the schema and won't go away.
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
    });
    results.push({ endpoint: "/rest/v1/projects", status: res.status, ok: res.ok });
    if (res.ok) {
      console.log(`Keep-alive OK: REST ${res.status}`);
      return { ok: true, results };
    }
    console.warn(`REST ping returned ${res.status}, falling back to auth health`);
  } catch (err) {
    results.push({ endpoint: "/rest/v1/projects", error: err.message });
  }

  // Fallback: auth health endpoint
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.SUPABASE_ANON_KEY },
    });
    results.push({ endpoint: "/auth/v1/health", status: res.status, ok: res.ok });
    if (res.ok) {
      console.log(`Keep-alive OK via fallback: auth ${res.status}`);
      return { ok: true, results };
    }
  } catch (err) {
    results.push({ endpoint: "/auth/v1/health", error: err.message });
  }

  console.error("Keep-alive FAILED — all endpoints unreachable", JSON.stringify(results));
  return { ok: false, results };
}
