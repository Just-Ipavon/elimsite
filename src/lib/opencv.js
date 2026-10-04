import { useEffect, useState } from 'react';

const OPENCV_URL = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.8.0-release.10/dist/opencv.js';
const POLL_INTERVAL_MS = 200;
const LOAD_TIMEOUT_MS = 90_000;

let loadingPromise;

// Attende che il runtime WebAssembly di OpenCV sia pronto (compare cv.Mat).
const waitForRuntime = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const cv = window.cv;
      if (cv instanceof Promise) {
        cv.then((module) => {
          window.cv = module;
          resolve();
        }, reject);
      } else if (cv?.Mat) {
        resolve();
      } else if (Date.now() - startedAt > LOAD_TIMEOUT_MS) {
        reject(new Error('Timeout nel caricamento di OpenCV.js'));
      } else {
        setTimeout(check, POLL_INTERVAL_MS);
      }
    };
    check();
  });

/**
 * Scarica ed esegue opencv.js una sola volta. Il file è un modulo UMD: se
 * Monaco ha già installato il suo loader AMD globale (`define`), opencv.js si
 * registrerebbe lì e `window.cv` non verrebbe mai creato. Eseguendolo con
 * `define`, `module` ed `exports` nascosti finisce sempre in `window.cv`.
 */
const loadOpenCv = () => {
  if (window.cv?.Mat) return Promise.resolve();
  if (!loadingPromise) {
    loadingPromise = fetch(OPENCV_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((code) => {
        new Function('define', 'module', 'exports', code).call(window);
        return waitForRuntime();
      });
    // In caso di errore un nuovo tentativo riparte da zero.
    loadingPromise.catch(() => {
      loadingPromise = undefined;
    });
  }
  return loadingPromise;
};

/**
 * Stato di caricamento di OpenCV.js: 'loading' | 'ready' | 'error'.
 */
export const useOpenCv = () => {
  const [status, setStatus] = useState(() => (window.cv?.Mat ? 'ready' : 'loading'));

  useEffect(() => {
    if (status !== 'loading') return undefined;
    let active = true;
    loadOpenCv().then(
      () => active && setStatus('ready'),
      (err) => {
        console.error('OpenCV.js non caricato:', err);
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [status]);

  return status;
};

// ---------------------------------------------------------------------------
// Porting in JS delle parti "a mano" del codice C++ di riferimento, così il
// visualizzatore mostra esattamente ciò che fa l'algoritmo studiato e non
// dipende da funzioni assenti in alcune build di OpenCV.js (es. floodFill).
// ---------------------------------------------------------------------------

// Canny: modulo normalizzato, fase, NMS e isteresi come in myCanny().
const cannyFromGradients = (dxData, dyData, rows, cols, lowThresh, highThresh) => {
  const n = rows * cols;
  const magF = new Float32Array(n);
  const phase = new Float32Array(n);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const gx = dxData[i];
    const gy = dyData[i];
    const m = Math.hypot(gx, gy);
    magF[i] = m;
    if (m < min) min = m;
    if (m > max) max = m;
    // cv::phase(..., true) restituisce gradi in [0, 360).
    const deg = (Math.atan2(gy, gx) * 180) / Math.PI;
    phase[i] = deg < 0 ? deg + 360 : deg;
  }

  // normalize(mag, mag, 0, 255, NORM_MINMAX, CV_8U)
  const mag = new Uint8Array(n);
  const scale = max > min ? 255 / (max - min) : 0;
  for (let i = 0; i < n; i += 1) mag[i] = Math.round((magF[i] - min) * scale);

  // nonMaxSuppression
  const nms = new Uint8Array(n);
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const i = r * cols + c;
      const a = phase[i] >= 180 ? phase[i] - 180 : phase[i];
      let q;
      let p;
      if (a < 22.5 || a >= 157.5) {
        q = mag[i - 1];
        p = mag[i + 1];
      } else if (a < 67.5) {
        q = mag[i - cols - 1];
        p = mag[i + cols + 1];
      } else if (a < 112.5) {
        q = mag[i - cols];
        p = mag[i + cols];
      } else {
        q = mag[i - cols + 1];
        p = mag[i + cols - 1];
      }
      if (mag[i] >= q && mag[i] >= p) nms[i] = mag[i];
    }
  }

  // hysteresis
  const out = new Uint8Array(n);
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const i = r * cols + c;
      if (nms[i] < highThresh) continue;
      out[i] = 255;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const j = i + dr * cols + dc;
          if (nms[j] >= lowThresh && nms[j] < highThresh) out[j] = 255;
        }
      }
    }
  }
  return out;
};

