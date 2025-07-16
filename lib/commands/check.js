const path = require("path");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const chalk = require("chalk");
const archiver = require("archiver");
const { checkFileExists, readYaml } = require("../utils");
const eventEmitter = require("events");

const showTestCase = function (results) {
  const statusColor = results.status === "AC" ? chalk.green : chalk.red;
  const output = [
    statusColor(results.status.padEnd(6)),
    results["case"].padEnd(8),
  ];
  if (results.time) output.push(`${results.time} ms`.padStart(8));
  if (results.message) output.push(results.message);
  console.log(output.join(" | "));
};
async function validateSolution(
  solutionPath,
  testCases,
  timeLimit,
  checkerPath, event
) {
  let passed = true;
  const results = [];
  let result1 = {
    case: "testcase",
    status: "status",
    time: "reason or cost time ",
    memory: "N/A",
  };
  event.emit("testcase_end", result1);
  for (const { inputFile, answerFile } of testCases) {
    const caseName = path.basename(inputFile, ".in");
    const userOutput = path.join(
      path.dirname(solutionPath),
      "..",
      "outputs",
      path.basename(solutionPath),
      `${caseName}.out`
    );

    fs.mkdirSync(path.dirname(userOutput), { recursive: true });

    try {
      const startTime = Date.now();
      const result = spawnSync(solutionPath, [], {
        input: fs.readFileSync(inputFile),
        timeout: timeLimit + 100,
        maxBuffer: 1024 * 1024 * 32,
        windowsHide: true,
      });

      if (result.error || result.signal === "SIGTERM") {
        throw new Error(`TLE (超过 ${timeLimit} ms)`);
      }
      if (result.signal === "SIGSEGV") {
        throw new Error("RE (段错误)");
      }
      if (result.status !== 0) {
        throw new Error(`RE (退出码 ${result.status})`);
      }

      fs.writeFileSync(userOutput, result.stdout);
      const runTime = Date.now() - startTime;

      const checkerResult = spawnSync(
        checkerPath,
        [inputFile, userOutput, answerFile],
        { stdio: "pipe" }
      );

      if (checkerResult.status !== 0) {
        throw new Error(`WA ${checkerResult.stderr.toString().trim()}`);
      }
      result1 = {
        case: caseName,
        status: "AC",
        time: runTime,
        memory: "N/A",
      };
      results.push(result1);
      event.emit("testcase_end", result1);
    } catch (err) {
      passed = false;
      result1 = {
        case: caseName,
        status: err.message.split(" ")[0],
        message: err.message,
      };
      results.push(result1);
      event.emit("testcase_end", result1);
    }
  }

  return { passed, results };
}



