export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(nextStateOrUpdater) {
    const nextState = typeof nextStateOrUpdater === 'function'
      ? nextStateOrUpdater(state)
      : nextStateOrUpdater;
    state = { ...state, ...(nextState || {}) };
    listeners.forEach((listener) => listener(state));
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function select(selector) {
    return selector(state);
  }

  return {
    getState,
    setState,
    subscribe,
    select,
  };
}
