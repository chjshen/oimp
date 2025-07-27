const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");
const chalk = require("chalk");
const { checkFileExists, updateChecklistStatus } = require("../utils");

function checkStatusForGenerate(status) {
  const required = ['problem', 'std', 'generator', 'validator'];
  for (const k of required) {
    if (!status[k] || status[k].status !== 'done') {
      throw new Error(`请先完成 ${status[k] ? status[k].desc : k}`);
    }
  }
}

function getFileMTime(file) {
  return fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
}

function updateNeedRedoStatus(problemDir, status) {
  const srcDir = path.join(problemDir, 'src');
  const files = ['generator.cpp', 'validator.cpp', 'std.cpp'].map(f => path.join(srcDir, f));
  const mtimePath = path.join(problemDir, '.snapshots', 'file-mtime.json');
  if (!fs.existsSync(path.dirname(mtimePath))) {
    fs.mkdirSync(path.dirname(mtimePath), { recursive: true });
  }
  let lastMtime = {};
  if (fs.existsSync(mtimePath)) {
    lastMtime = JSON.parse(fs.readFileSync(mtimePath, 'utf-8'));
  }
  let changed = false;
  for (const file of files) {
    const key = path.basename(file);
    const mtime = getFileMTime(file);
    if (lastMtime[key] && lastMtime[key] !== mtime) changed = true;
    lastMtime[key] = mtime;
  }
  if (changed) {
    status.data = { desc: '测评数据', status: 'need-redo' };
    status.check = { desc: '完整性检查', status: 'need-redo' };
    status.package = { desc: '打包', status: 'need-redo' };
  }
  fs.writeFileSync(mtimePath, JSON.stringify(lastMtime, null, 2));
}

module.exports = async function generateCommand(problemName, options) {
  const problemDir = path.join(process.cwd(), problemName);
  const testDataDir = path.join(problemDir, "testdata");
  const srcDir = path.join(problemDir, "src");

  // 检查目录是否存在
  if (!checkFileExists(problemDir)) {
    console.error(
      chalk.red(`Problem directory ${problemName} does not exist.`)
    );
    console.log(chalk.cyan(`请先用 oimp init ${problemName} 初始化题目目录`));
    process.exit(1);
  }

  if (!checkFileExists(testDataDir)) {
    console.error(chalk.red(`testdata directory not found in ${problemName}`));
    console.log(chalk.cyan(`请先用 oimp init ${problemName} 初始化题目目录`));
    process.exit(1);
  }

  // 强制流程校验
  const statusPath = path.join(problemDir, 'status.json');
  if (!fs.existsSync(statusPath)) {
    console.error(chalk.red('未找到 status.json，请先初始化题目。'));
    console.log(chalk.cyan(`请先用 oimp init ${problemName} 初始化题目目录`));
    process.exit(1);
  }
  // 统一推进 checklist 状态
  const status = await updateChecklistStatus(problemDir);
  if (!status.testsample || status.testsample.status !== 'done') {
    console.error(chalk.red('请先通过样例检测（oimp testsample ' + problemName + '）'));
    console.log(chalk.cyan(`建议命令：oimp testsample ${problemName}`));
    process.exit(1);
  }
  updateNeedRedoStatus(problemDir, status);
  try {
    checkStatusForGenerate(status);
  } catch (e) {
    console.error(chalk.red(e.message));
    console.log(chalk.cyan(`建议命令：oimp edit ${problemName}、oimp check ${problemName}`));
    process.exit(1);
  }

  // 获取生成数量参数，默认为10
  const count = options.count || 10;
  console.log(
    chalk.blueBright(`\nGenerating ${count} test cases for: ${problemName}`)
  );

  // 1. 检查必要组件
  const requiredComponents = {
    generator: path.join(srcDir, "generator.cpp"),
    validator: path.join(srcDir, "validator.cpp"),
    std: path.join(srcDir, "std.cpp"),
  };

  // 编译必要组件
  console.log(chalk.yellow("\n[1/4] Compiling components..."));
  try {
    for (const [name, file] of Object.entries(requiredComponents)) {
      if (!checkFileExists(file)) {
        throw new Error(`${name}.cpp not found`);
      }
      const output = path.join(srcDir, name);
      execSync(`g++ -O2 -std=c++14 -o ${output} ${file}`);
      console.log(chalk.green(`✓ ${name}.cpp compiled`));
    }
  } catch (err) {
    console.error(chalk.red(`× Compilation failed: ${err.message}`));
    process.exit(1);
  }

  // 2. 执行数据生成和验证
  console.log(chalk.yellow(`\n[2/4] Generating ${count} test cases...`));
  try {
    // 创建临时目录
    const tempDir = path.join(problemDir, "temp");
    fs.mkdirSync(tempDir, { recursive: true });

    // 生成测试数据
    for (let i = 1; i <= count; i++) {
      const index = i < 10 ? "0" + i : i;
      const inputFile = path.join(testDataDir, `${index}.in`);
      const outputFile = path.join(testDataDir, `${index}.ans`);

      // 生成输入数据
      execSync(`${path.join(srcDir, "generator")} ${index} > ${inputFile}`);

      // 验证输入数据
      const validation = execSync(
        `${path.join(srcDir, "validator")} < ${inputFile}`,
        { stdio: "pipe" }
      );

      if (validation.toString().trim() !== "") {
        throw new Error(
          `Validation failed for test case ${index}: ${validation}`
        );
      }

      // 生成输出数据
      execSync(`${path.join(srcDir, "std")} < ${inputFile} > ${outputFile}`);

      console.log(chalk.green(`✓ Generated case ${index}`));
    }

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true });
    // 生成成功后自动更新 status.json
    status.data = { desc: '测评数据', status: 'done' };
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  } catch (err) {
    console.error(chalk.red(`× Test data generation failed: ${err.message}`));
    process.exit(1);
  }

  // 3. 检查生成结果
  console.log(chalk.yellow("\n[3/4] Verifying test data..."));
  const testFiles = fs
    .readdirSync(testDataDir)
    .filter((f) => f.endsWith(".in") || f.endsWith(".ans"));

  if (testFiles.length === 0) {
    console.error(chalk.red("× No test data files generated"));
    process.exit(1);
  }

  console.log(chalk.yellow(`\nGenerated ${testFiles.length / 2} test files:`));
  for (let i = 1; i <= count; i++) {
    const index = i < 10 ? "0" + i : i;
    console.log(chalk.blueBright(`- ${index}.in / ${index}.ans`));
  }

  // 4. 验证所有输入数据
  console.log(chalk.yellow("\n[4/4] Validating all input files..."));
  try {
    const inputFiles = fs
      .readdirSync(testDataDir)
      .filter((f) => f.endsWith(".in"));

    for (const file of inputFiles) {
      const validation = execSync(
        `${path.join(srcDir, "validator")} < ${path.join(testDataDir, file)}`,
        { stdio: "pipe" }
      );

      console.log(chalk.green(`✓ ${file} input files validated successfully`));
      if (validation.toString().trim() !== "") {
        throw new Error(`Validation failed for ${file}: ${validation}`);
      }
    }
    console.log(
      chalk.greenBright.bold("✓ All input files validated successfully")
    );
    console.log(chalk.cyan(`如需检查题目完整性：oimp check ${problemName}，如需打包：oimp package ${problemName}`));
  } catch (err) {
    console.error(chalk.red(`× Validation failed: ${err.message}`));
    process.exit(1);
  }
};
