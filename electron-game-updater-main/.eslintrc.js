module.exports = {
  /* your base configuration of choice */
  extends: ["eslint:recommended", "plugin:react/recommended"],

  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
  },
  globals: {
    __static: true,
    Promise: "readonly",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    // allow anonymous component functions
    "react/display-name": 0,
    // allow console and debugger in builds
    "no-console": 0,
    "no-debugger": 1,
    // allow spreading out properties from an object without warnings
    "no-unused-vars": [1, { ignoreRestSiblings: true }],
  },
};
