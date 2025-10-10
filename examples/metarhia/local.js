const local = 'hello';

async (...args) => {
  const result = { local, args };
  return result;
};
