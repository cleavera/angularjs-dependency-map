const path = require('path');

module.exports = {
    entry: {
        'main': path.resolve(__dirname, './src/index.ts')
    },

    output: {
        path: path.resolve(__dirname),
        filename: 'index.js'
    },

    target: 'node',

    module: {
        rules: [
            {
                test: /\.ts$/,
                use: ['ts-loader']
            }
        ]
    },

    resolve: {
        modules: [
            'node_modules'
        ],
        extensions: ['.ts', '.js']
    }
};