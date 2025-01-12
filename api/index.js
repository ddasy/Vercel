const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 启用 CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 使用 raw body parser
app.use(express.raw({ type: '*/*' }));

// 请求体解析中间件
app.use((req, res, next) => {
    console.log('\n--- 新请求开始 ---');
    console.log('请求方法:', req.method);
    console.log('请求路径:', req.path);
    console.log('请求头:', req.headers);

    if (req.method === 'POST') {
        try {
            let rawBody = req.body;
            if (Buffer.isBuffer(rawBody)) {
                rawBody = rawBody.toString('utf8');
            }
            console.log('原始请求体:', rawBody);
            
            try {
                if (typeof rawBody === 'string') {
                    req.body = JSON.parse(rawBody);
                }
                console.log('解析后的请求体:', req.body);
            } catch (e) {
                console.log('请求体解析失败，保持原样:', e.message);
                req.body = rawBody;
            }
        } catch (error) {
            console.error('处理请求体时出错:', error);
            req.body = {};
        }
    }
    next();
});

const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const MAIN_LOG_FILE = path.join(LOGS_DIR, 'main.log');
const MAX_MAIN_LOGS = 20;
const MAX_INVESTMENT_LOGS = 2;

console.log('Application started');
console.log('Current working directory:', process.cwd());
console.log('Logs directory:', LOGS_DIR);
console.log('Main log file:', MAIN_LOG_FILE);

// 确保日志目录存在
async function ensureLogDirectory() {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
        console.log(`Ensured logs directory exists at ${LOGS_DIR}`);
    } catch (error) {
        console.error(`Error creating logs directory: ${error}`);
        throw error;
    }
}

// 读取日志文件
async function readLogFile(filePath) {
    try {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (exists) {
            const content = await fs.readFile(filePath, 'utf8');
            console.log(`Successfully read from ${filePath}`);
            return content ? content.split('\n').filter(line => line.trim()) : [];
        }
        console.log(`File ${filePath} does not exist, returning empty array`);
        return [];
    } catch (error) {
        console.error(`Error reading log file ${filePath}: ${error}`);
        return [];
    }
}

// 写入日志文件
async function writeLogFile(filePath, logs) {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, logs.join('\n') + '\n');
        console.log(`Successfully wrote to ${filePath}`);
    } catch (error) {
        console.error(`Error writing to log file ${filePath}: ${error}`);
        throw error;
    }
}

// 添加新日志
async function addLog(filePath, log, maxLogs) {
    try {
        console.log(`Adding log to ${filePath}`);
        const logs = await readLogFile(filePath);
        logs.unshift(log);
        await writeLogFile(filePath, logs.slice(0, maxLogs));
        console.log(`Successfully added log to ${filePath}`);
    } catch (error) {
        console.error(`Error adding log to ${filePath}: ${error}`);
        throw error;
    }
}

// 初始化应用
async function initializeApp() {
    try {
        await ensureLogDirectory();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// Webhook 处理函数
async function handleWebhook(req, res) {
    try {
        console.log('\n--- 处理 Webhook 请求 ---');
        console.log('请求体类型:', typeof req.body);
        console.log('请求体内容:', req.body);
        
        let messageData = req.body;
        if (typeof messageData === 'string') {
            try {
                messageData = JSON.parse(messageData);
            } catch (e) {
                console.error('JSON 解析失败:', e.message);
            }
        }

        // 转换时间为北京时间
        const beijingTime = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
        const message = { 
            ...messageData, 
            timestamp: beijingTime,
            received_at: new Date().toISOString()
        };
        
        console.log('处理后的消息:', message);
        
        // 记录到主日志
        console.log('添加到主日志...');
        await addLog(MAIN_LOG_FILE, JSON.stringify(message), MAX_MAIN_LOGS);

        // 处理 investment 相关的消息
        if (message.investment) {
            console.log(`处理投资消息: ${message.investment}`);
            const symbol = message.investment.split('.')[0]; // 提取币种符号
            const symbolLogFile = path.join(LOGS_DIR, `${symbol}.log`);
            await addLog(symbolLogFile, JSON.stringify(message), MAX_INVESTMENT_LOGS);
        }

        res.status(200).json({ 
            success: true,
            message: 'Webhook 已处理',
            timestamp: new Date().toISOString(),
            data: message
        });
    } catch (error) {
        console.error('处理 Webhook 时出错:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// 路由处理
app.post('/webhook', handleWebhook);
app.post('/', handleWebhook);

// 用于健康检查的路由
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Service is running',
        timestamp: new Date().toISOString()
    });
});

// 404 处理
app.use((req, res) => {
    console.log('404 - 未找到路径:', req.path);
    res.status(404).json({ 
        success: false,
        message: '未找到请求的路径',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
initializeApp().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
}); 