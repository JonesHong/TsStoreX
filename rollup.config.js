import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const external = ['rxjs', 'immer', 'solid-js'];

const createConfig = (input, output, format) => ({
  input,
  output: {
    file: output,
    format,
    sourcemap: true,
    ...(format === 'umd' && {
      name: 'RxjsStateManager',
      globals: {
        'rxjs': 'rxjs',
        'immer': 'immer',
        'solid-js': 'SolidJS'
      }
    })
  },
  external,
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: false,
      declarationMap: false
    }),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    })
  ]
});

export default [
  // Main bundle - ESM
  createConfig('src/index.ts', 'dist/index.mjs', 'es'),
  
  // Main bundle - CJS
  createConfig('src/index.ts', 'dist/index.js', 'cjs'),
  
  // Main bundle - UMD (browser)
  createConfig('src/index.ts', 'dist/index.umd.js', 'umd'),
  
  // Core module
  createConfig('src/core/index.ts', 'dist/core/index.mjs', 'es'),
  createConfig('src/core/index.ts', 'dist/core/index.js', 'cjs'),
  
  // Signals module
  createConfig('src/signals/index.ts', 'dist/signals/index.mjs', 'es'),
  createConfig('src/signals/index.ts', 'dist/signals/index.js', 'cjs'),
  
  // Entity module
  createConfig('src/entity/index.ts', 'dist/entity/index.mjs', 'es'),
  createConfig('src/entity/index.ts', 'dist/entity/index.js', 'cjs'),
  
  // Effects module
  createConfig('src/effects/index.ts', 'dist/effects/index.mjs', 'es'),
  createConfig('src/effects/index.ts', 'dist/effects/index.js', 'cjs'),
  
  // Middlewares module
  createConfig('src/middlewares/index.ts', 'dist/middlewares/index.mjs', 'es'),
  createConfig('src/middlewares/index.ts', 'dist/middlewares/index.js', 'cjs'),
  
  // Type definitions
  {
    input: 'dist/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
    external
  }
];