// Runs every 3 days to prevent Supabase free tier from pausing
// Supabase pauses after 7 days of inactivity — this keeps it alive

export default async () => {
  const url = process.env.VITE_SUPABASE_URL;

  if (!url) {
    console.error("VITE_SUPABASE_URL not set");
    return new Response("Missing Supabase URL", { status: 500 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    console.log(`Supabase ping: ${res.status}`);
    return new Response(`OK - ${res.status}`, { status: 200 });
  } catch (err) {
    console.error("Supabase ping failed:", err.message);
    return new Response(`Failed: ${err.message}`, { status: 500 });
  }
};

export const config = {
  schedule: "0 8 */3 * *",
};
