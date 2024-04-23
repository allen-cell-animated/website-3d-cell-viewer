const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = (env) => {
  return merge(common(env), {
    mode: "development",
    devtool: "eval-source-map",
    devServer: {
      // Allows the dev server to handle routes
      historyApiFallback: true,
      open: ["/"],
      port: 9020,
      allowedHosts: "all",
      static: [
        {
          staticOptions: {
            dotfiles: "allow",
          },
        },
      ],
    },
    plugins: [],
  });
};
