// 打印环境变量，用于调试
console.log('Environment variables:', {
    OKX_API_KEY: process.env.OKX_API_KEY,
    OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
    OKX_PASSPHRASE: process.env.OKX_PASSPHRASE
});

module.exports = {
    apiKey: process.env.OKX_API_KEY || '',
    secretKey: process.env.OKX_SECRET_KEY || '',
    passphrase: process.env.OKX_PASSPHRASE || '',
    defaultParams: {
        tdMode: 'cross',
        lever: '100',
        sz: '0.1',
        ordType: 'market'
    }
}; 