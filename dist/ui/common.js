"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const t = require("babel-types");
const glob = require("glob");
const babel_traverse_1 = require("babel-traverse");
const babel_generator_1 = require("babel-generator");
const wxTransformer = require("@tarojs/transformer-wx");
const util_1 = require("../util");
const constants_1 = require("../util/constants");
let processedScriptFiles = new Set();
exports.WEAPP_OUTPUT_NAME = 'weapp';
exports.QUICKAPP_OUTPUT_NAME = 'quickappp';
exports.H5_OUTPUT_NAME = 'h5';
exports.RN_OUTPUT_NAME = 'rn';
exports.TEMP_DIR = '.temp';
exports.RN_TEMP_DIR = 'rn_temp';
function parseAst(ast, sourceFilePath) {
    const styleFiles = [];
    const scriptFiles = [];
    const jsonFiles = [];
    const mediaFiles = [];
    babel_traverse_1.default(ast, {
        Program: {
            exit(astPath) {
                astPath.traverse({
                    ImportDeclaration(astPath) {
                        const node = astPath.node;
                        const source = node.source;
                        const value = source.value;
                        const valueExtname = path.extname(value);
                        if (value.indexOf('.') === 0) {
                            let importPath = path.resolve(path.dirname(sourceFilePath), value);
                            importPath = util_1.resolveScriptPath(importPath);
                            if (constants_1.REG_SCRIPT.test(valueExtname) || constants_1.REG_TYPESCRIPT.test(valueExtname)) {
                                const vpath = path.resolve(sourceFilePath, '..', value);
                                let fPath = value;
                                if (fs.existsSync(vpath) && vpath !== sourceFilePath) {
                                    fPath = vpath;
                                }
                                if (scriptFiles.indexOf(fPath) < 0) {
                                    scriptFiles.push(fPath);
                                }
                            }
                            else if (constants_1.REG_JSON.test(valueExtname)) {
                                const vpath = path.resolve(sourceFilePath, '..', value);
                                if (fs.existsSync(vpath) && jsonFiles.indexOf(vpath) < 0) {
                                    jsonFiles.push(vpath);
                                }
                            }
                            else if (constants_1.REG_FONT.test(valueExtname) || constants_1.REG_IMAGE.test(valueExtname) || constants_1.REG_MEDIA.test(valueExtname)) {
                                const vpath = path.resolve(sourceFilePath, '..', value);
                                if (fs.existsSync(vpath) && mediaFiles.indexOf(vpath) < 0) {
                                    mediaFiles.push(vpath);
                                }
                            }
                            else if (constants_1.REG_STYLE.test(valueExtname)) {
                                const vpath = path.resolve(path.dirname(sourceFilePath), value);
                                if (fs.existsSync(vpath) && styleFiles.indexOf(vpath) < 0) {
                                    styleFiles.push(vpath);
                                }
                            }
                            else {
                                const vpath = util_1.resolveScriptPath(path.resolve(sourceFilePath, '..', value));
                                if (fs.existsSync(vpath) && scriptFiles.indexOf(vpath) < 0) {
                                    scriptFiles.push(vpath);
                                }
                            }
                        }
                    }
                });
            }
        }
    });
    return {
        styleFiles,
        scriptFiles,
        jsonFiles,
        mediaFiles
    };
}
function parseEntryAst(ast, relativeFile) {
    const styleFiles = [];
    const components = [];
    const importExportName = [];
    let exportDefaultName = null;
    babel_traverse_1.default(ast, {
        ExportNamedDeclaration(astPath) {
            const node = astPath.node;
            const specifiers = node.specifiers;
            const source = node.source;
            if (source && source.type === 'StringLiteral') {
                specifiers.forEach(specifier => {
                    const exported = specifier.exported;
                    components.push({
                        name: exported.name,
                        path: util_1.resolveScriptPath(path.resolve(path.dirname(relativeFile), source.value))
                    });
                });
            }
            else {
                specifiers.forEach(specifier => {
                    const exported = specifier.exported;
                    importExportName.push(exported.name);
                });
            }
        },
        ExportDefaultDeclaration(astPath) {
            const node = astPath.node;
            const declaration = node.declaration;
            if (t.isIdentifier(declaration)) {
                exportDefaultName = declaration.name;
            }
        },
        Program: {
            exit(astPath) {
                astPath.traverse({
                    ImportDeclaration(astPath) {
                        const node = astPath.node;
                        const specifiers = node.specifiers;
                        const source = node.source;
                        const value = source.value;
                        const valueExtname = path.extname(value);
                        if (constants_1.REG_STYLE.test(valueExtname)) {
                            const stylePath = path.resolve(path.dirname(relativeFile), value);
                            if (styleFiles.indexOf(stylePath) < 0) {
                                styleFiles.push(stylePath);
                            }
                            astPath.remove();
                        }
                        else {
                            if (importExportName.length) {
                                importExportName.forEach(nameItem => {
                                    specifiers.forEach(specifier => {
                                        const local = specifier.local;
                                        if (local.name === nameItem) {
                                            components.push({
                                                name: local.name,
                                                path: util_1.resolveScriptPath(path.resolve(path.dirname(relativeFile), source.value))
                                            });
                                        }
                                    });
                                });
                            }
                            if (exportDefaultName != null) {
                                specifiers.forEach(specifier => {
                                    const local = specifier.local;
                                    if (local.name === exportDefaultName) {
                                        components.push({
                                            name: local.name,
                                            path: util_1.resolveScriptPath(path.resolve(path.dirname(relativeFile), source.value))
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
        }
    });
    const code = babel_generator_1.default(ast).code;
    return {
        code,
        styleFiles,
        components
    };
}
exports.parseEntryAst = parseEntryAst;
function isFileToBeCSSModulesMap(filePath) {
    let isMap = false;
    constants_1.CSS_EXT.forEach(item => {
        const reg = new RegExp(`${item}.map.js$`, 'g');
        if (reg.test(filePath)) {
            isMap = true;
        }
    });
    return isMap;
}
exports.isFileToBeCSSModulesMap = isFileToBeCSSModulesMap;
function copyFileToDist(filePath, sourceDir, outputDir, buildData) {
    if ((!filePath && !path.isAbsolute(filePath)) || isFileToBeCSSModulesMap(filePath)) {
        return;
    }
    const { appPath } = buildData;
    const dirname = path.dirname(filePath);
    const distDirname = dirname.replace(sourceDir, outputDir);
    const relativePath = path.relative(appPath, filePath);
    util_1.printLog("copy" /* COPY */, '发现文件', relativePath);
    fs.ensureDirSync(distDirname);
    fs.copyFileSync(filePath, path.format({
        dir: distDirname,
        base: path.basename(filePath)
    }));
}
exports.copyFileToDist = copyFileToDist;
function _analyzeFiles(files, sourceDir, outputDir, buildData) {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            if (processedScriptFiles.has(file)) {
                return;
            }
            processedScriptFiles.add(file);
            const code = fs.readFileSync(file).toString();
            const transformResult = wxTransformer({
                code,
                sourcePath: file,
                outputPath: file,
                isNormal: true,
                isTyped: constants_1.REG_TYPESCRIPT.test(file)
            });
            const { styleFiles, scriptFiles, jsonFiles, mediaFiles } = parseAst(transformResult.ast, file);
            const resFiles = styleFiles.concat(scriptFiles, jsonFiles, mediaFiles);
            if (resFiles.length) {
                resFiles.forEach(item => {
                    copyFileToDist(item, sourceDir, outputDir, buildData);
                });
            }
            if (scriptFiles.length) {
                _analyzeFiles(scriptFiles, sourceDir, outputDir, buildData);
            }
            if (styleFiles.length) {
                analyzeStyleFilesImport(styleFiles, sourceDir, outputDir, buildData);
            }
        }
    });
}
function analyzeFiles(files, sourceDir, outputDir, buildData) {
    _analyzeFiles(files, sourceDir, outputDir, buildData);
    processedScriptFiles = new Set();
}
exports.analyzeFiles = analyzeFiles;
function analyzeStyleFilesImport(styleFiles, sourceDir, outputDir, buildData) {
    styleFiles.forEach(item => {
        if (!fs.existsSync(item)) {
            return;
        }
        let content = fs.readFileSync(item).toString();
        content = content.replace(/(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)/g, (m, $1) => {
            if ($1) {
                let filePath = $1.replace(/'?"?/g, '');
                if (filePath.indexOf('.') === 0) {
                    filePath = path.resolve(path.dirname(item), filePath);
                    copyFileToDist(filePath, sourceDir, outputDir, buildData);
                }
            }
            return m;
        });
        let imports = util_1.cssImports(content);
        if (imports.length > 0) {
            imports = imports.map(importItem => {
                if (util_1.isNpmPkg(importItem)) {
                    return '';
                }
                const filePath = util_1.resolveStylePath(path.resolve(path.dirname(item), importItem));
                copyFileToDist(filePath, sourceDir, outputDir, buildData);
                return filePath;
            }).filter(item => item);
            analyzeStyleFilesImport(imports, sourceDir, outputDir, buildData);
        }
    });
}
exports.analyzeStyleFilesImport = analyzeStyleFilesImport;
function copyAllInterfaceFiles(sourceDir, outputDir, buildData) {
    const interfaceFiles = glob.sync(path.join(sourceDir, '**/*.d.ts'));
    if (interfaceFiles && interfaceFiles.length) {
        interfaceFiles.forEach(item => {
            copyFileToDist(item, sourceDir, outputDir, buildData);
        });
    }
}
exports.copyAllInterfaceFiles = copyAllInterfaceFiles;
