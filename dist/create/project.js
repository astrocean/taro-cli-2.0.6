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
const path = require("path");
const fs = require("fs-extra");
const chalk_1 = require("chalk");
const inquirer = require("inquirer");
const semver = require("semver");
const init_1 = require("./init");
const fetchTemplate_1 = require("./fetchTemplate");
const creator_1 = require("./creator");
const config_1 = require("../config");
const constants_1 = require("../util/constants");
const util_1 = require("../util");
class Project extends creator_1.default {
    constructor(options) {
        super(options.sourceRoot);
        this.askProjectName = function (conf, prompts) {
            if (typeof conf.projectName !== 'string') {
                prompts.push({
                    type: 'input',
                    name: 'projectName',
                    message: '请输入项目名称！',
                    validate(input) {
                        if (!input) {
                            return '项目名不能为空！';
                        }
                        if (fs.existsSync(input)) {
                            return '当前目录已经存在同名项目，请换一个项目名！';
                        }
                        return true;
                    }
                });
            }
            else if (fs.existsSync(conf.projectName)) {
                prompts.push({
                    type: 'input',
                    name: 'projectName',
                    message: '当前目录已经存在同名项目，请换一个项目名！',
                    validate(input) {
                        if (!input) {
                            return '项目名不能为空！';
                        }
                        if (fs.existsSync(input)) {
                            return '项目名依然重复！';
                        }
                        return true;
                    }
                });
            }
        };
        this.askDescription = function (conf, prompts) {
            if (typeof conf.description !== 'string') {
                prompts.push({
                    type: 'input',
                    name: 'description',
                    message: '请输入项目介绍！'
                });
            }
        };
        this.askTypescript = function (conf, prompts) {
            if (typeof conf.typescript !== 'boolean') {
                prompts.push({
                    type: 'confirm',
                    name: 'typescript',
                    message: '是否需要使用 TypeScript ？'
                });
            }
        };
        this.askCSS = function (conf, prompts) {
            const cssChoices = [{
                    name: 'Sass',
                    value: 'sass'
                }, {
                    name: 'Less',
                    value: 'less'
                }, {
                    name: 'Stylus',
                    value: 'stylus'
                }, {
                    name: '无',
                    value: 'none'
                }];
            if (typeof conf.css !== 'string') {
                prompts.push({
                    type: 'list',
                    name: 'css',
                    message: '请选择 CSS 预处理器（Sass/Less/Stylus）',
                    choices: cssChoices
                });
            }
        };
        this.askTemplate = function (conf, prompts, list = []) {
            const choices = [{
                    name: '默认模板',
                    value: 'default'
                }, ...list.map(item => ({ name: item, value: item }))];
            if (typeof conf.template !== 'string') {
                prompts.push({
                    type: 'list',
                    name: 'template',
                    message: '请选择模板',
                    choices
                });
            }
        };
        const unSupportedVer = semver.lt(process.version, 'v7.6.0');
        if (unSupportedVer) {
            throw new Error('Node.js 版本过低，推荐升级 Node.js 至 v8.0.0+');
        }
        this.rootPath = this._rootPath;
        this.conf = Object.assign({
            projectName: '',
            projectDir: '',
            template: '',
            description: ''
        }, options);
    }
    init() {
        console.log(chalk_1.default.green(`Taro 即将创建一个新项目!`));
        console.log('Need help? Go and open issue: https://github.com/NervJS/taro/issues/new');
        console.log();
    }
    create() {
        this.fetchTemplates()
            .then((templateChoices) => this.ask(templateChoices))
            .then(answers => {
            const date = new Date();
            this.conf = Object.assign(this.conf, answers);
            this.conf.date = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;
            this.write();
        })
            .catch(err => console.log(chalk_1.default.red('创建项目失败: ', err)));
    }
    fetchTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            const conf = this.conf;
            // 使用默认模版
            if (conf.template && conf.template === 'default') {
                return Promise.resolve([]);
            }
            // 处理模版源取值
            if (!conf.templateSource) {
                const homedir = util_1.getUserHomeDir();
                if (!homedir) {
                    chalk_1.default.yellow('找不到用户根目录，使用默认模版源！');
                    conf.templateSource = constants_1.DEFAULT_TEMPLATE_SRC;
                }
                const taroConfigPath = path.join(homedir, constants_1.TARO_CONFIG_FLODER);
                const taroConfig = path.join(taroConfigPath, constants_1.TARO_BASE_CONFIG);
                if (fs.existsSync(taroConfig)) {
                    const config = yield fs.readJSON(taroConfig);
                    conf.templateSource = config && config.templateSource ? config.templateSource : constants_1.DEFAULT_TEMPLATE_SRC;
                }
                else {
                    yield fs.createFile(taroConfig);
                    yield fs.writeJSON(taroConfig, { templateSource: constants_1.DEFAULT_TEMPLATE_SRC });
                    conf.templateSource = constants_1.DEFAULT_TEMPLATE_SRC;
                }
            }
            // 从模板源下载模板
            return fetchTemplate_1.default(this.conf.templateSource, this.templatePath(''), this.conf.clone);
        });
    }
    ask(templateChoices) {
        const prompts = [];
        const conf = this.conf;
        this.askProjectName(conf, prompts);
        this.askDescription(conf, prompts);
        this.askTypescript(conf, prompts);
        this.askCSS(conf, prompts);
        this.askTemplate(conf, prompts, templateChoices);
        return inquirer.prompt(prompts);
    }
    write(cb) {
        this.conf.src = config_1.default.SOURCE_DIR;
        init_1.createApp(this, this.conf, cb)
            .catch(err => console.log(err));
    }
}
exports.default = Project;
