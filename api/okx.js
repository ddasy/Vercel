const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');
const fs = require('fs');
const path = require('path');

class OKXClient {
  constructor() {
    this.baseUrl = 'https://www.okx.com';
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.isDemoTrading = config.isDemoTrading;
    
    console.log('OKX Client initialized with:', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      isDemoTrading: this.isDemoTrading
    });
  }

  generateSign(timestamp, method, requestPath, body = '') {
    if(typeof body === 'object') {
      body = JSON.stringify(body);
    }
    
    // 构建签名字符串
    const message = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
    console.log('Signing message:', message);
    
    // 使用HMAC SHA256生成签名
    const hmac = crypto.createHmac('sha256', this.secretKey);
    const sign = hmac.update(message).digest('base64');
    console.log('Generated signature:', sign);
    return sign;
  }

  generateHeaders(method, requestPath, body = '') {
    const timestamp = new Date().toISOString();
    const sign = this.generateSign(timestamp, method, requestPath, body);
    
    const headers = {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    console.log('Generated headers:', headers);
    return headers;
  }

  async logOrder(action, response) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, 'order.log');
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        response
      };

      const logContent = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
      const logs = logContent ? logContent.split('\n\n').filter(Boolean) : [];
      logs.unshift(JSON.stringify(logEntry, null, 2));
      fs.writeFileSync(logFile, logs.join('\n\n'));

    } catch (error) {
      console.error('Error logging order:', error);
    }
  }

  async getInstrumentInfo(symbol) {
    const method = 'GET';
    const requestPath = '/api/v5/public/instruments';
    const params = {
      instType: 'SWAP',
      instId: `${symbol}-USDT-SWAP`
    };

    try {
      const headers = this.generateHeaders(method, `${requestPath}?instType=${params.instType}&instId=${params.instId}`);
      const response = await axios({
        method,
        url: `${this.baseUrl}${requestPath}`,
        headers,
        params
      });

      console.log('Instrument info response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get instrument info:', error);
      throw error;
    }
  }

  async setLeverage(symbol, leverage) {
    const method = 'POST';
    const requestPath = '/api/v5/account/set-leverage';
    
    const params = {
      instId: `${symbol}-USDT-SWAP`,
      lever: leverage,
      mgnMode: 'cross',  // 全仓模式
      posSide: 'long'    // 设置多空方向
    };

    try {
      const headers = this.generateHeaders(method, requestPath, params);
      const response = await axios({
        method,
        url: `${this.baseUrl}${requestPath}`,
        headers,
        data: params
      });

      console.log('Set leverage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to set leverage:', error);
      throw error;
    }
  }

  async placeOrder(data) {
    const method = 'POST';
    const requestPath = '/api/v5/trade/order';
    
    // 从instrument中提取交易对
    const symbol = data.instrument.split('.')[0].split('USDT')[0];  // 提取BTC
    
    // 先设置杠杆
    await this.setLeverage(symbol, config.defaultParams.lever);
    
    // 获取合约信息
    const instrumentInfo = await this.getInstrumentInfo(symbol);
    console.log('Contract info:', instrumentInfo.data[0]);
    
    let orderParams = {
      ...config.defaultParams,
      instId: `${symbol}-USDT-SWAP`
    };

    // 根据action设置订单方向
    switch(data.action) {
      case 'open_long':
        orderParams = {
          ...orderParams,
          side: 'buy',
          posSide: 'long'
        };
        break;
      case 'close_long':
        orderParams = {
          ...orderParams,
          side: 'sell',
          posSide: 'long',
          reduceOnly: true
        };
        break;
      case 'open_short':
        orderParams = {
          ...orderParams,
          side: 'sell',
          posSide: 'short'
        };
        break;
      case 'close_short':
        orderParams = {
          ...orderParams,
          side: 'buy',
          posSide: 'short',
          reduceOnly: true
        };
        break;
      default:
        throw new Error('Invalid action');
    }

    console.log('API Credentials:', {
      apiKey: this.apiKey,
      secretKey: this.secretKey ? '***' : 'missing',
      passphrase: this.passphrase ? '***' : 'missing'
    });

    console.log('Placing order with params:', orderParams);
    const headers = this.generateHeaders(method, requestPath, orderParams);

    try {
      const fullUrl = `${this.baseUrl}${requestPath}`;
      console.log('Full request details:', {
        url: fullUrl,
        method,
        headers,
        data: orderParams
      });

      const response = await axios({
        method,
        url: fullUrl,
        headers,
        data: orderParams
      });

      console.log('Order response:', response.data);
      await this.logOrder(data.action, response.data);
      return response.data;
      
    } catch (error) {
      console.error('Order placement error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      });
      throw error;
    }
  }
}

module.exports = OKXClient; 