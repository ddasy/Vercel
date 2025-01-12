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
    const targetUrl = req.headers['x-target-url'] || DEFAULT_WEBHOOK;
    
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
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