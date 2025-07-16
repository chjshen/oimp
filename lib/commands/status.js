const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

module.exports = async function initCommand(problemName) {
    const problemDir = path.join(process.cwd(), problemName);

    const statusPath = path.join(problemDir, "status.json");
    if (!fs.existsSync(statusPath)) {

        console.log(chalk.red(`题目状态文件 ${statusPath} 不存在`));
        process.exit(1);
    }
    const problemStatus = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    console.log(chalk.cyan.bold(`${problemName} 状态：`));
    console.log("--------------------");
    let allStatus = 1;
    Object.values(problemStatus).forEach((item) => {
        let flag = "×";

        if (item.status) {
            flag = "✓";

            console.log(chalk.green(`  ${flag} ${item.desc}`));

        }
        else {
            allStatus = 0;
            console.log(chalk.red(`  ${flag} ${item.desc}`));

        }

    });
    if (allStatus)
        console.log(chalk.greenBright.bold(`可以使用 oimp package ${problemName} 生成数据压缩包了。`));
    else
        console.error(chalk.red.bold(`请继续完成题目 ${problemName} 的其他工作。`));
};