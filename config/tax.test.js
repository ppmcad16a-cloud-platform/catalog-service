const tax = require('./tax');

it('exposes the hardcoded single-jurisdiction tax rate', () => {
  expect(tax).toEqual({
    stateCode: 'CA',
    stateName: 'California',
    stateTaxRate: 0.05
  });
});
