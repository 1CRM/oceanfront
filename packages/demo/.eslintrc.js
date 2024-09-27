module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    '@typescript-eslint/ban-types': 'off', // temporary - allow 'object'
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_.*$',
        varsIgnorePattern: '^_.*$'
      }
    ],
    '@typescript-eslint/no-unsafe-function-type': 'off',
    'vue/attributes-order': 'off',
    'vue/html-closing-bracket-newline': 'off',
    'vue/html-indent': 'off',
    'vue/html-self-closing': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/no-dupe-keys': 'off', // seems broken
    'vue/require-default-prop': 'off',
    'vue/singleline-html-element-content-newline': 'off'
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue']
  },
  overrides: [
    {
      files: ['**/__tests__/*.{j,t}s?(x)'],
      env: {
        mocha: true
      }
    }
  ]
}
