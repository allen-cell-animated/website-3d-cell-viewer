const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

const lessToJs = require('less-vars-to-js');
const themeVariables = lessToJs(fs.readFileSync(path.join(__dirname, './src/aics-image-viewer/styles/ant-vars.less'), 'utf8'));
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

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
    new ExtractTextPlugin('bundle.[hash].css'),
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
        exclude: [/node_modules/, /dist/],
        use: 'babel-loader'
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract({
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
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          use: [
            {
              loader: "css-loader",
              options: {
                camelCase: true,
                importLoaders: 1
              }

            },
            {
              loader: "less-loader",
              options: {
                javascriptEnabled: true,
                modifyVars: themeVariables,

              }
            }
          ]
        })
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
      }
    ]
  }
};
