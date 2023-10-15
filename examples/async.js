async (name, data) => {
  if (!name) throw Error('Argument name is not defiled');
  const result = { name, data };
  return result;
};
