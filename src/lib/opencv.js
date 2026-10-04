import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 300;
const LOAD_TIMEOUT_MS = 60_000;

/**
 * Stato di caricamento di OpenCV.js (incluso via <script async> in index.html).
 * Restituisce 'loading' | 'ready' | 'error'.
 */
export const useOpenCv = () => {
  const [status, setStatus] = useState(() => (window.cv?.Mat ? 'ready' : 'loading'));

  useEffect(() => {
    if (status !== 'loading') return undefined;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const cv = window.cv;
      // Alcune build di opencv.js espongono `cv` come Promise del modulo.
      if (cv && typeof cv.then === 'function' && !cv.Mat) {
        clearInterval(interval);
        cv.then((module) => {
          window.cv = module;
          setStatus('ready');
        }).catch(() => setStatus('error'));
        return;
      }
      if (cv?.Mat) {
        clearInterval(interval);
        setStatus('ready');
      } else if (Date.now() - startedAt > LOAD_TIMEOUT_MS) {
        clearInterval(interval);
        setStatus('error');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
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

/**
 * Esegue con OpenCV.js un equivalente visivo dell'algoritmo `algoId`
 * leggendo da `imgEl` e disegnando su `canvasEl`.
 * Tutte le Mat allocate vengono liberate anche in caso di errore.
 */
export const runVisualAlgorithm = (algoId, imgEl, canvasEl) => {
  const cv = window.cv;
  const mats = [];
  const track = (mat) => {
    mats.push(mat);
    return mat;
  };

  try {
    const src = track(cv.imread(imgEl));
    const gray = track(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    let dst = track(new cv.Mat());

    switch (algoId) {
      case 'canny': {
        // Stessa pipeline di myCanny(src, dst, 30, 90).
        const gauss = track(new cv.Mat());
        cv.GaussianBlur(gray, gauss, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        const dx = track(new cv.Mat());
        const dy = track(new cv.Mat());
        cv.Sobel(gauss, dx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
        cv.Sobel(gauss, dy, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
        const edges = cannyFromGradients(dx.data32F, dy.data32F, gray.rows, gray.cols, 30, 90);
        dst = track(new cv.Mat(gray.rows, gray.cols, cv.CV_8UC1));
        dst.data.set(edges);
        break;
      }

      case 'harris': {
        const response = track(new cv.Mat());
        cv.cornerHarris(gray, response, 2, 3, 0.04);
        const norm = track(new cv.Mat());
        cv.normalize(response, norm, 0, 255, cv.NORM_MINMAX, cv.CV_32F);
        dst = track(new cv.Mat());
        cv.cvtColor(gray, dst, cv.COLOR_GRAY2RGBA);
        const corner = new cv.Scalar(255, 85, 85, 255);
        for (let y = 0; y < norm.rows; y += 1) {
          for (let x = 0; x < norm.cols; x += 1) {
            if (norm.floatAt(y, x) > 100) cv.circle(dst, new cv.Point(x, y), 4, corner, 1);
          }
        }
        break;
      }

      case 'hough_circles': {
        dst = track(src.clone());
        const circles = track(new cv.Mat());
        cv.medianBlur(gray, gray, 5);
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 45, 75, 40, 0, 0);
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
        dst = track(src.clone());
        const edges = track(new cv.Mat());
        const lines = track(new cv.Mat());
        cv.Canny(gray, edges, 50, 200, 3);
        cv.HoughLines(edges, lines, 1, Math.PI / 180, 150, 0, 0, 0, Math.PI);
        const color = new cv.Scalar(255, 0, 0, 255);
        for (let i = 0; i < lines.rows; i += 1) {
          const rho = lines.data32F[i * 2];
          const theta = lines.data32F[i * 2 + 1];
          const a = Math.cos(theta);
          const b = Math.sin(theta);
          const x0 = a * rho;
          const y0 = b * rho;
          const pt1 = new cv.Point(x0 - 1000 * b, y0 + 1000 * a);
          const pt2 = new cv.Point(x0 + 1000 * b, y0 - 1000 * a);
          cv.line(dst, pt1, pt2, color, 2);
        }
        break;
      }

      case 'otsu':
        cv.threshold(gray, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        break;

      case 'otsu2k': {
        // Approssimazione a 3 livelli: soglia di Otsu sull'immagine e poi
        // di nuovo sulla sola classe chiara.
        const low = track(new cv.Mat());
        const t1 = cv.threshold(gray, low, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        const high = track(new cv.Mat());
        cv.threshold(gray, high, Math.min(255, t1 + (255 - t1) / 2), 255, cv.THRESH_BINARY);
        cv.addWeighted(low, 0.5, high, 0.5, 0, dst);
        break;
      }

      case 'region_growing': {
        // Stessa logica di regionGrowing(): soglia 204 sulla distanza al
        // quadrato, vicinato a 8, regioni < 1% dell'immagine considerate rumore.
        const { labels } = regionGrowingLabels(src.data, src.channels(), src.rows, src.cols);
        dst = track(new cv.Mat(src.rows, src.cols, cv.CV_8UC3));
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
        const pixels = rgb.rows * rgb.cols;
        const samples32 = track(new cv.Mat(pixels, 3, cv.CV_32F));
        for (let i = 0; i < pixels * 3; i += 1) samples32.data32F[i] = rgb.data[i];
        const labels = track(new cv.Mat());
        const centers = track(new cv.Mat());
        const k = 6;
        const criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 10, 1.0);
        cv.kmeans(samples32, k, labels, criteria, 3, cv.KMEANS_PP_CENTERS, centers);
        dst = track(new cv.Mat(rgb.rows, rgb.cols, cv.CV_8UC3));
        for (let i = 0; i < labels.rows; i += 1) {
          const label = labels.intAt(i, 0);
          for (let c = 0; c < 3; c += 1) {
            dst.data[i * 3 + c] = centers.floatAt(label, c);
          }
        }
        break;
      }

      case 'split_merge':
        cv.medianBlur(src, dst, 15);
        break;

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

export const clearCanvas = (canvasEl) => {
  const ctx = canvasEl?.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
};
