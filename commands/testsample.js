const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { validateSolution,showTestCase } = require('./check.js');
const eventEmitter = require("events");
const { execSync } = require('child_process');


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
    console.log(chalk.blueBright(`[1/4] 查找解决方案...`));

    stdSolutions.sort();
    if (stdSolutions.length === 0) {
        console.error(chalk.red("× 未找到任何std开头的解决方案"));
        process.exit(1);
    }
    // 自动编译所有 std*.cpp/.cc
    for (const solut of stdSolutions) {
        const srcPath = path.join(srcDir, solut);
        const exname = path.extname(solut);
        const exePath = path.join(srcDir, path.basename(solut, exname));
        try {
            execSync(`g++ -O2 -std=c++14 -o "${exePath}" "${srcPath}"`);
            console.log(chalk.green(`✓ ${solut} 编译成功`));
        } catch (err) {
            console.error(chalk.red(`× ${solut} 编译失败:`), err.message);
            // 新增：编译失败时立即写 status.json
            const statusPath = path.join(problemDir, 'status.json');
            if (fs.existsSync(statusPath)) {
                const status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
                status.std = { desc: '标准程序', status: 'pending' };
                status.testsample = { desc: '样例检测', status: 'pending' };
                if (!status.data || status.data.status === 'done' || status.data.status === 'need-redo') {
                    status.data = { desc: '测评数据', status: 'need-redo' };
                }
                if (!status.check || status.check.status === 'done' || status.check.status === 'need-redo') {
                    status.check = { desc: '完整性检查', status: 'need-redo' };
                }
                if (!status.package || status.package.status === 'done' || status.package.status === 'need-redo') {
                    status.package = { desc: '打包', status: 'need-redo' };
                }
                fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
                console.log(chalk.yellow('× std 编译失败，std/testsample 状态已重置为 pending，data/check/package 状态已重置为 need-redo'));
            }
            process.exit(1);
        }
    }
    console.log(chalk.green(`✓ 找到 ${stdSolutions.length} 个解决方案`));
    console.log(chalk.blueBright(`\n[2/4] 查找样例文件...`));
    // 定义 testCases 和样例检查
    const testCases = fs
        .readdirSync(sampleDir)
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

    // 检查样例答案文件是否为空
    const sampleAns = path.join(sampleDir, 'sample01.ans');
    if (fs.existsSync(sampleAns)) {
        const ansContent = fs.readFileSync(sampleAns, 'utf8').trim();
        if (ansContent === '') {
            console.error(chalk.red('× 样例 sample01.ans 为空，请先填写样例答案后再进行样例检测！'));
            process.exit(1);
        }
    }

    
    console.log(chalk.blueBright(`\n[3/4] 测试数据验证器...`));
    // ===== 新增：用 sample*.in 测试 validator =====
    const validatorPath = path.join(srcDir, 'validator');
    let validatorOk = true;
    if (fs.existsSync(path.join(srcDir, 'validator.cpp'))) {
        // 编译 validator.cpp
        try {
            execSync(`g++ -O2 -std=c++14 -o "${validatorPath}" "${path.join(srcDir, 'validator.cpp')}"`);
            console.log(chalk.green('✓ validator.cpp 编译成功'));
        } catch (err) {
            console.error(chalk.red('× validator.cpp 编译失败:'), err.message);
            validatorOk = false;
        }
        if (validatorOk) {
            // 用所有 sample*.in 测试 validator
            const sampleInFiles = fs.readdirSync(sampleDir).filter(f => f.endsWith('.in'));
            for (const inFile of sampleInFiles) {
                try {
                    const res = execSync(`"${validatorPath}" < "${path.join(sampleDir, inFile)}"`, { stdio: 'pipe' });
                    if (res.toString().trim() !== '') {
                        throw new Error(`validator 输出不为空: ${res}`);
                    }
                    console.log(chalk.green(`✓ validator.cpp 验证 ${inFile} 成功。`));
                } catch (e) {
                    console.error(chalk.red(`× validator 检查 ${inFile} 失败: ${e.message}`));
                    validatorOk = false;
                    break;
                }
            }
        }
    }
    // ===== validator 检查结果推进状态 =====
    const statusPath = path.join(problemDir, 'status.json');
    if (fs.existsSync(statusPath)) {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));

        if (!validatorOk) {
            status.validator = { desc: '数据验证器', status: 'pending' };
            status.testsample = { desc: '样例检测', status: 'pending' };
            // 只处理 done/need-redo
            if (status.data && (status.data.status === 'done' || status.data.status === 'need-redo')) {
                status.data = { desc: '测评数据', status: 'need-redo' };
            }
            if (status.check && (status.check.status === 'done' || status.check.status === 'need-redo')) {
                status.check = { desc: '完整性检查', status: 'need-redo' };
            }
            if (status.package && (status.package.status === 'done' || status.package.status === 'need-redo')) {
                status.package = { desc: '打包', status: 'need-redo' };
            }
            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
            console.log(chalk.red('× validator 检查未通过，validator/testsample 状态已重置为 pending，data/check/package 状态已重置为 need-redo（如原为 pending 则不变）'));
            return;
        }else{status.validator = { desc: '数据验证器', status: 'done' };fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));}

        
    }
    

    // 5. 运行测试
    console.log(chalk.blueBright(`\n[4/4] 运行样例测试...`));


    event.on("testcase_end", showTestCase);
    let anyStdPassed = false;
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
        if (passed) {
            anyStdPassed = true;
            console.log(
                chalk.green.bold(`✓ ${solution} 通过${results.length} 项测试`)
            );
        } else {
            console.error(chalk.red.bold(`× ${solution} 未通过测试`));
        }
    }
    // 检查是否有 std 通过后，写回 status.json
    if (fs.existsSync(statusPath)) {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
        if (anyStdPassed) {
            status.testsample = { desc: '样例检测', status: 'done' };
            status.std = { desc: '标准程序', status: 'done' };
            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
            console.log(chalk.green('✓ 样例检测已通过，状态已更新'));
            updateMtimeRecord(problemDir);
        } else {
            status.testsample = { desc: '样例检测', status: 'pending' };
            status.std = { desc: '标准程序', status: 'pending' };
            if (!status.data || status.data.status === 'done' || status.data.status === 'need-redo') {
                status.data = { desc: '测评数据', status: 'need-redo' };
            }
            if (!status.check || status.check.status === 'done' || status.check.status === 'need-redo') {
                status.check = { desc: '完整性检查', status: 'need-redo' };
            }
            if (!status.package || status.package.status === 'done' || status.package.status === 'need-redo') {
                status.package = { desc: '打包', status: 'need-redo' };
            }
            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
            console.log(chalk.yellow('× 样例检测未通过，std 状态已重置为 pending，data/check/package 状态已重置为 need-redo'));
        }
    }
};

// 新增函数：更新文件mtime记录
function updateMtimeRecord(problemDir) {
    const srcDir = path.join(problemDir, 'src');
    const mtimePath = path.join(problemDir, '.snapshots', 'file-mtime.json');
    
    // 读取现有的mtime记录
    let mtimeInfo = {};
    if (fs.existsSync(mtimePath)) {
        mtimeInfo = JSON.parse(fs.readFileSync(mtimePath, 'utf-8'));
    }
    
    // 更新std.cpp的mtime
    const stdFile = path.join(srcDir, 'std.cpp');
    if (fs.existsSync(stdFile)) {
        const stat = fs.statSync(stdFile);
        mtimeInfo['std.cpp'] = stat.mtimeMs;
        
        // 写回更新后的mtime记录
        fs.writeFileSync(mtimePath, JSON.stringify(mtimeInfo, null, 2));
    }
}
