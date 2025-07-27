const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { updateChecklistStatus } = require("../utils");

function getStatusFile(problemDir) {
  return path.join(problemDir, "status.json");
}

function printChecklist(status, problemName) {
  const order = [
    { key: 'problem', desc: '题面' },
    { key: 'std', desc: '标准程序' },
    { key: 'generator', desc: '数据生成器' },
    { key: 'validator', desc: '数据验证器' },
    { key: 'testsample', desc: '样例检测' },
    { key: 'data', desc: '测评数据' },
    { key: 'check', desc: '完整性检查' },
    { key: 'package', desc: '打包' }
  ];
  let anyNeedRedo = false, anyPending = false;
  // 判断所有项都为 done
  let allDone = order.every(({key}) => (status[key] && status[key].status === 'done'));
  // 判断前置流程（不含打包）都为 done
  let canPackage = order.slice(0, -1).every(({key}) => (status[key] && status[key].status === 'done'));
  console.log(chalk.cyan.bold('题目出题流程 Checklist:'));
  order.forEach(({ key, desc }) => {
    const s = status[key] || { status: 'pending' };
    let flag = chalk.redBright('…');
    let tip = chalk.redBright('（未完成）');
    if (s.status === 'done') {
      flag = chalk.green('✓');
      tip = chalk.green('（已完成）');
    } else if (s.status === 'need-redo') {
      flag = chalk.yellow('↺');
      tip = chalk.yellow('（需重做，前置变更）');
      anyNeedRedo = true;
      allDone = false;
    } else if (s.status === 'pending') {
      flag = chalk.redBright('…');
      tip = chalk.redBright('（未完成）');
      anyPending = true;
      allDone = false;
    }
    console.log(`  ${flag} ${desc}${tip}`);
  });
  if (allDone) {
    console.log(chalk.greenBright('\n全部流程已完成！'));
    console.log(chalk.cyan(`如需重新打包：oimp package ${problemName}`));
  } else if (canPackage) {
    console.log(chalk.greenBright('\n前置流程已完成，可以安全打包！'));
    console.log(chalk.cyan(`下一步：oimp package ${problemName}`));
  } else if (status.testsample && status.testsample.status !== 'done') {
    console.log(chalk.yellowBright('\n样例检测未通过，请先完成样例检测！'));
    console.log(chalk.cyan(`建议命令：oimp testsample ${problemName}`));
  } else if (anyNeedRedo) {
    console.log(chalk.yellowBright('\n有步骤需重做，请先修正后再继续后续流程！'));
    console.log(chalk.cyan(`建议命令：oimp edit ${problemName}、oimp gendata ${problemName}、oimp check ${problemName}、oimp package ${problemName}`));
  } else if (anyPending) {
    console.log(chalk.redBright('\n有步骤未完成，请按顺序补全后再继续后续流程！'));
    console.log(chalk.cyan(`建议命令：oimp edit ${problemName}、oimp gendata ${problemName}、oimp check ${problemName}`));
  }
}

module.exports = async function checklistCommand(problemName) {
  const problemDir = path.join(process.cwd(), problemName);
  const statusPath = getStatusFile(problemDir);
  if (!fs.existsSync(statusPath)) {
    console.error(chalk.red(`未找到 ${statusPath}，请先初始化题目。`));
    process.exit(1);
  }
  const status = await updateChecklistStatus(problemDir);
  // 检查文件变更，回退依赖项
  const checkJs = require("./check.js");
  if (typeof checkJs.updateNeedRedoStatus === "function") {
    checkJs.updateNeedRedoStatus(problemDir, status);
  }
  printChecklist(status, problemName);
};