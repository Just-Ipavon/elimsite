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

  // nonMaxSuppression: (dy, dx) è il passo verso il vicino lungo il gradiente.
  const nms = new Uint8Array(n);
  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      const i = y * cols + x;
      const a = phase[i] % 180;
      let step;
      if (a < 22.5 || a >= 157.5) step = 1;
      else if (a < 67.5) step = cols + 1;
      else if (a < 112.5) step = cols;
      else step = cols - 1;
      if (mag[i] >= mag[i + step] && mag[i] >= mag[i - step]) nms[i] = mag[i];
    }
  }

  // hysteresis: forti (> hth) e vicini deboli (lth < v < hth).
  const out = new Uint8Array(n);
  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      const i = y * cols + x;
      if (nms[i] <= highThresh) continue;
      out[i] = 255;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const j = i + dy * cols + dx;
          if (nms[j] > lowThresh && nms[j] < highThresh) out[j] = 255;
        }
      }
    }
  }
  return out;
};

// Region growing: stessa logica di grow()/regionGrowing() su dati RGB(A).
// Restituisce le etichette (0 = non visitato, -1 = ignorato, 1..N = regioni).
const MAX_REGIONS = 100;
const regionGrowingLabels = (data, channels, rows, cols, th = 200, minAreaRatio = 0.01) => {
  const n = rows * cols;
  const labels = new Int32Array(n);
  const mask = new Int32Array(n); // id della crescita che ha visitato il pixel
  const minRegionArea = Math.floor(n * minAreaRatio);
  const front = [];
  const region = [];
  let growId = 0;
  let label = 1;

  for (let seed = 0; seed < n; seed += 1) {
    if (labels[seed] !== 0) continue;
    growId += 1;
    region.length = 0;
    front.push(seed);
    mask[seed] = growId;

    while (front.length) {
      const p = front.pop();
      region.push(p);
      const py = Math.floor(p / cols);
      const px = p - py * cols;
      const pi = p * channels;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = px + dx;
          const y = py + dy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const q = y * cols + x;
          if (labels[q] !== 0 || mask[q] === growId) continue;
          const qi = q * channels;
          const d0 = data[pi] - data[qi];
          const d1 = data[pi + 1] - data[qi + 1];
          const d2 = data[pi + 2] - data[qi + 2];
          if (d0 * d0 + d1 * d1 + d2 * d2 < th) {
            mask[q] = growId;
            front.push(q);
          }
        }
      }
    }

    const valid = region.length > minRegionArea;
    for (const idx of region) labels[idx] = valid ? label : -1;
    if (valid && ++label > MAX_REGIONS) break;
  }
  return labels;
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

// Harris: stessa sequenza di harris() (Sobel 3×3, blur 7×7 σ = 2, R = det − k·trace²).
// Restituisce R normalizzata in [0, 255].
const harrisResponse = (cv, gray, track, k) => {
  const dx = track(new cv.Mat());
  const dy = track(new cv.Mat());
  cv.Sobel(gray, dx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
  cv.Sobel(gray, dy, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);

  const n = gray.rows * gray.cols;
  const dx2 = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  const dy2 = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  const dxy = track(new cv.Mat(gray.rows, gray.cols, cv.CV_32F));
  for (let i = 0; i < n; i += 1) {
    const gx = dx.data32F[i];
    const gy = dy.data32F[i];
    dx2.data32F[i] = gx * gx;
    dy2.data32F[i] = gy * gy;
    dxy.data32F[i] = gx * gy;
  }

  const sx2 = track(new cv.Mat());
  const sy2 = track(new cv.Mat());
  const sxy = track(new cv.Mat());
  const size = new cv.Size(7, 7);
  cv.GaussianBlur(dx2, sx2, size, 2, 2, cv.BORDER_DEFAULT);
  cv.GaussianBlur(dy2, sy2, size, 2, 2, cv.BORDER_DEFAULT);
  cv.GaussianBlur(dxy, sxy, size, 2, 2, cv.BORDER_DEFAULT);

  const R = new Float64Array(n);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const a = sx2.data32F[i];
    const b = sy2.data32F[i];
    const c = sxy.data32F[i];
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

// Hough rette: stesso accumulatore di houghLines() (righe = ρ + maxDist, colonne = θ in gradi).
const houghLinesVotes = (edges, rows, cols) => {
  const maxDist = Math.floor(Math.hypot(rows, cols));
  const votes = new Int32Array((2 * maxDist + 1) * 180);
  const cosT = new Float64Array(180);
  const sinT = new Float64Array(180);
  for (let t = 0; t < 180; t += 1) {
    cosT[t] = Math.cos((t * Math.PI) / 180);
    sinT[t] = Math.sin((t * Math.PI) / 180);
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (edges[y * cols + x] !== 255) continue;
      for (let t = 0; t < 180; t += 1) {
        const rho = Math.round(x * cosT[t] + y * sinT[t]) + maxDist;
        votes[rho * 180 + t] += 1;
      }
    }
  }
  return { votes, maxDist };
};

// Hough cerchi: stesso accumulatore 3D di houghCircles() (b, a, r − rMin).
// Gli spostamenti (r·cos θ, r·sin θ) vengono calcolati una volta per raggio.
const houghCirclesVotes = (edges, rows, cols, rMin, rMax) => {
  const radii = Math.max(0, rMax - rMin + 1);
  const votes = new Int32Array(rows * cols * radii);
  for (let ri = 0; ri < radii; ri += 1) {
    const r = rMin + ri;
    const offA = new Int32Array(360);
    const offB = new Int32Array(360);
    for (let t = 0; t < 360; t += 1) {
      const theta = (t * Math.PI) / 180;
      offA[t] = Math.round(-r * Math.cos(theta));
      offB[t] = Math.round(-r * Math.sin(theta));
    }
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (edges[y * cols + x] !== 255) continue;
        for (let t = 0; t < 360; t += 1) {
          const a = x + offA[t];
          const b = y + offB[t];
          if (a >= 0 && a < cols && b >= 0 && b < rows) votes[(b * cols + a) * radii + ri] += 1;
        }
      }
    }
  }
  return { votes, radii };
};

