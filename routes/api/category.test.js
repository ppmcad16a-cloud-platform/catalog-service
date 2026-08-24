const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const { createAuthedUser, invalidId, newId, waitFor } = require('../../tests/helpers');
const { ROLES } = require('../../constants');
const categoryRouter = require('./category');
const Category = require('../../models/category');
const Product = require('../../models/product');

const app = buildApp(categoryRouter);

const createCategory = (overrides = {}) =>
  new Category({
    name: `Category${Date.now()}${Math.random()}`,
    isActive: true,
    ...overrides
  }).save();

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
    const res = await request(app).post('/add').send({ name: 'A', description: 'B' });
    expect(res.status).toBe(401);
  });

  it('requires the Admin role', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Merchant });
    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ name: 'A', description: 'B' });
    expect(res.status).toBe(403);
  });

  it('rejects a missing name/description', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({});
    expect(res.status).toBe(400);
  });

  it('creates a category', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ name: 'Gadgets', description: 'Tech stuff', isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('Gadgets');
  });

  it('returns 400 when save fails (callback-style error)', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest
      .spyOn(Category.prototype, 'save')
      .mockImplementationOnce(function (cb) {
        cb(new Error('boom'));
      });

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ name: 'Gadgets', description: 'Tech stuff' });

    expect(res.status).toBe(400);
  });
});

describe('GET /list', () => {
  it('lists only active categories', async () => {
    await createCategory({ isActive: true });
    await createCategory({ isActive: false });

    const res = await request(app).get('/list');

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Category, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/list');
    expect(res.status).toBe(400);
  });
});

describe('GET /', () => {
  it('lists every category regardless of active state', async () => {
    await createCategory({ isActive: true });
    await createCategory({ isActive: false });

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(2);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Category, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/');
    expect(res.status).toBe(400);
  });
});

describe('GET /:id', () => {
  it('returns the category with its products populated', async () => {
    const product = await new Product({ sku: 'SKU-CAT', name: 'P' }).save();
    const category = await createCategory({ products: [product._id] });

    const res = await request(app).get(`/${category._id}`);

    expect(res.status).toBe(200);
    expect(res.body.category.products[0].name).toBe('P');
  });

  it('returns 404 when not found', async () => {
    const res = await request(app).get(`/${newId()}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on a malformed id', async () => {
    const res = await request(app).get(`/${invalidId}`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /:id', () => {
  it('rejects a slug already used by a different category', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const categoryA = await createCategory({ name: 'Alpha' });
    const categoryB = await createCategory({ name: 'Beta' });

    const res = await request(app)
      .put(`/${categoryB._id}`)
      .set('Authorization', token)
      .send({ category: { slug: categoryA.slug } });

    expect(res.status).toBe(400);
  });

  it('updates the category', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const category = await createCategory();

    const res = await request(app)
      .put(`/${category._id}`)
      .set('Authorization', token)
      .send({ category: { description: 'Updated' } });

    expect(res.status).toBe(200);
    const stored = await Category.findById(category._id);
    expect(stored.description).toBe('Updated');
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .put(`/${invalidId}`)
      .set('Authorization', token)
      .send({ category: {} });
    expect(res.status).toBe(400);
  });
});

describe('PUT /:id/active', () => {
  it('deactivates the category and cascades to its products', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await new Product({
      sku: 'SKU-CAT-CASCADE',
      name: 'Cascade Product',
      isActive: true
    }).save();
    const category = await createCategory({ products: [product._id] });

    const res = await request(app)
      .put(`/${category._id}/active`)
      .set('Authorization', token)
      .send({ category: { isActive: false } });

    expect(res.status).toBe(200);
    await waitFor(async () => {
      const current = await Product.findById(product._id);
      return current.isActive === false;
    });
  });

  it('reactivating a category does not touch products', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const category = await createCategory({ isActive: false });

    const res = await request(app)
      .put(`/${category._id}/active`)
      .set('Authorization', token)
      .send({ category: { isActive: true } });

    expect(res.status).toBe(200);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .put(`/${invalidId}/active`)
      .set('Authorization', token)
      .send({ category: { isActive: false } });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /delete/:id', () => {
  it('requires the Admin role', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Merchant });
    const res = await request(app)
      .delete(`/delete/${newId()}`)
      .set('Authorization', token);
    expect(res.status).toBe(403);
  });

  it('deletes the category', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const category = await createCategory();

    const res = await request(app)
      .delete(`/delete/${category._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const stored = await Category.findById(category._id);
    expect(stored).toBeNull();
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Category, 'deleteOne').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .delete(`/delete/${newId()}`)
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});
