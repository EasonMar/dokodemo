// 在index.js中添加
function showError(message) {
  // 创建错误提示元素
  const errorElement = $('<div class="error-message"></div>').text(message);
  // 添加到界面
  $("body").prepend(errorElement);
  // 3秒后自动消失
  setTimeout(() => {
    errorElement.fadeOut(() => {
      errorElement.remove();
    });
  }, 3000);
}

function showSuccess(message) {
  // 创建成功提示元素
  const successElement = $('<div class="success-message"></div>').text(message);
  // 添加到界面
  $("body").prepend(successElement);
  // 3秒后自动消失
  setTimeout(() => {
    successElement.fadeOut(() => {
      successElement.remove();
    });
  }, 3000);
}

// 添加加载状态函数
function showLoading(message) {
  const loadingElement = $('<div class="loading-message"></div>').text(message);
  $("body").prepend(loadingElement);
  return loadingElement;
}

function hideLoading(loadingElement) {
  if (loadingElement) {
    loadingElement.fadeOut(() => {
      loadingElement.remove();
    });
  }
}

const seperator = utools.isWindows() ? "\\" : "/";

// uTools API onPluginEnter(callback)
utools.onPluginEnter(({ code, type, payload, option }) => {});
utools
  .readCurrentFolderPath()
  .then((path) => {
    const name = getNameFromPath(path);
    OUTPUT.push({ name, path });
    DomCreateing($(".OUTPUT"), OUTPUT);
  })
  .catch((err) => {
    console.log(err);
    showError("获取当前目录失败: " + err.message);
  });

// Model - 数据结构
// [
//   {
//     name: "demo",
//     path: "C:\\demo",
//     children: [
//       {
//         name: "xxx",
//         path: "c:\\demo\\xxx",
//         children: [
//           {
//             name: "zzz.css",
//             path: "c:\\demo\\xxx\\zzz.css",
//           },
//         ],
//       },
//       {
//         name: "xxx.js",
//         path: "c:\\demo\\xxx.js",
//       },
//     ],
//   },
// ];
// DomCreateing($(".OUTPUT"), OUTPUT);

var INPUT = [];
var OUTPUT = [];
var inputSelect = [];
var outputSelect = [];

// Dom Creating ———— 遍历dir树 ———— 直接用 ElementUI 的树形控件吧
function DomCreateing($Container, data) {
  const isInput = $Container.hasClass("INPUT");
  const dom = generateList(data, isInput);
  $Container.empty().append(dom);
  EventBinding($Container);
}

// 获取子目录
function getSubData(dir) {
  try {
    const children = [];
    const subItem = window.readDir(dir);
    subItem.forEach((item) => {
      const path = dir + seperator + item;
      children.push({ name: item, path });
    });
    return children;
  } catch (err) {
    showError("读取目录失败: " + err.message);
    return [];
  }
}

// 计算目录中文件数量（不包括子目录）
function countFilesInDir(dir) {
  try {
    const items = window.readDir(dir);
    let count = 0;
    items.forEach((item) => {
      const itemPath = dir + seperator + item;
      if (!window.isDir(itemPath)) {
        count++;
      }
    });
    return count;
  } catch (err) {
    console.log(err);
    return 0;
  }
}

// 递归遍历目录数据结构 —————— 不需要全部遍历...往下探一层就即可...
function generateList(data, isInput = false) {
  let result = "<ul>";
  for (let item of data) {
    const isFolder = window.isDir(item.path);
    const path = encodeURIComponent(item.path);
    const expendTag = isFolder
      ? `<span class="expand" path="${path}">+</span>`
      : "";

    let folderCount = "";
    if (isFolder) {
      const fileCount = countFilesInDir(item.path);
      folderCount = `<span class="file-count">(${fileCount})</span>`;
    }

    // 检查是否在选择数组中
    const selectArray = isInput ? inputSelect : outputSelect;
    const isSelected = selectArray.includes(item.path);
    const selectedClass = isSelected ? "selected" : "";

    result += `<li ${
      isFolder ? 'class="folder"' : '""'
    }><div class="item ${selectedClass}" path="${path}">${expendTag}${folderCount}${item.name}</div>`;
    if (item.children) {
      result += generateList(item.children, isInput);
    }
    result += "</li>";
  }
  result += "</ul>";
  return result;
}

