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
  console.log(`\n[${new Date().toISOString()}] 收到请求:`);
  console.log(`路径: ${req.path}`);
  console.log(`方法: ${req.method}`);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  next();
});

app.post('/webhook', async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] 开始转发请求到: ${WEBHOOK_URL}`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Webhook-Forwarder',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.ip
      }
    });
    
    console.log(`[${new Date().toISOString()}] 转发成功，响应状态: ${response.status}`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 转发失败:`, error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ 
      error: '转发失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook_url: WEBHOOK_URL
  });
});

module.exports = app; 