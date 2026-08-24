const mongoose = require('mongoose');

const setupDB = require('./db');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('setupDB', () => {
  it('connects successfully and logs the success message', async () => {
    jest.spyOn(mongoose, 'connect').mockResolvedValue({});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await setupDB();
    // Flush the .then() chained onto the (mocked) connect() promise.
    await new Promise(resolve => setImmediate(resolve));

    expect(mongoose.connect).toHaveBeenCalledWith(
      process.env.MONGO_URI,
      expect.objectContaining({ useNewUrlParser: true })
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('logs the error but still resolves when the connection attempt rejects', async () => {
    jest.spyOn(mongoose, 'connect').mockReturnValue(Promise.reject(new Error('conn failed')));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(setupDB()).resolves.toBeUndefined();
    await new Promise(resolve => setImmediate(resolve));

    expect(logSpy).toHaveBeenCalled();
  });

  it('returns null if something inside throws synchronously', async () => {
    jest.spyOn(mongoose, 'set').mockImplementation(() => {
      throw new Error('sync fail');
    });

    const result = await setupDB();
    expect(result).toBeNull();
  });
});
