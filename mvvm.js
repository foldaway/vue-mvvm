// 编译模版
class Compiler {
  constructor(el, vm) {
    // 判断el属性 是不是一个元素 如果不是元素 那就获取
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    // console.log(this.el);

    this.vm = vm;

    // 把当前节点中的元素 获取到 并放到内存中
    const fragment = this.node2fragment(this.el);

    // 1.把节点中到内容进行替换

    // 2.编译模版 填充数据
    this.compile(fragment);

    // 3.把内容重新放到页面上
    this.el.appendChild(fragment);
  }

  isElementNode(node) {
    return node.nodeType === 1;
  }

  // 把节点移到内存中
  node2fragment(node) {
    // 创建一个文档碎片
    const fragment = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      // appendChild具有移动性
      fragment.appendChild(firstChild);
    }
    return fragment;
  }

  // 核心编译方法 用来编译内存中的dom节点
  compile(node) {
    const childNodes = node.childNodes; // 类数组

    [...childNodes].forEach((child) => {
      if (this.isElementNode(child)) {
        // console.log('element', child)
        this.compileElement(child);
      } else {
        // console.log('text', child);
        this.compileText(child);
      }
    });
  }

  // 编译元素
  compileElement(node) {
    const attributes = node.attributes; // 类数组
    [...attributes].forEach((attr) => {
      // console.log(attr);
      const { name, value } = attr;
      if (this.isDirective(name)) {
        console.log(node);
      }
    });
  }

  // 判断是否指令
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }

  // 编译文本
  compileText(node) {
    // 判断当前文本节点中内容是否包含'{{}}'
  }
}

// 基础类
class Vue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;

    // 如果根元素存在 就编译模版
    if (this.$el) {
      new Compiler(this.$el, this);
    }
  }
}
