const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'WalletLink.js',
        path: path.resolve(__dirname, 'dist')
    }
};