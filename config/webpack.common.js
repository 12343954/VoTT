const path = require("path");

module.exports = {
    node: {
        __dirname: false,
    },
    target: "electron-main",
    entry: {
        main: "./src/electron/main.ts",
        preload: "./src/electron/preload.ts",
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            noEmit: false
                        }
                    }
                }],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "../build")
    }
};
