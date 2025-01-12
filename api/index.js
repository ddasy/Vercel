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

// 添加一个简单的健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '欢迎使用API代理服务器',
    usage: {
      health_check: 'GET /health - 检查服务器状态',
      proxy: '在请求头中添加 x-target-url 来指定目标服务器',
      example: {
        url: 'https://vercel-kappa-hazel.vercel.app/your-path',
        headers: {
          'x-target-url': 'https://your-target-server.com'
        }
      }
    }
  });
});

app.all('/*', async (req, res) => {
  try {
    // 验证请求头中是否包含目标URL
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) {
      console.log('错误: 缺少 x-target-url 请求头');
      return res.status(400).json({
        error: 'Missing target URL',
        message: 'Please provide x-target-url header'
      });
    }

    const path = req.path;
    if (path === '/health') {
      return; // 跳过健康检查端点的代理
    }
    
    // 构建完整的目标URL
    const fullUrl = `${targetUrl}${path}`;
    console.log(`转发请求到: ${fullUrl}`);
    
    // 设置超时时间为5秒
    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      timeout: 5000 // 5秒超时
    });
    
    // 记录响应状态
    console.log(`响应状态: ${response.status}`);
    
    // 返回响应
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('代理错误:', error.message);
    console.error('错误详情:', error.stack);
    
    // 更详细的错误处理
    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({
        error: 'Connection refused',
        message: '无法连接到目标服务器，请确保目标服务器正在运行且可以访问',
        details: error.message
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'Gateway timeout',
        message: '连接目标服务器超时',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Proxy error',
        message: '代理请求失败',
        details: error.message
      });
    }
  }
});

// 如果在本地运行，监听3001端口
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 