const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 本地接收地址
const WEBHOOK_URL = 'https://4039-122-231-237-246.ngrok-free.app/webhook';

// 记录所有请求
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n[${new Date().toISOString()}] [${requestId}] 收到新请求 =========`);
  console.log(`路径: ${req.path}`);
  console.log(`方法: ${req.method}`);
  console.log('IP:', req.ip);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  console.log('===============================================');
  
  // 将requestId附加到请求对象，用于跟踪
  req.requestId = requestId;
  next();
});

app.post('/webhook', async (req, res) => {
  const { requestId } = req;
  console.log(`\n[${new Date().toISOString()}] [${requestId}] 开始转发请求`);
  console.log(`目标地址: ${WEBHOOK_URL}`);
  
  try {
    console.log(`[${requestId}] 准备发送请求...`);
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Webhook-Forwarder',
        'X-Request-ID': requestId,
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.ip
      },
      timeout: 10000, // 增加超时时间到10秒
      validateStatus: false // 不抛出HTTP错误
    });
    
    console.log(`[${requestId}] 收到响应:`);
    console.log(`状态码: ${response.status}`);
    console.log('响应头:', JSON.stringify(response.headers, null, 2));
    console.log('响应体:', JSON.stringify(response.data, null, 2));
    
    res.status(response.status).json({
      success: true,
      message: '请求已转发',
      response: response.data,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${requestId}] 转发失败:`, error.message);
    console.error(`[${requestId}] 错误详情:`, error.stack);
    
    if (error.response) {
      console.error(`[${requestId}] 错误响应:`, {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    }
    
    if (error.request) {
      console.error(`[${requestId}] 请求配置:`, {
        method: error.request.method,
        path: error.request.path,
        headers: error.request.headers
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: '转发失败',
      message: error.message,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook_url: WEBHOOK_URL,
    version: '1.1.0'
  });
});

module.exports = app; 