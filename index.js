const seperator = utools.isWindows() ? "\\" : "/";

// uTools API onPluginEnter(callback)
utools.onPluginEnter(({ code, type, payload, option }) => {});
utools
  .readCurrentFolderPath()
  .then((dir) => {
    const name = getNameFromPath(dir);
    const children = getSubData(dir);
    const root = {
      root: true,
      name,
      path: dir,
      children,
    };

    OUTPUT.push(root);

    DomCreateing($(".OUTPUT"), OUTPUT);
  })
  .catch((err) => {
    console.log(err);
  });

// Model - 数据结构
// [
//   {
//     root :true,
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
var inputSelect = [];
var OUTPUT = [];
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
    const expendTag =
      isFolder && !item.root // root目录不需要expand
        ? `<span class="expand" path="${path}">+</span>`
        : "";
    result += `<li path="${path}">${expendTag} ${item.name}`;
    if (item.children) {
      result += generateList(item.children);
    }
    result += "</li>";
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
  $container.find("li").click(function (event) {
    event.stopPropagation(); // 阻止事件冒泡
    const path = decodeURIComponent($(this).attr("path"));
    const selected = !!$(this).attr("selected");
    $(this).attr("selected", selected ? false : true);
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
    const path = decodeURIComponent($(this).attr("path"));
    const $parent = $(`li[path='${path}']`);
    const $this = $(this);
    if ($this.text() === "+") {
      // 如果未展开
      const children = getSubData(path);
      const subDom = generateList(children);
      $parent.append(subDom);
      EventBinding($parent);
      $this.text("-");
    } else {
      // 收起
      $this.text("+");
      $parent.find("ul").remove();
    }
  });
}

function StaticDomBinding() {
  // 上传
  $(".DRAG").on("dragover", function (event) {
    event.preventDefault();
  });

  $(".DRAG").on("drop", function (event) {
    event.preventDefault();
    const files = Array.from(event.originalEvent.dataTransfer.files);
    files.forEach((file) => INPUT.push(file));
    DomCreateing($(".INPUT"), INPUT);
  });

  // 清空Input
  $(".emptyInput").on("click", function () {
    INPUT = [];
    $(".INPUT").empty();
  });

  // 移动
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

  // 清空OutPut
  $(".resetOutput").on("click", function () {
    outputSelect = [];
    $(".OUTPUT [selected]").attr("selected", false);
  });
}

StaticDomBinding();
