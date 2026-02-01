export const onRequest = async (context) => {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 忽略根目录
    if (path === "/") {
        return next();
    }

    // 2. 忽略静态资源 (Vite 默认将资源放在 /assets/)
    if (path.startsWith("/assets/") || path === "/favicon.ico" || path === "/robots.txt") {
        return next();
    }

    // 3. 处理 API 路由
    if (path.startsWith("/api/")) {
        if (path === "/api/login") return next();

        // 简单的鉴权检查
        const cookie = request.headers.get("Cookie");
        if (!cookie || !cookie.includes("auth_token=")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        return next();
    }

    // 4. 排除前端页面路由 (让前端 Vue Router 处理)
    const reservedPaths = ["/login", "/dashboard"];
    if (reservedPaths.includes(path)) {
        return next();
    }

    // 5. 处理短链接跳转
    const code = path.substring(1); // 提取短码
    if (code) {
        const value = await env.LINKS.get(`url:${code}`, { type: "json" });
        if (value) {
            // 异步记录访问次数
            context.waitUntil((async () => {
                try {
                    value.visitCount = (value.visitCount || 0) + 1;
                    await env.LINKS.put(`url:${code}`, JSON.stringify(value), {
                        metadata: value
                    });
                } catch (e) {
                    console.error("Stats update failed", e);
                }
            })());

            return Response.redirect(value.originalUrl, 302);
        }
    }

    // 6. 如果上面都没命中，放行（交给 Pages 的静态文件或 404 处理）
    return next();
};