const NEIGHBOURS_8 = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];

// Region growing: stessa logica di grow()/regionGrowing() su dati RGB(A).
// Restituisce le etichette (0 = rumore/regione piccola, 1..N = regioni).
const regionGrowingLabels = (data, channels, rows, cols, th = 204, minAreaRatio = 0.01) => {
  const n = rows * cols;
  const labels = new Int32Array(n); // 0 = non assegnato, -1 = rumore
  const inRegion = new Int32Array(n); // id della crescita che ha visitato il pixel
  const minRegionArea = Math.floor(n * minAreaRatio);
  const stack = [];
  const region = [];
  let growId = 0;
  let label = 0;

  for (let seed = 0; seed < n; seed += 1) {
    if (labels[seed] !== 0) continue;
    growId += 1;
    region.length = 0;
    stack.push(seed);
    inRegion[seed] = growId;

    while (stack.length) {
      const center = stack.pop();
      region.push(center);
      const cy = Math.floor(center / cols);
      const cx = center - cy * cols;
      const ci = center * channels;
      for (const [dx, dy] of NEIGHBOURS_8) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const neigh = y * cols + x;
        if (labels[neigh] !== 0 || inRegion[neigh] === growId) continue;
        const ni = neigh * channels;
        const d0 = data[ci] - data[ni];
        const d1 = data[ci + 1] - data[ni + 1];
        const d2 = data[ci + 2] - data[ni + 2];
        if (d0 * d0 + d1 * d1 + d2 * d2 < th) {
          inRegion[neigh] = growId;
          stack.push(neigh);
        }
      }
    }

    const value = region.length > minRegionArea ? (label += 1) : -1;
    for (const idx of region) labels[idx] = value;
  }
  return { labels, count: label };
};

// Colore distinto per ogni etichetta (angolo aureo sulla tinta).
const labelColor = (label) => {
  const h = (label * 137.508) % 360;
  const s = 0.65;
  const l = 0.55;
  const k = (m) => (m + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (m) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(m) - 3, 9 - k(m), 1))));
  return [f(0), f(8), f(4)];
};

// Harris: stessa sequenza di harris() (Sobel 11, blur 7×7, R = det − k·trace²).
// Restituisce R normalizzata in [0, 255].
const harrisResponse = (cv, gray, track, k) => {
  const dx = track(new cv.Mat());
  const dy = track(new cv.Mat());
  cv.Sobel(gray, dx, cv.CV_32F, 1, 0, 11, 1, 0, cv.BORDER_DEFAULT);
  cv.Sobel(gray, dy, cv.CV_32F, 0, 1, 11, 1, 0, cv.BORDER_DEFAULT);

  const n = gray.rows * gray.cols;
  const dx2 = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  const dy2 = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  const dxdy = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  for (let i = 0; i < n; i += 1) {
    const gx = dx.data32F[i];
    const gy = dy.data32F[i];
    dx2.data32F[i] = gx * gx;
    dy2.data32F[i] = gy * gy;
    dxdy.data32F[i] = gx * gy;
  }

  const c00 = track(new cv.Mat());
  const c11 = track(new cv.Mat());
  const c01 = track(new cv.Mat());
  const size = new cv.Size(7, 7);
  cv.GaussianBlur(dx2, c00, size, 2, 0, cv.BORDER_DEFAULT);
  cv.GaussianBlur(dy2, c11, size, 0, 2, cv.BORDER_DEFAULT);
  cv.GaussianBlur(dxdy, c01, size, 2, 2, cv.BORDER_DEFAULT);

  const R = new Float64Array(n);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const a = c00.data32F[i];
    const b = c11.data32F[i];
    const c = c01.data32F[i];
    const trace = a + b;
    const r = a * b - c * c - k * trace * trace;
    R[i] = r;
    if (r < min) min = r;
    if (r > max) max = r;
  }
  const scale = max > min ? 255 / (max - min) : 0;
  for (let i = 0; i < n; i += 1) R[i] = (R[i] - min) * scale;
  return R;
};

