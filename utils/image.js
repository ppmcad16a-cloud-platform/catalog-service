const isValidImageUrl = imageUrl => /^https?:\/\/.+/i.test(imageUrl);

module.exports = { isValidImageUrl };
