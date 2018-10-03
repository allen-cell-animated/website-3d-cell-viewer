const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: ['babel-polyfill', './public/index.js'],
  output: {
    path: path.resolve(__dirname, 'imageviewer'),
    filename: 'image-viewer-ui.bundle.js'
  },
  plugins: [
    new CleanWebpackPlugin(['imageviewer']),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new ExtractPlugin('bundle.[hash].css'),
    new webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(require("./package.json").version)
    }),
    new webpack.ProvidePlugin({
      d3: 'd3',
      THREE: 'three',
      jQuery: 'jquery',
      $: 'jquery'
    }),
    // ignores a webcomponents dependency on a server side module since this is for front end only.
    // see: https://github.com/webcomponents/webcomponentsjs/issues/794
    new webpack.IgnorePlugin(/vertx/)
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [
          path.resolve(__dirname, 'public'),
          path.resolve(__dirname, 'src/aics-image-viewer/components')
        ],
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.scss$/,
        loader: ExtractPlugin.extract({
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            'resolve-url-loader',
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                includePaths: [`${__dirname}/src/aics-image-viewer/assets/styles`]
              }
            }
          ]
        })
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(woff|woff2|tff|eot|glyph|svg)$/,
        use: [
            {
                loader: 'url-loader',
                 options: {
                     limit: 10000,
                     name: 'imageviewer/font/[name].[ext]'
               }
            }
        ]
      },
      {
        test: /Worker\.js$/,
        use: 'worker-loader?inline=true'
      },
      {
        test: /\.html$/,
        exclude: /index\.html/,
        use: ['polymer-webpack-loader']
      }
    ]
  }
};
