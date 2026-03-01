import { createSyncScheduler } from "../sync-engine";

describe("createSyncScheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fires syncFn once after 1s debounce when notifyWrite called twice", () => {
    const syncFn = jest.fn().mockResolvedValue(undefined);
    const { notifyWrite, cleanup } = createSyncScheduler(syncFn);

    notifyWrite();
    notifyWrite();

    expect(syncFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(syncFn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("triggerNow fires immediately", () => {
    const syncFn = jest.fn().mockResolvedValue(undefined);
    const { triggerNow, cleanup } = createSyncScheduler(syncFn);

    triggerNow();

    expect(syncFn).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("cleanup cancels pending debounce", () => {
    const syncFn = jest.fn().mockResolvedValue(undefined);
    const { notifyWrite, cleanup } = createSyncScheduler(syncFn);

    notifyWrite();
    cleanup();

    jest.advanceTimersByTime(2000);

    expect(syncFn).not.toHaveBeenCalled();
  });
});
