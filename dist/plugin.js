"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const chalk_1 = require("chalk");
const helper_1 = require("./mini/helper");
const mini_1 = require("./mini");
const PLUGIN_JSON = 'plugin.json';
const PLUGIN_MOCK_JSON = 'plugin-mock.json';
function build(appPath, { watch, platform }, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (platform) {
            case "weapp" /* WEAPP */:
                yield buildWxPlugin(appPath, { watch, type: "weapp" /* WEAPP */ }, builder);
                break;
            case "alipay" /* ALIPAY */:
                yield buildAlipayPlugin(appPath, { watch, type: "alipay" /* ALIPAY */ }, builder);
                break;
            default:
                console.log(chalk_1.default.red('输入插件类型错误，目前只支持 weapp/alipay 插件类型'));
                break;
        }
    });
}
exports.build = build;
function buildWxPlugin(appPath, { watch, type }, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        yield mini_1.build(appPath, { watch, type: "plugin" /* PLUGIN */ }, null, builder);
        const { outputDirName } = helper_1.getBuildData();
        yield mini_1.build(appPath, { watch, type }, {
            outputDirName: `${outputDirName}/miniprogram`
        }, builder);
    });
}
function buildAlipayPlugin(appPath, { watch, type }, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        yield mini_1.build(appPath, { watch, type }, null, builder);
        const { sourceDir, outputDir } = helper_1.getBuildData();
        const pluginJson = path.join(sourceDir, PLUGIN_JSON);
        const pluginMockJson = path.join(sourceDir, PLUGIN_MOCK_JSON);
        if (fs.existsSync(pluginJson)) {
            fs.copyFileSync(pluginJson, path.join(outputDir, PLUGIN_JSON));
        }
        if (fs.existsSync(pluginMockJson)) {
            fs.copyFileSync(pluginMockJson, path.join(outputDir, PLUGIN_MOCK_JSON));
        }
    });
}
