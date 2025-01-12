const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 主页路由
app.get('/', (req, res) => {
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

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 代理路由
app.all('/*', async (req, res) => {
  // 跳过主页和健康检查路由
  if (req.path === '/' || req.path === '/health') {
    return;
  }

  try {
    // 验证请求头中是否包含目标URL
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) {
      return res.status(400).json({
        error: 'Missing target URL',
        message: 'Please provide x-target-url header',
        usage: {
          headers: {
            'x-target-url': 'https://your-target-server.com'
          }
        }
      });
    }
    
    // 构建完整的目标URL
    const fullUrl = `${targetUrl}${req.path}`;
    
    // 设置超时时间为5秒
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
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
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

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 