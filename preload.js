const { readdirSync, statSync } = require("fs");

window.readDir = function (path) {
  return readdirSync(path);
};

window.isDir = function (path) {
  const stat = statSync(path);
  return stat.isDirectory();
};
