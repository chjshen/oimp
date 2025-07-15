const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const inquirer = require("inquirer");

async function createHydroPackage(problemDir, problemName) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(`${problemName}_hydro.zip`);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));
        archive.pipe(output);

        const files = [
            { src: path.join(problemDir, "problem.yaml"), dest: "problem.yaml" },
            { src: path.join(problemDir, "problem_zh.md"), dest: "problem_zh.md" },
            { src: path.join(problemDir, "testdata"), dest: "testdata" },
            {
                src: path.join(problemDir, "additional_file"),
                dest: "additional_file",
            },
        ];

        fs.readdirSync(path.join(problemDir, "src"))
            .filter(
                (f) => f.startsWith("std") && (f.endsWith(".cpp") || f.endsWith(".cc"))
            )
            .forEach((f) => {
                files.push({
                    src: path.join(problemDir, "src", f),
                    dest: `src/${f}`,
                });
            });
        console.log(chalk.cyan(`添加文件成功`));
        // 合并solution中的文件为sol.cpp

        try {
            // 并行读取两个文件
            const file1 = path.join(problemDir, "solution", "stdsol.md");
            const file2 = path.join(problemDir, "src", "std.cpp");
            let content1 = fs.readFileSync(file1, "utf8");
            let content2 = fs.readFileSync(file2, "utf8");

            // 合并内容（可选：添加分隔符）
            const separator1 = "\n\n## std.cpp\n\n```c\n";
            const separator2 = "\n```";
            const combined = `${content1}${separator1}${content2}${separator2}`;

            // 写入新文件
            fs.writeFileSync(
                path.join(problemDir, "solution", "solution.md"),
                combined
            );
            console.log(chalk.cyan(`solution生成成功`));
        } catch (err) {
            console.error("❌ 合并文件时出错:", err);
            process.exit(1);
        }
        files.push({
            src: path.join(problemDir, "solution", "solution.md"),
            dest: "solution/solution.md",
        });
        // files.push({
        //   src: path.join(problemDir, "src", "std.cpp"),
        //   dest: "src/std.cpp",
        // });
        files.forEach(({ src, dest }) => {
            if (fs.existsSync(src)) {
                if (fs.lstatSync(src).isDirectory()) {
                    archive.directory(src, dest);
                } else {
                    archive.file(src, { name: dest });
                }
            }
        });

        archive.finalize();
    });
}
module.exports = async function packageCommand(problemName) {
    const problemDir = path.join(process.cwd(), problemName);
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "selectedExportType",
            message: "请选择导出的包类型：",
            choices: [
                {
                    name: "hydrooj格式",
                    value: "hydrooj",
                }],
            default: "hydrooj",
        }]);

    const importType = answers.selectedExportType;
    console.log(importType)
    console.log(answers);
    // 查找当前题目的状态是否为完成
    const statusFile = path.resolve(problemDir,"status.json")
  const problemStatus = JSON.parse(fs.readFileSync(statusFile,{encoding:'utf-8'}));
  if( !problemStatus.ischecked)
  {
    console.error(chalk.red("× 题目还没有完成检查，无法打包压缩"));
    process.exit(1);
  }
    //  生成HydroOJ包
    if (problemStatus.ischecked ) {
        console.log(chalk.blueBright(`\n 生成${importType}导入包...`));
        try {
            if (importType === "hydrooj") {
                await createHydroPackage(problemDir, problemName);
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