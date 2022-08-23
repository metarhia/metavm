const script = `onmessage = (e) => {
  const func =
    new Function(\`return \${e.data.source}\`)()(...e.data.values);
  const value = typeof func === 'function' ? func() : func;
  postMessage({
    value: value,
    name: e.data.name,
  });
};`;

const RUN_OPTIONS = {
  timeout: 1000,
  inWorker: true,
};

class VMWorker {
  constructor() {
    this.calls = new Map();
    this.worker = new Worker(URL.createObjectURL(new Blob([script])));
    this.worker.addEventListener('message', (event) => {
      const { name, value } = event.data;
      if (!this.calls.has(name)) return;
      if (value) this.calls.get(name).resolve(value);
      else this.calls.get(name).reject(`Couldn't execute script ${name}`);
    });
  }

  execScript(name, script, context, { inWorker, timeout }) {
    const source = `(${Object.keys(context)}) => ${script}`;
    const values = Object.values(context);
    if (!inWorker) {
      const func = Function(`return ${source}`)()(...values);
      return typeof func === 'function' ? func() : func;
    }
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        name,
        source,
        values,
      });
      this.calls.set(name, { resolve, reject });
      setTimeout(() => {
        reject('Response timeout');
      }, timeout);
    });
  }
}

const worker = new VMWorker();

// adding it to keep compability with packages that already using it
// most of the browser apis are already available when running script
// can be used for additional libriries
const COMMON_CONTEXT = Object.freeze({});

const EMPTY_CONTEXT = Object.freeze({});

const createContext = (context) => {
  if (context === undefined) return EMPTY_CONTEXT;
  return context;
};

class MetaScript {
  constructor(name, src, options = {}) {
    this.name = name;
    this.src = src;
    this.runOptions = { ...RUN_OPTIONS, ...options };

    this.context = options.context ? options.context : createContext();
  }

  get exports() {
    return worker.execScript(
      this.name,
      this.src,
      this.context,
      this.runOptions,
    );
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

export {
  createContext,
  createScript,
  MetaScript,
  EMPTY_CONTEXT,
  COMMON_CONTEXT,
};
