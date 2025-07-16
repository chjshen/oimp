const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { validateSolution,showTestCase } = require('./check.js');
const eventEmitter = require("events");



module.exports = async function testsampleCommand(problemName) {
    const problemDir = path.join(process.cwd(), problemName);
    const sampleDir = path.join(problemDir, "sample");
    const srcDir = path.join(problemDir, "src");
    const outputsDir = path.join(problemDir, "outputs");

    const event = new eventEmitter();

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

    console.log(chalk.blueBright("\n[1/2] 准备测试样例..."));
    const testCases = fs
        .readdirSync(sampleDir) // 使用已定义的 sampleDir
        .filter((f) => f.endsWith(".in"))
        .map((f) => ({
            inputFile: path.join(sampleDir, f),
            answerFile: path.join(sampleDir, f.replace(".in", ".ans")),
        }));
    if (testCases.length === 0) {
        console.error(
            chalk.red(
                "× 未找到样例,可以将样例放入题目ID目录下的sample文件夹下，.in表示输入,.ans表示输出"
            )
        );
        process.exit(1);
    }
    testCases.sort();
    console.log(chalk.green(`✓ 找到 ${testCases.length} 个测试样例`));

    // 5. 运行测试
    console.log(chalk.blueBright(`\n[2/2] 运行样例测试...`));


    event.on("testcase_end", showTestCase);
    let allPassed = 0;
    for (const solution of stdSolutions) {
        console.log(chalk.cyan(`\n测试 ${solution}:`));
        const exname = path.extname(solution);
        const sol = path.basename(solution, exname);
        const timeLimit = 1000;
        const { passed, results } = await validateSolution(
            path.join(srcDir, sol),
            testCases,
            timeLimit,
            path.join(srcDir, "checker"),event
        );
        console.log("---------------------------------");
        allPassed++;
        if (!passed) {
            allPassed--;
            console.error(chalk.red.bold(`× ${solution} 未通过测试`));
        } else
            console.log(
                chalk.green.bold(`✓ ${solution} 通过${results.length} 项测试`)
            );
    }
};
