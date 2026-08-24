const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const { createAuthedUser, invalidId, newId, waitFor } = require('../../tests/helpers');
const { ROLES } = require('../../constants');
const brandRouter = require('./brand');
const Brand = require('../../models/brand');
const Product = require('../../models/product');
const Merchant = require('../../models/merchant');

const app = buildApp(brandRouter);

const createBrand = (overrides = {}) =>
  new Brand({ name: `Brand${Date.now()}${Math.random()}`, isActive: true, ...overrides }).save();

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

  it('creates a brand', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ name: 'Nike', description: 'Shoes', isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.brand.name).toBe('Nike');
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Brand.prototype, 'save').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ name: 'Nike', description: 'Shoes' });

    expect(res.status).toBe(400);
  });
});

describe('GET /list', () => {
  it('lists only active brands', async () => {
    await createBrand({ isActive: true });
    await createBrand({ isActive: false });

    const res = await request(app).get('/list');

    expect(res.status).toBe(200);
    expect(res.body.brands).toHaveLength(1);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Brand, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/list');
    expect(res.status).toBe(400);
  });
});

describe('GET /', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(401);
  });

  it('lists all brands for an admin', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    await createBrand();

    const res = await request(app).get('/').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.brands.length).toBeGreaterThan(0);
  });

  it("scopes results to the merchant's own brand", async () => {
    const merchant = await new Merchant({ name: 'M', email: 'm1@test.com' }).save();
    await createBrand({ merchant: merchant._id });
    await createBrand();

    const { token } = await createAuthedUser({
      role: ROLES.Merchant,
      merchant: merchant._id
    });

    const res = await request(app).get('/').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.brands).toHaveLength(1);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Brand, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/').set('Authorization', token);
    expect(res.status).toBe(400);
  });
});

describe('GET /:id', () => {
  it('returns the brand', async () => {
    const brand = await createBrand();
    const res = await request(app).get(`/${brand._id}`);
    expect(res.status).toBe(200);
    expect(res.body.brand._id).toBe(brand._id.toString());
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

describe('GET /list/select', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/list/select');
    expect(res.status).toBe(401);
  });

  it('lists brand names for an admin', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    await createBrand();

    const res = await request(app)
      .get('/list/select')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.brands.length).toBeGreaterThan(0);
  });

  it("scopes names to the merchant's own brand", async () => {
    const merchant = await new Merchant({ name: 'M', email: 'm2@test.com' }).save();
    await createBrand({ merchant: merchant._id });
    await createBrand();

    const { token } = await createAuthedUser({
      role: ROLES.Merchant,
      merchant: merchant._id
    });

    const res = await request(app)
      .get('/list/select')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.brands).toHaveLength(1);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Brand, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app)
      .get('/list/select')
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('PUT /:id', () => {
  it('rejects a slug already used by a different brand', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const brandA = await createBrand({ name: 'Alpha' });
    const brandB = await createBrand({ name: 'Beta' });

    const res = await request(app)
      .put(`/${brandB._id}`)
      .set('Authorization', token)
      .send({ brand: { slug: brandA.slug } });

    expect(res.status).toBe(400);
  });

  it('updates the brand', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const brand = await createBrand();

    const res = await request(app)
      .put(`/${brand._id}`)
      .set('Authorization', token)
      .send({ brand: { description: 'Updated' } });

    expect(res.status).toBe(200);
    const stored = await Brand.findById(brand._id);
    expect(stored.description).toBe('Updated');
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .put(`/${invalidId}`)
      .set('Authorization', token)
      .send({ brand: {} });
    expect(res.status).toBe(400);
  });
});

describe('PUT /:id/active', () => {
  it('deactivates the brand and cascades to its products', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const brand = await createBrand();
    const product = await new Product({
      sku: 'SKU-CASCADE',
      name: 'Cascade Product',
      isActive: true,
      brand: brand._id
    }).save();

    const res = await request(app)
      .put(`/${brand._id}/active`)
      .set('Authorization', token)
      .send({ brand: { isActive: false } });

    expect(res.status).toBe(200);

    // disableProducts (utils/store.js) is fire-and-forget, so poll for the
    // real DB write instead of guessing how many ticks it needs.
    await waitFor(async () => {
      const current = await Product.findById(product._id);
      return current.isActive === false;
    });
  });

  it('reactivating a brand does not touch products', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const brand = await createBrand({ isActive: false });

    const res = await request(app)
      .put(`/${brand._id}/active`)
      .set('Authorization', token)
      .send({ brand: { isActive: true } });

    expect(res.status).toBe(200);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const res = await request(app)
      .put(`/${invalidId}/active`)
      .set('Authorization', token)
      .send({ brand: { isActive: false } });
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

  it('deletes the brand and resets its merchant to waiting approval', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const merchant = await new Merchant({
      name: 'M',
      email: 'm3@test.com',
      isActive: true,
      status: 'Approved'
    }).save();
    const brand = await createBrand({ merchant: merchant._id });
    merchant.brand = brand._id;
    await merchant.save();

    const res = await request(app)
      .delete(`/delete/${brand._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const storedBrand = await Brand.findById(brand._id);
    expect(storedBrand).toBeNull();
    const storedMerchant = await Merchant.findById(merchant._id);
    expect(storedMerchant.isActive).toBe(false);
    expect(storedMerchant.brand).toBeNull();
  });

  it('deletes a brand with no merchant without error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const brand = await createBrand();

    const res = await request(app)
      .delete(`/delete/${brand._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Brand, 'deleteOne').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .delete(`/delete/${newId()}`)
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});