// Istogramma normalizzato come normalizedHistogram().
const normalizedHistogram = (grayData) => {
  const p = new Float64Array(256);
  for (let i = 0; i < grayData.length; i += 1) p[grayData[i]] += 1;
  for (let i = 0; i < 256; i += 1) p[i] /= grayData.length;
  return p;
};

// Otsu: stessi accumulatori di otsu().
const otsuThreshold = (grayData) => {
  const p = normalizedHistogram(grayData);
  let mG = 0;
  for (let i = 0; i < 256; i += 1) mG += i * p[i];
  let P1 = 0;
  let m = 0;
  let maxVar = 0;
  let kstar = 0;
  for (let k = 0; k < 256; k += 1) {
    P1 += p[k];
    m += k * p[k];
    if (P1 <= 0 || P1 >= 1) continue;
    const sigmaB2 = (mG * P1 - m) ** 2 / (P1 * (1 - P1));
    if (sigmaB2 > maxVar) {
      maxVar = sigmaB2;
      kstar = k;
    }
  }
  return kstar;
};

// Otsu a due soglie: stessi cicli di otsu2k() (terza classe per differenza).
const otsu2kThresholds = (grayData) => {
  const p = normalizedHistogram(grayData);
  let mG = 0;
  for (let i = 0; i < 256; i += 1) mG += i * p[i];

  let maxVar = 0;
  const kstar = [0, 0];
  let P1 = 0;
  let m1 = 0;
  for (let k1 = 0; k1 < 256 - 2; k1 += 1) {
    P1 += p[k1];
    m1 += k1 * p[k1];
    let P2 = 0;
    let m2 = 0;
    for (let k2 = k1 + 1; k2 < 256 - 1; k2 += 1) {
      P2 += p[k2];
      m2 += k2 * p[k2];
      const P = [P1, P2, 1 - P1 - P2];
      const m = [m1, m2, mG - m1 - m2];
      let sigmaB2 = 0;
      for (let w = 0; w < 3; w += 1) if (P[w] > 0) sigmaB2 += P[w] * (m[w] / P[w] - mG) ** 2;
      if (sigmaB2 > maxVar) {
        maxVar = sigmaB2;
        kstar[0] = k1;
        kstar[1] = k2;
      }
    }
  }
  return kstar;
};

