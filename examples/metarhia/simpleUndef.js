({
  field: 'value',

  add(a, b) {
    return a.unknown() + b.unknown();
  },

  sub: (a, b) => a.unknown() - b.unknown(),
});
