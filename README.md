# Vercel API 代理服务器

这是一个部署在 Vercel 上的 API 代理服务器，用于接收 API 请求并转发到本地服务器。

## 使用方法

1. 部署到 Vercel：
   ```bash
   vercel
   ```

2. 发送请求时，在请求头中添加 `x-target-url` 来指定目标本地服务器地址，例如：
   ```
   x-target-url: http://localhost:3000
   ```

如果不指定 `x-target-url`，默认会转发到 `http://localhost:3000`。

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动服务器：
   ```bash
   npm start
   ```

服务器将在 3001 端口启动。 