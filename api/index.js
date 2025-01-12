const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 本地接收地址
const WEBHOOK_URL = 'https://48a3-122-231-237-246.ngrok-free.app/webhook';

// 简单的请求日志
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] 收到请求:`);
  console.log(`路径: ${req.path}`);
  console.log(`方法: ${req.method}`);
  console.log('请求头:', req.headers);
  console.log('请求体:', req.body);
  next();
});

app.post('/webhook', async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] 开始转发请求到: ${WEBHOOK_URL}`);
  
  try {
    // 转发请求
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('转发成功，响应:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('转发失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app; 