const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  devtool: 'cheap-module-source-map',
  output: {
    publicPath: '/imageviewer/'
  },
  devServer: {
    publicPath: '/imageviewer/',
    openPage: 'imageviewer/',
    port: 9020,
    host: '0.0.0.0',
    disableHostCheck: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'IMAGE_VIEWER_SERVICE_URL': JSON.stringify('//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0')
      }
    })
  ]
});
