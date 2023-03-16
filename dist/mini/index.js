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
const npmProcess = require("../util/npm");
const util_1 = require("../util");
const defaultManifestJSON = require("../config/manifest.default.json");
const helper_1 = require("./helper");
function buildProjectConfig() {
    const { buildAdapter, sourceDir, outputDir, outputDirName, appPath } = helper_1.getBuildData();
    let projectConfigFileName = `project.${buildAdapter}.json`;
    if (buildAdapter === "weapp" /* WEAPP */) {
        // 微信小程序 projectConfig 不遵循多端配置规则，规则参考[项目配置](https://taro-docs.jd.com/taro/docs/project-config.html)
        projectConfigFileName = 'project.config.json';
    }
    let projectConfigPath = path.join(appPath, projectConfigFileName);
    if (!fs.existsSync(projectConfigPath)) {
        // 若项目根目录不存在对应平台的 projectConfig 文件，则尝试从源代码目录查找
        projectConfigPath = path.join(sourceDir, projectConfigFileName);
        if (!fs.existsSync(projectConfigPath))
            return;
    }
    const origProjectConfig = fs.readJSONSync(projectConfigPath);
    // compileType 是 plugin 时不修改 miniprogramRoot 字段
    let distProjectConfig = origProjectConfig;
    if (origProjectConfig['compileType'] !== 'plugin') {
        distProjectConfig = Object.assign({}, origProjectConfig, { miniprogramRoot: './' });
    }
    if (buildAdapter === "tt" /* TT */ || buildAdapter === "qq" /* QQ */) {
        // 输出头条和 QQ 小程序要求的 projectConfig 文件名
        projectConfigFileName = 'project.config.json';
    }
    fs.ensureDirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, projectConfigFileName), JSON.stringify(distProjectConfig, null, 2));
    util_1.printLog("generate" /* GENERATE */, '工具配置', `${outputDirName}/${projectConfigFileName}`);
}
function buildFrameworkInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        // 百度小程序编译出 .frameworkinfo 文件
        const { buildAdapter, outputDir, outputDirName, nodeModulesPath, projectConfig } = helper_1.getBuildData();
        if (buildAdapter === "swan" /* SWAN */) {
            const frameworkInfoFileName = '.frameworkinfo';
            const frameworkName = `@tarojs/taro-${buildAdapter}`;
            const frameworkVersion = util_1.getInstalledNpmPkgVersion(frameworkName, nodeModulesPath);
            if (frameworkVersion) {
                const frameworkinfo = {
                    toolName: 'Taro',
                    toolCliVersion: util_1.getPkgVersion(),
                    toolFrameworkVersion: frameworkVersion,
                    createTime: projectConfig.date ? new Date(projectConfig.date).getTime() : Date.now()
                };
                fs.writeFileSync(path.join(outputDir, frameworkInfoFileName), JSON.stringify(frameworkinfo, null, 2));
                util_1.printLog("generate" /* GENERATE */, '框架信息', `${outputDirName}/${frameworkInfoFileName}`);
            }
            else {
                util_1.printLog("warning" /* WARNING */, '依赖安装', chalk_1.default.red(`项目依赖 ${frameworkName} 未安装，或安装有误！`));
            }
        }
    });
}
function readQuickAppManifest() {
    const { appPath } = helper_1.getBuildData();
    // 读取 project.quickapp.json
    const quickappJSONPath = path.join(appPath, 'project.quickapp.json');
    let quickappJSON;
    if (fs.existsSync(quickappJSONPath)) {
        quickappJSON = fs.readJSONSync(quickappJSONPath);
    }
    else {
        util_1.printLog("warning" /* WARNING */, '缺少配置', `检测到项目目录下未添加 ${chalk_1.default.bold('project.quickapp.json')} 文件，将使用默认配置，参考文档 https://nervjs.github.io/taro/docs/project-config.html`);
        quickappJSON = defaultManifestJSON;
    }
    return quickappJSON;
}
function build(appPath, { watch, type = "weapp" /* WEAPP */, envHasBeenSet = false, port, release }, customBuildData, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        const buildData = helper_1.setBuildData(appPath, type, customBuildData);
        const isQuickApp = type === "quickapp" /* QUICKAPP */;
        if (type !== "plugin" /* PLUGIN */) {
            yield util_1.checkCliAndFrameworkVersion(appPath, type);
        }
        process.env.TARO_ENV = type;
        if (!envHasBeenSet) {
            helper_1.setIsProduction(process.env.NODE_ENV === 'production' || !watch);
        }
        fs.ensureDirSync(buildData.outputDir);
        let quickappJSON;
        if (!isQuickApp) {
            const shouldBuildProjectConfig= !!builder.hooks.shouldBuildProjectConfig.call(type);
            if(shouldBuildProjectConfig){
                buildProjectConfig();
            }
            yield buildFrameworkInfo();
        }
        else {
            quickappJSON = readQuickAppManifest();
            helper_1.setQuickappManifest(quickappJSON);
        }
        yield buildWithWebpack({
            appPath,
            watch
        }, builder);
        if (isQuickApp) {
            const isReady = yield helper_1.prepareQuickAppEnvironment(buildData);
            if (!isReady) {
                console.log();
                console.log(chalk_1.default.red('快应用环境准备失败，请重试！'));
                process.exit(0);
                return;
            }
            yield helper_1.runQuickApp(watch, buildData, port, release);
        }
    });
}
exports.build = build;
function buildWithWebpack({ appPath, watch }, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        const { entryFilePath, buildAdapter, projectConfig, isProduction, alias, sourceDirName, outputDirName, nodeModulesPath, quickappManifest } = helper_1.getBuildData();
        const miniRunner = yield npmProcess.getNpmPkg('@tarojs/mini-runner', appPath);
        const babelConfig = util_1.getBabelConfig(projectConfig.babel);
        const miniRunnerOpts = Object.assign({ entry: {
                app: [entryFilePath]
            }, alias, copy: projectConfig.copy, sourceRoot: sourceDirName, outputRoot: outputDirName, buildAdapter, babel: babelConfig, csso: projectConfig.csso, sass: projectConfig.sass, uglify: projectConfig.uglify, plugins: projectConfig.plugins, projectName: projectConfig.projectName, isWatch: watch, mode: isProduction ? 'production' : 'development', env: projectConfig.env, defineConstants: projectConfig.defineConstants, designWidth: projectConfig.designWidth, deviceRatio: projectConfig.deviceRatio, nodeModulesPath, quickappJSON: quickappManifest }, projectConfig.mini);
        yield miniRunner(appPath, miniRunnerOpts, builder);
    });
}
