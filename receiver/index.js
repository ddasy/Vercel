const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 创建 logs 目录（如果不存在）
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 日志文件路径
const logFile = path.join(logsDir, 'webhook.log');

// 写入日志函数
function writeLog(data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${JSON.stringify(data, null, 2)}\n\n`;
  
  // 同时写入文件和控制台
  fs.appendFileSync(logFile, logEntry);
  console.log('\n收到新的 webhook 请求:');
  console.log('时间:', timestamp);
  console.log('数据:', data);
}

app.post('/webhook', (req, res) => {
  try {
    // 记录请求信息
    const requestInfo = {
      headers: req.headers,
      body: req.body,
      method: req.method,
      path: req.path
    };
    
    // 写入日志
    writeLog(requestInfo);
    
    res.json({
      success: true,
      message: 'Webhook已接收',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('处理 webhook 时出错:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n=== Webhook接收服务器运行在 http://localhost:${PORT}/webhook ===`);
  console.log(`日志文件保存在: ${logFile}`);
}); 