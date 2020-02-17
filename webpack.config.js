const path = require("path");

module.exports = {
  mode: "production",
  target: "electron-main",
  entry: {
    app: ["./src/host/main.ts"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          { loader: "ts-loader", options: { configFile: "tsconfig.host.json" } }
        ]
      }
    ]
  },
  stats: {
    warningsFilter: /^(?!CriticalDependenciesWarning$)/
  },
  output: {
    path: path.resolve(__dirname, "build/host"),
    filename: "main.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  }
};
