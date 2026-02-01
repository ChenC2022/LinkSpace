export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { password } = body;

        // Direct comparison for personal tool simplicity; usage of wrangler secret recommended in production
        // env.ADMIN_PASSWORD should be set in dashboard. For dev, fallback to "admin123" if unset.
        const CORRECT_PASSWORD = env.ADMIN_PASSWORD || "admin123";

        if (password === CORRECT_PASSWORD) {
            // Set a simple cookie
            // Max-Age: 30 days
            const headers = new Headers();
            headers.set("Set-Cookie", `auth_token=valid_session; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
            headers.set("Content-Type", "application/json");

            return new Response(JSON.stringify({ success: true }), { headers });
        } else {
            return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
