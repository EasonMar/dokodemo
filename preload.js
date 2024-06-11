const fs = require("fs");

window.readDir = function (path) {
  return fs.readdirSync(path);
};

window.isDir = function (path) {
  const stat = fs.statSync(path);
  return stat.isDirectory();
};

window.copyTo = function (source, dest) {
  // copyFile('source.txt', 'destination.txt', callback);
  fs.copyFile(source, dest, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("File copied successfully");
    }
  });
};

window.deleteFile = function (target) {
  if (window.isDir(target)) {
    return fs.rmdir(folderPath, { recursive: true }, (err) => {
      if (err) {
        console.error("Error removing folder:", err);
      } else {
        console.log("Folder removed successfully");
      }
    });
  }
  fs.unlink(target, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("File deleted successfully");
    }
  });
};
