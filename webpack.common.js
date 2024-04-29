const path = require("path");
const webpack = require("webpack");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
  return {
    entry: ["./public/index.tsx"],
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
        WEBSITE3DCELLVIEWER_VERSION: JSON.stringify(require("./package.json").version),
        VOLUMEVIEWER_VERSION: JSON.stringify(require("./node_modules/@aics/volume-viewer/package.json").version),
        WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT: JSON.stringify(env.env),
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
          loader: "babel-loader",
          exclude: /node_modules/,
          test: /\.(js|jsx|ts|tsx|svg)$/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
        },
        {
          test: /\.(woff|woff2|tff|eot|glyph)$/,
          type: "asset/resource",
        },
      ],
    },
  };
};
