import type { Configuration } from 'webpack';
import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import ReplaceInFileWebpackPlugin from 'replace-in-file-webpack-plugin';
import LiveReloadPlugin from 'webpack-livereload-plugin';
import { execSync } from 'child_process';

const DIST_DIR = path.resolve(__dirname, 'dist');
const SRC_DIR = path.resolve(__dirname, 'src');

const config = async (env: any): Promise<Configuration> => {
  const isDevelopment = env.development === true;

  return {
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    context: __dirname,
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    entry: {
      module: path.join(SRC_DIR, 'module.ts'),
    },
    externals: [
      'lodash',
      'jquery',
      'moment',
      'slate',
      'prismjs',
      'slate-plain-serializer',
      'react',
      'react-dom',
      '@grafana/ui',
      '@grafana/runtime',
      '@grafana/data',
    ],
    mode: isDevelopment ? 'development' : 'production',
    module: {
      rules: [
        {
          test: /\.[tj]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: false,
                  dynamicImport: true,
                },
                target: 'es2015',
                loose: false,
                externalHelpers: false,
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
        },
        {
          test: /\.(css|sass|scss)$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'img/[name].[hash:8][ext]',
          },
        },
        {
          test: /\.(woff|woff2|ttf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash:8][ext]',
          },
        },
      ],
    },
    output: {
      clean: true,
      path: DIST_DIR,
      filename: '[name].js',
      libraryTarget: 'amd',
      publicPath: '/',
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/plugin.json', to: '.' },
          { from: 'src/img/*', to: '.', noErrorOnMissing: true },
          { from: 'LICENSE', to: '.' },
          { from: 'README.md', to: '.' },
          { from: 'CHANGELOG.md', to: '.', noErrorOnMissing: true },
        ],
      }),
      new ForkTsCheckerWebpackPlugin({
        async: isDevelopment,
        typescript: {
          configFile: path.join(__dirname, 'tsconfig.json'),
        },
      }),
      new ESLintPlugin({
        extensions: ['ts', 'tsx'],
        lintDirtyModulesOnly: isDevelopment,
      }),
      new ReplaceInFileWebpackPlugin([
        {
          dir: DIST_DIR,
          files: ['plugin.json'],
          rules: [
            {
              search: /%VERSION%/g,
              replace: require('./package.json').version,
            },
            {
              search: /%TODAY%/g,
              replace: new Date().toISOString().substring(0, 10),
            },
          ],
        },
      ]),
      ...(isDevelopment ? [new LiveReloadPlugin()] : []),
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': SRC_DIR,
      },
      modules: [SRC_DIR, 'node_modules'],
    },
    optimization: {
      minimize: !isDevelopment,
    },
  };
};

export default config;
