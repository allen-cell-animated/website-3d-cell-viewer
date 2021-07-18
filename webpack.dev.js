const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  devtool: 'eval-source-map',
  output: {
    publicPath: '/public/'
  },
  devServer: {
    publicPath: '/public/',
    openPage: 'public/',
    port: 9020,
    host: '0.0.0.0',
    disableHostCheck: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'IMAGE_VIEWER_SERVICE_URL': JSON.stringify('//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0'),
        'DOWNLOAD_SERVER': JSON.stringify('http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Data/'),
        'IMAGE_SERVER': JSON.stringify('http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Thumbnails/')
      }
    })
  ]
});
