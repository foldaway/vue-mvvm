// 观察者（发布订阅）模式
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;

    // 默认先存放一个旧值
    this.oldVal = this.get();
  }

  get() {
    // 先把自己放在this上
    Dep.target = this;
    // 取值 把这个观察者和数据关联起来 此处是重点!!!
    const value = CompileUtil.getVal(this.vm, this.expr);
    // 不取消 任何值取值 都会添加watcher
    Dep.target = null;

    return value;
  }

  update() {
    // 更新操作 数据变化后 调用观察者到update方法
    const newVal = CompileUtil.getVal(this.vm, this.expr);
    if (newVal !== this.oldVal) {
      this.cb(newVal);
    }
  }
}

// 订阅
class Dep {
  constructor() {
    this.subs = []; // 存放所有watcher
  }

  // 订阅
  addSub(watcher) {
    // 添加观察者
    this.subs.push(watcher);
  }

  // 发布
  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}

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
        // 如果是元素的话 需要把自己传进去 再遍历子节点
        this.compile(child);
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
      const { name, value: expr } = attr; // v-model = "school.name"
      if (this.isDirective(name)) {
        // v-model v-html v-bind
        // console.log(node);
        const [, directive] = name.split("-"); // v-on:click
        const [directiveName, eventName] = directive.split(":");

        // 需要调用不同的指令来处理
        CompileUtil[directiveName](node, expr, this.vm, eventName);
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
    const content = node.textContent;
    // console.log(content);
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content) // 找到所有文本
      CompileUtil["text"](node, content, this.vm);
    }
  }
}

CompileUtil = {
  // 解析v-model这个指令
  model(node, expr, vm) {
    // node是节点 expr是表达式 vm是当前实例

    // 给输入框赋予value属性
    const fn = this.updater["modelUpdater"];

    new Watcher(vm, expr, (newVal) => {
      // 给输入框加一个观察者 如果数据更新了会触发此方法 用新值 赋给输入框
      fn(node, newVal);
    });

    node.addEventListener("input", (e) => {
      const value = e.target.value; // 获取用户输入内容
      this.setVal(vm, expr, value);
    });

    const value = this.getVal(vm, expr);
    fn(node, value);
  },
  html(node, expr, vm) {
    // v-html="message"
    // node是节点 expr是表达式

    // 给输入框赋予value属性
    const fn = this.updater["htmlUpdater"];

    new Watcher(vm, expr, (newVal) => {
      // 给输入框加一个观察者 如果数据更新了会触发此方法 用新值 赋给输入框
      fn(node, newVal);
    });

    const value = this.getVal(vm, expr);
    fn(node, value);
  },
  getContentVal(vm, expr) {
    // 遍历表达式 将内容 重新替换成一个完整的内容 返还回去
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(vm, args[1]);
    });
  },
  text(node, expr, vm) {
    // expr=>{{a}} {{b}}
    const content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      // console.log(args)

      // 给表达式中每个{{变量}}都加上观察者
      new Watcher(vm, args[1], () => {
        const contentVal = this.getContentVal(vm, expr); // 返回一个全的字符串
        fn(node, contentVal);
      });

      return this.getVal(vm, args[1]);
    });

    const fn = this.updater["textUpdater"];
    fn(node, content);
  },
  on(node, expr, vm, eventName) {
    // v-on:click = 'change' expr
    node.addEventListener(eventName, (e) => {
      vm[expr].call(vm, e); // this.change?
    });
  },
  getVal(vm, expr) {
    // 根据表达式获取对应数据
    return expr.split(".").reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  // 当v-model指令 设置值
  setVal(vm, expr, value) {
    // vm.$data 'school.name' '姜文'
    expr.split(".").reduce((data, current, index, arr) => {
      if (index == arr.length - 1) {
        return (data[current] = value);
      }

      return data[current];
    }, vm.$data);
  },
  updater: {
    // 把数据插入节点中
    modelUpdater(node, value) {
      node.value = value;
    },
    htmlUpdater(node, value) {
      // xss攻击
      node.innerHTML = value;
    },
    textUpdater(node, value) {
      // 处理文本节点
      node.textContent = value;
    },
  },
};

// 转换数据
class Observer {
  constructor(data) {
    this.observer(data);
  }

  observer(data) {
    // 如果是对象才观察
    if (data && typeof data == "object") {
      // 如果是对象
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }

  defineReactive(obj, key, value) {
    // 如果value是{} 递归
    this.observer(value);

    const dep = new Dep(); // 给每一个属性 都加上一个具有发布订阅

    Object.defineProperty(obj, key, {
      get() {
        // 创建watcher时 会取到对应的内容 并且把watcher放到全局
        Dep.target && dep.addSub(Dep.target);

        return value;
      },
      set: (newVal) => {
        if (newVal != value) {
          // 同样 如果newVal={} 递归
          this.observer(newVal);

          value = newVal;

          // 数据变化 通知视图
          dep.notify();
        }
      },
    });
  }
}

// 基础类
class Vue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    let computed = options.computed;
    let methods = options.methods;

    // 如果根元素存在 就编译模版
    if (this.$el) {
      // 把数据 全部转化成用Object.defineProperty定义
      new Observer(this.$data);
      // console.log(this.$data);

      // 内部处理computed
      for (let key in computed) {
        // 有依赖关系 数据
        Object.defineProperty(this.$data, key, {
          get: () => {
            return computed[key].call(this);
          },
        });
      }

      // 处理methods
      for (let key in methods) {
        Object.defineProperty(this, key, {
          get() {
            return methods[key];
          },
        });
      }

      // 把数据获取操作 vm上当取值操作 都代理到 vm.$data
      this.proxyVm(this.$data);

      // 编译模版
      new Compiler(this.$el, this);
    }
  }

  proxyVm(data) {
    for (let key in data) {
      Object.defineProperty(this, key, {
        // 实现可以通过vm取到对应的内容
        get() {
          return data[key]; // 进行了转化操作
        },
        set(newVal) {
          // 此处有坑 容易忘记写set
          data[key] = newVal;
        },
      });
    }
  }
}
