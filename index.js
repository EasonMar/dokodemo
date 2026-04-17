// 在index.js中添加
function showError(message) {
  // 创建错误提示元素
  const errorElement = $('<div class="error-message"></div>').text(message);
  // 添加到界面
  $(".window").prepend(errorElement);
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
  $(".window").prepend(successElement);
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
  $(".window").prepend(loadingElement);
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
  const dom = generateList(data);
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

// 递归遍历目录数据结构 —————— 不需要全部遍历...往下探一层就即可...
function generateList(data) {
  let result = "<ul>";
  for (let item of data) {
    const isFolder = window.isDir(item.path);
    const path = encodeURIComponent(item.path);
    const expendTag = isFolder
      ? `<span class="expand" path="${path}">+</span>`
      : "";
    result += `<li ${
      isFolder ? 'class="folder"' : '""'
    }><div class="item" path="${path}">${expendTag} ${item.name}`;
    if (item.children) {
      result += generateList(item.children);
    }
    result += "</div></li>";
  }
  result += "</ul>";
  return result;
}

// 从path里获取name
function getNameFromPath(path) {
  const nameReg = utools.isWindows() ? /\\([^\\]*?)$/ : /\/([^\/]*?)$/; //  在Windows系统中，文件路径使用反斜杠“\”作为路径分隔符，例如：C:\Users\John\Documents\file.txt；macOS使用正斜杠“/”作为路径分隔符，例如：/Users/John/Documents/file.txt

  return path.match(nameReg)[1] || "";
}

// Event Binding
function EventBinding($parent) {
  const $container = $parent || $("body");
  $container.find(".item").click(function (event) {
    event.stopPropagation(); // 阻止事件冒泡
    const path = decodeURIComponent($(this).attr("path"));
    const selected = $(this).hasClass("selected");
    $(this).toggleClass("selected");
    const target = $container.hasClass("INPUT")
      ? "inputSelect"
      : "outputSelect";
    if (selected) {
      // 消除
      window[target] = window[target].filter((s) => s !== path);
    } else {
      // 添加
      window[target].push(path);
    }
  });

  $container.find(".expand").click(function (event) {
    event.stopPropagation(); // 阻止事件冒泡
    const attrPath = $(this).attr("path");
    const path = decodeURIComponent(attrPath);
    const $parentLi = $(`.item[path='${attrPath}']`).parent();
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
      $parentLi.find("ul").remove();
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

  selectedPaths.forEach((path) => {
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
    }

    previewHtml += `<div><strong>原名称:</strong> ${oldName} → <strong>新名称:</strong> ${newFileName}</div>`;
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

  selectedPaths.forEach((oldPath) => {
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
  // 上传
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
    $(".INPUT").empty();
  });
  // 清空output
  $(".outputBtn .empty").on("click", function () {
    OUTPUT = [];
    $(".OUTPUT").empty();
  });

  // 移出(虚拟删除)input中所选项的最外层目录...
  $("inputBtn .remove").on("click", function () {});

  // 撤销output所选
  $(".outputBtn .reset").on("click", function () {
    outputSelect = [];
    $(".OUTPUT .selected").removeClass("selected");
  });

  // 撤销input所选
  $(".inputBtn .reset").on("click", function () {
    inputSelect = [];
    $(".INPUT .selected").removeClass("selected");
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
  });

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
    } else {
      $(".regex-only").hide();
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

  // 取消重命名
  $("#cancelRename").on("click", function () {
    hideRenameDialog();
  });

  // 确认重命名
  $("#confirmRename").on("click", function () {
    executeRename();
  });
}

staticDomEventBind();
