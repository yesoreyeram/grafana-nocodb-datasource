const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin');

module.exports = (env) => ({
  cache: {
    type: 'filesystem',
  },
  context: path.join(process.cwd(), 'src'),
  devtool: env.production ? 'source-map' : 'eval-source-map',
  entry: './module.ts',
  externals: [
    'lodash',
    'react',
    'react-dom',
    '@grafana/data',
    '@grafana/runtime',
    '@grafana/ui',
  ],
  mode: env.production ? 'production' : 'development',
  module: {
    rules: [
      {
        exclude: /(node_modules)/,
        test: /\.[tj]sx?$/,
        use: {
          loader: 'swc-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/,
        type: 'asset/source',
      },
    ],
  },
  output: {
    clean: true,
    filename: 'module.js',
    library: {
      type: 'amd',
    },
    path: path.resolve(process.cwd(), 'dist'),
    publicPath: '/',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'plugin.json', to: '.' },
        { from: '../README.md', to: '.' },
        { from: '../LICENSE', to: '.', noErrorOnMissing: true },
        { from: 'img', to: 'img', noErrorOnMissing: true },
      ],
    }),
    new ReplaceInFileWebpackPlugin([
      {
        dir: 'dist',
        files: ['plugin.json', 'README.md'],
        rules: [
          {
            search: '%VERSION%',
            replace: process.env.npm_package_version || '0.1.0',
          },
          {
            search: '%TODAY%',
            replace: new Date().toISOString().substring(0, 10),
          },
        ],
      },
    ]),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
});
