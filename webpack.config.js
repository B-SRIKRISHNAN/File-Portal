const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require('path');
const webpack = require('webpack');
module.exports = {
  entry: "./public/index.js",
  // output:{
  //   filename:"bundle.js",
  //   path: path.resolve(__dirname,"dist")
  // },
  module: {
    rules: [
      {
        // regular expression applies this loader only to html files
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: { minimize: true }
          }
        ]
      },
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      // entry point defined in src folder
      template: "./index.html",
      // output defined in dist folder
      filename: "./index.html",
      base: '/welcome'
    }),

    new HtmlWebPackPlugin({
      // entry point defined in src folder
      template: "./Reciever.html",
      // output defined in dist folder
      filename: "./Reciever.html",
      base: '/getFile'
    }),

    new webpack.ProvidePlugin({
      process: 'process/browser',
    })
  ],
  resolve: {
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/")
    }
  }
};