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
            // 将内容按双换行符分割，并过滤掉空行
            return content ? content.split('\n\n').filter(line => line.trim()) : [];
        }
        console.log(`File ${filePath} does not exist, returning empty array`);
        return [];
    } catch (error) {
        console.error(`Error reading log file ${filePath}: ${error}`);
        return [];
    }
}

// 清理日志文件
async function cleanLogFiles() {
    try {
        console.log('开始清理日志文件...');
        await fs.rm(LOGS_DIR, { recursive: true, force: true });
        console.log('日志目录已清理');
        await ensureLogDirectory();
    } catch (error) {
        console.error('清理日志文件时出错:', error);
        throw error;
    }
}

// 写入日志文件
async function writeLogFile(filePath, logs) {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // 格式化每条日志，确保是对象格式
        const formattedLogs = logs.map(log => {
            let logObj = log;
            if (typeof log === 'string') {
                try {
                    // 移除多余的引号和转义字符
                    const cleanedLog = log
                        .replace(/^"/, '')
                        .replace(/"$/, '')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                    logObj = JSON.parse(cleanedLog);
                } catch (e) {
                    try {
                        // 尝试直接解析
                        logObj = JSON.parse(log);
                    } catch (e2) {
                        console.log('解析日志时出错，使用原始内容:', e2.message);
                        return null; // 返回 null 以便后续过滤
                    }
                }
            }
            return logObj;
        });

        // 过滤掉无效的日志，并格式化为字符串
        const validLogs = formattedLogs
            .filter(log => log !== null && typeof log === 'object')
            .map(log => JSON.stringify(log, null, 2));

        // 写入文件，每条日志之间用双换行符分隔
        await fs.writeFile(filePath, validLogs.join('\n\n'));
        console.log(`Successfully wrote ${validLogs.length} logs to ${filePath}`);
    } catch (error) {
        console.error(`Error writing to log file ${filePath}:`, error);
        throw error;
    }
}

// 添加新日志
async function addLog(filePath, log, maxLogs) {
    try {
        console.log(`Adding log to ${filePath} (max logs: ${maxLogs})`);
        const logs = await readLogFile(filePath);
        
        // 添加新日志到开头
        logs.unshift(log);
        
        // 保留指定数量的日志
        const trimmedLogs = logs.slice(0, maxLogs);
        console.log(`Keeping ${trimmedLogs.length} of ${logs.length} logs`);
        
        await writeLogFile(filePath, trimmedLogs);
        console.log(`Successfully added log to ${filePath}`);
    } catch (error) {
        console.error(`Error adding log to ${filePath}: ${error}`);
        throw error;
    }
}

// 初始化应用
async function initializeApp() {
    try {
        await cleanLogFiles(); // 添加清理日志的步骤
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

        // 保留完整的原始消息，只添加额外的时间信息
        const message = { 
            ...messageData,
            beijing_time: moment(messageData.timestamp || new Date()).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
            received_at: new Date().toISOString()
        };
        
        console.log('处理后的消息:', message);
        
        // 记录到主日志
        console.log('添加到主日志...');
        await addLog(MAIN_LOG_FILE, message, MAX_MAIN_LOGS);

        // 处理 instrument 相关的消息
        if (message.instrument) {
            console.log(`处理交易对消息: ${message.instrument}`);
            const symbol = message.instrument.split('.')[0]; // 提取币种符号
            const symbolLogFile = path.join(LOGS_DIR, `${symbol}.log`);
            await addLog(symbolLogFile, message, MAX_INVESTMENT_LOGS);
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