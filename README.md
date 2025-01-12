# OKX 消息转发系统

这是一个基于 Vercel 的消息转发系统，用于接收消息并转发到本地 ngrok 服务。

## 功能特点

- 接收消息并转换为北京时间
- 将所有消息保存到主日志文件（保留最新20条）
- 根据 investment 币种自动创建对应的日志文件（每个币种保留最新2条）
- 通过 ngrok 转发消息到本地服务器

## 项目设置

1. 安装依赖：
```bash
npm install
```

2. 本地开发：
```bash
npm run dev
```

3. 部署到 Vercel：
```bash
vercel
```

## ngrok 设置

1. 安装 ngrok
2. 配置 ngrok.yml：
```yaml
agent:
  authtoken: 2rVfJNozD2Nl1HJtNgYWQrAJxLf_7KEU5Uxky3QZH9374dKV8
```

3. 启动 ngrok：
```bash
ngrok http --url=glad-friendly-ostrich.ngrok-free.app 80
```

## 项目结构

```
.
├── api/
│   └── index.js          # 主服务器文件
├── logs/                 # 日志文件目录
├── package.json          # 项目配置
├── vercel.json          # Vercel 配置
└── README.md            # 项目文档
```

## API 端点

- POST `/webhook`: 接收消息的主要端点
- GET `/`: 健康检查端点 