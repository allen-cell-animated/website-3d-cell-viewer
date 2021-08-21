const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = merge(common, {
  devtool: "eval-source-map",
  output: {
    publicPath: "",
  },
  devServer: {
    publicPath: "/imageviewer/",
    openPage: "imageviewer/",
    port: 9020,
    host: "0.0.0.0",
    disableHostCheck: true,
  },
  plugins: [
  ],
});
