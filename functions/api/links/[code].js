export async function onRequestDelete(context) {
    const { params, env } = context;
    const code = params.code; // derived from filename [code].js

    await env.LINKS.delete(`url:${code}`);

    return new Response(JSON.stringify({ deleted: true }));
}

export async function onRequestPut(context) {
    const { request, env, params } = context;
    const code = params.code;

    try {
        const { originalUrl, note, visitCount, createdAt } = await request.json();

        // We need to keep existing data if not provided, but usually FE sends full object.
        // Let's assume we overwrite with what is sent merged with existing essentials.

        // Construct new data object
        const newData = {
            originalUrl,
            note: note || "",
            visitCount: visitCount || 0,
            createdAt: createdAt || Date.now()
        };

        // Update KV with Metadata
        await env.LINKS.put(`url:${code}`, JSON.stringify(newData), {
            metadata: newData
        });

        return new Response(JSON.stringify({ success: true, data: newData }));
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