// 刷新指定文件夹的 UI（数量和子列表）
function refreshFolderUI(path) {
  const attrPath = encodeURIComponent(path);
  const $items = $(`.item[path='${attrPath}']`);

  $items.each(function () {
    const $item = $(this);
    const $parentLi = $item.parent();
    const $expand = $item.find(".expand");

    // 1. 更新文件数量
    const fileCount = countFilesInDir(path);
    $item.find(".file-count").text(`(${fileCount})`);

    // 2. 如果已展开，刷新子列表内容
    if ($expand.text() === "-") {
      $parentLi.find("> ul").remove();
      const children = getSubData(path);
      const isInput = $parentLi.closest(".INPUT").length > 0;
      const $sub = $(generateList(children, isInput));
      $parentLi.append($sub);
      EventBinding($sub);
    }
  });
}

// 从path里获取name
function getNameFromPath(path) {
  const nameReg = utools.isWindows() ? /\\([^\\]*?)$/ : /\/([^\/]*?)$/; //  在Windows系统中，文件路径使用反斜杠“\”作为路径分隔符，例如：C:\Users\John\Documents\file.txt；macOS使用正斜杠“/”作为路径分隔符，例如：/Users/John/Documents/file.txt

  return path.match(nameReg)[1] || "";
}

// 更新取消选中按钮的显示状态
function updateResetButtons() {
  // 更新input取消选中按钮
  const inputResetBtn = $(".inputBtn .reset");
  if (inputSelect.length > 0) {
    inputResetBtn.show().text(`取消选中 (${inputSelect.length})`);
  } else {
    inputResetBtn.hide();
  }

  // 更新output取消选中按钮
  const outputResetBtn = $(".outputBtn .reset");
  if (outputSelect.length > 0) {
    outputResetBtn.show().text(`取消选中 (${outputSelect.length})`);
  } else {
    outputResetBtn.hide();
  }
}

// Event Binding
function EventBinding($parent) {
  const $container = $parent || $(".window");
  $container.find(".item").click(function (event) {
    event.stopPropagation(); // 阻止事件冒泡
    const path = decodeURIComponent($(this).attr("path"));
    const selected = $(this).hasClass("selected");
    $(this).toggleClass("selected");
    const target =
      $(this).closest(".INPUT").length > 0 ? "inputSelect" : "outputSelect";
    if (selected) {
      // 消除
      window[target] = window[target].filter((s) => s !== path);
    } else {
      // 添加
      window[target].push(path);
    }
    // 更新取消选中按钮状态
    updateResetButtons();
  });

  $container.find(".expand").click(function (event) {
    event.stopPropagation(); // 阻止事件冒泡
    const attrPath = $(this).attr("path");
    const path = decodeURIComponent(attrPath);
    const $parentLi = $(this).closest("li");
    const $this = $(this);
    if ($this.text() === "+") {
      // 如果未展开
      const children = getSubData(path);
      const $sub = $(generateList(children));
      $parentLi.append($sub);
      EventBinding($sub);
      $this.text("-");
    } else {
      // 收起
      $this.text("+");
      $parentLi.find("> ul").remove();
    }
  });
}

// 重命名相关函数
function showRenameDialog() {
  // 检查是否有选中的文件
  const selectedPaths = [...inputSelect, ...outputSelect];
  if (selectedPaths.length === 0) {
    showError("请选择要重命名的文件或文件夹");
    return;
  }

  // 显示对话框
  $("#renameDialog").show();

  // 生成预览
  updateRenamePreview();
}

function hideRenameDialog() {
  $("#renameDialog").hide();
  // 重置表单
  $("#newName").val("");
  $("#regexPattern").val("");
  $("#regexReplacement").val("");
  $("#directRename").prop("checked", true);
  $("#regexRename").prop("checked", false);
  $(".regex-only").hide();
}

