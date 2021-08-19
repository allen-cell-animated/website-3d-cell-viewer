const {merge} = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'IMAGE_VIEWER_SERVICE_URL': JSON.stringify('//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0'),
        'DOWNLOAD_SERVER': JSON.stringify('http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Data/'),
        'IMAGE_SERVER': JSON.stringify('https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.3.0/Cell-Viewer_Thumbnails/')
      }
    })
  ]
});
