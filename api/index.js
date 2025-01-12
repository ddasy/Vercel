const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// 启用所有 CORS 请求
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// 解析 JSON 请求体
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: '无效的 JSON 格式' });
      throw new Error('无效的 JSON 格式');
    }
  }
}));

// 本地接收地址
const WEBHOOK_URL = 'https://8534-122-231-237-246.ngrok-free.app/webhook';

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 简单的请求日志
app.use((req, res, next) => {
  // 忽略 favicon 请求的日志
  if (req.path === '/favicon.ico') {
    return next();
  }
  console.log(`\n[${new Date().toISOString()}] 收到请求:`);
  console.log(`路径: ${req.path}`);
  console.log(`方法: ${req.method}`);
  console.log('请求头:', req.headers);
  if (req.method !== 'GET') {
    console.log('请求体:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 根路径 GET 处理
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook 转发服务器正在运行',
    endpoints: {
      webhook: '/webhook (POST)',
      health: '/health (GET)'
    },
    timestamp: new Date().toISOString()
  });
});

// favicon 处理
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 通用的 webhook 处理函数
async function handleWebhook(req, res) {
  const startTime = new Date();
  console.log(`\n[${startTime.toISOString()}] 开始处理 webhook 请求`);
  
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('请求体为空或无效');
    }

    console.log('转发请求到:', WEBHOOK_URL);
    console.log('请求体:', JSON.stringify(req.body, null, 2));

    // 转发请求
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Webhook-Forwarder'
      },
      timeout: 10000 // 10秒超时
    });
    
    const endTime = new Date();
    console.log('转发成功，耗时:', endTime - startTime, 'ms');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('转发失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// 根路径 POST 处理
app.post('/', handleWebhook);

// webhook 路径处理
app.post('/webhook', handleWebhook);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    webhook_url: WEBHOOK_URL
  });
});

// 处理 404
app.use((req, res) => {
  if (req.path !== '/favicon.ico') {
    console.log('404 - 未找到路由:', req.path);
  }
  res.status(404).json({ 
    error: '未找到路由',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = app; 