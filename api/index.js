const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 默认webhook接收地址
const DEFAULT_WEBHOOK = 'http://localhost:3000/webhook';

app.post('/webhook', async (req, res) => {
  try {
    // 优先使用ngrok地址
    const targetUrl = 'https://4039-122-231-237-246.ngrok-free.app/webhook';
    
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 5000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    // 如果ngrok失败，尝试本地地址
    try {
      const response = await axios({
        method: 'POST',
        url: DEFAULT_WEBHOOK,
        data: req.body,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      res.status(response.status).json(response.data);
    } catch (localError) {
      res.status(500).json({ 
        error: 'Both remote and local endpoints failed',
        remote: error.message,
        local: localError.message
      });
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT);
}

module.exports = app; 