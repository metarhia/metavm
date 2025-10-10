'use strict';

const local = 'hello';

module.exports = async (...args) => {
  const result = { local, args };
  return result;
};
