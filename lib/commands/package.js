const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const inquirer = require("inquirer");
module.exports = async function packageCommand(problemName) {
    const problemDir = path.join(process.cwd(), problemName);
    // 查找当前题目的状态是否为完成
    const statusFile = path.resolve(problemDir, "status.json")
    const problemStatus = JSON.parse(fs.readFileSync(statusFile, { encoding: 'utf-8' }));
    if (!problemStatus.ischecked.status) {
        console.error(chalk.red("× 题目还没有完成检查，无法打包压缩"));
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
    if (problemStatus.ischecked.status) {
        console.log(chalk.blueBright.bold(`\n生成${importType}导入包...`));
        try {
            if (importType === "hydrooj") {
                const createPackage = require(path.join(typeDir , importType));
                await createPackage(problemDir, problemName, importType);
                console.log(chalk.green(`✓ 已生成 ${problemName}_${importType}.zip`));
            }
        } catch (err) {
            console.error(chalk.red("× 打包失败:"), err.message);
        }
    } else {
        console.error(chalk.red.bold("\n× 未通过解决方案，不生成n导入包"));
        process.exit(1);
    }
};