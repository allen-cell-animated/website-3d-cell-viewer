const merge = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'IMAGE_VIEWER_SERVICE_URL': JSON.stringify('//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0')
      }
    })
  ]
});
