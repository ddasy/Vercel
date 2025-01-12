const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 默认webhook接收地址（使用你的ngrok地址）
const DEFAULT_WEBHOOK = 'https://8c2f-103-61-153-92.ngrok-free.app/webhook';

app.post('/webhook', async (req, res) => {
  try {
    // 使用请求头中的地址，如果没有则使用默认地址
    const targetUrl = req.headers['x-target-url'] || DEFAULT_WEBHOOK;
    
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'  // 跳过ngrok警告
      },
      timeout: 5000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT);
}

module.exports = app; 