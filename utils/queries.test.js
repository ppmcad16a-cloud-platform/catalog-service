const Mongoose = require('mongoose');

const {
  getStoreProductsQuery,
  getStoreProductsWishListQuery
} = require('./queries');

describe('getStoreProductsQuery', () => {
  it('builds a price range filter when both min and max are given', () => {
    const pipeline = getStoreProductsQuery('10', '100', '4');
    const matchStage = pipeline.find(
      stage => stage.$match && 'price' in stage.$match
    );

    expect(matchStage.$match.price).toEqual({ $gte: 10, $lte: 100 });
    expect(matchStage.$match.averageRating).toEqual({ $gte: 4 });
  });

  it('omits the price filter when min/max are not both provided', () => {
    const pipeline = getStoreProductsQuery(undefined, undefined, '0');
    const matchStage = pipeline.find(
      stage => stage.$match && 'price' in stage.$match
    );

    expect(matchStage.$match.price).toBeUndefined();
  });

  it('returns the full aggregate pipeline stages', () => {
    const pipeline = getStoreProductsQuery(1, 100, 0);
    const stageKeys = pipeline.map(stage => Object.keys(stage)[0]);

    expect(stageKeys).toEqual([
      '$lookup',
      '$unwind',
      '$addFields',
      '$match',
      '$lookup',
      '$addFields',
      '$addFields',
      '$match',
      '$project'
    ]);
  });
});

describe('getStoreProductsWishListQuery', () => {
  it('builds a lookup + addFields pipeline keyed on the given userId', () => {
    const userId = new Mongoose.Types.ObjectId().toString();
    const pipeline = getStoreProductsWishListQuery(userId);

    expect(pipeline).toHaveLength(2);
    expect(pipeline[0].$lookup.from).toBe('wishlists');
    expect(pipeline[1].$addFields.isLiked).toBeDefined();
  });
});
