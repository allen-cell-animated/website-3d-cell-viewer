const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  // output: {
  //   publicPath: "imageviewer/",
  // },
  devServer: {
    open: ["/"],
    port: 9020,
    allowedHosts: "all",
    static: [
      {
        //publicPath: "imageviewer/",
        staticOptions: {
          dotfiles: "allow",
        },
      },
    ],
  },
  plugins: [],
});
