const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");
const chalk = require("chalk");
const { checkFileExists } = require("../utils");

module.exports = async function generateCommand(problemName, options) {
  const problemDir = path.join(process.cwd(), problemName);
  const testDataDir = path.join(problemDir, "testdata");
  const srcDir = path.join(problemDir, "src");

  // 检查目录是否存在
  if (!checkFileExists(problemDir)) {
    console.error(
      chalk.red(`Problem directory ${problemName} does not exist.`)
    );
    process.exit(1);
  }

  if (!checkFileExists(testDataDir)) {
    console.error(chalk.red(`testdata directory not found in ${problemName}`));
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
  } catch (err) {
    console.error(chalk.red(`× Validation failed: ${err.message}`));
    process.exit(1);
  }
};
