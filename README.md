# 徐州游玩纪念网站部署说明

## 项目简介
这是一个记录徐州游玩经历的纪念网站，包含首页和年度游玩记录页面。

## 部署步骤

### 1. 本地开发与预览
1. 确保您的计算机已安装 Python 3.6 或更高版本
2. 在项目根目录下打开终端
3. 运行以下命令启动本地 HTTP 服务器：
   ```
   python -m http.server 8000
   ```
4. 在浏览器中访问 `http://localhost:8000` 查看网站

### 2. 生产环境部署

#### 方式一：静态网站托管服务
1. 将所有项目文件上传到静态网站托管服务（如 Vercel、Netlify、GitHub Pages 等）
2. 配置域名（可选）
3. 部署完成后访问您的网站

#### 方式二：传统 Web 服务器
1. 将项目文件上传到 Web 服务器的根目录（如 Nginx、Apache 等）
2. 确保服务器已配置支持静态文件访问
3. 访问服务器 IP 或域名查看网站

#### 方式三：Cloudflare Workers
1. 确保已安装 Wrangler CLI：`npm install -g wrangler`
2. 使用以下命令部署：`npx wrangler deploy --assets=.`
3. 或使用配置文件部署：`npx wrangler deploy`（需要确保 wrangler.jsonc 配置正确）

## 项目结构
```
.
├── index.html          # 首页
├── annual.html         # 年度游玩记录页面
└── README.md           # 部署说明文档
```

## 技术栈
- HTML5
- Tailwind CSS
- JavaScript

## 浏览器兼容性
- Chrome (推荐)
- Firefox
- Safari
- Edge

## 注意事项
1. 网站使用了 Tailwind CSS CDN 和 Google Fonts，需要确保网络连接正常
2. 图片使用了占位图服务，实际部署时请替换为真实图片
3. 年度游玩记录页面的图片和视频路径为动态生成，需要确保数据源正确