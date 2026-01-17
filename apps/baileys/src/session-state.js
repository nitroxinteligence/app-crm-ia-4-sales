export const sessions = new Map();
export const restartState = new Map();
export const badSessionState = new Map();

export const clearRestartState = (integrationAccountId) => {
  const state = restartState.get(integrationAccountId);
  if (state?.timer) clearTimeout(state.timer);
  restartState.delete(integrationAccountId);
};
