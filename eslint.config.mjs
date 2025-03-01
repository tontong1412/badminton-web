import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import stylisticJs from '@stylistic/eslint-plugin-js'
import pluginNext from '@next/eslint-plugin-next'


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      '@stylistic/js': stylisticJs,
      '@next/next': pluginNext
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      '@stylistic/js/indent': [
        'error',
        2
      ],
      '@stylistic/js/linebreak-style': [
        'error',
        'unix'
      ],
      '@stylistic/js/quotes': [
        'error',
        'single'
      ],
      '@stylistic/js/semi': [
        'error',
        'never'
      ],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': [
        'error', 'always'
      ],
      'react/react-in-jsx-scope': 'off',
      'comma-dangle': ['error', 'only-multiline'],
      'arrow-parens': ['error', 'always'],
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'space-before-function-paren': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': ['error', { 'int32Hint': false }],
      'comma-spacing': ['error', { 'before': false, 'after': true }]
    },
  }
]