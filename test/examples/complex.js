({
  field: 'value',

  add: (a, b, callback) => {
    setTimeout(() => {
      callback(new Error('Custom error'), a + b);
    }, 10);
  },
});
