const express = require('express');
const axios = require('axios');
const cors = require('cors');

// API代理服务器 v1.0
const app = express();
app.use(cors());
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.all('/*', async (req, res) => {
  try {
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing x-target-url' });
    }

    const path = req.path;
    if (path === '/health') {
      return;
    }
    
    const fullUrl = `${targetUrl}${path}`;
    console.log(`转发请求到: ${fullUrl}`);
    
    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      timeout: 5000
    });
    
    console.log(`响应状态: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('代理错误:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ error: 'Connection refused' });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Timeout' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT);
}

module.exports = app; 