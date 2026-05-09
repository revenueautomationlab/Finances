// Pings Supabase every 3 days to prevent free-tier pausing.
// Replaces netlify/functions/keep-alive.mjs.

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  async fetch(request, env) {
    const result = await ping(env);
    return new Response(result.message, { status: result.ok ? 200 : 500 });
  },
};

async function ping(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY not set");
    return { ok: false, message: "Missing Supabase env vars" };
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });
    console.log(`Supabase ping: ${res.status}`);
    return { ok: true, message: `OK - ${res.status}` };
  } catch (err) {
    console.error("Supabase ping failed:", err.message);
    return { ok: false, message: `Failed: ${err.message}` };
  }
}
