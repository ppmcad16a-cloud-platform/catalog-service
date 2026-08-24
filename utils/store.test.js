const store = require('./store');
const Product = require('../models/product');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('disableProducts', () => {
  it('bulk-deactivates the given products', () => {
    const spy = jest.spyOn(Product, 'bulkWrite').mockResolvedValue({});

    store.disableProducts([{ _id: 'id1' }, { _id: 'id2' }]);

    expect(spy).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'id1' }, update: { isActive: false } } },
      { updateOne: { filter: { _id: 'id2' }, update: { isActive: false } } }
    ]);
  });
});

describe('caculateTaxAmount', () => {
  it('computes totalPrice/tax for non-cancelled items, taxable and non-taxable', () => {
    const order = {
      total: 0,
      products: [
        {
          purchasePrice: 0,
          quantity: 2,
          product: { price: 10, taxable: true },
          priceWithTax: 0,
          status: 'Not processed',
          totalPrice: 0,
          totalTax: 0
        },
        {
          purchasePrice: 0,
          quantity: 1,
          product: { price: 5, taxable: false },
          priceWithTax: 0,
          status: 'Not processed',
          totalPrice: 0,
          totalTax: 0
        }
      ]
    };

    const result = store.caculateTaxAmount(order);

    expect(result.products[0].totalPrice).toBe(20);
    expect(result.products[1].totalPrice).toBe(5);
    expect(result.totalWithTax).toBeGreaterThan(result.total);
    expect(result.total).toBe(25);
  });

  it('recomputes the order total when an item is cancelled', () => {
    const order = {
      total: 100,
      products: [
        {
          purchasePrice: 10,
          quantity: 2,
          product: { price: 10, taxable: false },
          priceWithTax: 0,
          status: 'Cancelled',
          totalPrice: 20,
          totalTax: 0
        },
        {
          purchasePrice: 5,
          quantity: 1,
          product: { price: 5, taxable: false },
          priceWithTax: 0,
          status: 'Not processed',
          totalPrice: 5,
          totalTax: 0
        }
      ]
    };

    const result = store.caculateTaxAmount(order);

    expect(result.total).toBe(5);
  });

  it('returns the order unchanged if something throws', () => {
    const result = store.caculateTaxAmount(null);
    expect(result).toBeNull();
  });

  it('falls back to 0 when neither purchasePrice nor product.price is set', () => {
    const order = {
      total: 0,
      products: [
        {
          purchasePrice: 0,
          quantity: 2,
          product: undefined,
          priceWithTax: 0,
          status: 'Not processed',
          totalPrice: 0,
          totalTax: 0
        }
      ]
    };

    const result = store.caculateTaxAmount(order);

    expect(result.products[0].totalPrice).toBe(0);
  });

  it('skips the per-item loop entirely when products is empty', () => {
    const order = { total: 0, products: [] };

    const result = store.caculateTaxAmount(order);

    expect(result.totalTax).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('caculateOrderTotal', () => {
  it('sums totalPrice of non-cancelled items only', () => {
    const order = {
      products: [
        { status: 'Not processed', totalPrice: 10 },
        { status: 'Cancelled', totalPrice: 100 }
      ]
    };

    expect(store.caculateOrderTotal(order)).toBe(10);
  });
});

describe('caculateItemsSalesTax', () => {
  it('stamps price/tax fields onto each item', () => {
    const items = [
      { price: 10, quantity: 2, taxable: true },
      { price: 5, quantity: 1, taxable: false }
    ];

    const result = store.caculateItemsSalesTax(items);

    expect(result[0].totalPrice).toBe(20);
    expect(result[0].totalTax).toBeGreaterThan(0);
    expect(result[1].totalTax).toBe(0);
    expect(result[1].priceWithTax).toBe(0);
  });
});

describe('formatOrders', () => {
  it('flattens populated order docs and runs caculateTaxAmount when products exist', () => {
    const orders = [
      {
        _id: 'o1',
        total: 10,
        created: new Date(),
        cart: {
          products: [
            {
              status: 'Not processed',
              quantity: 1,
              purchasePrice: 10,
              product: { price: 10, taxable: false },
              priceWithTax: 0,
              totalPrice: 0,
              totalTax: 0
            }
          ]
        }
      },
      {
        _id: 'o2',
        total: 5,
        created: new Date(),
        cart: null
      }
    ];

    const result = store.formatOrders(orders);

    expect(result[0].products).toBeDefined();
    expect(result[0].totalWithTax).toBeDefined();
    expect(result[1].products).toBeUndefined();
  });
});
