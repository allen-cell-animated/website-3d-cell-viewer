const path = require('path');
const webpack = require('webpack');

const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'AicsImageViewer',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  externals: [
    {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      }
    },
    {
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom'
      }
    },
    {
      'antd': {
        root: 'antd',
        commonjs2: 'antd',
        commonjs: 'antd',
        amd: 'antd'
      }
    },
    {
      'prop-types': {
        root: 'PropTypes',
        commonjs2: 'prop-types',
        commonjs: 'prop-types',
        amd: 'prop-types'
      }
    }
  ],
  plugins: [
    new CleanWebpackPlugin(['dist/*']),
    new webpack.ProvidePlugin({
      THREE: 'three',
      jQuery: 'jquery',
      $: 'jquery'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'IMAGE_VIEWER_SERVICE_URL': JSON.stringify('//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0'),
        'DOWNLOAD_SERVER': JSON.stringify('http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Data/'),
        'IMAGE_SERVER': JSON.stringify('https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.3.0/Cell-Viewer_Thumbnails/')
      }
    })
  ],
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [
          path.resolve(__dirname, 'src')
        ],
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
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
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'resolve-url-loader',
          'css-loader'
        ]
      },
      {
        loader: 'babel-loader',
        exclude: /node_modules/,
        test: /\.js$/,
        // options: {
        //   plugins: [
        //     ['import', { libraryName: "antd", style: true }]
        //   ]
        // },
      },
      {
        test: /\.less$/,
          use: [
            'style-loader',
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
              }
            }
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
    ]
  }
};