async function checkCommand(problemName) {
  const problemDir = path.join(process.cwd(), problemName);
  const testDataDir = path.join(problemDir, "testdata"); // 正确定义 testDataDir
  const srcDir = path.join(problemDir, "src");
  const outputsDir = path.join(problemDir, "outputs");
  const event = new eventEmitter();

  const statusFile = path.resolve(problemDir, "status.json")
  if (!fs.existsSync(statusFile)) {
    console.error(chalk.red(`找不到 ${statusFile} 状态文件`));
    process.exit(1);
  }
  const problemStatus = JSON.parse(fs.readFileSync(statusFile, { encoding: 'utf-8' }));
  problemStatus.dir.status = false;
  problemStatus.ischecked.status = false;
  problemStatus.isvalidated.status = false;
  problemStatus.isgenerated.status = false;
  fs.writeFileSync(statusFile, JSON.stringify(problemStatus), "utf-8");
  // 初始化目录
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  // 1. 检查基本文件
  console.log(chalk.blueBright(`\n[1/5] 检查题目 ${problemName} 结构完整...`));
  const requiredFiles = [
    "problem.yaml",
    "problem_zh.md",
    "testdata/config.yaml"
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(problemDir, file);
    if (!checkFileExists(filePath)) {
      console.error(chalk.red(`× 缺失必要文件: ${file}`));
      process.exit(1);
    }
    problemStatus.dir.status = true;
    fs.writeFileSync(statusFile, JSON.stringify(problemStatus), "utf-8");
    console.log(chalk.green(`✓ ${file}`));
  }

  // 2. 查找所有std解决方案
  const stdSolutions = fs
    .readdirSync(srcDir)
    // 修改过滤条件：支持 .cpp 和 .cc 扩展名
    .filter(
      (f) => f.startsWith("std") && (f.endsWith(".cpp") || f.endsWith(".cc"))
    );
  // 修改映射逻辑：正确移除扩展名
  // .map((f) => {
  //   const ext = path.extname(f); // 获取扩展名 (.cpp 或 .cc)
  //   return path.basename(f, ext); // 移除扩展名
  // });

  stdSolutions.sort();
  if (stdSolutions.length === 0) {
    console.error(chalk.red("× 未找到任何std开头的解决方案"));
    process.exit(1);
  }

  console.log(chalk.green(`✓ 找到 ${stdSolutions.length} 个解决方案`));
  // 修复循环语法：使用 for...of 替代 for...in
  for (const solut of stdSolutions) {
    console.log(chalk.green(solut));
  }
  // 3. 编译程序
  console.log(chalk.blueBright("\n[2/5] 编译程序..."));
  try {
    execSync(`g++ -O2 -std=c++14 -o ${srcDir}/checker ${srcDir}/checker.cpp`);
    console.log(chalk.green(`✓ checker.cpp 编译成功`));
    stdSolutions.forEach((sol) => {
      const extname = path.extname(sol);
      const execfile = path.basename(sol, extname);
      execSync(`g++ -O2 -std=c++14 -o ${srcDir}/${execfile} ${srcDir}/${sol}`);
      console.log(chalk.green(`✓ ${sol} 编译成功`));
    });
    console.log(chalk.green("✓ 全部编译成功"));
  } catch (err) {
    console.error(chalk.red("× 编译失败:"), err.message);
    process.exit(1);
  }

  // 4. 准备测试用例
  console.log(chalk.blueBright("\n[3/5] 准备测试用例..."));
  const testCases = fs
    .readdirSync(testDataDir) // 使用已定义的 testDataDir
    .filter((f) => f.endsWith(".in"))
    .map((f) => ({
      inputFile: path.join(testDataDir, f),
      answerFile: path.join(testDataDir, f.replace(".in", ".ans")),
    }));
  if (testCases.length === 0) {
    console.error(
      chalk.red(
        "× 未找到测试用例,可以使用 oimp generator 题目 -c 10 生成10个测试样例，前提是您得写好generator 和 validator"
      )
    );
    process.exit(1);
  }
  problemStatus.isgenerated.status = true; problemStatus.isvalidated.status = true;
  fs.writeFileSync(statusFile, JSON.stringify(problemStatus), "utf-8");
  testCases.sort();
  console.log(chalk.green(`✓ 找到 ${testCases.length} 个测试用例`));

  // 5. 运行测试
  console.log(chalk.blueBright(`\n[4/5] 运行测试...`));
  const config = readYaml(path.join(testDataDir, "config.yaml"));
  const timeLimit = parseInt(config.time) || 1000;

  event.on("testcase_end", showTestCase);
  let allPassed = 0;
  for (const solution of stdSolutions) {
    console.log(chalk.cyan(`\n测试 ${solution}:`));
    const exname = path.extname(solution);
    const sol = path.basename(solution, exname);
    const { passed, results } = await validateSolution(
      path.join(srcDir, sol),
      testCases,
      timeLimit,
      path.join(srcDir, "checker"), event
    );
    console.log("---------------------------------");
    allPassed++;
    let acs = 0;
    results.forEach((item)=>{
      if(item.status === 'AC') acs ++;
    });
    if (!passed) {
      allPassed--;
      console.error(chalk.red.bold(`× ${solution} ${acs}/${results.length} 未通过测试`));
    } else
      console.log(
        chalk.green.bold(`✓ ${solution} 通过 ${acs}/${results.length} 项测试`)
      );
  }

  if (allPassed) {

    problemStatus.ischecked.status = true;
    fs.writeFileSync(statusFile, JSON.stringify(problemStatus), "utf-8");
  }
};
module.exports = {
  validateSolution, showTestCase, checkCommand
}
