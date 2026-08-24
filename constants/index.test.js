const constants = require('./index');

it('exposes every shared enum used across models/routes', () => {
  expect(constants.ROLES).toEqual({
    Admin: 'ROLE ADMIN',
    Member: 'ROLE MEMBER',
    Merchant: 'ROLE MERCHANT'
  });
  expect(constants.MERCHANT_STATUS).toEqual({
    Rejected: 'Rejected',
    Approved: 'Approved',
    Waiting_Approval: 'Waiting Approval'
  });
  expect(constants.REVIEW_STATUS).toEqual({
    Rejected: 'Rejected',
    Approved: 'Approved',
    Waiting_Approval: 'Waiting Approval'
  });
  expect(constants.EMAIL_PROVIDER).toEqual({ Email: 'Email' });
});
