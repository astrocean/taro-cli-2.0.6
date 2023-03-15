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
const os = require("os");
const child_process_1 = require("child_process");
const _ = require("lodash");
const ora = require("ora");
const chalk_1 = require("chalk");
const constants_1 = require("../util/constants");
const util_1 = require("../util");
const config_1 = require("../config");
const dowload_1 = require("../util/dowload");
let BuildData;
function setIsProduction(isProduction) {
    BuildData.isProduction = isProduction;
}
exports.setIsProduction = setIsProduction;
function setQuickappManifest(quickappManifest) {
    BuildData.quickappManifest = quickappManifest;
}
exports.setQuickappManifest = setQuickappManifest;
function setBuildData(appPath, adapter, options) {
    const configDir = path.join(appPath, constants_1.PROJECT_CONFIG);
    const projectConfig = require(configDir)(_.merge);
    const sourceDirName = projectConfig.sourceRoot || config_1.default.SOURCE_DIR;
    const outputDirName = projectConfig.outputRoot || config_1.default.OUTPUT_DIR;
    const sourceDir = path.join(appPath, sourceDirName);
    const outputDir = path.join(appPath, outputDirName);
    const entryFilePath = util_1.resolveScriptPath(path.join(sourceDir, config_1.default.ENTRY));
    const entryFileName = path.basename(entryFilePath);
    const pathAlias = projectConfig.alias || {};
    const weappConf = projectConfig.weapp || {};
    const npmConfig = Object.assign({
        name: config_1.default.NPM_DIR,
        dir: null
    }, weappConf.npm);
    const useCompileConf = Object.assign({}, weappConf.compile);
    BuildData = {
        appPath,
        configDir,
        sourceDirName,
        outputDirName,
        sourceDir,
        outputDir,
        originalOutputDir: outputDir,
        entryFilePath,
        entryFileName,
        projectConfig,
        npmConfig,
        alias: pathAlias,
        isProduction: false,
        compileConfig: useCompileConf,
        buildAdapter: adapter,
        outputFilesTypes: constants_1.MINI_APP_FILES[adapter],
        nodeModulesPath: util_1.recursiveFindNodeModules(path.join(appPath, constants_1.NODE_MODULES)),
        jsxAttributeNameReplace: weappConf.jsxAttributeNameReplace || {}
    };
    // 可以自定义输出文件类型
    if (weappConf.customFilesTypes && !util_1.isEmptyObject(weappConf.customFilesTypes)) {
        BuildData.outputFilesTypes = Object.assign({}, BuildData.outputFilesTypes, weappConf.customFilesTypes[adapter] || {});
    }
    if (adapter === "quickapp" /* QUICKAPP */) {
        BuildData.originalOutputDir = BuildData.outputDir;
        BuildData.outputDirName = `${BuildData.outputDirName}/src`;
        BuildData.outputDir = path.join(BuildData.appPath, BuildData.outputDirName);
    }
    if (options) {
        Object.assign(BuildData, options);
    }
    return BuildData;
}
exports.setBuildData = setBuildData;
function getBuildData() {
    return BuildData;
}
exports.getBuildData = getBuildData;
function setOutputDirName(outputDirName) {
    BuildData.originalOutputDir = BuildData.outputDir;
    BuildData.outputDirName = outputDirName;
    BuildData.outputDir = path.join(BuildData.appPath, BuildData.outputDirName);
}
exports.setOutputDirName = setOutputDirName;
function prepareQuickAppEnvironment(buildData) {
    return __awaiter(this, void 0, void 0, function* () {
        let isReady = false;
        let needDownload = false;
        let needInstall = false;
        const originalOutputDir = buildData.originalOutputDir;
        console.log();
        if (fs.existsSync(path.join(buildData.originalOutputDir, 'sign'))) {
            needDownload = false;
        }
        else {
            needDownload = true;
        }
        if (needDownload) {
            const getSpinner = ora('开始下载快应用运行容器...').start();
            yield dowload_1.downloadGithubRepoLatestRelease('NervJS/quickapp-container', buildData.appPath, originalOutputDir);
            yield util_1.unzip(path.join(originalOutputDir, 'download_temp.zip'));
            getSpinner.succeed('快应用运行容器下载完成');
        }
        else {
            console.log(`${chalk_1.default.green('✔ ')} 快应用容器已经准备好`);
        }
        process.chdir(originalOutputDir);
        console.log();
        if (fs.existsSync(path.join(originalOutputDir, 'node_modules'))) {
            needInstall = false;
        }
        else {
            needInstall = true;
        }
        if (needInstall) {
            const isWindows = os.platform() === 'win32';
            let command;
            if (util_1.shouldUseYarn()) {
                if (!isWindows) {
                    command = 'NODE_ENV=development yarn install';
                }
                else {
                    command = 'yarn install';
                }
            }
            else if (util_1.shouldUseCnpm()) {
                if (!isWindows) {
                    command = 'NODE_ENV=development cnpm install';
                }
                else {
                    command = 'cnpm install';
                }
            }
            else {
                if (!isWindows) {
                    command = 'NODE_ENV=development npm install';
                }
                else {
                    command = 'npm install';
                }
            }
            const installSpinner = ora(`安装快应用依赖环境, 需要一会儿...`).start();
            try {
                const stdout = child_process_1.execSync(command);
                installSpinner.color = 'green';
                installSpinner.succeed('安装成功');
                console.log(`${stdout}`);
                isReady = true;
            }
            catch (error) {
                installSpinner.color = 'red';
                installSpinner.fail(chalk_1.default.red(`快应用依赖环境安装失败，请进入 ${path.basename(originalOutputDir)} 重新安装！`));
                console.log(`${error}`);
                isReady = false;
            }
        }
        else {
            console.log(`${chalk_1.default.green('✔ ')} 快应用依赖已经安装好`);
            isReady = true;
        }
        return isReady;
    });
}
exports.prepareQuickAppEnvironment = prepareQuickAppEnvironment;
function runQuickApp(isWatch, buildData, port, release) {
    return __awaiter(this, void 0, void 0, function* () {
        const originalOutputDir = buildData.originalOutputDir;
        const { compile } = require(require.resolve('hap-toolkit/lib/commands/compile', { paths: [originalOutputDir] }));
        if (isWatch) {
            const { launchServer } = require(require.resolve('@hap-toolkit/server', { paths: [originalOutputDir] }));
            launchServer({
                port: port || 12306,
                watch: isWatch,
                clearRecords: false,
                disableADB: false
            });
            compile('native', 'dev', true);
        }
        else {
            if (!release) {
                compile('native', 'dev', false);
            }
            else {
                compile('native', 'prod', false);
            }
        }
    });
}
exports.runQuickApp = runQuickApp;
