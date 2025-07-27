const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');
const chalk = require('chalk');
const inquirer = require('inquirer');

const METADATA = 'metadata.json';

function getSnapshotDir(problemID) {
  return path.join(process.cwd(), problemID, '.snapshots');
}
function getMetadataPath(problemID) {
  return path.join(getSnapshotDir(problemID), METADATA);
}
function loadMetadata(problemID) {
  const metaPath = getMetadataPath(problemID);
  if (!fs.existsSync(metaPath)) return { snapshots: [] };
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
}
function saveMetadata(problemID, meta) {
  const metaPath = getMetadataPath(problemID);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

async function listSnapshots(problemID) {
  const meta = loadMetadata(problemID);
  if (!meta.snapshots || meta.snapshots.length === 0) {
    console.log(chalk.yellow('无快照记录。'));
    return;
  }
  console.log(chalk.cyan('快照列表:'));
  meta.snapshots.forEach(snap => {
    const stat = fs.existsSync(path.join(getSnapshotDir(problemID), snap.file)) ? fs.statSync(path.join(getSnapshotDir(problemID), snap.file)) : { size: 0 };
    console.log(`- ${snap.file}  (${(stat.size/1024).toFixed(1)} KB)  [${snap.time}]  ${snap.desc || ''}`);
  });
}

async function restoreSnapshot(problemID, snapshotName) {
  const snapshotDir = getSnapshotDir(problemID);
  const snapshotPath = path.join(snapshotDir, snapshotName);
  if (!fs.existsSync(snapshotPath)) {
    console.error(chalk.red('未找到快照: ' + snapshotPath));
    process.exit(1);
  }
  await fs.createReadStream(snapshotPath)
    .pipe(unzipper.Extract({ path: path.join(process.cwd(), problemID) }))
    .promise();
  console.log(chalk.green(`已回滚到快照: ${snapshotName}`));
}

async function interactiveRestore(problemID) {
  const meta = loadMetadata(problemID);
  if (!meta.snapshots || meta.snapshots.length === 0) {
    console.log(chalk.yellow('无快照记录。'));
    return;
  }
  const choices = meta.snapshots.map(snap => ({
    name: `${snap.file}  [${snap.time}]  ${snap.desc || ''}`,
    value: snap.file
  }));
  const { chosen } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosen',
      message: '请选择要回滚的快照:',
      choices
    }
  ]);
  await restoreSnapshot(problemID, chosen);
}

// 用于 package.js 写入快照元数据
function addSnapshotMetadata(problemDir, file, desc) {
  const problemID = path.basename(problemDir);
  const meta = loadMetadata(problemID);
  meta.snapshots = meta.snapshots || [];
  meta.snapshots.unshift({
    file,
    time: new Date().toLocaleString(),
    desc: desc || ''
  });
  // 只保留最近20个快照
  if (meta.snapshots.length > 20) meta.snapshots = meta.snapshots.slice(0, 20);
  saveMetadata(problemID, meta);
}

module.exports = async function snapshotCommand(problemID, action, snapshotName) {
  if (!problemID) {
    console.error(chalk.red('请指定题目ID。'));
    process.exit(1);
  }
  if (action === 'list') {
    await listSnapshots(problemID);
  } else if (action === 'restore') {
    if (!snapshotName) {
      await interactiveRestore(problemID);
    } else {
      await restoreSnapshot(problemID, snapshotName);
    }
  } else {
    console.error(chalk.red('未知操作: ' + action));
    process.exit(1);
  }
};

module.exports.addSnapshotMetadata = addSnapshotMetadata; 