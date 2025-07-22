const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

// 处理markdown文件中的链接和图片路径
function processMarkdownLinks(content, additionalFilePath) {
    // 处理图片链接 ![alt](path)
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, linkPath) => {
        // 如果链接不是以http://或https://或file://开头，则修正为file://additional_file/格式
        if (!linkPath.match(/^(https?:\/\/|file:\/\/)/)) {
            const fileName = path.basename(linkPath);
            return `![${alt}](file://additional_file/${fileName})`;
        }
        return match;
    });

    // 处理普通链接 [text](path)
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, linkPath) => {
        // 如果链接不是以http://或https://或file://开头，且不是锚点链接(#)，则修正为file://additional_file/格式
        if (!linkPath.match(/^(https?:\/\/|file:\/\/|#)/)) {
            const fileName = path.basename(linkPath);
            return `[${text}](file://additional_file/${fileName})`;
        }
        return match;
    });

    return content;
}

// 处理markdown文件
function processMarkdownFile(filePath, additionalFilePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const processedContent = processMarkdownLinks(content, additionalFilePath);
        
        // 如果内容有变化，写回文件
        if (content !== processedContent) {
            fs.writeFileSync(filePath, processedContent, 'utf8');
            console.log(chalk.cyan(`  processed markdown links in ${path.basename(filePath)}`));
        }
        
        return processedContent;
    } catch (error) {
        console.error(chalk.red(`Error processing markdown file ${filePath}:`), error.message);
        return null;
    }
}

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
    
    // 处理markdown文件中的链接
    const additionalFilePath = path.join(problemDir, "additional_file");
    const markdownFiles = [
        path.join(problemDir, "problem_zh.md"),
        path.join(problemDir, "solution", "stdsol.md")
    ];
    
    markdownFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            processMarkdownFile(filePath, additionalFilePath);
        }
    });
    
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(`${problemName}_${types}.zip`);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));
        archive.pipe(output);

        // 在压缩包内所有路径前加上题目id目录
        const prefix = `${problemName}/`;

        const files = [
            { src: path.join(problemDir, "problem.yaml"), dest: prefix + "problem.yaml" },
            { src: path.join(problemDir, "problem_zh.md"), dest: prefix + "problem_zh.md" },
            { src: path.join(problemDir, "src/checker.cpp"), dest: prefix + "testdata/checker.cpp" },
            { src: path.join(problemDir, "src/std.cpp"), dest: prefix + "testdata/std.cpp" },
            { src: path.join(problemDir, "testdata"), dest: prefix + "testdata" },
            { src: path.join(problemDir, "additional_file"), dest: prefix + "additional_file" },
        ];

        fs.readdirSync(path.join(problemDir, "src"))
            .filter(
                (f) => f.startsWith("std") && (f.endsWith(".cpp") || f.endsWith(".cc"))
            )
            .forEach((f) => {
                files.push({
                    src: path.join(problemDir, "src", f),
                    dest: prefix + `src/${f}`,
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
            dest: prefix + "solution/solution.md",
        });

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
