const express = require('express');
const router = express.Router();
const okxClient = require('../okx/client');

// 测试下单接口
router.post('/test-order', async (req, res) => {
  try {
    const { action } = req.body;
    const symbol = 'BTCUSDT';  // 固定测试BTC

    // 验证action
    const validActions = ['open_long', 'open_short', 'close_long', 'close_short'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be one of: ' + validActions.join(', ')
      });
    }

    // 调用OKX API
    const result = await okxClient.placeOrder(action, symbol);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Test order error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router; 