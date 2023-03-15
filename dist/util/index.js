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
const stream_1 = require("stream");
const os = require("os");
const child_process = require("child_process");
const chalk_1 = require("chalk");
const lodash_1 = require("lodash");
const yauzl = require("yauzl");
const findWorkspaceRoot = require("find-yarn-workspace-root");
const babel_1 = require("../config/babel");
const constants_1 = require("./constants");
const execSync = child_process.execSync;
function isNpmPkg(name) {
    if (/^(\.|\/)/.test(name)) {
        return false;
    }
    return true;
}
exports.isNpmPkg = isNpmPkg;
function isAliasPath(name, pathAlias = {}) {
    const prefixs = Object.keys(pathAlias);
    if (prefixs.length === 0) {
        return false;
    }
    return prefixs.includes(name) || (new RegExp(`^(${prefixs.join('|')})/`).test(name));
}
exports.isAliasPath = isAliasPath;
function replaceAliasPath(filePath, name, pathAlias = {}) {
    // 后续的 path.join 在遇到符号链接时将会解析为真实路径，如果
    // 这里的 filePath 没有做同样的处理，可能会导致 import 指向
    // 源代码文件，导致文件被意外修改
    filePath = fs.realpathSync(filePath);
    const prefixs = Object.keys(pathAlias);
    if (prefixs.includes(name)) {
        return promoteRelativePath(path.relative(filePath, fs.realpathSync(resolveScriptPath(pathAlias[name]))));
    }
    const reg = new RegExp(`^(${prefixs.join('|')})/(.*)`);
    name = name.replace(reg, function (m, $1, $2) {
        return promoteRelativePath(path.relative(filePath, path.join(pathAlias[$1], $2)));
    });
    return name;
}
exports.replaceAliasPath = replaceAliasPath;
function promoteRelativePath(fPath) {
    const fPathArr = fPath.split(path.sep);
    let dotCount = 0;
    fPathArr.forEach(item => {
        if (item.indexOf('..') >= 0) {
            dotCount++;
        }
    });
    if (dotCount === 1) {
        fPathArr.splice(0, 1, '.');
        return fPathArr.join('/');
    }
    if (dotCount > 1) {
        fPathArr.splice(0, 1);
        return fPathArr.join('/');
    }
    return fPath.replace(/\\/g, '/');
}
exports.promoteRelativePath = promoteRelativePath;
exports.homedir = os.homedir;
function getRootPath() {
    return path.resolve(__dirname, '../../');
}
exports.getRootPath = getRootPath;
function getTaroPath() {
    const taroPath = path.join(exports.homedir(), constants_1.TARO_CONFIG_FLODER);
    if (!fs.existsSync(taroPath)) {
        fs.ensureDirSync(taroPath);
    }
    return taroPath;
}
exports.getTaroPath = getTaroPath;
function getConfig() {
    const configPath = path.join(getTaroPath(), 'config.json');
    if (fs.existsSync(configPath)) {
        return require(configPath);
    }
    return {};
}
exports.getConfig = getConfig;
function getSystemUsername() {
    const userHome = exports.homedir();
    const systemUsername = process.env.USER || path.basename(userHome);
    return systemUsername;
}
exports.getSystemUsername = getSystemUsername;
function getPkgVersion() {
    return require(path.join(getRootPath(), 'package.json')).version;
}
exports.getPkgVersion = getPkgVersion;
function getPkgItemByKey(key) {
    const packageMap = require(path.join(getRootPath(), 'package.json'));
    if (Object.keys(packageMap).indexOf(key) === -1) {
        return {};
    }
    else {
        return packageMap[key];
    }
}
exports.getPkgItemByKey = getPkgItemByKey;
function printPkgVersion() {
    const taroVersion = getPkgVersion();
    console.log(`👽 Taro v${taroVersion}`);
    console.log();
}
exports.printPkgVersion = printPkgVersion;
function shouldUseYarn() {
    try {
        execSync('yarn --version', { stdio: 'ignore' });
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.shouldUseYarn = shouldUseYarn;
function shouldUseCnpm() {
    try {
        execSync('cnpm --version', { stdio: 'ignore' });
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.shouldUseCnpm = shouldUseCnpm;
function isEmptyObject(obj) {
    if (obj == null) {
        return true;
    }
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}
exports.isEmptyObject = isEmptyObject;
function resolveScriptPath(p) {
    const realPath = p;
    const taroEnv = process.env.TARO_ENV;
    const SCRIPT_EXT = constants_1.JS_EXT.concat(constants_1.TS_EXT);
    for (let i = 0; i < SCRIPT_EXT.length; i++) {
        const item = SCRIPT_EXT[i];
        if (taroEnv) {
            if (fs.existsSync(`${p}.${taroEnv}${item}`)) {
                return `${p}.${taroEnv}${item}`;
            }
            if (fs.existsSync(`${p}${path.sep}index.${taroEnv}${item}`)) {
                return `${p}${path.sep}index.${taroEnv}${item}`;
            }
            if (fs.existsSync(`${p.replace(/\/index$/, `.${taroEnv}/index`)}${item}`)) {
                return `${p.replace(/\/index$/, `.${taroEnv}/index`)}${item}`;
            }
        }
        if (fs.existsSync(`${p}${item}`)) {
            return `${p}${item}`;
        }
        if (fs.existsSync(`${p}${path.sep}index${item}`)) {
            return `${p}${path.sep}index${item}`;
        }
    }
    return realPath;
}
exports.resolveScriptPath = resolveScriptPath;
function resolveStylePath(p) {
    const realPath = p;
    const removeExtPath = p.replace(path.extname(p), '');
    const taroEnv = process.env.TARO_ENV;
    for (let i = 0; i < constants_1.CSS_EXT.length; i++) {
        const item = constants_1.CSS_EXT[i];
        if (taroEnv) {
            if (fs.existsSync(`${removeExtPath}.${taroEnv}${item}`)) {
                return `${removeExtPath}.${taroEnv}${item}`;
            }
        }
        if (fs.existsSync(`${p}${item}`)) {
            return `${p}${item}`;
        }
    }
    return realPath;
}
exports.resolveStylePath = resolveStylePath;
function printLog(type, tag, filePath) {
    const typeShow = constants_1.processTypeMap[type];
    const tagLen = tag.replace(/[\u0391-\uFFE5]/g, 'aa').length;
    const tagFormatLen = 8;
    if (tagLen < tagFormatLen) {
        const rightPadding = new Array(tagFormatLen - tagLen + 1).join(' ');
        tag += rightPadding;
    }
    const padding = '';
    filePath = filePath || '';
    if (typeof typeShow.color === 'string') {
        console.log(chalk_1.default[typeShow.color](typeShow.name), padding, tag, padding, filePath);
    }
    else {
        console.log(typeShow.color(typeShow.name), padding, tag, padding, filePath);
    }
}
exports.printLog = printLog;
function generateEnvList(env) {
    const res = {};
    if (env && !isEmptyObject(env)) {
        for (const key in env) {
            try {
                res[`process.env.${key}`] = JSON.parse(env[key]);
            }
            catch (err) {
                res[`process.env.${key}`] = env[key];
            }
        }
    }
    return res;
}
exports.generateEnvList = generateEnvList;
function generateConstantsList(constants) {
    const res = {};
    if (constants && !isEmptyObject(constants)) {
        for (const key in constants) {
            if (lodash_1.isPlainObject(constants[key])) {
                res[key] = generateConstantsList(constants[key]);
            }
            else {
                try {
                    res[key] = JSON.parse(constants[key]);
                }
                catch (err) {
                    res[key] = constants[key];
                }
            }
        }
    }
    return res;
}
exports.generateConstantsList = generateConstantsList;
function cssImports(content) {
    let match;
    const results = [];
    content = String(content).replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '');
    while ((match = constants_1.CSS_IMPORT_REG.exec(content))) {
        results.push(match[2]);
    }
    return results;
}
exports.cssImports = cssImports;
function processStyleImports(content, adapter, processFn) {
    const style = [];
    const imports = [];
    const styleReg = new RegExp(`\\${constants_1.MINI_APP_FILES[adapter].STYLE}`);
    content = content.replace(constants_1.CSS_IMPORT_REG, (m, $1, $2) => {
        if (styleReg.test($2)) {
            style.push(m);
            imports.push($2);
            if (processFn) {
                return processFn(m, $2);
            }
            return '';
        }
        if (processFn) {
            return processFn(m, $2);
        }
        return m;
    });
    return {
        content,
        style,
        imports
    };
}
exports.processStyleImports = processStyleImports;
/*eslint-disable*/
const retries = (process.platform === 'win32') ? 100 : 1;
function emptyDirectory(dirPath, opts = { excludes: [] }) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(file => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                let removed = false;
                let i = 0; // retry counter
                do {
                    try {
                        if (!opts.excludes.length || !opts.excludes.some(item => curPath.indexOf(item) >= 0)) {
                            emptyDirectory(curPath);
                            fs.rmdirSync(curPath);
                        }
                        removed = true;
                    }
                    catch (e) {
                    }
                    finally {
                        if (++i < retries) {
                            continue;
                        }
                    }
                } while (!removed);
            }
            else {
                fs.unlinkSync(curPath);
            }
        });
    }
}
exports.emptyDirectory = emptyDirectory;
/* eslint-enable */
function recursiveFindNodeModules(filePath) {
    const dirname = path.dirname(filePath);
    const workspaceRoot = findWorkspaceRoot(dirname);
    const nodeModules = path.join(workspaceRoot || dirname, 'node_modules');
    if (fs.existsSync(nodeModules)) {
        return nodeModules;
    }
    if (dirname.split(path.sep).length <= 1) {
        printLog("error" /* ERROR */, `在${dirname}目录下`, `未找到node_modules文件夹，请先安装相关依赖库！`);
        return nodeModules;
    }
    return recursiveFindNodeModules(dirname);
}
exports.recursiveFindNodeModules = recursiveFindNodeModules;
exports.pascalCase = (str) => str.charAt(0).toUpperCase() + lodash_1.camelCase(str.substr(1));
function getInstalledNpmPkgPath(pkgName, basedir) {
    const resolvePath = require('resolve');
    try {
        return resolvePath.sync(`${pkgName}/package.json`, { basedir });
    }
    catch (err) {
        return null;
    }
}
exports.getInstalledNpmPkgPath = getInstalledNpmPkgPath;
function checkCliAndFrameworkVersion(appPath, buildAdapter) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkgVersion = getPkgVersion();
        const frameworkName = `@tarojs/taro-${buildAdapter}`;
        const nodeModulesPath = recursiveFindNodeModules(path.join(appPath, constants_1.NODE_MODULES));
        const frameworkVersion = getInstalledNpmPkgVersion(frameworkName, nodeModulesPath);
        if (frameworkVersion) {
            if (frameworkVersion !== pkgVersion) {
                const taroCliPath = path.join(getRootPath(), 'package.json');
                const frameworkPath = path.join(nodeModulesPath, frameworkName, 'package.json');
                printLog("error" /* ERROR */, '版本问题', `Taro CLI 与本地安装运行时框架 ${frameworkName} 版本不一致, 请确保版本一致！`);
                printLog("remind" /* REMIND */, '升级命令', `升级到最新CLI：taro update self   升级到最新依赖库：taro update project`);
                printLog("remind" /* REMIND */, '升级文档', `请参考 "常用 CLI 命令"中"更新" 章节：https://taro-docs.jd.com/taro/docs/GETTING-STARTED.html`);
                console.log(``);
                console.log(`Taro CLI：${getPkgVersion()}             路径：${taroCliPath}`);
                console.log(`${frameworkName}：${frameworkVersion}   路径：${frameworkPath}`);
                console.log(``);
                process.exit(1);
            }
        }
        else {
            printLog("warning" /* WARNING */, '依赖安装', chalk_1.default.red(`项目依赖 ${frameworkName} 未安装，或安装有误，请重新安装此依赖！`));
            process.exit(1);
        }
    });
}
exports.checkCliAndFrameworkVersion = checkCliAndFrameworkVersion;
function getInstalledNpmPkgVersion(pkgName, basedir) {
    const pkgPath = getInstalledNpmPkgPath(pkgName, basedir);
    if (!pkgPath) {
        return null;
    }
    return fs.readJSONSync(pkgPath).version;
}
exports.getInstalledNpmPkgVersion = getInstalledNpmPkgVersion;
function isQuickappPkg(name, quickappPkgs = []) {
    const isQuickappPkg = /^@(system|service)\.[a-zA-Z]{1,}/.test(name);
    let hasSetInManifest = false;
    quickappPkgs.forEach(item => {
        if (item.name === name.replace(/^@/, '')) {
            hasSetInManifest = true;
        }
    });
    if (isQuickappPkg && !hasSetInManifest) {
        printLog("error" /* ERROR */, '快应用', `需要在 ${chalk_1.default.bold('project.quickapp.json')} 文件的 ${chalk_1.default.bold('features')} 配置中添加 ${chalk_1.default.bold(name)}`);
    }
    return isQuickappPkg;
}
exports.isQuickappPkg = isQuickappPkg;
exports.recursiveMerge = (src, ...args) => {
    return lodash_1.mergeWith(src, ...args, (value, srcValue, key, obj, source) => {
        const typeValue = typeof value;
        const typeSrcValue = typeof srcValue;
        if (typeValue !== typeSrcValue)
            return;
        if (Array.isArray(value) && Array.isArray(srcValue)) {
            return value.concat(srcValue);
        }
        if (typeValue === 'object') {
            return exports.recursiveMerge(value, srcValue);
        }
    });
};
exports.mergeVisitors = (src, ...args) => {
    const validFuncs = ['exit', 'enter'];
    return lodash_1.mergeWith(src, ...args, (value, srcValue, key, object, srcObject) => {
        if (!object.hasOwnProperty(key) || !srcObject.hasOwnProperty(key)) {
            return undefined;
        }
        const shouldMergeToArray = validFuncs.indexOf(key) > -1;
        if (shouldMergeToArray) {
            return lodash_1.flatMap([value, srcValue]);
        }
        const [newValue, newSrcValue] = [value, srcValue].map(v => {
            if (typeof v === 'function') {
                return {
                    enter: v
                };
            }
            else {
                return v;
            }
        });
        return exports.mergeVisitors(newValue, newSrcValue);
    });
};
exports.applyArrayedVisitors = obj => {
    let key;
    for (key in obj) {
        const funcs = obj[key];
        if (Array.isArray(funcs)) {
            obj[key] = (astPath, ...args) => {
                funcs.forEach(func => {
                    func(astPath, ...args);
                });
            };
        }
        else if (typeof funcs === 'object') {
            exports.applyArrayedVisitors(funcs);
        }
    }
    return obj;
};
function unzip(zipPath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err)
                throw err;
            zipfile.on('close', () => {
                fs.removeSync(zipPath);
                resolve();
            });
            zipfile.readEntry();
            zipfile.on('error', (err) => {
                reject(err);
            });
            zipfile.on('entry', entry => {
                if (/\/$/.test(entry.fileName)) {
                    const fileNameArr = entry.fileName.replace(/\\/g, '/').split('/');
                    fileNameArr.shift();
                    const fileName = fileNameArr.join('/');
                    fs.ensureDirSync(path.join(path.dirname(zipPath), fileName));
                    zipfile.readEntry();
                }
                else {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err)
                            throw err;
                        const filter = new stream_1.Transform();
                        filter._transform = function (chunk, encoding, cb) {
                            cb(undefined, chunk);
                        };
                        filter._flush = function (cb) {
                            cb();
                            zipfile.readEntry();
                        };
                        const fileNameArr = entry.fileName.replace(/\\/g, '/').split('/');
                        fileNameArr.shift();
                        const fileName = fileNameArr.join('/');
                        const writeStream = fs.createWriteStream(path.join(path.dirname(zipPath), fileName));
                        writeStream.on('close', () => { });
                        readStream
                            .pipe(filter)
                            .pipe(writeStream);
                    });
                }
            });
        });
    });
}
exports.unzip = unzip;
let babelConfig;
function getBabelConfig(babel) {
    if (!babelConfig) {
        babelConfig = lodash_1.mergeWith({}, babel_1.default, babel, (objValue, srcValue) => {
            if (Array.isArray(objValue)) {
                return Array.from(new Set(srcValue.concat(objValue)));
            }
        });
    }
    return babelConfig;
}
exports.getBabelConfig = getBabelConfig;
exports.getAllFilesInFloder = (floder, filter = []) => __awaiter(this, void 0, void 0, function* () {
    let files = [];
    const list = readDirWithFileTypes(floder);
    yield Promise.all(list.map((item) => __awaiter(this, void 0, void 0, function* () {
        const itemPath = path.join(floder, item.name);
        if (item.isDirectory) {
            const _files = yield exports.getAllFilesInFloder(itemPath, filter);
            files = [...files, ..._files];
        }
        else if (item.isFile) {
            if (!filter.find(rule => rule === item.name))
                files.push(itemPath);
        }
    })));
    return files;
});
function getUserHomeDir() {
    function homedir() {
        const env = process.env;
        const home = env.HOME;
        const user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;
        if (process.platform === 'win32') {
            return env.USERPROFILE || '' + env.HOMEDRIVE + env.HOMEPATH || home || '';
        }
        if (process.platform === 'darwin') {
            return home || (user ? '/Users/' + user : '');
        }
        if (process.platform === 'linux') {
            return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : ''));
        }
        return home || '';
    }
    return typeof os.homedir === 'function' ? os.homedir() : homedir();
}
exports.getUserHomeDir = getUserHomeDir;
function getTemplateSourceType(url) {
    if (/^github:/.test(url) || /^gitlab:/.test(url) || /^direct:/.test(url)) {
        return 'git';
    }
    else {
        return 'url';
    }
}
exports.getTemplateSourceType = getTemplateSourceType;
function readDirWithFileTypes(floder) {
    const list = fs.readdirSync(floder);
    const res = list.map(name => {
        const stat = fs.statSync(path.join(floder, name));
        return {
            name,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile()
        };
    });
    return res;
}
exports.readDirWithFileTypes = readDirWithFileTypes;
function extnameExpRegOf(filePath) {
    return new RegExp(`${path.extname(filePath)}$`);
}
exports.extnameExpRegOf = extnameExpRegOf;
function generateAlipayPath(filePath) {
    return filePath.replace(/@/g, '_');
}
exports.generateAlipayPath = generateAlipayPath;
function printVersionTip() {
    const taroPath = getTaroPath();
    let remindVersion = { remindTimes: 0 };
    const remindVersionFilePath = path.join(taroPath, '.remind_version.json');
    if (!fs.existsSync(remindVersionFilePath)) {
        fs.ensureDirSync(taroPath);
        fs.writeFileSync(remindVersionFilePath, JSON.stringify(remindVersion));
    }
    else {
        remindVersion = fs.readJSONSync(remindVersionFilePath);
    }
    if (remindVersion.remindTimes < 5) {
        console.log(chalk_1.default.red('当前您正在使用 Taro 2.0 版本，请先执行 taro doctor 确保编译配置正确'));
        console.log(chalk_1.default.red('如出现令你束手无策的问题，请使用 taro update 命令更新到你指定的稳定版本'));
        remindVersion.remindTimes++;
        fs.writeFileSync(remindVersionFilePath, JSON.stringify(remindVersion));
    }
}
exports.printVersionTip = printVersionTip;
