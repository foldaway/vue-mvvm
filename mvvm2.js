// 基础类
class Vue {
  constructor(opt) {
    this.$el = opt.el;
    this.$data = opt.data;

    // 如果元素存在 就编译模板
    if (this.$el) {
      // 转换数据
      new Observer(this.$data);

      // 编译模板
      new Compiler(this.$el, this);
    }
  }
}

// 编译模板
class Compiler {
  constructor(el, vm) {
    // 判断el属性 是不是一个元素 如果不是元素 就获取
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;

    // 把当前节点中的元素 放到内存中
    // 1. 把节点中的内容进行替换
    const fragment = this.node2fragment(this.el);

    // 2. 编译模板 填充数据
    this.compile(fragment);

    // 3. 把内容重新放到页面上
    this.el.appendChild(fragment);
  }

  isElementNode(node) {
    return node.nodeType === 1;
  }

  // 把节点移到内存中
  node2fragment(node) {
    const fragment = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      // appendChild具有移动性
      fragment.appendChild(firstChild);
    }
    return fragment;
  }

  // 核心编译方法 编译内存中dom节点
  compile(node) {
    const childNodes = node.childNodes; // 类数组
    [...childNodes].forEach((child) => {
      if (this.isElementNode(child)) {
        // 编译元素
        this.compileElement(child);
        // 如果是元素 就把自己传进去 遍历子节点
        this.compile(child);
      } else {
        // 编译文本
        this.compileText(child);
      }
    });
  }

  // 编译元素
  compileElement(node) {
    // console.log(node);
    const attributes = node.attributes; // 类数组
    [...attributes].forEach((attr) => {
      const { name, value: expr } = attr;
      if (this.isDirective(name)) {
        const [, directive] = name.split("-");

        // 需要处理不同的指令
        compileUtil[directive](node, expr, this.vm);
      }
    });
  }

  // 判断指令
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }

  // 编译文本
  compileText(node) {
    // console.log(node);
    // 判断当前文本节点中是否包含{{}}
    const content = node.textContent;
    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil["text"](node, content, this.vm);
    }
  }
}

const compileUtil = {
  // v-model
  model(node, expr, vm) {
    new Watcher(vm, expr, (newVal) => {
      node.value = newVal;
    });

    node.addEventListener("input", (e) => {
      const value = e.target.value;
      this.setVal(vm, expr, value);
    });

    node.value = this.getVal(vm, expr);
  },
  text(node, expr, vm) {
    const content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], (newVal) => {
        node.textContent = newVal;
      });

      return this.getVal(vm, args[1]);
    });
    node.textContent = content;
  },
  getVal(vm, expr) {
    return expr.split(".").reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  setVal(vm, expr, value) {
    expr.split(".").reduce((data, current, index, arr) => {
      if (index === arr.length - 1) {
        return (data[current] = value);
      }
      return data[current];
    }, vm.$data);
  },
};

// 转换数据
class Observer {
  constructor(data) {
    this.observer(data);
  }

  observer(data) {
    // 如果是对象 才观察
    if (data && typeof data === "object") {
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }

  defineReactive(obj, key, value) {
    // 如果value是{} 就递归
    this.observer(value);

    // 给每一个属性加上一个订阅者
    const dep = new Dep();

    Object.defineProperty(obj, key, {
      get() {
        // 重点
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: (newVal) => {
        if (newVal !== value) {
          // 如果newVal是{} 就递归
          this.observer(newVal);

          value = newVal;

          // 数据变化 通知视图
          dep.notify();
        }
      },
    });
  }
}

/**
 * dep->watcher->update
 */

// 观察者模式（发布订阅）
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;

    // 默认值
    this.oldVal = this.get();
  }

  get() {
    Dep.target = this;
    // 取值 把这个观察者和数据关联起来 此处是重点!!!
    const val = compileUtil.getVal(this.vm, this.expr);
    Dep.target = null;

    return val;
  }

  update() {
    const newVal = compileUtil.getVal(this.vm, this.expr);
    if (newVal !== this.oldVal) {
      this.cb(newVal);
    }
  }
}

// 订阅
class Dep {
  constructor() {
    // 存放所有watcher
    this.subs = [];
  }

  // 添加订阅者
  addSub(watcher) {
    this.subs.push(watcher);
  }

  // 通知订阅者
  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}