// Hough rette: stesso accumulatore di houghLines() (θ indicizzato 0..179 = θ−90°).
const houghLinesVotes = (edges, rows, cols) => {
  const maxDist = Math.floor(Math.hypot(rows, cols));
  const votes = new Int32Array((2 * maxDist + 1) * 180);
  const cosT = new Float64Array(180);
  const sinT = new Float64Array(180);
  for (let t = 0; t < 180; t += 1) {
    cosT[t] = Math.cos(((t - 90) * Math.PI) / 180);
    sinT[t] = Math.sin(((t - 90) * Math.PI) / 180);
  }
  for (let x = 0; x < rows; x += 1) {
    for (let y = 0; y < cols; y += 1) {
      if (edges[x * cols + y] !== 255) continue;
      for (let t = 0; t < 180; t += 1) {
        const rho = Math.round(y * cosT[t] + x * sinT[t]) + maxDist;
        votes[rho * 180 + t] += 1;
      }
    }
  }
  return { votes, maxDist };
};

// Otsu a due soglie: stessi cicli di otsu2k().
const otsu2kThresholds = (grayData) => {
  const his = new Float64Array(256);
  for (let i = 0; i < grayData.length; i += 1) his[grayData[i]] += 1;
  for (let i = 0; i < 256; i += 1) his[i] /= grayData.length;
  let gMean = 0;
  for (let i = 0; i < 256; i += 1) gMean += i * his[i];

  const prob = [0, 0, 0];
  const cum = [0, 0, 0];
  let maxVar = 0;
  const kstar = [0, 0];
  for (let i = 0; i < 256 - 2; i += 1) {
    prob[0] += his[i];
    cum[0] += i * his[i];
    for (let j = i + 1; j < 256 - 1; j += 1) {
      prob[1] += his[j];
      cum[1] += j * his[j];
      for (let k = j + 1; k < 256; k += 1) {
        prob[2] += his[k];
        cum[2] += k * his[k];
        let v = 0;
        for (let w = 0; w < 3; w += 1) v += prob[w] * (cum[w] / prob[w] - gMean) ** 2;
        if (v > maxVar) {
          maxVar = v;
          kstar[0] = i;
          kstar[1] = j;
        }
      }
      prob[2] = 0;
      cum[2] = 0;
    }
    prob[1] = 0;
    cum[1] = 0;
  }
  return kstar;
};

// Split (QuadTree): divide finché la somma delle deviazioni standard dei
// canali supera la soglia e il blocco è più largo di 4 pixel; ogni foglia
// viene colorata con il suo colore medio.
const quadTreeSplit = (data, channels, size, out, thStd) => {
  const visit = (x0, y0, s) => {
    const sum = [0, 0, 0];
    const sq = [0, 0, 0];
    for (let y = y0; y < y0 + s; y += 1) {
      for (let x = x0; x < x0 + s; x += 1) {
        const p = (y * size + x) * channels;
        for (let c = 0; c < 3; c += 1) {
          sum[c] += data[p + c];
          sq[c] += data[p + c] * data[p + c];
        }
      }
    }
    const n = s * s;
    const mean = sum.map((v) => v / n);
    const std = sq.reduce((acc, v, c) => acc + Math.sqrt(Math.max(0, v / n - mean[c] * mean[c])), 0);
    if (s > 4 && std > thStd) {
      const h = s / 2;
      visit(x0, y0, h);
      visit(x0 + h, y0, h);
      visit(x0, y0 + h, h);
      visit(x0 + h, y0 + h, h);
      return;
    }
    for (let y = y0; y < y0 + s; y += 1) {
      for (let x = x0; x < x0 + s; x += 1) {
        const p = (y * size + x) * 3;
        out[p] = mean[0];
        out[p + 1] = mean[1];
        out[p + 2] = mean[2];
      }
    }
  };
  visit(0, 0, size);
};

