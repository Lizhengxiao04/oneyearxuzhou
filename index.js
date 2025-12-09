// Cloudflare Workers 后端代码（模块语法，支持静态资源绑定和 KV）
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API 路由
    if (path.startsWith('/api/records')) {
      return await handleApiRecords(request, env);
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

async function handleApiRecords(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  
  // 获取所有记录
  if (method === 'GET') {
    return await getAllRecords(env);
  }
  
  // 创建记录
  if (method === 'POST') {
    return await createRecord(request, env);
  }
  
  // 删除记录
  if (method === 'DELETE') {
    const recordId = url.pathname.split('/').pop();
    return await deleteRecord(recordId, env);
  }
  
  return new Response('Method Not Allowed', { status: 405 });
}

async function getAllRecords(env) {
  try {
    const records = [];
    const { keys } = await env.CFBLOG.list({ prefix: 'record_' });

    for (const key of keys) {
      const value = await env.CFBLOG.get(key.name, { type: 'json' });
      if (value) {
        records.push(value);
      }
    }
    
    // 按创建时间倒序排列
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return new Response(JSON.stringify(records), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '获取记录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createRecord(request, env) {
  try {
    // 解析表单数据
    const formData = await request.formData();
    const location = formData.get('location');
    const date = formData.get('date');
    
    if (!location || !date) {
      return new Response(JSON.stringify({ error: '请填写地点和时间' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理图片上传
    let image = null;
    if (formData.has('image')) {
      const imageFile = formData.get('image');
      if (imageFile instanceof File) {
        // 在Cloudflare Workers中，文件会被上传到R2存储
        // 这里简化处理，使用base64编码存储
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        image = `data:${imageFile.type};base64,${base64}`;
      }
    }
    
    // 处理视频上传
    let video = null;
    if (formData.has('video')) {
      const videoFile = formData.get('video');
      if (videoFile instanceof File) {
        // 在Cloudflare Workers中，文件会被上传到R2存储
        // 这里简化处理，使用base64编码存储
        const arrayBuffer = await videoFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        video = `data:${videoFile.type};base64,${base64}`;
      }
    }
    
    // 创建记录对象
    const record = {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      location: location,
      date: date,
      image: image,
      video: video,
      createdAt: new Date().toISOString()
    };
    
    // 保存到KV命名空间
    await env.CFBLOG.put(record.id, JSON.stringify(record));
    
    return new Response(JSON.stringify(record), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '创建记录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteRecord(recordId, env) {
  try {
    if (!recordId || !recordId.startsWith('record_')) {
      return new Response(JSON.stringify({ error: '无效的记录ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从KV命名空间中删除记录
    await env.CFBLOG.delete(recordId);
    
    return new Response(JSON.stringify({ success: true, message: '记录删除成功' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '删除记录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}