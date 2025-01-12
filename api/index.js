const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 默认的本地服务器地址，你可以在请求中通过 targetUrl 参数覆盖它
const DEFAULT_TARGET = 'http://localhost:3000';

app.all('/*', async (req, res) => {
  try {
    // 从请求头中获取目标URL，如果没有则使用默认值
    const targetUrl = req.headers['x-target-url'] || DEFAULT_TARGET;
    const path = req.path;
    
    // 构建完整的目标URL
    const fullUrl = `${targetUrl}${path}`;
    
    // 转发请求
    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
    });
    
    // 返回响应
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// 如果在本地运行，监听3000端口
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 