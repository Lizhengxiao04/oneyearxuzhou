// Cloudflare Workers 静态站点服务 + 基于 KV 的匿名图片上传
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/records') {
      if (request.method === 'OPTIONS') {
        return buildCorsResponse();
      }
      if (request.method === 'GET') {
        return getRecords(env);
      }
      if (request.method === 'POST') {
        return postRecord(request, env);
      }
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

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

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MiB，避免超过 KV 单对象 25 MiB 限制
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function buildCorsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function getRecords(env) {
  const { keys } = await env.CFBLOG.list({ prefix: 'record_' });
  const records = [];

  for (const key of keys) {
    const value = await env.CFBLOG.get(key.name, { type: 'json' });
    if (value) records.push(value);
  }

  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return jsonResponse(records);
}

async function postRecord(request, env) {
  try {
    const form = await request.formData();
    const location = (form.get('location') || '').toString().trim();
    const date = (form.get('date') || '').toString().trim();
    const file = form.get('image');

    if (!location || !date) {
      return jsonResponse({ error: '请填写地点和时间' }, 400);
    }
    if (!(file instanceof File)) {
      return jsonResponse({ error: '请上传图片文件' }, 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonResponse({ error: '仅支持 JPG/PNG/GIF/WebP 图片' }, 400);
    }

    const arrayBuf = await file.arrayBuffer();
    if (arrayBuf.byteLength > MAX_UPLOAD_BYTES) {
      return jsonResponse({ error: '图片过大，限制 5MB' }, 400);
    }

    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    const record = {
      id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      location,
      date,
      image: dataUrl,
      imageType: file.type,
      size: arrayBuf.byteLength,
      createdAt: new Date().toISOString()
    };

    await env.CFBLOG.put(record.id, JSON.stringify(record));
    return jsonResponse(record, 201);
  } catch (err) {
    return jsonResponse({ error: '上传失败，请稍后重试' }, 500);
  }
}