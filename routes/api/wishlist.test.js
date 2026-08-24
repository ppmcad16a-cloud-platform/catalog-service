const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const { createAuthedUser, newId } = require('../../tests/helpers');
const wishlistRouter = require('./wishlist');
const Wishlist = require('../../models/wishlist');
const Product = require('../../models/product');

const app = buildApp(wishlistRouter);

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clear();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbHandler.disconnect();
});

describe('POST /', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/').send({ product: newId(), isLiked: true });
    expect(res.status).toBe(401);
  });

  it('creates a new wishlist row when none exists', async () => {
    const { user, token } = await createAuthedUser();
    const product = await new Product({ sku: 'SKU-W1', name: 'Wished' }).save();

    const res = await request(app)
      .post('/')
      .set('Authorization', token)
      .send({ product: product._id, isLiked: true });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/added to your wishlist/i);

    const stored = await Wishlist.findOne({ user: user._id, product: product._id });
    expect(stored.isLiked).toBe(true);
  });

  it('updates the existing row instead of duplicating it', async () => {
    const { user, token } = await createAuthedUser();
    const product = await new Product({ sku: 'SKU-W2', name: 'Wished2' }).save();
    await new Wishlist({ user: user._id, product: product._id, isLiked: true }).save();

    const res = await request(app)
      .post('/')
      .set('Authorization', token)
      .send({ product: product._id, isLiked: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    const rows = await Wishlist.find({ user: user._id, product: product._id });
    expect(rows).toHaveLength(1);
    expect(rows[0].isLiked).toBe(false);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser();
    jest.spyOn(Wishlist, 'findOneAndUpdate').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/')
      .set('Authorization', token)
      .send({ product: newId(), isLiked: true });

    expect(res.status).toBe(400);
  });
});

describe('GET /', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(401);
  });

  it('lists only currently-liked rows', async () => {
    const { user, token } = await createAuthedUser();
    const product = await new Product({ sku: 'SKU-W3', name: 'Wished3' }).save();
    await new Wishlist({ user: user._id, product: product._id, isLiked: true }).save();
    const product2 = await new Product({ sku: 'SKU-W4', name: 'Wished4' }).save();
    await new Wishlist({ user: user._id, product: product2._id, isLiked: false }).save();

    const res = await request(app).get('/').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.wishlist).toHaveLength(1);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser();
    jest.spyOn(Wishlist, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/').set('Authorization', token);
    expect(res.status).toBe(400);
  });
});
