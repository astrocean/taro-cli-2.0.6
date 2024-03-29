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
const child_process_1 = require("child_process");
const ora = require("ora");
const helper = require("../util");
const CONFIG_DIR_NAME = 'config';
const TEMPLATE_CREATOR = 'template_creator.js';
const PACKAGE_JSON_ALIAS_REG = /\/pkg$/;
const styleExtMap = {
    sass: 'scss',
    less: 'less',
    stylus: 'styl',
    none: 'css'
};
const doNotCopyFiles = [
    '.DS_Store',
    '.npmrc',
    TEMPLATE_CREATOR
];
function createFiles(creater, files, handler, options) {
    const { description, projectName, version, css, date, typescript, template, templatePath, projectPath, pageName } = options;
    const logs = [];
    // 模板库模板，直接创建，不需要改后缀
    const globalChangeExt = Boolean(handler);
    const currentStyleExt = styleExtMap[css] || 'css';
    files.forEach(file => {
        // fileRePath startsWith '/'
        const fileRePath = file.replace(templatePath, '').replace(new RegExp(`\\${path.sep}`, 'g'), '/');
        let externalConfig = null;
        // 跑自定义逻辑，确定是否创建此文件
        if (handler && typeof handler[fileRePath] === 'function') {
            externalConfig = handler[fileRePath](options);
            if (!externalConfig)
                return;
        }
        let changeExt = globalChangeExt;
        if (externalConfig && typeof externalConfig === 'object') {
            if (externalConfig.changeExt === false) {
                changeExt = false;
            }
        }
        // 合并自定义 config
        const config = Object.assign({}, {
            description,
            projectName,
            version,
            css,
            cssExt: currentStyleExt,
            date,
            typescript,
            template,
            pageName
        }, externalConfig);
        let destRePath = fileRePath;
        // createPage 创建页面模式
        if (config.setPageName) {
            destRePath = config.setPageName;
        }
        destRePath = destRePath.replace(/^\//, '');
        // 处理 .js 和 .css 的后缀
        if (typescript &&
            changeExt &&
            !destRePath.startsWith(`${CONFIG_DIR_NAME}`) &&
            (path.extname(destRePath) === '.js' || path.extname(destRePath) === '.jsx')) {
            destRePath = destRePath.replace('.js', '.ts');
        }
        if (changeExt && path.extname(destRePath).includes('.css')) {
            destRePath = destRePath.replace('.css', `.${currentStyleExt}`);
        }
        let dest = path.join(projectPath, destRePath);
        // 兼容 Nodejs 13+ 调用 require 时 package.json 格式不能非法
        if (PACKAGE_JSON_ALIAS_REG.test(fileRePath)) {
            dest = path.join(projectPath, fileRePath.replace(PACKAGE_JSON_ALIAS_REG, '/package.json'));
        }
        // 创建
        creater.template(template, fileRePath, dest, config);
        logs.push(`${chalk_1.default.green('✔ ')}${chalk_1.default.grey(`创建文件: ${path.join(projectName, destRePath)}`)}`);
    });
    return logs;
}
function createPage(creater, params, cb) {
    return __awaiter(this, void 0, void 0, function* () {
        const { projectDir, template, pageName } = params;
        // path
        const templatePath = creater.templatePath(template);
        if (!fs.existsSync(templatePath))
            return console.log(chalk_1.default.red(`创建页面错误：找不到模板${templatePath}`));
        // 引入模板编写者的自定义逻辑
        const handlerPath = path.join(templatePath, TEMPLATE_CREATOR);
        const basePageFiles = fs.existsSync(handlerPath) ? require(handlerPath).basePageFiles : [];
        const files = Array.isArray(basePageFiles) ? basePageFiles : [];
        const handler = fs.existsSync(handlerPath) ? require(handlerPath).handler : null;
        const logs = createFiles(creater, files, handler, Object.assign({}, params, { templatePath, projectPath: projectDir, pageName, period: 'createPage' }));
        creater.fs.commit(() => {
            // logs
            console.log();
            logs.forEach(log => console.log(log));
            console.log();
            typeof cb === 'function' && cb();
        });
    });
}
exports.createPage = createPage;
function createApp(creater, params, cb) {
    return __awaiter(this, void 0, void 0, function* () {
        const { projectName, projectDir, template, env, autoInstall = true } = params;
        const logs = [];
        // path
        const templatePath = creater.templatePath(template);
        const projectPath = path.join(projectDir, projectName);
        // default 模板发布 npm 会滤掉 '.' 开头的文件，因此改为 '_' 开头，这里先改回来。
        if (env !== 'test' && template === 'default') {
            const files = yield fs.readdir(templatePath);
            const renames = files
                .map(file => {
                const filePath = path.join(templatePath, file);
                if (fs.statSync(filePath).isFile() && file.startsWith('_')) {
                    return fs.rename(filePath, path.join(templatePath, file.replace(/^_/, '.')));
                }
                return Promise.resolve();
            });
            yield Promise.all(renames);
        }
        // npm & yarn
        const version = helper.getPkgVersion();
        const shouldUseYarn = helper.shouldUseYarn();
        const useNpmrc = !shouldUseYarn;
        const yarnLockfilePath = path.join('yarn-lockfiles', `${version}-yarn.lock`);
        const useYarnLock = shouldUseYarn && fs.existsSync(creater.templatePath(template, yarnLockfilePath));
        if (useNpmrc) {
            creater.template(template, '.npmrc', path.join(projectPath, '.npmrc'));
            logs.push(`${chalk_1.default.green('✔ ')}${chalk_1.default.grey(`创建文件: ${projectName}${path.sep}.npmrc`)}`);
        }
        if (useYarnLock) {
            creater.template(template, yarnLockfilePath, path.join(projectPath, 'yarn.lock'));
            logs.push(`${chalk_1.default.green('✔ ')}${chalk_1.default.grey(`创建文件: ${projectName}${path.sep}yarn.lock`)}`);
        }
        // 遍历出模板中所有文件
        const files = yield helper.getAllFilesInFloder(templatePath, doNotCopyFiles);
        // 引入模板编写者的自定义逻辑
        const handlerPath = path.join(templatePath, TEMPLATE_CREATOR);
        const handler = fs.existsSync(handlerPath) ? require(handlerPath).handler : null;
        // 为所有文件进行创建
        logs.push(...createFiles(creater, files, handler, Object.assign({}, params, { version,
            templatePath,
            projectPath, pageName: 'index', period: 'createApp' })));
        // fs commit
        creater.fs.commit(() => {
            // logs
            console.log();
            console.log(`${chalk_1.default.green('✔ ')}${chalk_1.default.grey(`创建项目: ${chalk_1.default.grey.bold(projectName)}`)}`);
            logs.forEach(log => console.log(log));
            console.log();
            // git init
            const gitInitSpinner = ora(`cd ${chalk_1.default.cyan.bold(projectName)}, 执行 ${chalk_1.default.cyan.bold('git init')}`).start();
            process.chdir(projectPath);
            const gitInit = child_process_1.exec('git init');
            gitInit.on('close', code => {
                if (code === 0) {
                    gitInitSpinner.color = 'green';
                    gitInitSpinner.succeed(gitInit.stdout.read());
                }
                else {
                    gitInitSpinner.color = 'red';
                    gitInitSpinner.fail(gitInit.stderr.read());
                }
            });
            const callSuccess = () => {
                console.log(chalk_1.default.green(`创建项目 ${chalk_1.default.green.bold(projectName)} 成功！`));
                console.log(chalk_1.default.green(`请进入项目目录 ${chalk_1.default.green.bold(projectName)} 开始工作吧！😝`));
                if (typeof cb === 'function') {
                    cb();
                }
            };
            if (autoInstall) {
                // packages install
                let command;
                if (shouldUseYarn) {
                    command = 'yarn install';
                }
                else if (helper.shouldUseCnpm()) {
                    command = 'cnpm install';
                }
                else {
                    command = 'npm install';
                }
                const installSpinner = ora(`执行安装项目依赖 ${chalk_1.default.cyan.bold(command)}, 需要一会儿...`).start();
                child_process_1.exec(command, (error, stdout, stderr) => {
                    if (error) {
                        installSpinner.color = 'red';
                        installSpinner.fail(chalk_1.default.red('安装项目依赖失败，请自行重新安装！'));
                        console.log(error);
                    }
                    else {
                        installSpinner.color = 'green';
                        installSpinner.succeed('安装成功');
                        console.log(`${stderr}${stdout}`);
                    }
                    callSuccess();
                });
            }
            else {
                callSuccess();
            }
        });
    });
}
exports.createApp = createApp;
