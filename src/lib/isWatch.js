// Uno smartwatch (es. Galaxy Watch, 480×480 px fisici) ha uno schermo che non supera
// i 500 px CSS nemmeno sul lato lungo; qualunque telefono è più grande.
const WATCH_MAX_SIDE = 500;

/** true se lo schermo è quello di uno smartwatch. */
export const isWatchScreen = () => {
  const maxSide = Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return maxSide > 0 && maxSide <= WATCH_MAX_SIDE;
};
