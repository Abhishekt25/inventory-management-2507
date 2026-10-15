const httpErr = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, extra });

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const isPosInt = (n) => Number.isInteger(n) && n > 0;

module.exports = { httpErr, wrap, isPosInt };
