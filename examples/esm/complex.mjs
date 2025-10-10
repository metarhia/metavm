const field = 'value';

const add = (a, b, callback) => {
  setTimeout(() => {
    callback(new Error('Custom error'), a + b);
  }, 10);
};

export { field, add };

