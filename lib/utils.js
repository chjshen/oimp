const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { mkdirp } = require("mkdirp");
const { rimraf } = require("rimraf");
const chalk = require("chalk");

// 获取模板内容
function getTemplate(templateName) {
  return fs.readFileSync(
    path.join(__dirname, "templates", templateName),
    "utf-8"
  );
}

// 写入文件，如果目录不存在则创建
function writeFileWithDir(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir);
  }
  fs.writeFileSync(filePath, content);
}

// 读取 YAML 文件
function readYaml(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(
      chalk.red(`Error reading YAML file ${filePath}: ${e.message}`)
    );
    return null;
  }
}

// 写入 YAML 文件
function writeYaml(filePath, data) {
  writeFileWithDir(filePath, yaml.dump(data));
}

// 检查文件是否存在
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  getTemplate,
  writeFileWithDir,
  readYaml,
  writeYaml,
  checkFileExists,
};
