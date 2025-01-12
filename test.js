// 设置API密钥
process.env.OKX_API_KEY = 'dc265489-1415-4506-89b2-753c4a27ee58';
process.env.OKX_SECRET_KEY = '113CA465617BFD8D40185F7E84D7448D';
process.env.OKX_PASSPHRASE = '321321Qwe!';
process.env.DEMO_TRADING = 'false';  // 关闭模拟交易

require('dotenv').config();
const OKXClient = require('./api/okx');

async function test() {
    const client = new OKXClient();
    
    const testData = {
        instrument: 'BTCUSDT.P',
        action: 'open_long'
    };

    try {
        console.log('Testing order placement...');
        const response = await client.placeOrder(testData);
        console.log('Test result:', response);
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

test(); 