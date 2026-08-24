const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const {
  createAuthedUser,
  createToken,
  invalidId,
  newId
} = require('../../tests/helpers');
const { ROLES } = require('../../constants');
const productRouter = require('./product');
const Product = require('../../models/product');
const Brand = require('../../models/brand');
const Category = require('../../models/category');
const Merchant = require('../../models/merchant');

const app = buildApp(productRouter);

const sortOrder = JSON.stringify({ _id: -1 });

const createBrand = (overrides = {}) =>
  new Brand({ name: 'Acme', isActive: true, ...overrides }).save();

const createProduct = (overrides = {}) =>
  new Product({
    sku: `SKU${Date.now()}${Math.random().toString(36).slice(2)}`,
    name: 'Widget',
    description: 'A widget',
    quantity: 10,
    price: 20,
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

describe('GET /item/:slug', () => {
  it('returns the product when its brand is active', async () => {
    const brand = await createBrand();
    const product = await createProduct({ brand: brand._id });

    const res = await request(app).get(`/item/${product.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.product.slug).toBe(product.slug);
  });

  it('returns 404 when no product matches the slug', async () => {
    const res = await request(app).get('/item/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 404 when the product has no brand', async () => {
    const product = await createProduct({ brand: null });
    const res = await request(app).get(`/item/${product.slug}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the product brand is inactive', async () => {
    const brand = await createBrand({ isActive: false });
    const product = await createProduct({ brand: brand._id });
    const res = await request(app).get(`/item/${product.slug}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Product, 'findOne').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/item/whatever');
    expect(res.status).toBe(400);
  });
});

describe('GET /list/search/:name', () => {
  it('returns matching products', async () => {
    await createProduct({ name: 'Special Widget', isActive: true });

    const res = await request(app).get('/list/search/Special');

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', async () => {
    const res = await request(app).get('/list/search/nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);
  });

  it('returns 400 on an unexpected error', async () => {
    jest.spyOn(Product, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/list/search/whatever');
    expect(res.status).toBe(400);
  });
});

describe('GET /list', () => {
  // Mirrors the real client's advancedFilters defaults (Product/reducer.js):
  // min/max/rating are always sent, never left undefined.
  const baseFilters = { sortOrder, min: 1, max: 2500, rating: 0 };

  it('lists products with default filters', async () => {
    const brand = await createBrand();
    await createProduct({ brand: brand._id });

    const res = await request(app).get('/list').query(baseFilters);

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const brand = await createBrand();
    const product = await createProduct({ brand: brand._id });
    const category = await new Category({
      name: 'Gadgets',
      isActive: true,
      products: [product._id]
    }).save();

    const res = await request(app)
      .get('/list')
      .query({ ...baseFilters, category: category.slug });

    expect(res.status).toBe(200);
  });

  it('filters by brand', async () => {
    const brand = await createBrand();
    await createProduct({ brand: brand._id });

    const res = await request(app)
      .get('/list')
      .query({ ...baseFilters, brand: brand.slug });

    expect(res.status).toBe(200);
  });

  it('decorates results with wishlist state for an authenticated caller', async () => {
    const brand = await createBrand();
    await createProduct({ brand: brand._id });
    const token = createToken({ _id: newId() });

    const res = await request(app)
      .get('/list')
      .query(baseFilters)
      .set('Authorization', token);

    expect(res.status).toBe(200);
  });

  it('computes pagination when the result count exceeds the limit', async () => {
    const brand = await createBrand();
    await Promise.all(
      Array.from({ length: 3 }).map((_, i) =>
        createProduct({ brand: brand._id, name: `Widget ${i}-${Date.now()}` })
      )
    );

    const res = await request(app)
      .get('/list')
      .query({ ...baseFilters, limit: 2, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.totalPages).toBe(2);
  });

  it('returns 400 when sortOrder is not valid JSON', async () => {
    const res = await request(app).get('/list');
    expect(res.status).toBe(400);
  });
});

describe('GET /list/select', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/list/select');
    expect(res.status).toBe(401);
  });

  it('lists product names', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    await createProduct();

    const res = await request(app)
      .get('/list/select')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Product, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app)
      .get('/list/select')
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('POST /add', () => {
  const validBody = () => ({
    sku: `SKU${Date.now()}${Math.random().toString(36).slice(2)}`,
    name: 'Widget',
    description: 'A widget',
    quantity: 5,
    price: 10
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/add').send(validBody());
    expect(res.status).toBe(401);
  });

  it('requires Admin or Merchant role', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Member });
    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(validBody());
    expect(res.status).toBe(403);
  });

  it('rejects a missing sku', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const body = validBody();
    delete body.sku;

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sku/i);
  });

  it('rejects a missing name/description', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const body = validBody();
    delete body.name;

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description & name/i);
  });

  it('rejects a missing quantity', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const body = validBody();
    delete body.quantity;

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/quantity/i);
  });

  it('rejects a missing price', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const body = validBody();
    delete body.price;

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/price/i);
  });

  it('rejects an invalid image URL', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ ...validBody(), imageUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Image URL/i);
  });

  it('rejects a duplicate sku', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const body = validBody();
    await createProduct({ sku: body.sku });

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already in use/i);
  });

  it('creates a product as a Merchant', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Merchant });

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send({ ...validBody(), imageUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.imageUrl).toBe('https://example.com/a.png');
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Product.prototype, 'save').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/add')
      .set('Authorization', token)
      .send(validBody());

    expect(res.status).toBe(400);
  });
});

describe('GET / (dashboard list)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(401);
  });

  it('requires Admin or Merchant role', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Member });
    const res = await request(app).get('/').set('Authorization', token);
    expect(res.status).toBe(403);
  });

  it('lists all products for an admin', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    await createProduct();

    const res = await request(app).get('/').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it("scopes results to the merchant's own brand", async () => {
    const merchant = await new Merchant({ name: 'M', email: 'm@test.com' }).save();
    const brand = await createBrand({ merchant: merchant._id });
    const product = await createProduct({ brand: brand._id });
    const otherBrand = await createBrand();
    await createProduct({ brand: otherBrand._id });

    const { token } = await createAuthedUser({
      role: ROLES.Merchant,
      merchant: merchant._id
    });

    const res = await request(app).get('/').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]._id).toBe(product._id.toString());
  });

  it('returns 400 on an unexpected error', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    jest.spyOn(Product, 'find').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/').set('Authorization', token);
    expect(res.status).toBe(400);
  });
});

describe('GET /:id', () => {
  it('requires authentication', async () => {
    const res = await request(app).get(`/${newId()}`);
    expect(res.status).toBe(401);
  });

  it('requires Admin or Merchant role', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Member });
    const res = await request(app).get(`/${newId()}`).set('Authorization', token);
    expect(res.status).toBe(403);
  });

  it('returns the product for an admin', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await createProduct();

    const res = await request(app)
      .get(`/${product._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.product._id).toBe(product._id.toString());
  });

  it('returns 404 when the product does not exist', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .get(`/${newId()}`)
      .set('Authorization', token);

    expect(res.status).toBe(404);
  });

  it("scopes lookup to the merchant's own brand", async () => {
    const merchant = await new Merchant({ name: 'M', email: 'm2@test.com' }).save();
    const brand = await createBrand({ merchant: merchant._id });
    const product = await createProduct({ brand: brand._id });

    const { token } = await createAuthedUser({
      role: ROLES.Merchant,
      merchant: merchant._id
    });

    const res = await request(app)
      .get(`/${product._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .get(`/${invalidId}`)
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('PUT /:id', () => {
  it('rejects an invalid image URL', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await createProduct();

    const res = await request(app)
      .put(`/${product._id}`)
      .set('Authorization', token)
      .send({ product: { sku: product.sku, slug: product.slug, imageUrl: 'nope' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Image URL/i);
  });

  it('rejects a sku/slug already used by a different product', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const productA = await createProduct({ sku: 'SKU-A' });
    const productB = await createProduct({ sku: 'SKU-B' });

    const res = await request(app)
      .put(`/${productB._id}`)
      .set('Authorization', token)
      .send({ product: { sku: 'SKU-A', slug: productB.slug } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already in use/i);
  });

  it('updates the product', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await createProduct();

    const res = await request(app)
      .put(`/${product._id}`)
      .set('Authorization', token)
      .send({
        product: { sku: product.sku, slug: product.slug, name: 'New Name' }
      });

    expect(res.status).toBe(200);
    const stored = await Product.findById(product._id);
    expect(stored.name).toBe('New Name');
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .put(`/${invalidId}`)
      .set('Authorization', token)
      .send({ product: { sku: 'x', slug: 'x' } });

    expect(res.status).toBe(400);
  });
});

describe('PUT /:id/active', () => {
  it('toggles the active flag', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await createProduct({ isActive: true });

    const res = await request(app)
      .put(`/${product._id}/active`)
      .set('Authorization', token)
      .send({ product: { isActive: false } });

    expect(res.status).toBe(200);
    const stored = await Product.findById(product._id);
    expect(stored.isActive).toBe(false);
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .put(`/${invalidId}/active`)
      .set('Authorization', token)
      .send({ product: { isActive: false } });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /delete/:id', () => {
  it('deletes the product', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });
    const product = await createProduct();

    const res = await request(app)
      .delete(`/delete/${product._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const stored = await Product.findById(product._id);
    expect(stored).toBeNull();
  });

  it('returns 400 on a malformed id', async () => {
    const { token } = await createAuthedUser({ role: ROLES.Admin });

    const res = await request(app)
      .delete(`/delete/${invalidId}`)
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });
});
