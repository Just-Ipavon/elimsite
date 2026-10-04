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
      case 'canny':
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.Canny(gray, dst, 50, 150, 3, false);
        break;

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
        dst = track(src.clone());
        cv.cvtColor(dst, dst, cv.COLOR_RGBA2RGB);
        const mask = track(cv.Mat.zeros(src.rows + 2, src.cols + 2, cv.CV_8U));
        const seed = new cv.Point(Math.floor(src.cols / 2), Math.floor(src.rows / 2));
        const diff = new cv.Scalar(20, 20, 20, 0);
        cv.floodFill(
          dst,
          mask,
          seed,
          new cv.Scalar(255, 85, 85, 255),
          new cv.Rect(),
          diff,
          diff,
          4 | (255 << 8) | cv.FLOODFILL_FIXED_RANGE,
        );
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
