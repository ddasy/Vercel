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

// 解析原始请求体
app.use(express.raw({ type: '*/*' }));

// 请求体解析中间件
app.use((req, res, next) => {
  if (req.method === 'POST') {
    try {
      const rawBody = req.body.toString('utf8');
      console.log('原始请求体:', rawBody);
      
      try {
        req.body = JSON.parse(rawBody);
        console.log('解析后的请求体:', req.body);
      } catch (e) {
        console.log('请求体不是 JSON 格式，保持原样');
        req.body = rawBody;
      }
    } catch (error) {
      console.error('处理请求体时出错:', error);
      req.body = {};
    }
  }
  next();
});

// 本地接收地址
const WEBHOOK_URL = 'https://c339-122-231-237-246.ngrok-free.app/webhook';

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
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
    console.log('请求体:', typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body);
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
    console.log('转发请求到:', WEBHOOK_URL);
    console.log('请求体类型:', typeof req.body);
    console.log('请求体:', req.body);

    // 转发请求
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Webhook-Forwarder',
        ...req.headers
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
    console.error('错误堆栈:', error.stack);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message,
        stack: error.stack,
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

// 未捕获的错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的错误:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error);
});

module.exports = app; 