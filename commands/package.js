const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const inquirer = require("inquirer");
const { addSnapshotMetadata } = require('./snapshot');
const { updateChecklistStatus } = require('../utils');
const pathLib = require('path');

function getNowStr() {
  const d = new Date();
  return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}${d.getSeconds().toString().padStart(2,'0')}`;
}

async function makeSnapshot(problemDir) {
  const snapshotDir = require('path').join(problemDir, '.snapshots');
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir);
  const now = getNowStr();
  const snapshotName = `${now}.zip`;
  const snapshotPath = require('path').join(snapshotDir, snapshotName);
  const output = fs.createWriteStream(snapshotPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  // 排除 .snapshots 目录自身
  archive.glob('**/*', {
    cwd: problemDir,
    ignore: ['.snapshots/**', '*.zip']
  });
  await archive.finalize();
  return snapshotName;
}

function checkStatusForPackage(status) {
  if (!status.check || status.check.status !== 'done') {
    throw new Error('请先完成完整性检查');
  }
}

function getRecentSnapshotDescs(problemDir) {
  const metaPath = pathLib.join(problemDir, '.snapshots', 'metadata.json');
  if (!fs.existsSync(metaPath)) return [];
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const descs = (meta.snapshots || []).map(s => s.desc).filter(Boolean);
  // 去重，保留最近5条
  return [...new Set(descs)].slice(0, 5);
}

module.exports = async function packageCommand(problemName) {
    const problemDir = path.join(process.cwd(), problemName);
    // 打包前统一推进 checklist 状态
    await updateChecklistStatus(problemDir);
    // 校验样例检测
    const statusPath = require('path').join(problemDir, 'status.json');
    if (require('fs').existsSync(statusPath)) {
      const status = JSON.parse(require('fs').readFileSync(statusPath, 'utf-8'));
      if (!status.testsample || status.testsample.status !== 'done') {
        console.error(require('chalk').red('请先通过样例检测（oimp testsample ' + problemName + '）'));
        console.log(require('chalk').cyan(`建议命令：oimp testsample ${problemName}`));
        process.exit(1);
      }
    }
    // 快照说明交互式选择
    const commonDescs = ['初次生成', '修正generator逻辑', '修正题面', '修正validator逻辑', '修正标准程序', '修正checker', '补充题面说明'];
    const recentDescs = getRecentSnapshotDescs(problemDir);
    const choices = [
      ...recentDescs.map(d => ({ name: d, value: d })),
      ...commonDescs.filter(d => !recentDescs.includes(d)).map(d => ({ name: d, value: d })),
      { name: '自定义输入', value: '__custom__' }
    ];
    let desc = '';
    const { descChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'descChoice',
        message: '请选择本次快照的修改说明（可选）：',
        choices
      }
    ]);
    if (descChoice === '__custom__') {
      const { customDesc } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customDesc',
          message: '请输入自定义快照说明：',
          default: ''
        }
      ]);
      desc = customDesc;
    } else {
      desc = descChoice;
    }
    // package 前自动快照
    const snapshotName = await makeSnapshot(problemDir);
    console.log(chalk.cyan(`已自动快照: .snapshots/${snapshotName}`));
    addSnapshotMetadata(problemDir, snapshotName, desc);
    // 查找当前题目的状态是否为完成
    const statusFile = path.resolve(problemDir, "status.json")
    const problemStatus = JSON.parse(fs.readFileSync(statusFile, { encoding: 'utf-8' }));
    try {
      checkStatusForPackage(problemStatus);
    } catch (e) {
      console.error(chalk.red(e.message));
      console.log(chalk.cyan(`建议命令：oimp check ${problemName}、oimp gendata ${problemName}`));
        process.exit(1);
    }

    //查找导出类型文件夹，获取导出类型
    const typeDir = `${__dirname}/../exporttype`
    const exportTypes = fs
        .readdirSync(typeDir)
        // 修改过滤条件：
        .filter((f) => f.endsWith(".js"))
        //修改映射逻辑：正确移除扩展名
        .map((f) => {
            const ext = path.extname(f); // 获取扩展名 (.cpp 或 .cc)
            const exportType = path.basename(f, ext);
            return { "name": exportType + '格式', "value": exportType }; // 移除扩展名
        });
    // console.log(exportTypes);
    // process.exit(1);
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "selectedExportType",
            message: "请选择导出的包类型：",
            choices: exportTypes,
            default: "hydrooj",
        }]);

    const importType = answers.selectedExportType;
    // console.log(importType)
    // console.log(answers);
    
    
    //  生成HydroOJ包
    if (problemStatus.check && problemStatus.check.status === 'done') {
        console.log(chalk.blueBright.bold(`\n生成${importType}导入包...`));
        try {
            if (importType === "hydrooj") {
                const createPackage = require(path.join(typeDir , importType));
                await createPackage(problemDir, problemName, importType);
                console.log(chalk.green(`✓ 已生成 ${problemName}_${importType}.zip`));
                // 打包成功后自动更新 status.json
                problemStatus.package = { desc: '打包', status: 'done' };
                fs.writeFileSync(statusFile, JSON.stringify(problemStatus, null, 2));
                console.log(chalk.cyan(`如需重新打包：oimp package ${problemName}`));
            }
        } catch (err) {
            console.error(chalk.red("× 打包失败:"), err.message);
            console.log(chalk.cyan(`建议命令：oimp check ${problemName}、oimp edit ${problemName}`));
        }
    } else {
        console.error(chalk.red.bold("\n× 未通过完整性检查，不生成导入包"));
        console.log(chalk.cyan(`建议命令：oimp check ${problemName}、oimp edit ${problemName}`));
        process.exit(1);
    }
};