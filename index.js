// Cloudflare Workers 静态站点服务（无后端、无存储）
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 根路径重定向到首页
    if (path === '/') {
      return Response.redirect(new URL('/index.html', request.url), 302);
    }

    // 静态资源交给 ASSETS 处理
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // 默认返回 404
    return new Response('Not Found', { status: 404 });
  }
};