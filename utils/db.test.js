const mongoose = require('mongoose');

const setupDB = require('./db');

const makeLogger = () => ({ info: jest.fn(), error: jest.fn() });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('setupDB', () => {
  it('connects and logs success', async () => {
    jest.spyOn(mongoose, 'connect').mockResolvedValue({});
    const logger = makeLogger();
    const onFailure = jest.fn();

    await setupDB({ logger, onFailure });

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
    expect(mongoose.get('strictQuery')).toBe(false);
    expect(logger.info).toHaveBeenCalledWith('MongoDB connected');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('logs and calls onFailure when the first connection fails', async () => {
    const error = new Error('conn failed');
    jest.spyOn(mongoose, 'connect').mockRejectedValue(error);
    const logger = makeLogger();
    const onFailure = jest.fn();

    await setupDB({ logger, onFailure });

    expect(logger.error).toHaveBeenCalledWith({ err: error }, 'MongoDB connection failed');
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it('defaults to console logging and exiting the process with code 1', async () => {
    jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('conn failed'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    await setupDB();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
