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
  const children = [];
  const subItem = window.readDir(dir);
  subItem.forEach((item) => {
    const path = dir + seperator + item;
    children.push({ name: item, path });
  });
  return children;
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

function staticDomEventBind() {
  // 上传
  $(".DRAG").on("dragover", function (event) {
    event.preventDefault();
  });

  $(".DRAG").on("drop", function (event) {
    event.preventDefault();
    const files = Array.from(event.originalEvent.dataTransfer.files);
    const target = $(this).hasClass("input") ? "INPUT" : "OUTPUT";

    files.forEach((file) => window[target].push(file));
    DomCreateing($("." + target), window[target]);
  });

  // 清空Input
  $(".emptyInput").on("click", function () {
    INPUT = [];
    $(".INPUT").empty();
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
    $(".OUTPUT [selected]").attr("selected", false);
    DomCreateing($(".INPUT"), INPUT);
  });

  // 清空OutPut所选
  $(".resetOutput").on("click", function () {
    outputSelect = [];
    $(".OUTPUT .selected").removeClass("selected");
  });

  // 复制Input所选文件到Output所选目录
  $(".copyToOutput").on("click", function () {
    inputSelect.forEach((i) => {
      const name = getNameFromPath(i);
      outputSelect.forEach((o) => {
        // 只有是目录的才执行...
        if (window.isDir(o)) window.copyTo(i, o + seperator + name);
      });
    });
  });

  // 虚拟删除 删除Input\Output中所选项的最外层文件夹...
  $(".removeSelected").on("click", function () {});

  // 删除Input\Output中所选文件
  $(".deleteSelected").on("click", function () {
    // 获取不重复的所有所选路径
    let origin = [...outputSelect, ...inputSelect];
    let uniqueArr = Array.from(new Set(origin));
    uniqueArr.forEach(window.deleteFile);
    $("[selected]").remove();
    outputSelect = [];
    inputSelect = [];
  });
}

staticDomEventBind();
