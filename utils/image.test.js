const { isValidImageUrl } = require('./image');

it('accepts http/https URLs', () => {
  expect(isValidImageUrl('http://example.com/a.png')).toBe(true);
  expect(isValidImageUrl('https://example.com/a.png')).toBe(true);
});

it('rejects non-http(s) values', () => {
  expect(isValidImageUrl('ftp://example.com/a.png')).toBe(false);
  expect(isValidImageUrl('not-a-url')).toBe(false);
  expect(isValidImageUrl('')).toBe(false);
});
