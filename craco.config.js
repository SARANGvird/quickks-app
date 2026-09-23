
const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js core modules
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
      };

      // Ignore deprecation warnings
      webpackConfig.stats = {
        ...webpackConfig.stats,
        warningsFilter: [
          /DEP0060/,
          /deprecated/,
          /util\._extend/,
        ],
      };

      // Add plugins to suppress warnings
      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_NO_WARNINGS': JSON.stringify('1'),
        })
      );

      return webpackConfig;
    },
  },
  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
    },
  },
};