module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    "prettier/@typescript-eslint",
    "plugin:prettier/recommended",
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": "error",
    "no-empty-function": "off",
    "@typescript-eslint/no-empty-function": "error",
  },
  settings: {
    "import/extensions": [".js",".jsx",".ts",".tsx"],
    "import/parsers": {
      "@typescript-eslint/parser": [".ts",".tsx"]
     },
     "import/resolver": {
         node: {
             extensions: [".js",".jsx",".ts",".tsx"]
         }
     }
}
};