// K-means: stessi passi di kmeansSegmentation() su dati RGB(A). I centri
// iniziali sono casuali come nel C++, quindi ogni esecuzione può cambiare.
const MAX_KMEANS_ITERATIONS = 100;
const kmeansColors = (data, channels, n, k, th = 0.5) => {
  const centers = Array.from({ length: k }, () => {
    const i = Math.floor(Math.random() * n) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const labels = new Int32Array(n);
  let shift = Infinity;
  for (let iter = 0; shift > th && iter < MAX_KMEANS_ITERATIONS; iter += 1) {
    for (let i = 0; i < n; i += 1) {
      const p = i * channels;
      let minDist = Infinity;
      for (let c = 0; c < k; c += 1) {
        const d = Math.hypot(data[p] - centers[c][0], data[p + 1] - centers[c][1], data[p + 2] - centers[c][2]);
        if (d < minDist) {
          minDist = d;
          labels[i] = c;
        }
      }
    }

    const sum = Array.from({ length: k }, () => [0, 0, 0]);
    const count = new Int32Array(k);
    for (let i = 0; i < n; i += 1) {
      const c = labels[i];
      const p = i * channels;
      sum[c][0] += data[p];
      sum[c][1] += data[p + 1];
      sum[c][2] += data[p + 2];
      count[c] += 1;
    }
    shift = 0;
    for (let c = 0; c < k; c += 1) {
      if (count[c] === 0) continue;
      const next = sum[c].map((v) => v / count[c]);
      shift += Math.hypot(next[0] - centers[c][0], next[1] - centers[c][1], next[2] - centers[c][2]);
      centers[c] = next;
    }
    shift /= k;
  }
  return { labels, centers };
};

// Split and Merge: stessi split()/merge()/segment() su un'immagine in grigio
// quadrata con lato potenza di 2. Scrive in `out` l'immagine segmentata.
const splitAndMerge = (gray, size, out, { sth, tsize, mth }) => {
  const split = (x0, y0, s) => {
    let sum = 0;
    let sq = 0;
    for (let y = y0; y < y0 + s; y += 1) {
      for (let x = x0; x < x0 + s; x += 1) {
        const v = gray[y * size + x];
        sum += v;
        sq += v * v;
      }
    }
    const n = s * s;
    const mean = sum / n;
    const node = { x0, y0, s, mean, stddev: Math.sqrt(Math.max(0, sq / n - mean * mean)), children: null };
    node.merged = [];
    node.mergedB = [false, false, false, false];
    if (s > tsize && node.stddev > sth) {
      const h = s / 2;
      // Ordine circolare: alto sx, alto dx, basso dx, basso sx.
      node.children = [split(x0, y0, h), split(x0 + h, y0, h), split(x0 + h, y0 + h, h), split(x0, y0 + h, h)];
    }
    return node;
  };

  // Solo foglie (blocchi omogenei) con medie vicine.
  const similar = (a, b) => !a.children && !b.children && Math.abs(a.mean - b.mean) < mth;
  const addMerged = (root, i) => {
    root.merged.push(root.children[i]);
    root.mergedB[i] = true;
  };

  const merge = (root) => {
    if (!root.children) {
      root.merged.push(root);
      return;
    }
    const ch = root.children;
    for (let i = 0; i < 4; i += 1) {
      const next = (i + 1) % 4;
      const opp = (i + 2) % 4;
      const prev = (i + 3) % 4;
      if (similar(ch[i], ch[next])) {
        addMerged(root, i);
        addMerged(root, next);
        if (similar(ch[next], ch[opp])) addMerged(root, opp);
        if (similar(ch[i], ch[prev])) addMerged(root, prev);
        break;
      }
    }
    for (let i = 0; i < 4; i += 1) if (!root.mergedB[i]) merge(ch[i]);
  };

  const segment = (root) => {
    if (root.merged.length) {
      const val = Math.trunc(root.merged.reduce((acc, node) => acc + node.mean, 0) / root.merged.length);
      for (const { x0, y0, s } of root.merged) {
        for (let y = y0; y < y0 + s; y += 1) out.fill(val, y * size + x0, y * size + x0 + s);
      }
    }
    if (!root.children) return;
    for (let i = 0; i < 4; i += 1) if (!root.mergedB[i]) segment(root.children[i]);
  };

  const root = split(0, 0, size);
  merge(root);
  segment(root);
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

    // GaussianBlur + Canny di OpenCV, come nei due Hough.
    const cannyEdges = (low, high) => {
      const gauss = track(new cv.Mat());
      cv.GaussianBlur(gray, gauss, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
      const edges = track(new cv.Mat());
      cv.Canny(gauss, edges, low, high, 3, false);
      return edges.data;
    };
    // Copia a colori di Lena in grigio, su cui disegnare in colore.
    const grayCanvas = () => {
      const out = track(new cv.Mat());
      cv.cvtColor(gray, out, cv.COLOR_GRAY2RGBA);
      return out;
    };
    const blurredGray = (ksize) => {
      const out = track(new cv.Mat());
      cv.GaussianBlur(gray, out, new cv.Size(ksize, ksize), 0, 0, cv.BORDER_DEFAULT);
      return out;
    };

    switch (algoId) {
      case 'canny': {
        const gauss = blurredGray(5);
        const dx = track(new cv.Mat());
        const dy = track(new cv.Mat());
        cv.Sobel(gauss, dx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
        cv.Sobel(gauss, dy, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
        const edges = cannyFromGradients(dx.data32F, dy.data32F, rows, cols, p('low', 40), p('high', 90));
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC1));
        dst.data.set(edges);
        break;
      }

      case 'harris': {
        const R = harrisResponse(cv, gray, track, p('k', 0.04));
        const th = p('threshold', 100);
        dst = grayCanvas();
        const color = new cv.Scalar(255, 85, 85, 255);
        // Come harris() (R > th), ma per leggibilità si disegna un solo
        // cerchio per angolo: il massimo locale nell'intorno 5×5.
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
        const rMin = p('minRadius', 22);
        const rMax = p('maxRadius', 25);
        const th = p('votes', 123);
        const edges = cannyEdges(100, 112);
        const { votes, radii } = houghCirclesVotes(edges, rows, cols, rMin, rMax);
        dst = grayCanvas();
        const color = new cv.Scalar(255, 0, 255, 255);
        for (let ri = 0; ri < radii; ri += 1) {
          for (let b = 0; b < rows; b += 1) {
            for (let a = 0; a < cols; a += 1) {
              if (votes[(b * cols + a) * radii + ri] < th) continue;
              const center = new cv.Point(a, b);
              cv.circle(dst, center, 2, color, 1);
              cv.circle(dst, center, rMin + ri, color, 1);
            }
          }
        }
        break;
      }

      case 'hough_lines': {
        const edges = cannyEdges(p('cannyLow', 90), p('cannyHigh', 160));
        const { votes, maxDist } = houghLinesVotes(edges, rows, cols);
        dst = grayCanvas();
        const color = new cv.Scalar(255, 0, 0, 255);
        const th = p('votes', 90);
        for (let r = 0; r < 2 * maxDist + 1; r += 1) {
          for (let t = 0; t < 180; t += 1) {
            if (votes[r * 180 + t] < th) continue;
            const rho = r - maxDist;
            const theta = (t * Math.PI) / 180;
            const x0 = rho * Math.cos(theta);
            const y0 = rho * Math.sin(theta);
            const p1 = new cv.Point(Math.round(x0 - maxDist * Math.sin(theta)), Math.round(y0 + maxDist * Math.cos(theta)));
            const p2 = new cv.Point(Math.round(x0 + maxDist * Math.sin(theta)), Math.round(y0 - maxDist * Math.cos(theta)));
            cv.line(dst, p1, p2, color, 1);
          }
        }
        break;
      }

      case 'otsu': {
        const gauss = blurredGray(3);
        cv.threshold(gauss, dst, otsuThreshold(gauss.data), 255, cv.THRESH_BINARY);
        break;
      }

      case 'otsu2k': {
        const gauss = blurredGray(3);
        const [k1, k2] = otsu2kThresholds(gauss.data);
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC1));
        for (let i = 0; i < gauss.data.length; i += 1) {
          const v = gauss.data[i];
          dst.data[i] = v > k2 ? 255 : v > k1 ? 127 : 0;
        }
        break;
      }

      case 'region_growing': {
        const labels = regionGrowingLabels(
          src.data,
          src.channels(),
          rows,
          cols,
          p('threshold', 200),
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
        const channels = src.channels();
        const { labels, centers } = kmeansColors(src.data, channels, rows * cols, p('k', 6));
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC3));
        for (let i = 0; i < labels.length; i += 1) {
          const center = centers[labels[i]];
          for (let c = 0; c < 3; c += 1) dst.data[i * 3 + c] = Math.round(center[c]);
        }
        break;
      }

      case 'split_merge': {
        const gauss = blurredGray(5);
        dst = track(new cv.Mat(rows, cols, cv.CV_8UC1));
        splitAndMerge(gauss.data, Math.min(rows, cols), dst.data, {
          sth: p('stddev', 10),
          tsize: p('minSize', 8),
          mth: p('mergeTh', 5),
        });
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
