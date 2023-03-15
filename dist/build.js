"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const tapable_1 = require("tapable");
const _ = require("lodash");
const chalk_1 = require("chalk");
const constants_1 = require("./util/constants");
const util_1 = require("./util");
const config_1 = require("./config");
class Builder {
    constructor(appPath) {
        this.hooks = {
            beforeBuild: new tapable_1.SyncHook(['config']),
            afterBuild: new tapable_1.SyncHook(['builder'])
        };
        this.appPath = appPath;
        this.init();
    }
    init() {
        this.resolveConfig();
        this.applyPlugins();
    }
    resolveConfig() {
        this.config = require(path.join(this.appPath, constants_1.PROJECT_CONFIG))(_.merge);
    }
    applyPlugins() {
        const plugins = this.config.plugins || [];
        if (plugins.length) {
            plugins.forEach((plugin) => {
                plugin.apply(this);
            });
        }
    }
    emptyFirst({ watch, type }) {
        const outputPath = path.join(this.appPath, `${this.config.outputRoot || config_1.default.OUTPUT_DIR}`);
        if (!fs.existsSync(outputPath)) {
            fs.ensureDirSync(outputPath);
        }
        else if (type !== "h5" /* H5 */ && (type !== "quickapp" /* QUICKAPP */ || !watch)) {
            util_1.emptyDirectory(outputPath);
        }
    }
    build(buildOptions) {
        this.hooks.beforeBuild.call(this.config);
        const { type, watch, platform, port, uiIndex } = buildOptions;
        this.emptyFirst({ type, watch });
        switch (type) {
            case "h5" /* H5 */:
                this.buildForH5(this.appPath, { watch, port });
                break;
            case "weapp" /* WEAPP */:
            case "swan" /* SWAN */:
            case "alipay" /* ALIPAY */:
            case "tt" /* TT */:
            case "quickapp" /* QUICKAPP */:
            case "qq" /* QQ */:
            case "jd" /* JD */:
                this.buildForMini(this.appPath, buildOptions);
                break;
            case "rn" /* RN */:
                this.buildForRN(this.appPath, { watch, port });
                break;
            case "ui" /* UI */:
                this.buildForUILibrary(this.appPath, { watch, uiIndex });
                break;
            case "plugin" /* PLUGIN */:
                this.buildForPlugin(this.appPath, {
                    watch,
                    platform
                });
                break;
            default:
                console.log(chalk_1.default.red('输入类型错误，目前只支持 weapp/swan/alipay/tt/qq/h5/quickapp/rn 八端类型'));
        }
    }
    buildForH5(appPath, buildOptions) {
        require('./h5').build(appPath, buildOptions);
    }
    buildForMini(appPath, buildOptions) {
        require('./mini').build(appPath, buildOptions, null, this);
    }
    buildForRN(appPath, { watch, port }) {
        require('./rn').build(appPath, { watch, port });
    }
    buildForUILibrary(appPath, { watch, uiIndex }) {
        require('./ui/index').build(appPath, { watch, uiIndex });
    }
    buildForPlugin(appPath, { watch, platform }) {
        const typeMap = {
            ["weapp" /* WEAPP */]: '微信',
            ["alipay" /* ALIPAY */]: '支付宝'
        };
        if (platform !== "weapp" /* WEAPP */ && platform !== "alipay" /* ALIPAY */) {
            console.log(chalk_1.default.red('目前插件编译仅支持 微信/支付宝 小程序！'));
            return;
        }
        console.log(chalk_1.default.green(`开始编译${typeMap[platform]}小程序插件`));
        require('./plugin').build(appPath, { watch, platform }, this);
    }
}
exports.default = Builder;
