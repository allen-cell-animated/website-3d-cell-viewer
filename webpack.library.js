const path = require("path");

const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      type: "umd"
    },
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  externals: [
    {
      react: {
        root: "React",
        commonjs2: "react",
        commonjs: "react",
        amd: "react",
      },
    },
    {
      "react-dom": {
        root: "ReactDOM",
        commonjs2: "react-dom",
        commonjs: "react-dom",
        amd: "react-dom",
      },
    },
  ],
  plugins: [
    new CleanWebpackPlugin(),
  ],
  devtool: "cheap-module-source-map",
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: [path.resolve(__dirname, "src")],
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          "resolve-url-loader",
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              sassOptions: {
                includePaths: [`${__dirname}/src/aics-image-viewer/assets/styles`],
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "resolve-url-loader", "css-loader"],
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
              camelCase: true,
              importLoaders: 1,
            },
          },
          {
            loader: "less-loader",
            options: {
              javascriptEnabled: true,
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|tff|eot|glyph|svg)$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 10000,
              name: "imageviewer/font/[name].[ext]",
            },
          },
        ],
      },
    ],
  },
};
