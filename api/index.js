require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const OKXClient = require('./okx');

// 启用 CORS
app.use(cors());

// 创建logs目录（如果不存在）
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 通用日志文件路径
const generalLogFile = path.join(logsDir, 'general.log');

// 获取北京时间的时间戳
function getBeijingTime() {
  const date = new Date();
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

// 读取日志文件
function readLogFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim());
    }
    return [];
  } catch (error) {
    console.error('Error reading log file:', error);
    return [];
  }
}

// 写入日志文件
function writeLogFile(filePath, logs) {
  try {
    fs.writeFileSync(filePath, logs.join('\n'));
  } catch (error) {
    console.error('Error writing log file:', error);
  }
}

// 更新日志
function updateLogs(message, filePath, maxEntries) {
  const logs = readLogFile(filePath);
  const timestamp = getBeijingTime().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  logs.unshift(`[${timestamp}] ${JSON.stringify(message)}`);
  
  // 保留指定数量的最新记录
  const updatedLogs = logs.slice(0, maxEntries);
  writeLogFile(filePath, updatedLogs);
}

app.use(express.json());

app.post('/api/webhook', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received webhook data:', data);

    // 更新通用日志（保留最新20条）
    updateLogs(data, generalLogFile, 20);

    // 如果存在instrument字段，创建对应的币种日志
    if (data.instrument) {
      const symbol = data.instrument.split('.')[0];
      const symbolLogFile = path.join(logsDir, `${symbol}.log`);
      updateLogs(data, symbolLogFile, 2);
    }

    // 初始化OKX客户端并发送请求
    const okxClient = new OKXClient();
    const response = await okxClient.placeOrder(data);
    
    res.json({
      success: true,
      message: 'Webhook received and processed',
      okxResponse: response
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  const PORT = process.env.PORT || 3456;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app; 