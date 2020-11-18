const removeRedundantOptions = (template, options) => {
  for (const key of Object.keys(options)) {
    if (!(key in template)) {
      delete options[key];
    }
  }
};

/**
 *  Remove redundant options and add defaults for missing options.
 */
const normalizeOptions = (options, defaultOptions) => {
  removeRedundantOptions(defaultOptions, options);
  for (const [optionKey, defaultOption] of Object.entries(defaultOptions)) {
    const option = options[optionKey];
    const optionIsUndefined = typeof option === 'undefined';
    const isNestedOptions = typeof option === 'object';
    if (optionIsUndefined) {
      options[optionKey] = defaultOption;
    } else if (isNestedOptions) {
      normalizeOptions(defaultOption, option);
    }
  }
};

export { normalizeOptions };
