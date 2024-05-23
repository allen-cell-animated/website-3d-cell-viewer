const { merge } = require("webpack-merge");
const common = require("./webpack.common");

// NOTE: webpack.dev.js is currently used in our deployments across multiple platforms
// (S3, GitHub Pages, etc.). Please be cautious when making changes to this file.

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
