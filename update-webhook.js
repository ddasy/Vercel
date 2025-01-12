const fs = require('fs');
const path = require('path');

// 获取命令行参数中的新 URL
const newUrl = process.argv[2];

if (!newUrl) {
  console.error('请提供新的 webhook URL');
  console.error('使用方法: node update-webhook.js <新的URL>');
  process.exit(1);
}

// 读取现有配置
let config = {};
const configPath = path.join(__dirname, 'config.json');

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.log('未找到配置文件，将创建新文件');
}

// 更新 URL
config.webhook_url = newUrl;

// 保存配置
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('webhook URL 已更新为:', newUrl);
console.log('配置文件已保存到:', configPath); 