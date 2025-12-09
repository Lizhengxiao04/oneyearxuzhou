// Cloudflare Workers 后端代码
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 静态文件服务
  if (path.startsWith('/assets/') || path === '/index.html' || path === '/annual.html') {
    return await serveStatic(request);
  }
  
  // API路由
  if (path.startsWith('/api/records')) {
    return await handleApiRecords(request);
  }
  
  // 根路径重定向到index.html
  if (path === '/') {
    return Response.redirect(new URL('/index.html', request.url), 302);
  }
  
  // 默认返回404
  return new Response('Not Found', { status: 404 });
}

async function serveStatic(request) {
  const url = new URL(request.url);
  
  try {
    // 在Cloudflare Workers中，静态文件会被自动添加到assets中
    // 我们可以直接获取请求的URL路径
    return await fetch(request);
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}

async function handleApiRecords(request) {
  const url = new URL(request.url);
  const method = request.method;
  
  // 获取所有记录
  if (method === 'GET') {
    return await getAllRecords();
  }
  
  // 创建记录
  if (method === 'POST') {
    return await createRecord(request);
  }
  
  // 删除记录
  if (method === 'DELETE') {
    const recordId = url.pathname.split('/').pop();
    return await deleteRecord(recordId);
  }
  
  return new Response('Method Not Allowed', { status: 405 });
}

async function getAllRecords() {
  try {
    const records = [];
    
    // 遍历KV命名空间中的所有记录
    const iterator = CFBLOG.list();
    for await (const key of iterator) {
      if (key.name.startsWith('record_')) {
        const value = await CFBLOG.get(key.name, 'json');
        if (value) {
          records.push(value);
        }
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

async function createRecord(request) {
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
    await CFBLOG.put(record.id, JSON.stringify(record));
    
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

async function deleteRecord(recordId) {
  try {
    if (!recordId || !recordId.startsWith('record_')) {
      return new Response(JSON.stringify({ error: '无效的记录ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从KV命名空间中删除记录
    await CFBLOG.delete(recordId);
    
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