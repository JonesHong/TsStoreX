module.exports = {
    // 基本格式設定
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    
    // 括號和空格
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    
    // 行尾設定
    endOfLine: 'lf',
    
    // TypeScript 特定
    parser: 'typescript',
    
    // 文件覆蓋
    overrides: [
      {
        files: '*.json',
        options: {
          parser: 'json'
        }
      },
      {
        files: '*.md',
        options: {
          parser: 'markdown',
          printWidth: 80,
          proseWrap: 'always'
        }
      },
      {
        files: '*.yaml',
        options: {
          parser: 'yaml'
        }
      }
    ]
  };