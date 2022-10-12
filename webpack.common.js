const path = require("path");
const fs = require("fs");
const webpack = require("webpack");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const lessToJs = require("less-vars-to-js");
const themeVariables = lessToJs(
  fs.readFileSync(path.join(__dirname, "src/aics-image-viewer/styles/ant-vars.less"), "utf8")
);

module.exports = {
  entry: ["./public/index.jsx"],
  output: {
    path: path.resolve(__dirname, "imageviewer"),
    filename: "image-viewer-ui.bundle.js",
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new MiniCssExtractPlugin(),
    new webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(require("./package.json").version),
    }),
    new CopyWebpackPlugin({ patterns: ["./.nojekyll"] }),
    new webpack.ProvidePlugin({
      THREE: "three",
      jQuery: "jquery",
      $: "jquery",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: [path.resolve(__dirname, "src")],
        exclude: [/node_modules/, /dist/],
        use: "babel-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
      {
        loader: "babel-loader",
        exclude: /node_modules/,
        test: /\.(js|jsx|ts|tsx)$/,
      },
      {
        test: /\.less$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                javascriptEnabled: true,
                modifyVars: themeVariables,
                math: "always",
              },
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|tff|eot|glyph)$/,
        type: "asset/resource",
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
      }
    ],
  },
};
