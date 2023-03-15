"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const util_1 = require("../util");
const constants_1 = require("../util/constants");
const homedir = util_1.getUserHomeDir();
const configPath = path.join(homedir, `${constants_1.TARO_CONFIG_FLODER}/${constants_1.TARO_BASE_CONFIG}`);
function displayConfigPath(configPath) {
    console.log('Config path:', configPath);
    console.log();
}
function get(key) {
    if (!homedir)
        return console.log('找不到用户根目录');
    if (fs.existsSync(configPath)) {
        displayConfigPath(configPath);
        const config = fs.readJSONSync(configPath);
        console.log('Key:', key, ', value:', config[key]);
    }
}
exports.get = get;
function set(key, value) {
    if (!homedir)
        return console.log('找不到用户根目录');
    if (fs.existsSync(configPath)) {
        displayConfigPath(configPath);
        const config = fs.readJSONSync(configPath);
        config[key] = value;
        fs.writeJSONSync(configPath, config);
    }
    else {
        fs.ensureFileSync(configPath);
        fs.writeJSONSync(configPath, {
            [key]: value
        });
    }
    console.log('Set key:', key, ', value:', value);
}
exports.set = set;
function deleteKey(key) {
    if (!homedir)
        return console.log('找不到用户根目录');
    if (fs.existsSync(configPath)) {
        displayConfigPath(configPath);
        const config = fs.readJSONSync(configPath);
        delete config[key];
        fs.writeJSONSync(configPath, config);
    }
    console.log('Deleted:', key);
}
exports.deleteKey = deleteKey;
function list(isJSONFormat = false) {
    if (!homedir)
        return console.log('找不到用户根目录');
    if (fs.existsSync(configPath)) {
        displayConfigPath(configPath);
        console.log('Config info:');
        const config = fs.readJSONSync(configPath);
        if (isJSONFormat) {
            console.log(JSON.stringify(config, null, 2));
        }
        else {
            for (const key in config) {
                console.log(`${key}=${config[key]}`);
            }
        }
    }
}
exports.list = list;