function updateRenamePreview() {
  const selectedPaths = [...inputSelect, ...outputSelect];
  const renameMode = $("input[name='renameMode']:checked").val();
  const newName = $("#newName").val();
  const regexPattern = $("#regexPattern").val();
  const regexReplacement = $("#regexReplacement").val();

  let previewHtml = "";

  selectedPaths.forEach((path, index) => {
    const oldName = getNameFromPath(path);
    let newFileName = oldName;

    if (renameMode === "direct") {
      // 直接重命名
      if (newName) {
        // 保留文件扩展名
        const extMatch = oldName.match(/(\.[^.]+)$/);
        if (extMatch) {
          newFileName = newName + extMatch[1];
        } else {
          newFileName = newName;
        }
      }
    } else if (renameMode === "regex") {
      // 正则替换
      if (regexPattern) {
        try {
          const regex = new RegExp(regexPattern);
          newFileName = oldName.replace(regex, regexReplacement);
        } catch (err) {
          showError("正则表达式无效");
          return;
        }
      }
    } else if (renameMode === "index") {
      // 添加序号
      const num = index + 1;
      // 检查文件名是否以数字开头（可能带有分隔符如 - 或 _）
      const match = oldName.match(/^(\d+)([-_ ]?)(.*)/);
      if (match) {
        // 如果原本就有序号，替换它，保留分隔符和后续内容
        newFileName = `${num}${match[2]}${match[3]}`;
      } else {
        // 如果没有序号，直接加在前面
        newFileName = `${num}、${oldName}`;
      }
    }

    previewHtml += `<div class="preview-row"><span class="old">${oldName}</span><span class="arrow">→</span><span class="new">${newFileName}</span></div>`;
  });

  $("#renamePreview").html(previewHtml);
}

function executeRename() {
  const selectedPaths = [...inputSelect, ...outputSelect];
  const renameMode = $("input[name='renameMode']:checked").val();
  const newName = $("#newName").val();
  const regexPattern = $("#regexPattern").val();
  const regexReplacement = $("#regexReplacement").val();

  if (selectedPaths.length === 0) {
    showError("请选择要重命名的文件或文件夹");
    return;
  }

  if (renameMode === "direct" && !newName) {
    showError("请输入新名称");
    return;
  }

  if (renameMode === "regex" && !regexPattern) {
    showError("请输入正则表达式");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  const loading = showLoading("正在重命名文件...");

  selectedPaths.forEach((oldPath, index) => {
    const oldName = getNameFromPath(oldPath);
    let newFileName = oldName;

    if (renameMode === "direct") {
      // 直接重命名
      // 保留文件扩展名
      const extMatch = oldName.match(/(\.[^.]+)$/);
      if (extMatch) {
        newFileName = newName + extMatch[1];
      } else {
        newFileName = newName;
      }
    } else if (renameMode === "regex") {
      // 正则替换
      try {
        const regex = new RegExp(regexPattern);
        newFileName = oldName.replace(regex, regexReplacement);
      } catch (err) {
        showError("正则表达式无效");
        hideLoading(loading);
        return;
      }
    } else if (renameMode === "index") {
      // 添加序号
      const num = index + 1;
      const match = oldName.match(/^(\d+)([-_ ]?)(.*)/);
      if (match) {
        newFileName = `${num}${match[2]}${match[3]}`;
      } else {
        newFileName = `${num}、${oldName}`;
      }
    }

    // 构建新路径
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf(seperator));
    const newPath = parentPath + seperator + newFileName;

    // 执行重命名
    window.renameFile(oldPath, newPath, (err) => {
      if (err) {
        errorCount++;
        showError(`重命名失败: ${err.message}`);
      } else {
        successCount++;
        // 更新内存中的路径
        if (inputSelect.includes(oldPath)) {
          const index = INPUT.findIndex((item) => item.path === oldPath);
          if (index !== -1) {
            INPUT[index].name = newFileName;
            INPUT[index].path = newPath;
          }
        }
        if (outputSelect.includes(oldPath)) {
          const index = OUTPUT.findIndex((item) => item.path === oldPath);
          if (index !== -1) {
            OUTPUT[index].name = newFileName;
            OUTPUT[index].path = newPath;
          }
        }
      }

      // 所有操作完成后显示结果
      if (successCount + errorCount === selectedPaths.length) {
        hideLoading(loading);
        if (successCount > 0) {
          showSuccess(`成功重命名 ${successCount} 个项目`);
          // 刷新界面
          DomCreateing($(".INPUT"), INPUT);
          DomCreateing($(".OUTPUT"), OUTPUT);
          // 清空选择
          inputSelect = [];
          outputSelect = [];
        }
        // 隐藏对话框
        hideRenameDialog();
      }
    });
  });
}

