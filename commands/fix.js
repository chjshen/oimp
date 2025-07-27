const path = require('path');
const fs = require('fs');
const { mkdirp } = require('mkdirp');
const chalk = require('chalk');
const { getTemplate, writeFileWithDir, writeYaml } = require('../utils');

module.exports = async function fixCommand(problemName) {
  const problemDir = path.join(process.cwd(), problemName);
  if (!fs.existsSync(problemDir)) {
    console.error(chalk.red(`题目目录 ${problemName} 不存在`));
    process.exit(1);
  }
  // 1. 标准目录
  const dirs = ['testdata', 'src', 'sample', 'solution', 'additional_file', '.snapshots'];
  let dirCreated = false;
  for (const dir of dirs) {
    const dirPath = path.join(problemDir, dir);
    if (!fs.existsSync(dirPath)) {
      await mkdirp(dirPath);
      dirCreated = true;
    }
  }
  if (dirCreated) {
    console.log(chalk.green('已创建缺失的目录'));
  } else {
    console.log(chalk.blue('所有标准目录已存在，跳过'));
  }
  // 2. 标准模板文件
  const templates = {
    'src/std.cpp': 'std.cpp',
    'problem_zh.md': 'problem_zh.md',
    'src/generator.cpp': 'generator.cpp',
    'src/validator.cpp': 'validator.cpp',
    'src/testlib.h': 'testlib.h',
    'solution/stdsol.md': 'solution/stdsol.md',
    'src/checker.cpp': 'checkers/wcmp.cpp',
  };
  let templateCreated = false;
  for (const [filePath, templateName] of Object.entries(templates)) {
    const absPath = path.join(problemDir, filePath);
    if (!fs.existsSync(absPath)) {
      writeFileWithDir(absPath, getTemplate(templateName));
      console.log(chalk.green(`已补全模板文件: ${filePath}`));
      templateCreated = true;
    }
  }
  if (!templateCreated) {
    console.log(chalk.blue('所有模板文件已存在，跳过'));
  }
  // 3. sample 目录和样例文件
  const sampleDir = path.join(problemDir, 'sample');
  if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir);
  const sampleIn = path.join(sampleDir, 'sample01.in');
  const sampleAns = path.join(sampleDir, 'sample01.ans');
  let sampleCreated = false;
  if (!fs.existsSync(sampleIn)) {
    fs.writeFileSync(sampleIn, '');
    sampleCreated = true;
  }
  if (!fs.existsSync(sampleAns)) {
    fs.writeFileSync(sampleAns, '');
    sampleCreated = true;
  }
  if (sampleCreated) {
  console.log(chalk.green('已补全 sample 目录和样例文件'));
  } else {
    console.log(chalk.blue('sample 目录和样例文件已存在，跳过'));
  }
  // 4. testdata/config.yaml
  const testdataDir = path.join(problemDir, 'testdata');
  const configYaml = path.join(testdataDir, 'config.yaml');
  if (!fs.existsSync(configYaml)) {
    writeYaml(configYaml, { memory: 256, time: 1000 });
    console.log(chalk.green('已补全 testdata/config.yaml'));
  } else {
    console.log(chalk.blue('testdata/config.yaml 已存在，跳过'));
  }
  // 5. problem.yaml
  const problemYaml = path.join(problemDir, 'problem.yaml');
  if (!fs.existsSync(problemYaml)) {
    writeYaml(problemYaml, { tag: ['入门'], title: problemName });
    console.log(chalk.green('已补全 problem.yaml'));
  } else {
    console.log(chalk.blue('problem.yaml 已存在，跳过'));
  }
  // 记录关键文件的 mtime
  const snapshotDir = path.join(problemDir, '.snapshots');
  const mtimePath = path.join(snapshotDir, 'file-mtime.json');
  const files = [
    'src/generator.cpp',
    'src/validator.cpp',
    'src/std.cpp',
    'src/checker.cpp'
  ].map(f => path.join(problemDir, f));
  let mtimeInfo = {};
  for (const file of files) {
    if (fs.existsSync(file)) {
      mtimeInfo[path.basename(file)] = fs.statSync(file).mtimeMs;
    }
  }
  fs.writeFileSync(mtimePath, JSON.stringify(mtimeInfo, null, 2));
  console.log(chalk.green('已更新 .snapshots/file-mtime.json'));
  console.log(chalk.greenBright('所有标准目录和文件已补全！'));
} 