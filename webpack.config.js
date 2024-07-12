const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');

const general = {
    mode: 'development',
    output: {
        path: dist,
        filename: '[name].js',
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    devtool: 'source-map',
    experiments: {
        syncWebAssembly: true,
        asyncWebAssembly: true,
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.html$/i,
                loader: 'html-loader',
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
};

const extension = {
    ...general,
    target: 'node',
    entry: {
        'extension-vscode': './extension/extension.ts',
    },
    output: {
        ...general.output,
        libraryTarget: 'commonjs2',
    }
};


const webview = {
    ...general,
    target: 'web',
    entry: {
        webview_nifti: './webview/nifti/index.ts'
    },
    output: {
        ...general.output,
        filename: 'webview/nifti/index.js',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './webview/**/*.html', to: '' },
                { from: './webview/**/*.css', to: '' },
            ],
        }),
    ],
};

module.exports = [webview,extension];