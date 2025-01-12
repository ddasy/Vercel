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

app.use(express.json());

// 本地接收地址
const WEBHOOK_URL = 'https://48a3-122-231-237-246.ngrok-free.app/webhook';

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(500).json({ error: err.message });
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
    console.log('请求体:', req.body);
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

// 根路径 POST 处理
app.post('/', async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] 收到根路径请求，转发到: ${WEBHOOK_URL}`);
  
  try {
    if (!req.body) {
      throw new Error('请求体为空');
    }

    // 转发请求
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5秒超时
    });
    
    console.log('转发成功，响应:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('转发失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// webhook 路径处理
app.post('/webhook', async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] 开始转发请求到: ${WEBHOOK_URL}`);
  
  try {
    if (!req.body) {
      throw new Error('请求体为空');
    }

    // 转发请求
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5秒超时
    });
    
    console.log('转发成功，响应:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('转发失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  console.log('健康检查请求');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 处理 404
app.use((req, res) => {
  // 忽略 favicon 请求的 404 日志
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