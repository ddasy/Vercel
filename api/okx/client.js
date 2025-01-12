const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class OKXClient {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  // 生成签名
  generateSign(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  // 生成请求头
  generateHeaders(method, requestPath, body = '') {
    const timestamp = new Date().toISOString();
    const sign = this.generateSign(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': config.passphrase,
      'Content-Type': 'application/json'
    };
  }

  // 记录订单日志
  async logOrder(action, params, response) {
    const orderLog = {
      timestamp: new Date().toISOString(),
      action,
      params,
      response
    };

    const logFile = path.join(process.cwd(), 'orders', 'order.log');
    let logs = [];
    
    try {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        logs = content ? content.split('\n\n').filter(line => line.trim()) : [];
      }
      
      logs.unshift(JSON.stringify(orderLog, null, 2));
      fs.writeFileSync(logFile, logs.join('\n\n'));
    } catch (error) {
      console.error('Error writing order log:', error);
    }
  }

  // 下单
  async placeOrder(action, symbol) {
    try {
      const method = 'POST';
      const requestPath = config.apiPath.order;
      
      // 根据action设置参数
      let params = {
        instId: `${symbol}-SWAP`,
        tdMode: config.defaultParams.tdMode,
        lever: config.defaultParams.lever,
        sz: config.defaultParams.sz
      };

      // 设置开平仓方向
      switch(action) {
        case 'open_long':
          params.side = 'buy';
          params.posSide = 'long';
          break;
        case 'close_long':
          params.side = 'sell';
          params.posSide = 'long';
          break;
        case 'open_short':
          params.side = 'sell';
          params.posSide = 'short';
          break;
        case 'close_short':
          params.side = 'buy';
          params.posSide = 'short';
          break;
        default:
          throw new Error('Invalid action');
      }

      const body = JSON.stringify(params);
      const headers = this.generateHeaders(method, requestPath, body);

      console.log('Sending order request:', {
        url: this.baseUrl + requestPath,
        method,
        headers,
        data: params
      });

      const response = await axios({
        url: this.baseUrl + requestPath,
        method,
        headers,
        data: params
      });

      // 记录订单日志
      await this.logOrder(action, params, response.data);

      return response.data;
    } catch (error) {
      console.error('Place order error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new OKXClient(); 