const local = 'hello';

export default async (...args) => {
  const result = { local, args };
  return result;
};

