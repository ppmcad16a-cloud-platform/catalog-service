const role = require('./role');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
});

describe('role.check', () => {
  it('responds 401 when req.user is missing', () => {
    const middleware = role.check('ROLE ADMIN');
    const res = mockRes();
    const next = jest.fn();

    middleware({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when the role does not match any allowed role', () => {
    const middleware = role.check('ROLE ADMIN');
    const res = mockRes();
    const next = jest.fn();

    middleware({ user: { role: 'ROLE MEMBER' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the role matches one of the allowed roles', () => {
    const middleware = role.check('ROLE ADMIN', 'ROLE MERCHANT');
    const res = mockRes();
    const next = jest.fn();

    middleware({ user: { role: 'ROLE MERCHANT' } }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