function staticDomEventBind() {
  // 点击上传
  $(".DRAG").on("click", function () {
    const isInput = $(this).hasClass("input");
    const target = isInput ? "INPUT" : "OUTPUT";

    // uTools API: 唤起原生文件选择框
    const filePaths = utools.showOpenDialog({
      title: isInput ? "选择源文件或文件夹" : "选择目标目录",
      properties: isInput
        ? ["openFile", "openDirectory", "multiSelections"]
        : ["openDirectory", "multiSelections"],
    });

    if (filePaths && filePaths.length > 0) {
      try {
        filePaths.forEach((path) => {
          const name = getNameFromPath(path);
          window[target].push({ name, path });
        });
        DomCreateing($("." + target), window[target]);
        showSuccess(`成功添加 ${filePaths.length} 个项目`);
      } catch (err) {
        showError("添加文件失败: " + err.message);
      }
    }
  });

  // 上传 (拖拽)
  $(".DRAG").on("dragover", function (event) {
    event.preventDefault();
  });

  $(".DRAG").on("drop", function (event) {
    event.preventDefault();
    try {
      const files = Array.from(event.originalEvent.dataTransfer.files);
      const target = $(this).hasClass("input") ? "INPUT" : "OUTPUT";

      if (files.length === 0) {
        showError("未检测到文件");
        return;
      }

      files.forEach((file) => window[target].push(file));
      DomCreateing($("." + target), window[target]);
      showSuccess(`成功添加 ${files.length} 个文件`);
    } catch (err) {
      showError("添加文件失败: " + err.message);
    }
  });

  // 清空input
  $(".inputBtn .empty").on("click", function () {
    INPUT = [];
    inputSelect = [];
    $(".INPUT").empty();
    // 更新取消选中按钮状态
    updateResetButtons();
  });
  // 清空output
  $(".outputBtn .empty").on("click", function () {
    OUTPUT = [];
    outputSelect = [];
    $(".OUTPUT").empty();
    // 更新取消选中按钮状态
    updateResetButtons();
  });

  // 移出(虚拟删除)input中所选项的最外层目录...
  $(".inputBtn .remove").on("click", function () {
    if (inputSelect.length === 0) {
      showError("请选择要移除的项目");
      return;
    }
    // 收集要移除的最外层目录路径
    const pathsToRemove = new Set();
    inputSelect.forEach((selectedPath) => {
      // 找到该路径对应的最外层目录
      const outerItem = INPUT.find((item) => {
        return selectedPath.startsWith(item.path);
      });
      if (outerItem) {
        pathsToRemove.add(outerItem.path);
      }
    });
    // 从INPUT中移除这些目录
    INPUT = INPUT.filter((item) => {
      return !pathsToRemove.has(item.path);
    });
    // 清空选择
    inputSelect = [];
    // 重新生成DOM
    DomCreateing($(".INPUT"), INPUT);
    // 更新取消选中按钮状态
    updateResetButtons();
    showSuccess(`成功移除 ${pathsToRemove.size} 个目录`);
  });

  // 撤销output所选
  $(".outputBtn .reset").on("click", function () {
    outputSelect = [];
    $(".OUTPUT .selected").removeClass("selected");
    // 更新取消选中按钮状态
    updateResetButtons();
  });

  // 移出(虚拟删除)output中所选项的最外层目录...
  $(".outputBtn .remove").on("click", function () {
    if (outputSelect.length === 0) {
      showError("请选择要移除的项目");
      return;
    }
    // 收集要移除的最外层目录路径
    const pathsToRemove = new Set();
    outputSelect.forEach((selectedPath) => {
      // 找到该路径对应的最外层目录
      const outerItem = OUTPUT.find((item) => {
        return selectedPath.startsWith(item.path);
      });
      if (outerItem) {
        pathsToRemove.add(outerItem.path);
      }
    });
    // 从OUTPUT中移除这些目录
    OUTPUT = OUTPUT.filter((item) => {
      return !pathsToRemove.has(item.path);
    });
    // 清空选择
    outputSelect = [];
    // 重新生成DOM
    DomCreateing($(".OUTPUT"), OUTPUT);
    // 更新取消选中按钮状态
    updateResetButtons();
    showSuccess(`成功从列表移除 ${pathsToRemove.size} 个项目`);
  });

  // 在系统资源管理器中打开所选（同时处理 Input 和 Output）
  $(".openDir").on("click", function () {
    const allSelected = [...new Set([...inputSelect, ...outputSelect])];

    if (allSelected.length === 0) {
      showError("请选择要打开的项目");
      return;
    }

    // 遍历打开所有选中的路径
    allSelected.forEach((path) => {
      let targetPath = path;
      // 如果不是目录，则获取其父目录
      if (!window.isDir(path)) {
        targetPath = path.substring(0, path.lastIndexOf(seperator));
      }
      utools.shellOpenPath(targetPath);
    });
  });

  // 撤销input所选
  $(".inputBtn .reset").on("click", function () {
    inputSelect = [];
    $(".INPUT .selected").removeClass("selected");
    // 更新取消选中按钮状态
    updateResetButtons();
  });

  // 移动Output所选到Input
  $(".addToInput").on("click", function () {
    // 需要根据 path 创建 data Object
    const items = outputSelect.map((path) => {
      const name = getNameFromPath(path);
      return { path, name };
    });
    INPUT.push(...items);
    outputSelect = [];
    $(".OUTPUT .selected").removeClass("selected");
    DomCreateing($(".INPUT"), INPUT);
    // 更新取消选中按钮状态
    updateResetButtons();
  });

  // 初始化取消选中按钮状态
  updateResetButtons();

  // 复制Input所选文件到Output所选目录
  $(".copyToOutput").on("click", function () {
    if (inputSelect.length === 0) {
      showError("请选择要复制的文件");
      return;
    }
    if (outputSelect.length === 0) {
      showError("请选择目标目录");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    const loading = showLoading("正在复制文件...");

    inputSelect.forEach((i) => {
      const name = getNameFromPath(i);
      outputSelect.forEach((o) => {
        // 只有是目录的才执行...
        if (window.isDir(o)) {
          window.copyTo(i, o + seperator + name, (err) => {
            if (err) {
              errorCount++;
              showError(`复制失败: ${err.message}`);
            } else {
              successCount++;
            }
            // 所有操作完成后显示结果
            if (
              successCount + errorCount ===
              inputSelect.length * outputSelect.length
            ) {
              hideLoading(loading);
              if (successCount > 0) {
                showSuccess(`成功复制 ${successCount} 个文件`);
                // 刷新目标目录的 UI，确保展开的文件夹内容能及时更新
                outputSelect.forEach((path) => refreshFolderUI(path));
              }
            }
          });
        } else {
          showError(`目标路径不是目录: ${o}`);
        }
      });
    });
  });

  // 删除Input\Output中所选文件
  $(".deleteSelected").on("click", function () {
    // 获取不重复的所有所选路径
    let origin = [...outputSelect, ...inputSelect];
    let uniqueArr = Array.from(new Set(origin));

    if (uniqueArr.length === 0) {
      showError("请选择要删除的文件或文件夹");
      return;
    }

    // 确认删除
    if (!confirm("确定要删除所选文件吗？此操作不可恢复。")) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    uniqueArr.forEach((target) => {
      window.deleteFile(target, (err) => {
        if (err) {
          errorCount++;
          showError(`删除失败: ${err.message}`);
        } else {
          successCount++;
        }
        // 所有操作完成后显示结果
        if (successCount + errorCount === uniqueArr.length) {
          if (successCount > 0) {
            showSuccess(`成功删除 ${successCount} 个项目`);
            // 刷新界面
            DomCreateing($(".INPUT"), INPUT);
            DomCreateing($(".OUTPUT"), OUTPUT);
          }
        }
      });

      $(".selected").remove();
      outputSelect = [];
      inputSelect = [];
    });
  });

  // 重命名模式切换
  $("input[name='renameMode']").change(function () {
    if ($(this).val() === "regex") {
      $(".regex-only").show();
      $(".direct-only").hide();
    } else {
      $(".regex-only").hide();
      $(".direct-only").show();
    }
    updateRenamePreview();
  });

  // 输入变化时更新预览
  $("#newName, #regexPattern, #regexReplacement").on("input", function () {
    updateRenamePreview();
  });

  // 重命名按钮点击
  $(".renameSelected").on("click", function () {
    showRenameDialog();
  });

  // 移除重复文件按钮点击
  $(".removeDuplicates").on("click", function () {
    showDuplicateDialog();
  });

  // 取消重命名
  $("#cancelRename").on("click", function () {
    hideRenameDialog();
  });

  // 确认重命名
  $("#confirmRename").on("click", function () {
    executeRename();
  });

  // 显示重复文件对话框
  $("#scanDuplicates").on("click", function () {
    scanDuplicateFiles();
  });

  // 取消重复文件对话框
  $("#cancelDuplicate").on("click", function () {
    hideDuplicateDialog();
  });

  // 删除重复文件
  $("#deleteDuplicates").on("click", function () {
    deleteSelectedDuplicates();
  });

  // 全选/取消全选重复文件（不包括原始文件）
  $(document).on("change", ".select-all-checkbox", function () {
    const isChecked = $(this).prop("checked");
    const groupId = $(this).data("groupId");
    // 只选中非disabled的checkbox（即非原始文件）
    $(
      `.duplicate-file-item[data-group-id='${groupId}'] input[type='checkbox']:not(:disabled)`,
    ).prop("checked", isChecked);
  });

  // 全选所有重复文件（不包括原始文件）
  $("#selectAllDuplicates").on("click", function () {
    // 选中所有非disabled的checkbox
    $("#duplicateResults input[type='checkbox']:not(:disabled)").prop(
      "checked",
      true,
    );
  });
}

staticDomEventBind();

// 重复文件相关函数
function showDuplicateDialog() {
  // 获取当前目录路径作为默认值
  utools
    .readCurrentFolderPath()
    .then((path) => {
      $("#scanPath").val(path);
    })
    .catch(() => {
      $("#scanPath").val("");
    });
  $("#duplicateDialog").show();
  $("#duplicateResults").html("");
  $("#deleteDuplicates").hide();
}

function hideDuplicateDialog() {
  $("#duplicateDialog").hide();
  $("#duplicateResults").html("");
  $("#scanPath").val("");
}

// 解析文件名，去除末尾的 (n) 序号
function parseFileName(name) {
  // 匹配末尾的 (数字) 模式
  const match = name.match(/^(.*?)\s*\((\d+)\)(\.[^.]+)?$/);
  if (match) {
    const baseName = match[1];
    const ext = match[3] || "";
    return {
      baseName: baseName + ext,
      hasSuffix: true,
      suffixNum: parseInt(match[2]),
    };
  }
  return {
    baseName: name,
    hasSuffix: false,
    suffixNum: 0,
  };
}

// 递归扫描目录获取所有文件
function scanFiles(dir, includeSubdirs, files = []) {
  try {
    const items = window.readDir(dir);
    items.forEach((item) => {
      const path = dir + seperator + item;
      if (window.isDir(path)) {
        if (includeSubdirs) {
          scanFiles(path, includeSubdirs, files);
        }
      } else {
        const size = window.getFileSize(path);
        files.push({
          name: item,
          path: path,
          size: size,
        });
      }
    });
  } catch (err) {
    console.log("扫描目录失败:", err);
  }
  return files;
}

// 查找重复文件
function findDuplicateFiles(files) {
  const groups = {};

  files.forEach((file) => {
    const parsed = parseFileName(file.name);
    // 以基础文件名和文件大小作为键来判断重复
    const key = `${parsed.baseName}_${file.size}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({
      ...file,
      parsed: parsed,
    });
  });

  // 过滤出有重复的组（包含多个文件的组）
  const duplicateGroups = Object.values(groups).filter(
    (group) => group.length > 1,
  );

  // 对每个组按序号排序
  duplicateGroups.forEach((group) => {
    group.sort((a, b) => {
      // 没有序号的排前面（视为原始文件）
      if (!a.parsed.hasSuffix && b.parsed.hasSuffix) return -1;
      if (a.parsed.hasSuffix && !b.parsed.hasSuffix) return 1;
      // 都有序号的按序号大小排序
      return a.parsed.suffixNum - b.parsed.suffixNum;
    });
  });

  return duplicateGroups;
}

// 扫描重复文件
function scanDuplicateFiles() {
  const scanPath = $("#scanPath").val().trim();
  const includeSubdirs = $("#includeSubdirs").prop("checked");

  if (!scanPath) {
    showError("请输入要扫描的目录路径");
    return;
  }

  if (!window.isDir(scanPath)) {
    showError("输入的路径不是有效的目录");
    return;
  }

  const loading = showLoading("正在扫描文件...");

  setTimeout(() => {
    try {
      const files = scanFiles(scanPath, includeSubdirs);
      const duplicateGroups = findDuplicateFiles(files);

      hideLoading(loading);
      displayDuplicateResults(duplicateGroups);
    } catch (err) {
      hideLoading(loading);
      showError("扫描失败: " + err.message);
    }
  }, 100);
}

// 显示重复文件结果
function displayDuplicateResults(groups) {
  if (groups.length === 0) {
    $("#duplicateResults").html(
      '<div style="text-align: center; padding: 40px; color: #666;">未找到重复文件</div>',
    );
    $("#deleteDuplicates").hide();
    return;
  }

  let html = "";
  groups.forEach((group, groupIndex) => {
    const firstFile = group[0];
    const groupId = `group-${groupIndex}`;

    html += `
      <div class="select-all-group">
        <input type="checkbox" class="select-all-checkbox" data-group-id="${groupId}" />
        <label>全选此组 (${group.length - 1} 个文件)</label>
      </div>
      <div class="duplicate-group">
        <div class="duplicate-group-header">
          <span>${firstFile.parsed.baseName}</span>
          <span class="count">${group.length - 1} 个重复</span>
        </div>
        <div class="duplicate-file-list">
    `;

    group.forEach((file, index) => {
      const isOriginal = index === 0;
      const sizeStr = formatFileSize(file.size);
      html += `
          <div class="duplicate-file-item ${isOriginal ? "original" : ""}" data-group-id="${groupId}">
            <input type="checkbox" class="checkbox" data-path="${encodeURIComponent(file.path)}" ${isOriginal ? "disabled" : ""} />
            <span class="filename">${isOriginal ? "[原始] " : ""}${file.name}</span>
            <span class="size">${sizeStr}</span>
          </div>
        `;
    });

    html += `
        </div>
      </div>
    `;
  });

  $("#duplicateResults").html(html);
  $("#deleteDuplicates").show();
  $("#selectAllDuplicates").show();
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 删除选中的重复文件
function deleteSelectedDuplicates() {
  const selectedBoxes = $(
    ".duplicate-file-list input[type='checkbox']:checked",
  );

  if (selectedBoxes.length === 0) {
    showError("请选择要删除的重复文件");
    return;
  }

  if (
    !confirm(
      `确定要删除选中的 ${selectedBoxes.length} 个重复文件吗？此操作不可恢复。`,
    )
  ) {
    return;
  }

  const pathsToDelete = selectedBoxes
    .map(function () {
      return decodeURIComponent($(this).data("path"));
    })
    .get();

  let successCount = 0;
  let errorCount = 0;

  const loading = showLoading("正在删除文件...");

  pathsToDelete.forEach((path) => {
    window.deleteFile(path, (err) => {
      if (err) {
        errorCount++;
        showError(`删除失败: ${err.message}`);
      } else {
        successCount++;
      }

      if (successCount + errorCount === pathsToDelete.length) {
        hideLoading(loading);
        if (successCount > 0) {
          showSuccess(`成功删除 ${successCount} 个重复文件`);
          // 重新扫描显示更新后的结果
          scanDuplicateFiles();
        }
      }
    });
  });
}
