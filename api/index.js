const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 本地接收地址
const WEBHOOK_URL = 'https://4039-122-231-237-246.ngrok-free.app/webhook';

app.post('/webhook', async (req, res) => {
  try {
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app; 