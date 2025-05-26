import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from "@rollup/plugin-terser";
import dts from 'rollup-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

// 外部依賴 - 不打包進 bundle
const external = [
  'rxjs',
  'rxjs/operators',
  'immer',
  'solid-js',
  'solid-js/store'
];

// 全域變數映射 (UMD 格式需要)
const globals = {
  'rxjs': 'rxjs',
  'rxjs/operators': 'rxjs.operators',
  'immer': 'immer',
  'solid-js': 'SolidJS',
  'solid-js/store': 'SolidJS.store'
};

// 通用插件配置
const getPlugins = (declaration = false, analyze = false) => [
  nodeResolve({
    preferBuiltins: true,
    browser: false
  }),
  typescript({
    tsconfig: declaration ? './tsconfig.build.json' : './tsconfig.json',
    declaration,
    declarationMap: declaration,
    rootDir: 'src',
    exclude: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*']
  }),
  terser({
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug']
    },
    mangle: {
      reserved: ['Store', 'createAction', 'createReducer']
    },
    format: {
      comments: false
    }
  }),
  ...(analyze ? [
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true
    })
  ] : [])
];

// 創建配置的工廠函數
const createConfig = (input, outputFile, format, plugins = getPlugins()) => ({
  input,
  output: {
    file: outputFile,
    format,
    sourcemap: true,
    ...(format === 'umd' && {
      name: 'TsStoreX',
      globals
    }),
    ...(format === 'es' && {
      chunkFileNames: '[name]-[hash].mjs'
    })
  },
  external,
  plugins,
  // 優化設定
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false
  }
});

// 子模組配置生成器
const createSubmoduleConfigs = (submodule) => [
  // ESM
  createConfig(
    `src/${submodule}/index.ts`,
    `dist/${submodule}/index.mjs`,
    'es'
  ),
  // CJS
  createConfig(
    `src/${submodule}/index.ts`,
    `dist/${submodule}/index.js`,
    'cjs'
  )
];

export default [
  // ===== 主要 Bundle =====
  
  // ESM 格式
  createConfig('src/index.ts', 'dist/index.mjs', 'es'),
  
  // CJS 格式
  createConfig('src/index.ts', 'dist/index.js', 'cjs'),
  
  // UMD 格式 (瀏覽器通用)
  createConfig('src/index.ts', 'dist/index.umd.js', 'umd'),
  
  // UMD 最小化版本
  createConfig('src/index.ts', 'dist/index.umd.min.js', 'umd', [
    ...getPlugins(),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2
      },
      mangle: true,
      format: {
        comments: false
      }
    })
  ]),

  // ===== 子模組 Bundle =====
  
  // Core 模組
  ...createSubmoduleConfigs('core'),
  
  // Signals 模組
  ...createSubmoduleConfigs('signals'),
  
  // Entity 模組
  ...createSubmoduleConfigs('entity'),
  
  // Effects 模組
  ...createSubmoduleConfigs('effects'),
  
  // Middlewares 模組
  ...createSubmoduleConfigs('middlewares'),
  
  // Selectors 模組
  ...createSubmoduleConfigs('selectors'),
  
  // Utils 模組
  ...createSubmoduleConfigs('utils'),

  // ===== TypeScript 型別定義 =====
  
  // 主要型別定義
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [dts({
      respectExternal: true,
      compilerOptions: {
        removeComments: false
      }
    })]
  },
  
  // 子模組型別定義
  {
    input: 'src/core/index.ts',
    output: { file: 'dist/core/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/signals/index.ts',
    output: { file: 'dist/signals/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/entity/index.ts',
    output: { file: 'dist/entity/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/effects/index.ts',
    output: { file: 'dist/effects/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/middlewares/index.ts',
    output: { file: 'dist/middlewares/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/selectors/index.ts',
    output: { file: 'dist/selectors/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  },
  {
    input: 'src/utils/index.ts',
    output: { file: 'dist/utils/index.d.ts', format: 'es' },
    external,
    plugins: [dts()]
  }
];