// Tutti gli algoritmi lavorano su una copia 256×256 di Lena, così il risultato
// non dipende da quanto è grande l'immagine nella pagina.
export const WORK_SIZE = 256;

const readSource = (cv, imgEl) => {
  const canvas = document.createElement('canvas');
  canvas.width = WORK_SIZE;
  canvas.height = WORK_SIZE;
  canvas.getContext('2d').drawImage(imgEl, 0, 0, WORK_SIZE, WORK_SIZE);
  return cv.imread(canvas);
};

/**
 * Esegue con OpenCV.js l'algoritmo `algoId` leggendo da `imgEl` e disegnando
 * su `canvasEl`. `params` contiene le soglie scelte dall'utente (vedi
 * `params` in algorithms.js); i valori mancanti usano quelli del codice C++.
 * Tutte le Mat allocate vengono liberate anche in caso di errore.
 */
export const runVisualAlgorithm = (algoId, imgEl, canvasEl, params = {}) => {
  const cv = window.cv;
  const mats = [];
  const track = (mat) => {
    mats.push(mat);
    return mat;
  };
  const p = (key, fallback) => (params[key] ?? fallback);

  try {
    const src = track(readSource(cv, imgEl));
    const gray = track(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    const rows = gray.rows;
    const cols = gray.cols;
    let dst = track(new cv.Mat());

    switch (algoId) {
      case 'canny': {
        const gauss = track(new cv.Mat());
        cv.GaussianBlur(gray, gauss, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        const dx = track(new cv.Mat());
        const dy = track(new cv.Mat());
        cv.Sobel(gauss, dx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
        cv.Sobel(gauss, dy, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
        const edges = cannyFromGradients(dx.data32F, dy.data32F, rows, cols, p('low', 30), p('high', 90));
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC1));
        dst.data.set(edges);
        break;
      }

      case 'harris': {
        const R = harrisResponse(cv, gray, track, p('k', 0.04));
        const th = p('threshold', 100);
        dst = track(new cv.Mat());
        cv.cvtColor(gray, dst, cv.COLOR_GRAY2RGBA);
        const color = new cv.Scalar(255, 85, 85, 255);
        // Come circleCorners() (R > soglia), ma per leggibilità si disegna un
        // solo cerchio per angolo: il massimo locale nell'intorno 5×5.
        for (let y = 2; y < rows - 2; y += 1) {
          for (let x = 2; x < cols - 2; x += 1) {
            const v = R[y * cols + x];
            if (v <= th) continue;
            let isMax = true;
            for (let dy = -2; dy <= 2 && isMax; dy += 1) {
              for (let dx = -2; dx <= 2; dx += 1) {
                if (R[(y + dy) * cols + x + dx] > v) {
                  isMax = false;
                  break;
                }
              }
            }
            if (isMax) cv.circle(dst, new cv.Point(x, y), 4, color, 1);
          }
        }
        break;
      }

      case 'hough_circles': {
        dst = track(src.clone());
        const circles = track(new cv.Mat());
        cv.medianBlur(gray, gray, 5);
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 20, 100, p('votes', 30), p('minRadius', 10), p('maxRadius', 40));
        const color = new cv.Scalar(255, 0, 255, 255);
        for (let i = 0; i < circles.cols; i += 1) {
          const x = circles.data32F[i * 3];
          const y = circles.data32F[i * 3 + 1];
          const radius = circles.data32F[i * 3 + 2];
          cv.circle(dst, new cv.Point(x, y), radius, color, 2);
        }
        break;
      }

      case 'hough_lines': {
        const blurred = track(new cv.Mat());
        cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
        const edges = track(new cv.Mat());
        cv.Canny(blurred, edges, p('cannyLow', 50), p('cannyHigh', 150), 3, false);
        const { votes, maxDist } = houghLinesVotes(edges.data, rows, cols);
        dst = track(src.clone());
        const color = new cv.Scalar(255, 0, 0, 255);
        const th = p('votes', 100);
        for (let i = 0; i < 2 * maxDist + 1; i += 1) {
          for (let j = 0; j < 180; j += 1) {
            if (votes[i * 180 + j] < th) continue;
            const rho = i - maxDist;
            const rad = ((j - 90) * Math.PI) / 180;
            const x0 = Math.round(rho * Math.cos(rad));
            const y0 = Math.round(rho * Math.sin(rad));
            const pt1 = new cv.Point(Math.round(x0 - 1000 * Math.sin(rad)), Math.round(y0 + 1000 * Math.cos(rad)));
            const pt2 = new cv.Point(Math.round(x0 + 1000 * Math.sin(rad)), Math.round(y0 - 1000 * Math.cos(rad)));
            cv.line(dst, pt1, pt2, color, 1);
          }
        }
        break;
      }

      case 'otsu':
        cv.threshold(gray, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        break;

      case 'otsu2k': {
        const [th1, th2] = otsu2kThresholds(gray.data);
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC1));
        for (let i = 0; i < gray.data.length; i += 1) {
          const v = gray.data[i];
          dst.data[i] = v >= th2 ? 255 : v >= th1 ? 127 : 0;
        }
        break;
      }

      case 'region_growing': {
        const { labels } = regionGrowingLabels(
          src.data,
          src.channels(),
          rows,
          cols,
          p('threshold', 204),
          p('minArea', 1) / 100,
        );
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC3));
        const palette = new Map();
        for (let i = 0; i < labels.length; i += 1) {
          const label = labels[i];
          let color = palette.get(label);
          if (!color) {
            color = label > 0 ? labelColor(label) : [40, 42, 54];
            palette.set(label, color);
          }
          dst.data[i * 3] = color[0];
          dst.data[i * 3 + 1] = color[1];
          dst.data[i * 3 + 2] = color[2];
        }
        break;
      }

      case 'kmeans': {
        const rgb = track(new cv.Mat());
        cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
        const pixels = rows * cols;
        const samples32 = track(new cv.Mat(pixels, 3, cv.CV_32F));
        for (let i = 0; i < pixels * 3; i += 1) samples32.data32F[i] = rgb.data[i];
        const labels = track(new cv.Mat());
        const centers = track(new cv.Mat());
        const criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 10, 1.0);
        cv.kmeans(samples32, p('k', 6), labels, criteria, 3, cv.KMEANS_PP_CENTERS, centers);
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC3));
        for (let i = 0; i < labels.rows; i += 1) {
          const label = labels.intAt(i, 0);
          for (let c = 0; c < 3; c += 1) dst.data[i * 3 + c] = centers.floatAt(label, c);
        }
        break;
      }

      case 'split_merge': {
        const blurred = track(new cv.Mat());
        cv.GaussianBlur(src, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC3));
        quadTreeSplit(blurred.data, blurred.channels(), Math.min(rows, cols), dst.data, p('stddev', 30));
        break;
      }

      default:
        cv.cvtColor(gray, dst, cv.COLOR_GRAY2RGBA);
    }

    cv.imshow(canvasEl, dst);
  } finally {
    mats.forEach((mat) => {
      if (!mat.isDeleted()) mat.delete();
    });
  }
};

/** Valori iniziali dei parametri di un algoritmo (quelli del codice C++). */
export const defaultParams = (algo) =>
  Object.fromEntries((algo.params ?? []).map((param) => [param.key, param.default]));

export const clearCanvas = (canvasEl) => {
  const ctx = canvasEl?.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
};
