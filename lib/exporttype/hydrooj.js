const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

async function createSampleZip(problemDir)
{
    return new Promise((resolve,reject)=>{
        const sampleZipPath = path.join(problemDir, "additional_file/sample.zip");
        const output = fs.createWriteStream(sampleZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));
        archive.pipe(output);
        const files = [
            { src: path.join(problemDir, "sample"), dest: "sample" },
            
        ];
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
module.exports = async function createPackage(problemDir, problemName, types) {
    // make sample.zip file
    try {
        await createSampleZip(problemDir);
    } catch (e) {
        console.error(chalk.red('make sample.zip error:'), e.message);
        process.exit(1)
    }
    console.log(chalk.cyan('  make file sample.zip success'));
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(`${problemName}_${types}.zip`);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));
        archive.pipe(output);

        const files = [
            { src: path.join(problemDir, "problem.yaml"), dest: "problem.yaml" },
            { src: path.join(problemDir, "problem_zh.md"), dest: "problem_zh.md" },
            { src: path.join(problemDir, "src/checker.cpp"), dest: "testdata/checker.cpp" },
            { src: path.join(problemDir, "src/std.cpp"), dest: "testdata/std.cpp" },
            { src: path.join(problemDir, "testdata"), dest: "testdata" },
            { src: path.join(problemDir, "additional_file"), dest: "additional_file" },
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
            
        } catch (err) {
            console.error("❌ 合并文件时出错:", err);
            process.exit(1);
        }
        console.log(chalk.cyan(`  make file solution.md success`));
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
                    console.log(chalk.cyan(`  add directory ${src} files to ${dest} success`));
                } else {
                    archive.file(src, { name: dest });
                    console.log(chalk.cyan(`  add file ${src}  to ${dest} success`));
                }
            }
        });

        archive.finalize();
    });
}
