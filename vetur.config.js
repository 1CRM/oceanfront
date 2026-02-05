// vetur.config.js
/** @type {import('vls').VeturConfig} */
module.exports = {
  settings: {
    //"vetur.useWorkspaceDependencies": true,
  },
  projects: [
    {
      root: "./packages/demo",
      globalComponents: [
        "./src/components/**/*.ts",
        "./src/components/**/*.vue",
      ],
    },
    {
      root: "./packages/oceanfront",
      globalComponents: [
        "./src/components/**/*.ts",
        "./src/components/**/*.vue",
      ],
    },
    {
      root: "./packages/oceanfront-html-editor",
      globalComponents: [
        "./src/components/**/*.ts",
        "./src/components/**/*.vue",
      ],
    },
    {
      root: "./packages/oceanfront-workflow-canvas",
      globalComponents: [
        "./src/components/**/*.ts",
        "./src/components/**/*.vue",
      ],
    },
  ],
};
