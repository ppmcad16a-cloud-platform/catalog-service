const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const { createAuthedUser, invalidId, newId } = require('../../tests/helpers');
const { REVIEW_STATUS } = require('../../constants');
const reviewRouter = require('./review');
const Review = require('../../models/review');
const Product = require('../../models/product');
const Brand = require('../../models/brand');

const app = buildApp(reviewRouter);

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

describe('POST /add', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/add').send({});
    expect(res.status).toBe(401);
  });

  it('creates a review defaulting to Waiting_Approval', async () => {
    const { user, token } = await createAuthedUser();
    const product = await new Product({ sku: 'SKU-R1', name: 'Reviewed' }).save();

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ product: product._id, title: 'Great', rating: 5, review: 'Nice' });

    expect(res.status).toBe(200);
    expect(res.body.review.user).toBe(user._id.toString());
    expect(res.body.review.status).toBe(REVIEW_STATUS.Waiting_Approval);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser();
    jest.spyOn(Review.prototype, 'save').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /', () => {
  it('lists every review regardless of status', async () => {
    const { user } = await createAuthedUser();
    await new Review({ user: user._id, title: 'A', status: REVIEW_STATUS.Waiting_Approval }).save();
    await new Review({ user: user._id, title: 'B', status: REVIEW_STATUS.Rejected }).save();

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Review, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/');
    expect(res.status).toBe(400);
  });
});

describe('GET /:slug', () => {
  it('returns only approved reviews for the product', async () => {
    const brand = await new Brand({ name: 'B', isActive: true }).save();
    const product = await new Product({ sku: 'SKU-R2', name: 'Slugged', brand: brand._id }).save();
    const { user } = await createAuthedUser();
    await new Review({ user: user._id, product: product._id, status: REVIEW_STATUS.Approved }).save();
    await new Review({ user: user._id, product: product._id, status: REVIEW_STATUS.Waiting_Approval }).save();

    const res = await request(app).get(`/${product.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
  });

  it('returns 404 when the product does not exist', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 404 when the product has no active brand', async () => {
    const product = await new Product({ sku: 'SKU-R3', name: 'NoBrand', brand: null }).save();
    const res = await request(app).get(`/${product.slug}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Product, 'findOne').mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/whatever');
    expect(res.status).toBe(400);
  });
});

describe('PUT /:id', () => {
  it('updates a review', async () => {
    const { user } = await createAuthedUser();
    const review = await new Review({ user: user._id, title: 'Old' }).save();

    const res = await request(app).put(`/${review._id}`).send({ title: 'New' });

    expect(res.status).toBe(200);
    const stored = await Review.findById(review._id);
    expect(stored.title).toBe('New');
  });

  it('returns 400 on a malformed id', async () => {
    const res = await request(app).put(`/${invalidId}`).send({ title: 'New' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /approve/:reviewId', () => {
  it('requires authentication', async () => {
    const res = await request(app).put(`/approve/${newId()}`);
    expect(res.status).toBe(401);
  });

  it('approves a review', async () => {
    const { user, token } = await createAuthedUser();
    const review = await new Review({ user: user._id, status: REVIEW_STATUS.Waiting_Approval }).save();

    const res = await request(app)
      .put(`/approve/${review._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const stored = await Review.findById(review._id);
    expect(stored.status).toBe(REVIEW_STATUS.Approved);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser();
    const res = await request(app)
      .put(`/approve/${invalidId}`)
      .set('Authorization', token);
    expect(res.status).toBe(400);
  });
});

describe('PUT /reject/:reviewId', () => {
  it('requires authentication', async () => {
    const res = await request(app).put(`/reject/${newId()}`);
    expect(res.status).toBe(401);
  });

  it('rejects a review', async () => {
    const { user, token } = await createAuthedUser();
    const review = await new Review({ user: user._id, status: REVIEW_STATUS.Waiting_Approval }).save();

    const res = await request(app)
      .put(`/reject/${review._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const stored = await Review.findById(review._id);
    expect(stored.status).toBe(REVIEW_STATUS.Rejected);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser();
    const res = await request(app)
      .put(`/reject/${invalidId}`)
      .set('Authorization', token);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /delete/:id', () => {
  it('deletes a review', async () => {
    const { user } = await createAuthedUser();
    const review = await new Review({ user: user._id }).save();

    const res = await request(app).delete(`/delete/${review._id}`);

    expect(res.status).toBe(200);
    expect(await Review.findById(review._id)).toBeNull();
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Review, 'deleteOne').mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).delete(`/delete/${newId()}`);
    expect(res.status).toBe(400);
  });
});
