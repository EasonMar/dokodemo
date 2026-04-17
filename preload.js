const fs = require("fs");

window.readDir = function (path) {
  try {
    return fs.readdirSync(path);
  } catch (err) {
    console.error("读取目录失败:", err);
    throw err; // 抛出错误供上层捕获
  }
};

window.isDir = function (path) {
  try {
    const stat = fs.statSync(path);
    return stat.isDirectory();
  } catch (err) {
    console.error("判断路径类型失败:", err);
    return false; // 返回默认值，避免程序崩溃
  }
};

window.copyTo = function (source, dest, callback) {
  // copyFile('source.txt', 'destination.txt', callback);
  fs.copyFile(source, dest, (err) => {
    if (err) {
      console.error("复制文件失败:", err);
      if (callback) callback(err);
    } else {
      console.log("文件复制成功");
      if (callback) callback(null);
    }
  });
};

window.deleteFile = function (target, callback) {
  try {
    if (window.isDir(target)) {
      fs.rmdir(target, { recursive: true }, (err) => {
        if (err) {
          console.error("删除文件夹失败:", err);
          if (callback) callback(err);
        } else {
          console.log("文件夹删除成功");
          if (callback) callback(null);
        }
      });
    } else {
      fs.unlink(target, (err) => {
        if (err) {
          console.error("删除文件失败:", err);
          if (callback) callback(err);
        } else {
          console.log("文件删除成功");
          if (callback) callback(null);
        }
      });
    }
  } catch (err) {
    console.error("删除操作失败:", err);
    if (callback) callback(err);
  }
};

// 重命名文件或文件夹
window.renameFile = function (oldPath, newPath, callback) {
  try {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        console.error("重命名失败:", err);
        if (callback) callback(err);
      } else {
        console.log("重命名成功");
        if (callback) callback(null);
      }
    });
  } catch (err) {
    console.error("重命名操作失败:", err);
    if (callback) callback(err);
  }
};
