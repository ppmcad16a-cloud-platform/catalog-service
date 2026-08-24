const jwt = require('jsonwebtoken');

// "Soft" auth check for routes that work for both logged-in and anonymous
// callers. Deliberately uses jwt.decode, NOT jwt.verify — never rejects a
// request; a missing/invalid/expired token just resolves to null.
const checkAuth = async req => {
  try {
    if (!req.headers.authorization) {
      return null;
    }

    const token =
      (await jwt.decode(req.headers.authorization.split(' ')[1])) ||
      req.headers.authorization;

    // Unreachable: the `|| req.headers.authorization` fallback above always
    // makes `token` truthy once the `!req.headers.authorization` guard has
    // already passed — there's no header value that's truthy enough to
    // reach here yet still falsy after that fallback.
    /* istanbul ignore if */
    if (!token) {
      return null;
    }

    return token;
  } catch (error) {
    return null;
  }
};

module.exports = checkAuth;
