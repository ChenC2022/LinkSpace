export async function onRequestGet(context) {
    const { env } = context;

    // List all keys from KV
    // KV list returns keys, we then need to decide if we fetch values individually or store metadata in key?
    // Fetching values N times is slow.
    // Optimization: For a personal link manager (e.g. < 1000 links), fetching keys and then batching values or 
    // better: Storing the minimal metadata in the list? No, KV list only returns name and metadata.
    // Best practice: Store summary in KV metadata!
    // When writing KV: await env.LINKS.put(key, value, { metadata: { originalUrl: ..., visits: ... } })
    // Then list() gives us everything we need for the table without extra GETs.

    try {
        const list = await env.LINKS.list({ prefix: "url:", limit: 1000 });
        const links = list.keys.map(key => ({
            shortCode: key.name.substring(4),
            ...key.metadata
        }));

        // Sort by createdAt desc
        links.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return new Response(JSON.stringify(links), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { url, shortCode, note } = await request.json();

        if (!url) return new Response("Missing URL", { status: 400 });

        // Determine code
        let code = shortCode;
        if (!code) {
            // Generate random 5 char code
            code = Math.random().toString(36).substring(2, 7);
        }

        // Check collision
        const existing = await env.LINKS.get(`url:${code}`);
        if (existing && !shortCode) {
            // Retry once if random collision
            code = Math.random().toString(36).substring(2, 7);
        } else if (existing && shortCode) {
            return new Response(JSON.stringify({ error: "Short code already exists" }), { status: 409 });
        }

        const data = {
            originalUrl: url,
            createdAt: Date.now(),
            visitCount: 0,
            note: note || ""
        };

        // Save with Metadata for fast listing
        await env.LINKS.put(`url:${code}`, JSON.stringify(data), {
            metadata: data
        });

        return new Response(JSON.stringify({ success: true, code, data }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
