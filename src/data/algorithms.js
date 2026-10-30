const baseTemplate = `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

int main( int argc, char** argv ) {
	Mat src = imread( argv[1] );
	if(src.empty()) return -1;
	Mat dst;
	
	// IL TUO CODICE QUI
	
	imshow("src", src);
	waitKey(0);
	return 0;
}`;

export const algorithms = [
  {
    id: "canny",
    name: "Canny Edge Detector",
    params: [
      {
        key: "low",
        label: "Soglia bassa (lth)",
        min: 0,
        max: 255,
        step: 1,
        default: 40,
        code: "const int lth = 40;",
      },
      {
        key: "high",
        label: "Soglia alta (hth)",
        min: 0,
        max: 255,
        step: 1,
        default: 90,
        code: "const int hth = 90;",
      },
    ],
    description:
      "Canny trova bordi sottili (larghi un pixel) e poco sensibili al rumore. Per ricordarlo bastano 5 parole: blur, Sobel, modulo/fase, NMS, isteresi. Il codice è diviso in tre funzioni: myCanny esegue la pipeline, nonMaxSuppression assottiglia i bordi, hysteresis decide quali tenere usando le due soglie globali lth e hth.",
    steps: [
      "Blur gaussiano 5×5 per togliere il rumore.",
      "Sobel: derivate Dx e Dy (in float, perché possono essere negative).",
      "Modulo (forza del bordo, normalizzato in 0–255) e fase (direzione, in gradi).",
      "NMS: un pixel resta solo se è più forte dei due vicini lungo il gradiente.",
      "Isteresi: > hth → bordo; tra lth e hth → bordo solo se tocca un bordo forte.",
    ],
    explanations: [
      {
        startMatch: "const int lth = 40;",
        endMatch: "const int hth = 90;",
        title: "Soglie dell'isteresi",
        text: "Le due soglie sono costanti globali, lette direttamente da hysteresis. Valgono sul modulo normalizzato 0–255, quindi non dipendono dal contrasto dell'immagine.",
        points: [
          "Canny consiglia un rapporto tra 1:2 e 1:3 tra soglia bassa e alta: 40 e 90 stanno in questo intervallo.",
          "Soglie più alte danno meno bordi e più puliti, più basse più dettagli ma anche più rumore.",
        ],
      },
      {
        startMatch: "void nonMaxSuppression(const Mat& mag, const Mat& angle, Mat& nms) {",
        endMatch: "float a = fmod(angle.at<float>(y, x), 180);",
        title: "NMS · Angolo in [0°, 180°)",
        text: "nms parte tutta nera: un pixel diventa bordo solo se lo decidiamo. y è la riga e x la colonna; i cicli partono da 1 e finiscono a rows-1 / cols-1, così i vicini (y±1, x±1) sono sempre dentro l'immagine.",
        points: [
          "phase restituisce angoli in [0°, 360°).",
          "Un angolo a e a + 180° indicano la stessa retta e quindi la stessa coppia di vicini: fmod(a, 180) riporta tutto in [0°, 180°) e restano solo 4 casi da gestire invece di 8.",
        ],
      },
      {
        startMatch: "int dy, dx;",
        endMatch: "{ dy = 1; dx = -1; }",
        title: "NMS · I 4 settori",
        text: "Il gradiente è perpendicolare al bordo. (dy, dx) è il passo verso uno dei due vicini lungo il gradiente: i vicini da confrontare sono (y + dy, x + dx) e (y − dy, x − dx). La direzione viene arrotondata al multiplo di 45° più vicino:",
        points: [
          "0° (a < 22,5 o a ≥ 157,5): passo (0, 1) → sinistra e destra.",
          "45° (fino a 67,5): passo (1, 1) → diagonale principale.",
          "90° (fino a 112,5): passo (1, 0) → sopra e sotto.",
          "135° (il resto): passo (1, −1) → anti-diagonale.",
        ],
        note: "Trucco per ricordarlo: le soglie sono 22,5 · 67,5 · 112,5 · 157,5 (cioè 45° · k ± 22,5°). Nelle immagini la y cresce verso il basso, quindi 45° punta in basso a destra: per questo il passo è (1, 1).",
      },
      {
        startMatch: "uchar m = mag.at<uchar>(y, x);",
        endMatch: "nms.at<uchar>(y, x) = m;",
        title: "NMS · Massimo locale",
        text: "Se il pixel è maggiore o uguale a entrambi i vicini è il «crinale» del bordo e ne copiamo il valore; altrimenti resta 0. Il risultato sono bordi larghi un pixel, ancora con intensità diverse: a decidere quali tenere sarà l'isteresi.",
      },
      {
        startMatch: "void hysteresis(const Mat& nms, Mat& dst) {",
        endMatch: "dst.at<uchar>(y + dy, x + dx) = 255;",
        title: "Isteresi",
        text: "dst parte nera. Ogni pixel con valore > hth è un bordo forte e diventa 255. Attorno a lui si guarda l'intorno 3×3 (dy, dx ∈ {−1, 0, 1}): i vicini deboli, con lth < valore < hth, vengono «accesi» perché collegati a un bordo certo.",
        points: [
          "Fino a lth → mai bordo. Sopra hth → sempre bordo. In mezzo → bordo solo se vicino a un forte.",
          "Con una sola soglia alta i bordi si spezzerebbero, con una sola soglia bassa entrerebbe il rumore.",
        ],
        note: "Versione semplificata: un solo passaggio, quindi accende solo i deboli che toccano direttamente un forte e non segue le catene di deboli.",
      },
      {
        startMatch: "GaussianBlur(src, gauss, Size(5, 5), 0, 0);",
        endMatch: "Sobel(gauss, Dy, CV_32F, 0, 1, 3);",
        title: "Pipeline · Blur e Sobel",
        text: "Le derivate amplificano il rumore, quindi prima si sfoca con un filtro gaussiano 5×5 (sigma 0 = calcolato da OpenCV in base alla dimensione del kernel). Poi Sobel 3×3: Dx = derivata in x (1, 0), Dy = derivata in y (0, 1).",
        points: ["CV_32F perché le derivate possono essere negative: su 8 bit verrebbero tagliate a 0."],
      },
      {
        startMatch: "magnitude(Dx, Dy, mag);",
        endMatch: "phase(Dx, Dy, angle, true);",
        title: "Pipeline · Modulo e fase",
        text: "Per ogni pixel il gradiente è il vettore (Dx, Dy).",
        points: [
          "magnitude: √(Dx² + Dy²) = forza del bordo.",
          "normalize NORM_MINMAX → 0–255 su 8 bit (CV_8U): così le soglie non dipendono dal contrasto dell'immagine.",
          "phase con true → angolo in gradi in [0°, 360°).",
        ],
      },
      {
        startMatch: "nonMaxSuppression(mag, angle, nms);",
        endMatch: "hysteresis(nms, dst);",
        title: "Pipeline · NMS e isteresi",
        text: "Prima si assottigliano i bordi (nms), poi si binarizzano con le due soglie in dst (0 = sfondo, 255 = bordo).",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

const int lth = 40;  // soglia bassa
const int hth = 90;  // soglia alta

// 4) Non-maxima suppression: tengo il pixel solo se è un massimo lungo la direzione del gradiente
void nonMaxSuppression(const Mat& mag, const Mat& angle, Mat& nms) {
    nms = Mat::zeros(mag.size(), CV_8U);
    for (int y = 1; y < mag.rows - 1; y++)
        for (int x = 1; x < mag.cols - 1; x++) {
            float a = fmod(angle.at<float>(y, x), 180);  // [0,360) -> [0,180)
            int dy, dx;                                  // passo verso il vicino lungo il gradiente
            if (a < 22.5 || a >= 157.5) { dy = 0; dx = 1;  }  // orizzontale
            else if (a < 67.5)          { dy = 1; dx = 1;  }  // diagonale 45
            else if (a < 112.5)         { dy = 1; dx = 0;  }  // verticale
            else                        { dy = 1; dx = -1; }  // diagonale 135
            uchar m = mag.at<uchar>(y, x);
            if (m >= mag.at<uchar>(y + dy, x + dx) && m >= mag.at<uchar>(y - dy, x - dx))
                nms.at<uchar>(y, x) = m;
        }
}

// 5) Isteresi: un pixel forte è bordo e "accende" i vicini deboli
void hysteresis(const Mat& nms, Mat& dst) {
    dst = Mat::zeros(nms.size(), CV_8U);
    for (int y = 1; y < nms.rows - 1; y++)
        for (int x = 1; x < nms.cols - 1; x++)
            if (nms.at<uchar>(y, x) > hth) {
                dst.at<uchar>(y, x) = 255;
                for (int dy = -1; dy <= 1; dy++)
                    for (int dx = -1; dx <= 1; dx++) {
                        uchar v = nms.at<uchar>(y + dy, x + dx);
                        if (v > lth && v < hth)
                            dst.at<uchar>(y + dy, x + dx) = 255;
                    }
            }
}

void myCanny(const Mat& src, Mat& dst) {
    // 1) Smoothing gaussiano
    Mat gauss;
    GaussianBlur(src, gauss, Size(5, 5), 0, 0);

    // 2) Derivate con Sobel
    Mat Dx, Dy;
    Sobel(gauss, Dx, CV_32F, 1, 0, 3);
    Sobel(gauss, Dy, CV_32F, 0, 1, 3);

    // 3) Magnitudo (normalizzata a 0-255) e fase in gradi
    Mat mag, angle;
    magnitude(Dx, Dy, mag);
    normalize(mag, mag, 0, 255, NORM_MINMAX, CV_8U);
    phase(Dx, Dy, angle, true);

    // 4) NMS   5) Isteresi
    Mat nms;
    nonMaxSuppression(mag, angle, nms);
    hysteresis(nms, dst);
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat dst;
    myCanny(src, dst);

    imshow("src", src);
    imshow("canny", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "harris",
    name: "Harris Corner Detection",
    params: [
      {
        key: "k",
        label: "k (sensibilità)",
        min: 0.01,
        max: 0.2,
        step: 0.01,
        default: 0.04,
        code: "const float k = 0.04f;",
      },
      {
        key: "threshold",
        label: "Soglia su R normalizzata (th)",
        min: 0,
        max: 255,
        step: 1,
        default: 100,
        code: "const int th = 100;",
      },
    ],
    description:
      "Harris individua gli angoli (corner): punti in cui l'intensità cambia molto spostando una piccola finestra in qualunque direzione. Su una zona piatta non cambia nulla, lungo un bordo cambia solo attraversandolo, su un angolo cambia in tutte le direzioni. Questo comportamento è riassunto dalla matrice C e dalla risposta R = det(C) − k·trace(C)².",
    steps: [
      "Derivate Dx e Dy con Sobel 3×3 e loro prodotti Dx², Dy², Dx·Dy.",
      "Smoothing gaussiano 7×7 dei prodotti: è la somma pesata sulla finestra attorno a ogni pixel e fornisce gli elementi di C.",
      "Risposta R = det(C) − k·trace(C)² per ogni pixel, con k = 0,04.",
      "Normalizzazione di R in [0, 255] e cerchio sui pixel con R > th = 100.",
    ],
    explanations: [
      {
        startMatch: "const float k = 0.04f;",
        endMatch: "const int th = 100;",
        title: "Parametri",
        text: "k è la costante empirica di Harris (valori tipici 0,04–0,06): più è grande, più R penalizza i bordi e meno angoli vengono trovati. th è la soglia applicata a R dopo averla normalizzata in [0, 255].",
      },
      {
        startMatch: "Mat Dx, Dy;",
        endMatch: "multiply(Dx, Dy, Dxy);",
        title: "Derivate e loro prodotti",
        text: "Sobel 3×3 calcola le derivate Dx (1, 0) e Dy (0, 1) in float, perché possono essere negative.",
        points: [
          "pow(Dx, 2) → Dx² e pow(Dy, 2) → Dy²: elementi sulla diagonale di C.",
          "multiply(Dx, Dy) → Dx·Dy: prodotto elemento per elemento (non matriciale), elemento fuori diagonale.",
        ],
      },
      {
        startMatch: "Mat Sx2, Sy2, Sxy;",
        endMatch: "GaussianBlur(Dxy, Sxy, Size(7, 7), 2, 2);",
        title: "Matrice C",
        text: "Per ogni pixel C = [[ΣDx², ΣDxDy], [ΣDxDy, ΣDy²]], dove le somme sono pesate da una finestra gaussiana. Applicare GaussianBlur 7×7 (σ = 2 in x e in y) ai prodotti calcola proprio queste somme pesate per tutti i pixel insieme.",
        points: [
          "Sx2 = Σ w·Dx², Sy2 = Σ w·Dy², Sxy = Σ w·DxDy.",
          "C è simmetrica: i due elementi fuori diagonale sono entrambi Sxy, quindi bastano tre matrici.",
        ],
      },
      {
        startMatch: "Mat SxSy, Sxy2, trace2;",
        endMatch: "Mat R = (SxSy - Sxy2) - k * trace2;",
        title: "Risposta di Harris R",
        text: "Calcolare gli autovalori λ1, λ2 di C per ogni pixel è costoso; Harris usa det(C) = λ1·λ2 e trace(C) = λ1 + λ2, che si ottengono con semplici prodotti e somme.",
        points: [
          "det = Sx2·Sy2 − Sxy² (prodotto della diagonale principale meno quello della secondaria).",
          "trace = Sx2 + Sy2, elevata al quadrato con pow.",
          "R = det − k·trace².",
          "R grande e positivo → entrambi gli autovalori grandi → angolo. R negativo → un solo autovalore grande → bordo. |R| piccolo → zona piatta.",
        ],
      },
      {
        startMatch: "normalize(R, R, 0, 255, NORM_MINMAX, CV_32F);",
        endMatch: "circle(dst, Point(x, y), 5, Scalar(255), 2);",
        title: "Normalizzazione e output",
        text: "R viene riscalata in [0, 255] restando in float, così la soglia non dipende dall'ordine di grandezza dei valori. dst è una copia di src: su di essa si disegna un cerchio bianco (255) di raggio 5 e spessore 2 attorno a ogni pixel con R > th.",
        points: ["Point vuole (x, y) = (colonna, riga): per questo si scrive Point(x, y) mentre at<float> vuole (y, x)."],
        note: "Non c'è una non-maximum suppression: attorno a un angolo forte più pixel adiacenti superano la soglia e i cerchi si sovrappongono.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

const float k = 0.04f;  // costante di Harris (0.04 - 0.06)
const int th = 100;     // soglia su R normalizzato 0-255

void harris(const Mat& src, Mat& dst) {
    // 1) Derivate con Sobel
    Mat Dx, Dy;
    Sobel(src, Dx, CV_32F, 1, 0, 3);
    Sobel(src, Dy, CV_32F, 0, 1, 3);

    // 2) Prodotti delle derivate
    Mat Dx2, Dy2, Dxy;
    pow(Dx, 2, Dx2);
    pow(Dy, 2, Dy2);
    multiply(Dx, Dy, Dxy);

    // 3) Smoothing gaussiano -> elementi della matrice C = [Sx2 Sxy; Sxy Sy2]
    Mat Sx2, Sy2, Sxy;
    GaussianBlur(Dx2, Sx2, Size(7, 7), 2, 2);
    GaussianBlur(Dy2, Sy2, Size(7, 7), 2, 2);
    GaussianBlur(Dxy, Sxy, Size(7, 7), 2, 2);

    // 4) R = det(C) - k * trace(C)^2
    Mat SxSy, Sxy2, trace2;
    multiply(Sx2, Sy2, SxSy);
    multiply(Sxy, Sxy, Sxy2);
    pow(Sx2 + Sy2, 2, trace2);
    Mat R = (SxSy - Sxy2) - k * trace2;

    // 5) Normalizzo R e cerchio i punti sopra soglia
    normalize(R, R, 0, 255, NORM_MINMAX, CV_32F);
    dst = src.clone();
    for (int y = 0; y < R.rows; y++)
        for (int x = 0; x < R.cols; x++)
            if (R.at<float>(y, x) > th)
                circle(dst, Point(x, y), 5, Scalar(255), 2);
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat dst;
    harris(src, dst);

    imshow("src", src);
    imshow("harris", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_circles",
    name: "Hough Circles",
    params: [
      {
        key: "votes",
        label: "Voti minimi (hth)",
        min: 30,
        max: 250,
        step: 1,
        default: 123,
        code: "const int hth = 123;",
      },
      {
        key: "minRadius",
        label: "Raggio minimo (rMin)",
        min: 5,
        max: 60,
        step: 1,
        default: 22,
        code: "const int rMin = 22;",
      },
      {
        key: "maxRadius",
        label: "Raggio massimo (rMax)",
        min: 5,
        max: 60,
        step: 1,
        default: 25,
        code: "const int rMax = 25;",
      },
    ],
    description:
      "La trasformata di Hough per i cerchi cerca cerchi di raggio noto (qui da 22 a 25 pixel). Ogni pixel di bordo «vota» tutti i possibili centri da cui potrebbe provenire; i veri centri accumulano molti voti perché ricevono il voto da tutti i punti della propria circonferenza.",
    steps: [
      "Smoothing gaussiano 5×5 e Canny (100, 112) per ottenere i pixel di bordo.",
      "Accumulatore 3D votes(b, a, r − rMin) inizializzato a zero.",
      "Per ogni pixel di bordo, raggio r e angolo θ: voto al centro (a, b) = (x − r·cos θ, y − r·sin θ).",
      "Le celle con almeno 123 voti sono cerchi: si disegnano centro e circonferenza.",
    ],
    explanations: [
      {
        startMatch: "const int cth1 = 100;",
        endMatch: "const int hth = 123;",
        title: "Parametri",
        text: "cth1 e cth2 sono le soglie di Canny. Si cercano i raggi da rMin a rMax inclusi (i cicli usano <=), cioè 22, 23, 24 e 25. hth è il numero minimo di voti perché una cella dell'accumulatore sia considerata un cerchio.",
        note: "Ogni raggio in più aggiunge un intero «piano» all'accumulatore e 360 calcoli per ogni pixel di bordo: l'intervallo stretto tiene bassi memoria e tempo.",
      },
      {
        startMatch: "Mat gauss, edges;",
        endMatch: "Canny(gauss, edges, cth1, cth2);",
        title: "Bordi",
        text: "L'immagine viene sfocata (meno bordi spuri) e passata al Canny di OpenCV, che produce una mappa binaria: 255 sui bordi, 0 altrove. Solo i pixel di bordo voteranno.",
      },
      {
        startMatch: "int sizes[] = {src.rows, src.cols, rMax - rMin + 1};",
        endMatch: "Mat votes(3, sizes, CV_32S, Scalar(0));",
        title: "Accumulatore 3D",
        text: "votes è una Mat a 3 dimensioni: righe × colonne × numero di raggi, di interi (CV_32S) a zero. La cella votes(b, a, r − rMin) conta i voti per un cerchio di centro (a, b) e raggio r.",
        points: ["Il +1 serve perché anche rMax è incluso: i raggi sono rMax − rMin + 1."],
      },
      {
        startMatch: "for (int y = 0; y < edges.rows; y++)",
        endMatch: "votes.at<int>(b, a, r - rMin)++;",
        title: "Votazione",
        text: "Per ogni pixel di bordo (x, y), per ogni raggio e per ognuno dei 360 angoli si calcola il centro (a, b) che, con quel raggio, avrebbe il pixel sulla circonferenza: a = x − r·cos θ, b = y − r·sin θ.",
        points: [
          "t va in gradi, cos e sin vogliono radianti: theta = t·π/180.",
          "cvRound arrotonda all'intero più vicino; i centri fuori dall'immagine vengono scartati.",
          "La circonferenza ha circa 2πr ≈ 140–160 pixel ma gli angoli sono 360: angoli vicini cadono nella stessa cella, quindi ogni pixel dà al vero centro 2–3 voti.",
        ],
      },
      {
        startMatch: "dst = src.clone();",
        endMatch: "circle(dst, Point(a, b), r, Scalar(0), 2);",
        title: "Estrazione dei cerchi",
        text: "Si scorre l'accumulatore: ogni cella con almeno hth voti è un cerchio. Su una copia di src si disegnano un piccolo cerchio di raggio 3 (il centro) e la circonferenza di raggio r, in nero.",
        points: ["Point vuole (colonna, riga) = (a, b), mentre at<int> vuole (riga, colonna) = (b, a)."],
        note: "Non c'è una non-maximum suppression: anche le celle vicine al vero centro possono superare la soglia, e allora si vedono più cerchi quasi sovrapposti.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

const int cth1 = 100;  // soglie di Canny
const int cth2 = 112;
const int rMin = 22;   // raggi cercati: [rMin, rMax]
const int rMax = 25;
const int hth = 123;   // voti minimi per accettare un cerchio

void houghCircles(const Mat& src, Mat& dst) {
    // 1) Smoothing + bordi con Canny
    Mat gauss, edges;
    GaussianBlur(src, gauss, Size(5, 5), 0, 0);
    Canny(gauss, edges, cth1, cth2);

    // 2) Accumulatore 3D: (b, a, r) = (riga centro, colonna centro, raggio)
    int sizes[] = {src.rows, src.cols, rMax - rMin + 1};
    Mat votes(3, sizes, CV_32S, Scalar(0));

    // 3) Votazione: ogni punto di bordo vota per i centri a distanza r da sé
    for (int y = 0; y < edges.rows; y++)
        for (int x = 0; x < edges.cols; x++)
            if (edges.at<uchar>(y, x) == 255)
                for (int r = rMin; r <= rMax; r++)
                    for (int t = 0; t < 360; t++) {
                        double theta = t * CV_PI / 180;
                        int a = cvRound(x - r * cos(theta));
                        int b = cvRound(y - r * sin(theta));
                        if (a >= 0 && a < src.cols && b >= 0 && b < src.rows)
                            votes.at<int>(b, a, r - rMin)++;
                    }

    // 4) Disegno centro e circonferenza dei cerchi con abbastanza voti
    dst = src.clone();
    for (int r = rMin; r <= rMax; r++)
        for (int b = 0; b < src.rows; b++)
            for (int a = 0; a < src.cols; a++)
                if (votes.at<int>(b, a, r - rMin) >= hth) {
                    circle(dst, Point(a, b), 3, Scalar(0), 2);
                    circle(dst, Point(a, b), r, Scalar(0), 2);
                }
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat dst;
    houghCircles(src, dst);

    imshow("src", src);
    imshow("hough circles", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_lines",
    name: "Hough Lines",
    params: [
      {
        key: "votes",
        label: "Voti minimi (hth)",
        min: 20,
        max: 250,
        step: 1,
        default: 90,
        code: "const int hth = 90;",
      },
      {
        key: "cannyLow",
        label: "Canny soglia bassa (cth1)",
        min: 0,
        max: 255,
        step: 1,
        default: 90,
        code: "const int cth1 = 90;",
      },
      {
        key: "cannyHigh",
        label: "Canny soglia alta (cth2)",
        min: 0,
        max: 255,
        step: 1,
        default: 160,
        code: "const int cth2 = 160;",
      },
    ],
    description:
      "La trasformata di Hough per le rette descrive ogni retta in forma polare: ρ = x·cos θ + y·sin θ, dove ρ è la distanza dall'origine e θ l'angolo della normale. Ogni pixel di bordo vota tutte le rette (ρ, θ) che passano per lui; le celle dell'accumulatore con molti voti sono le rette presenti nell'immagine.",
    steps: [
      "Smoothing gaussiano 5×5 e Canny (90, 160) per ottenere i pixel di bordo.",
      "Accumulatore votes(ρ + maxDist, θ) con θ ∈ [0°, 180°).",
      "Per ogni pixel di bordo e ogni θ: ρ = x·cos θ + y·sin θ e un voto alla cella.",
      "Le celle con almeno 90 voti sono rette: da (ρ, θ) si ricavano due punti e si disegna la retta.",
    ],
    explanations: [
      {
        startMatch: "const int cth1 = 90;",
        endMatch: "const int hth = 90;",
        title: "Parametri",
        text: "cth1 e cth2 sono le soglie di Canny; hth è il numero minimo di pixel di bordo che devono stare sulla stessa retta perché venga disegnata.",
      },
      {
        startMatch: "Mat gauss, edges;",
        endMatch: "Canny(gauss, edges, cth1, cth2);",
        title: "Bordi",
        text: "L'immagine viene sfocata con un filtro gaussiano 5×5 e passata al Canny di OpenCV, che produce una mappa binaria: 255 sui bordi, 0 altrove.",
      },
      {
        startMatch: "int maxDist = hypot(src.rows, src.cols);",
        endMatch: "Mat votes = Mat::zeros(2 * maxDist + 1, 180, CV_32S);",
        title: "Accumulatore",
        text: "|ρ| non può superare la diagonale dell'immagine (hypot = √(rows² + cols²)). Poiché ρ può essere negativo, l'accumulatore ha 2·maxDist + 1 righe e l'indice di riga è ρ + maxDist. Le colonne sono i 180 angoli possibili: θ e θ + 180° individuano la stessa retta (con ρ di segno opposto).",
      },
      {
        startMatch: "for (int y = 0; y < edges.rows; y++)",
        endMatch: "votes.at<int>(rho, t)++;",
        title: "Votazione",
        text: "Per ogni pixel di bordo si provano tutti i 180 angoli e si calcola il ρ della retta che passa per quel pixel con quell'inclinazione, poi si incrementa votes(ρ + maxDist, t).",
        points: [
          "x è la colonna e y la riga, come nelle coordinate dell'immagine: ρ = x·cos θ + y·sin θ.",
          "Il + maxDist sposta ρ in un indice di riga sempre ≥ 0.",
        ],
      },
      {
        startMatch: "dst = src.clone();",
        endMatch: "Point p2(cvRound(x0 + maxDist * sin(theta)), cvRound(y0 - maxDist * cos(theta)));",
        title: "Da (ρ, θ) a due punti",
        text: "Si scorre l'accumulatore: una cella con almeno hth voti è una retta. Dagli indici si torna ai valori reali (ρ = r − maxDist, θ in radianti). Per disegnarla con line() servono due punti:",
        points: [
          "(x0, y0) = (ρ·cos θ, ρ·sin θ) è il punto della retta più vicino all'origine (piede della perpendicolare).",
          "La retta è perpendicolare alla normale, quindi la sua direzione è (−sin θ, cos θ).",
          "p1 e p2 si ottengono spostandosi di ±maxDist lungo la direzione: maxDist è la diagonale, quindi i punti cadono fuori dall'immagine e la retta la attraversa tutta.",
        ],
      },
      {
        startMatch: "line(dst, p1, p2, Scalar(127), 2);",
        title: "Disegno",
        text: "La retta viene disegnata in grigio (127) con spessore 2. src è in scala di grigi, quindi anche dst ha un solo canale e lo Scalar usa un solo valore.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

const int cth1 = 90;  // soglie di Canny
const int cth2 = 160;
const int hth = 90;   // voti minimi per accettare una retta

void houghLines(const Mat& src, Mat& dst) {
    // 1) Smoothing + bordi con Canny
    Mat gauss, edges;
    GaussianBlur(src, gauss, Size(5, 5), 0, 0);
    Canny(gauss, edges, cth1, cth2);

    // 2) Accumulatore: righe = rho in [-maxDist, maxDist], colonne = theta in [0, 180)
    int maxDist = hypot(src.rows, src.cols);
    Mat votes = Mat::zeros(2 * maxDist + 1, 180, CV_32S);

    // 3) Votazione: ogni punto di bordo vota per tutte le rette che ci passano
    for (int y = 0; y < edges.rows; y++)
        for (int x = 0; x < edges.cols; x++)
            if (edges.at<uchar>(y, x) == 255)
                for (int t = 0; t < 180; t++) {
                    double theta = t * CV_PI / 180;
                    int rho = cvRound(x * cos(theta) + y * sin(theta)) + maxDist;
                    votes.at<int>(rho, t)++;
                }

    // 4) Disegno le rette con abbastanza voti (da polari a due punti cartesiani)
    dst = src.clone();
    for (int r = 0; r < votes.rows; r++)
        for (int t = 0; t < votes.cols; t++)
            if (votes.at<int>(r, t) >= hth) {
                double rho = r - maxDist;
                double theta = t * CV_PI / 180;
                double x0 = rho * cos(theta), y0 = rho * sin(theta);  // punto della retta più vicino all'origine
                Point p1(cvRound(x0 - maxDist * sin(theta)), cvRound(y0 + maxDist * cos(theta)));
                Point p2(cvRound(x0 + maxDist * sin(theta)), cvRound(y0 - maxDist * cos(theta)));
                line(dst, p1, p2, Scalar(127), 2);
            }
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat dst;
    houghLines(src, dst);

    imshow("src", src);
    imshow("hough lines", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "kmeans",
    name: "K-means Clustering",
    params: [
      {
        key: "k",
        label: "Numero di cluster k",
        min: 2,
        max: 12,
        step: 1,
        default: 6,
        code: "const int k = 6;",
      },
    ],
    description:
      "K-means divide i pixel in k = 6 gruppi (cluster) di colore simile. Ogni cluster è rappresentato da un centro (un colore BGR); l'algoritmo alterna l'assegnazione dei pixel al centro più vicino e il ricalcolo dei centri come media, finché i centri si spostano in media meno di th = 0,5.",
    steps: [
      "Inizializzazione: k centri presi dal colore di k pixel casuali.",
      "Assegnazione: ogni pixel riceve l'etichetta del centro più vicino (distanza euclidea tra i colori).",
      "Aggiornamento: ogni centro diventa la media dei colori dei suoi pixel; si misura di quanto si sono spostati i centri.",
      "Si ripete finché lo spostamento medio è maggiore di th, poi ogni pixel viene colorato con il proprio centro.",
    ],
    explanations: [
      {
        startMatch: "const int k = 6;",
        endMatch: "const double th = 0.5;",
        title: "Parametri",
        text: "k è il numero di cluster (e quindi di colori nell'immagine finale). th è la soglia di convergenza: quando i centri si spostano in media meno di 0,5 livelli di colore, l'algoritmo si ferma.",
      },
      {
        startMatch: "RNG rng(getTickCount());",
        endMatch: "centers[c] = src.at<Vec3b>(rng.uniform(0, src.rows), rng.uniform(0, src.cols));",
        title: "1. Centri iniziali casuali",
        text: "Il generatore RNG, inizializzato con getTickCount() (quindi diverso a ogni esecuzione), estrae k posizioni casuali: il colore di quei pixel diventa il centro iniziale di ogni cluster.",
        points: ["I centri sono Vec3f (float) e non Vec3b: le medie calcolate dopo non vengono troncate a interi."],
        note: "Il risultato dipende dai centri iniziali: esecuzioni diverse possono dare segmentazioni leggermente diverse.",
      },
      {
        startMatch: "Mat labels(src.size(), CV_32S);",
        endMatch: "while (shift > th) {",
        title: "Ciclo di convergenza",
        text: "labels contiene, per ogni pixel, l'indice (0…k−1) del cluster a cui appartiene. shift parte da INFINITY, quindi si entra sempre nel ciclo almeno una volta.",
      },
      {
        startMatch: "for (int y = 0; y < src.rows; y++)",
        endMatch: "labels.at<int>(y, x) = c;",
        title: "2. Assegnazione dei pixel",
        text: "Per ogni pixel si calcola la distanza del suo colore da ciascuno dei k centri e si tiene la minima: minDist parte da INFINITY, così il primo confronto vince sempre. L'etichetta del pixel diventa l'indice del centro più vicino.",
        points: ["norm(px − centers[c]) è la distanza euclidea √(ΔB² + ΔG² + ΔR²)."],
      },
      {
        startMatch: "vector<Vec3f> sum(k, Vec3f(0, 0, 0));",
        endMatch: "shift /= k;",
        title: "3. Aggiornamento dei centri",
        text: "Per ogni cluster si sommano i colori dei suoi pixel (sum) e si contano (count); il nuovo centro è sum / count, cioè il colore medio.",
        points: [
          "shift somma di quanto si è spostato ogni centro e alla fine viene diviso per k: è lo spostamento medio, confrontato con th nella condizione del while.",
          "Un cluster vuoto (count = 0) mantiene il suo centro: così si evita una divisione per zero.",
        ],
      },
      {
        startMatch: "dst.create(src.size(), src.type());",
        endMatch: "dst.at<Vec3b>(y, x) = centers[labels.at<int>(y, x)];",
        title: "4. Colorazione finale",
        text: "dst ha la stessa dimensione e lo stesso tipo di src. Ogni pixel viene sostituito con il colore del proprio centro (la conversione da Vec3f a Vec3b arrotonda): l'immagine finale contiene solo k colori.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <vector>

using namespace std;
using namespace cv;

const int k = 6;          // numero di cluster
const double th = 0.5;    // mi fermo quando i centri si spostano (in media) meno di così

void kmeansSegmentation(const Mat& src, Mat& dst) {
    // 1) Inizializzo i k centri con il colore di pixel casuali
    RNG rng(getTickCount());
    vector<Vec3f> centers(k);
    for (int c = 0; c < k; c++)
        centers[c] = src.at<Vec3b>(rng.uniform(0, src.rows), rng.uniform(0, src.cols));

    Mat labels(src.size(), CV_32S);
    double shift = INFINITY;
    while (shift > th) {
        // 2) Assegnamento: ogni pixel va al centro più vicino (distanza euclidea sui colori)
        for (int y = 0; y < src.rows; y++)
            for (int x = 0; x < src.cols; x++) {
                Vec3f px = src.at<Vec3b>(y, x);
                double minDist = INFINITY;
                for (int c = 0; c < k; c++) {
                    double d = norm(px - centers[c]);
                    if (d < minDist) {
                        minDist = d;
                        labels.at<int>(y, x) = c;
                    }
                }
            }

        // 3) Aggiornamento: ogni centro diventa la media dei suoi pixel
        vector<Vec3f> sum(k, Vec3f(0, 0, 0));
        vector<int> count(k, 0);
        for (int y = 0; y < src.rows; y++)
            for (int x = 0; x < src.cols; x++) {
                int c = labels.at<int>(y, x);
                sum[c] += Vec3f(src.at<Vec3b>(y, x));
                count[c]++;
            }
        shift = 0;
        for (int c = 0; c < k; c++)
            if (count[c] > 0) {  // un cluster vuoto mantiene il suo centro
                Vec3f newCenter = sum[c] / count[c];
                shift += norm(newCenter - centers[c]);
                centers[c] = newCenter;
            }
        shift /= k;
    }

    // 4) Coloro ogni pixel con il colore del suo centro
    dst.create(src.size(), src.type());
    for (int y = 0; y < src.rows; y++)
        for (int x = 0; x < src.cols; x++)
            dst.at<Vec3b>(y, x) = centers[labels.at<int>(y, x)];
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_COLOR);
    if (src.empty()) return -1;

    Mat dst;
    kmeansSegmentation(src, dst);

    imshow("src", src);
    imshow("kmeans", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "otsu",
    name: "Otsu Thresholding",
    description:
      "Il metodo di Otsu sceglie automaticamente la soglia di binarizzazione. Prova tutte le soglie k da 0 a 255: ognuna divide i pixel in due classi (scuri ≤ k, chiari > k). La soglia migliore è quella che rende le due classi il più separate possibile, cioè che massimizza la varianza tra le classi σB².",
    steps: [
      "Istogramma normalizzato: probabilità p(i) di ogni livello di grigio.",
      "Media globale mG = Σ i·p(i).",
      "Per ogni k: probabilità cumulata P1(k), media cumulata m(k) e varianza σB²(k).",
      "La soglia k* è quella con σB² massima; nel main si sfoca con un blur 3×3 e si binarizza con threshold().",
    ],
    explanations: [
      {
        startMatch: "vector<double> normalizedHistogram(const Mat& src) {",
        endMatch: "return p;",
        title: "Istogramma normalizzato",
        text: "Si contano i pixel per ciascuno dei 256 livelli di grigio (il valore del pixel è usato direttamente come indice). Dividendo per il numero totale di pixel si ottiene p(i), la probabilità che un pixel abbia livello i; la somma di tutti i p(i) è 1.",
      },
      {
        startMatch: "double mG = 0.0;",
        endMatch: "mG += i * p[i];",
        title: "Media globale",
        text: "mG = Σ i·p(i) è l'intensità media dell'intera immagine. È il riferimento rispetto a cui si misura quanto le due classi si allontanano.",
      },
      {
        startMatch: "double P1 = 0.0, m = 0.0, maxVar = 0.0;",
        endMatch: "int kstar = 0;",
        title: "Accumulatori",
        text: "Invece di ricalcolare tutto da zero per ogni soglia, si usano valori cumulativi aggiornati di un passo a ogni iterazione:",
        points: [
          "P1 = P1(k): frazione di pixel nella classe scura (livelli 0…k).",
          "m = m(k) = Σ i·p(i) fino a k.",
          "maxVar e kstar memorizzano il miglior valore trovato finora e la soglia corrispondente.",
        ],
      },
      {
        startMatch: "for (int k = 0; k < 256; k++) {",
        endMatch: "return kstar;",
        title: "Massimizzazione di σB²",
        text: "Per ogni soglia k si aggiornano P1 e m, poi si calcola la varianza tra le classi con la formula di Otsu σB² = (mG·P1 − m)² / (P1·(1 − P1)). Se è la più alta vista finora, k diventa la nuova soglia ottima k*.",
        points: [
          "Massimizzare la varianza tra le classi equivale a minimizzare la varianza dentro le classi.",
          "Quando P1 = 0 o P1 = 1 una delle due classi è vuota e il denominatore è 0: il continue salta quei casi.",
        ],
      },
      {
        startMatch: "GaussianBlur(src, gauss, Size(3, 3), 0, 0);",
        endMatch: "threshold(gauss, dst, th, 255, THRESH_BINARY);",
        title: "Blur e binarizzazione",
        text: "Nel main l'immagine viene prima sfocata con un filtro gaussiano 3×3: il rumore si riduce e l'istogramma diventa più regolare. La soglia trovata da otsu viene poi passata a threshold con THRESH_BINARY: i pixel > th diventano 255 (bianco), gli altri 0 (nero).",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

// p[i] = probabilità del livello di grigio i
vector<double> normalizedHistogram(const Mat& src) {
    vector<double> p(256, 0.0);
    for (int y = 0; y < src.rows; y++)
        for (int x = 0; x < src.cols; x++)
            p[src.at<uchar>(y, x)]++;
    for (int i = 0; i < 256; i++)
        p[i] /= src.rows * src.cols;
    return p;
}

int otsu(const Mat& src) {
    // 1) Istogramma normalizzato
    vector<double> p = normalizedHistogram(src);

    // 2) Media globale mG
    double mG = 0.0;
    for (int i = 0; i < 256; i++)
        mG += i * p[i];

    // 3) Per ogni k: P1 (prob. cumulata), m (media cumulata), varianza inter-classe
    //    sigmaB2 = (mG*P1 - m)^2 / (P1*(1-P1))  ->  tengo il k che la massimizza
    double P1 = 0.0, m = 0.0, maxVar = 0.0;
    int kstar = 0;
    for (int k = 0; k < 256; k++) {
        P1 += p[k];
        m += k * p[k];
        if (P1 <= 0 || P1 >= 1) continue;  // evito la divisione per zero
        double sigmaB2 = pow(mG * P1 - m, 2) / (P1 * (1 - P1));
        if (sigmaB2 > maxVar) {
            maxVar = sigmaB2;
            kstar = k;
        }
    }
    return kstar;
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat gauss, dst;
    GaussianBlur(src, gauss, Size(3, 3), 0, 0);
    int th = otsu(gauss);
    threshold(gauss, dst, th, 255, THRESH_BINARY);

    imshow("src", src);
    imshow("otsu", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "otsu2k",
    name: "Otsu 2K (Multi-level)",
    description:
      "Estensione di Otsu a due soglie (k1, k2), che dividono i pixel in tre classi: scuri, medi e chiari. Il principio è lo stesso: si provano tutte le coppie di soglie e si sceglie quella che massimizza la varianza tra le classi σB² = Σ Pw·(mw − mG)².",
    steps: [
      "Istogramma normalizzato e media globale mG.",
      "Ricerca su tutte le coppie k1 < k2: le classi sono [0, k1], (k1, k2] e (k2, 255].",
      "Per ogni coppia: σB² = Σ Pw·(mw − mG)² sulle tre classi; la terza si ricava per differenza.",
      "Output a tre livelli: 0, 127, 255.",
    ],
    explanations: [
      {
        startMatch: "vector<double> normalizedHistogram(const Mat& src) {",
        endMatch: "return p;",
        title: "Istogramma normalizzato",
        text: "Identico a Otsu: si contano i pixel per ogni livello di grigio e si divide per il numero di pixel, ottenendo le probabilità p(i).",
      },
      {
        startMatch: "vector<int> otsu2k(const Mat& src) {",
        endMatch: "mG += i * p[i];",
        title: "Media globale",
        text: "La funzione restituisce le due soglie {k1, k2}. Come in Otsu, mG = Σ i·p(i) è la media dell'intera immagine.",
      },
      {
        startMatch: "double maxVar = 0.0;",
        endMatch: "m1 += k1 * p[k1];",
        title: "Classe 1 (ciclo esterno)",
        text: "maxVar e kstar memorizzano la miglior varianza e la coppia di soglie corrispondente. Il ciclo su k1 chiude la prima classe (livelli 0…k1): P1 e m1 sono probabilità e media cumulate, aggiornate di un livello a ogni passo.",
        points: ["k1 arriva al massimo a 253, così restano livelli per le altre due classi."],
      },
      {
        startMatch: "double P2 = 0.0, m2 = 0.0;",
        endMatch: "double m3 = mG - m1 - m2;",
        title: "Classi 2 e 3",
        text: "Per ogni k1 si azzerano P2 e m2 e il ciclo su k2 (da k1 + 1) accumula la seconda classe, livelli k1+1…k2. La terza classe è «tutto il resto» e si ottiene per differenza:",
        points: [
          "P3 = 1 − P1 − P2, perché le probabilità delle tre classi sommano a 1.",
          "m3 = mG − m1 − m2, perché le medie cumulate delle tre classi sommano alla media globale.",
        ],
        note: "Ricavare la terza classe per differenza evita un terzo ciclo annidato: la ricerca costa O(256²) invece di O(256³).",
      },
      {
        startMatch: "double P[3] = {P1, P2, P3};",
        endMatch: "kstar[1] = k2;",
        title: "Varianza tra le classi",
        text: "Si mettono probabilità e medie cumulate in due array per scorrere le tre classi con un solo ciclo. σB² = Σw Pw·(mw − mG)², dove mw = m[w] / P[w] è la media della classe w. Se supera il massimo, si memorizzano k1 e k2.",
        points: ["Le classi vuote (P[w] = 0) vengono saltate per non dividere per zero."],
      },
      {
        startMatch: "void multipleThreshold(const Mat& src, Mat& dst, int k1, int k2) {",
        endMatch: "dst.at<uchar>(y, x) = 127;",
        title: "Segmentazione a tre livelli",
        text: "dst parte nera (0). I pixel > k2 diventano 255 (classe chiara), quelli > k1 ma ≤ k2 diventano 127 (classe media), gli altri restano 0 (classe scura).",
      },
      {
        startMatch: "GaussianBlur(src, gauss, Size(3, 3), 0, 0);",
        endMatch: "multipleThreshold(gauss, dst, k[0], k[1]);",
        title: "Main",
        text: "Come in Otsu, prima si sfoca con un filtro gaussiano 3×3; poi otsu2k trova le due soglie e multipleThreshold produce l'immagine a tre livelli.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

// p[i] = probabilità del livello di grigio i
vector<double> normalizedHistogram(const Mat& src) {
    vector<double> p(256, 0.0);
    for (int y = 0; y < src.rows; y++)
        for (int x = 0; x < src.cols; x++)
            p[src.at<uchar>(y, x)]++;
    for (int i = 0; i < 256; i++)
        p[i] /= src.rows * src.cols;
    return p;
}

// Restituisce le due soglie {k1, k2}: classi [0,k1], (k1,k2], (k2,255]
vector<int> otsu2k(const Mat& src) {
    // 1) Istogramma normalizzato
    vector<double> p = normalizedHistogram(src);

    // 2) Media globale mG
    double mG = 0.0;
    for (int i = 0; i < 256; i++)
        mG += i * p[i];

    // 3) Per ogni coppia (k1,k2): P e m cumulati delle 3 classi
    //    sigmaB2 = somma_w P[w] * (m[w]/P[w] - mG)^2  ->  tengo la coppia che la massimizza
    double maxVar = 0.0;
    vector<int> kstar(2, 0);
    double P1 = 0.0, m1 = 0.0;
    for (int k1 = 0; k1 < 256 - 2; k1++) {
        P1 += p[k1];
        m1 += k1 * p[k1];
        double P2 = 0.0, m2 = 0.0;
        for (int k2 = k1 + 1; k2 < 256 - 1; k2++) {
            P2 += p[k2];
            m2 += k2 * p[k2];
            double P3 = 1 - P1 - P2;  // la terza classe è "tutto il resto"
            double m3 = mG - m1 - m2;
            double P[3] = {P1, P2, P3};
            double m[3] = {m1, m2, m3};
            double sigmaB2 = 0.0;
            for (int w = 0; w < 3; w++)
                if (P[w] > 0)
                    sigmaB2 += P[w] * pow(m[w] / P[w] - mG, 2);
            if (sigmaB2 > maxVar) {
                maxVar = sigmaB2;
                kstar[0] = k1;
                kstar[1] = k2;
            }
        }
    }
    return kstar;
}

// 4) Tre livelli di uscita: 0, 127, 255
void multipleThreshold(const Mat& src, Mat& dst, int k1, int k2) {
    dst = Mat::zeros(src.size(), CV_8U);
    for (int y = 0; y < src.rows; y++)
        for (int x = 0; x < src.cols; x++) {
            uchar v = src.at<uchar>(y, x);
            if (v > k2)
                dst.at<uchar>(y, x) = 255;
            else if (v > k1)
                dst.at<uchar>(y, x) = 127;
        }
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    Mat gauss, dst;
    GaussianBlur(src, gauss, Size(3, 3), 0, 0);
    vector<int> k = otsu2k(gauss);
    multipleThreshold(gauss, dst, k[0], k[1]);

    imshow("src", src);
    imshow("otsu2k", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "region_growing",
    name: "Region Growing",
    params: [
      {
        key: "threshold",
        label: "Soglia (distanza²)",
        min: 10,
        max: 2000,
        step: 10,
        default: 200,
        code: "const int th = 200;",
      },
      {
        key: "minArea",
        label: "Area minima regione (%)",
        min: 0,
        max: 10,
        step: 0.5,
        default: 1,
        code: "const double minRegionAreaFactor = 0.01;",
      },
    ],
    description:
      "Il region growing segmenta l'immagine facendo «crescere» regioni a partire da un pixel seme: un vicino viene aggiunto alla regione se il suo colore è abbastanza simile a quello del pixel da cui lo si raggiunge. L'immagine viene scandita tutta, quindi ogni pixel finisce in una regione; le regioni troppo piccole vengono ignorate.",
    steps: [
      "Si scandisce l'immagine; il primo pixel non ancora visitato diventa un seme.",
      "Partendo dal seme, uno stack esplora gli 8 vicini e aggiunge quelli con colore simile (distanza² < 200).",
      "Se la regione supera l'1% dell'immagine riceve una nuova etichetta (1, 2, 3, …), altrimenti viene marcata come ignorata (255).",
      "Si azzera la maschera e si continua con il seme successivo, fino a un massimo di 100 regioni.",
    ],
    explanations: [
      {
        startMatch: "const int th = 200;",
        endMatch: "const double minRegionAreaFactor = 0.01;",
        title: "Parametri",
        text: "th è la soglia sulla distanza al quadrato tra due colori: 200 corrisponde a una distanza euclidea di circa 14 livelli. maxRegions limita il numero di etichette; minRegionAreaFactor = 1% è l'area minima perché una regione venga tenuta.",
      },
      {
        startMatch: "int colorDist2(Vec3b a, Vec3b b) {",
        endMatch: "return d0 * d0 + d1 * d1 + d2 * d2;",
        title: "Distanza di colore",
        text: "Restituisce ΔB² + ΔG² + ΔR² tra due pixel. Le differenze vengono salvate in int perché possono essere negative.",
        note: "Lavorare con la distanza al quadrato evita di calcolare una radice per ogni confronto: basta confrontarla con una soglia al quadrato.",
      },
      {
        startMatch: "void grow(const Mat& src, const Mat& dst, Mat& mask, Point seed) {",
        endMatch: "front.pop();",
        title: "Esplorazione con lo stack",
        text: "La crescita usa uno stack esplicito (front) invece della ricorsione: su regioni grandi la ricorsione supererebbe lo stack di sistema. Si inserisce il seme e lo si segna subito nella maschera della regione corrente (mask = 1); finché lo stack non è vuoto si estrae un punto (top + pop).",
      },
      {
        startMatch: "for (int dy = -1; dy <= 1; dy++)",
        endMatch: "front.push(q);",
        title: "Criterio di crescita",
        text: "Per ognuno degli 8 vicini q del punto p (dy, dx ∈ {−1, 0, 1}):",
        points: [
          "Se è fuori dall'immagine lo si salta.",
          "Se appartiene già a un'altra regione (dst ≠ 0) o alla regione corrente (mask ≠ 0) lo si salta: con (0, 0) si ritrova p stesso, che è già in mask.",
          "Se la distanza di colore da p è < th, q viene segnato in mask e inserito nello stack.",
        ],
        note: "Il confronto è con il pixel corrente, non con il seme: la regione può seguire sfumature graduali e arrivare a colori molto diversi dal seme. Segnare q in mask prima di inserirlo evita che finisca nello stack due volte.",
      },
      {
        startMatch: "void regionGrowing(const Mat& src, Mat& dst) {",
        endMatch: "int label = 1;",
        title: "Inizializzazione",
        text: "dst è la mappa delle etichette: 0 = non visitato, 1…maxRegions = regione, 255 = ignorato. mask è la regione in costruzione. minRegionArea è l'1% dei pixel dell'immagine; label parte da 1 perché 0 significa «non visitato».",
      },
      {
        startMatch: "for (int y = 0; y < src.rows; y++)",
        endMatch: "mask.setTo(0);",
        title: "Scansione dei semi ed etichettatura",
        text: "Ogni pixel ancora non visitato diventa un seme e si fa crescere la sua regione. countNonZero(mask) conta i pixel della regione:",
        points: [
          "Regione grande: dst += mask * label scrive l'etichetta su tutti i suoi pixel; imshow + waitKey(0) mostrano la regione appena trovata (premi un tasto per passare alla successiva).",
          "Se le etichette superano maxRegions si stampa un messaggio e ci si ferma.",
          "Regione piccola: dst += mask * 255 la marca come ignorata, così non verrà più usata come seme.",
          "mask.setTo(0) azzera la maschera per la regione successiva.",
        ],
        note: "Le etichette sono valori piccoli (1, 2, 3, …): mostrata con imshow, dst appare quasi nera. Per vederla meglio si può moltiplicare per una costante o assegnare un colore a ogni etichetta, come fa il visualizzatore.",
      },
      {
        startMatch: "if (src.rows > 500 || src.cols > 500)",
        endMatch: "resize(src, src, Size(0, 0), 0.5, 0.5);",
        title: "Main · Ridimensionamento",
        text: "Se l'immagine supera i 500 pixel in altezza o larghezza viene dimezzata prima di segmentarla: con Size(0, 0) la dimensione finale si ricava dai fattori di scala 0,5 in x e in y.",
        points: ["Con un quarto dei pixel la crescita è molto più veloce e ci sono meno regioni da mostrare una per una con waitKey."],
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stack>

using namespace std;
using namespace cv;

const int th = 200;                      // soglia sulla distanza di colore (al quadrato)
const int maxRegions = 100;              // numero massimo di regioni
const double minRegionAreaFactor = 0.01; // regioni sotto l'1% dell'immagine vengono ignorate

// distanza di colore al quadrato: (B-B')^2 + (G-G')^2 + (R-R')^2
int colorDist2(Vec3b a, Vec3b b) {
    int d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2];
    return d0 * d0 + d1 * d1 + d2 * d2;
}

// Accresce una regione dal seed: aggiungo i vicini (8-connessi) simili al pixel corrente
void grow(const Mat& src, const Mat& dst, Mat& mask, Point seed) {
    stack<Point> front;
    front.push(seed);
    mask.at<uchar>(seed) = 1;
    while (!front.empty()) {
        Point p = front.top();
        front.pop();
        for (int dy = -1; dy <= 1; dy++)
            for (int dx = -1; dx <= 1; dx++) {
                Point q(p.x + dx, p.y + dy);
                if (q.x < 0 || q.y < 0 || q.x >= src.cols || q.y >= src.rows) continue;  // fuori immagine
                if (dst.at<uchar>(q) || mask.at<uchar>(q)) continue;                     // già visitato
                if (colorDist2(src.at<Vec3b>(p), src.at<Vec3b>(q)) < th) {
                    mask.at<uchar>(q) = 1;  // marco subito, così non lo inserisco due volte
                    front.push(q);
                }
            }
    }
}

// dst: 0 = non visitato, 1..maxRegions = etichetta della regione, 255 = ignorato
void regionGrowing(const Mat& src, Mat& dst) {
    dst = Mat::zeros(src.size(), CV_8U);
    Mat mask = Mat::zeros(src.size(), CV_8U);
    int minRegionArea = int(minRegionAreaFactor * src.rows * src.cols);
    int label = 1;

    // Ogni pixel non ancora visitato diventa un seed
    for (int y = 0; y < src.rows; y++)
        for (int x = 0; x < src.cols; x++)
            if (dst.at<uchar>(y, x) == 0) {
                grow(src, dst, mask, Point(x, y));
                if (countNonZero(mask) > minRegionArea) {
                    dst += mask * label;  // regione valida
                    imshow("mask", mask * 255);
                    waitKey(0);
                    if (++label > maxRegions) {
                        cout << "Run out of region labels..." << endl;
                        return;
                    }
                } else
                    dst += mask * 255;  // regione troppo piccola: ignorata
                mask.setTo(0);
            }
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_COLOR);
    if (src.empty()) return -1;
    if (src.rows > 500 || src.cols > 500)
        resize(src, src, Size(0, 0), 0.5, 0.5);  // dimezzo le immagini grandi (come il prof)

    Mat dst;
    regionGrowing(src, dst);

    imshow("src", src);
    imshow("regions", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "split_merge",
    name: "Split and Merge",
    params: [
      {
        key: "stddev",
        label: "Soglia split (deviazione standard)",
        min: 1,
        max: 60,
        step: 1,
        default: 10,
        code: "const double sth = 10;",
      },
      {
        key: "minSize",
        label: "Lato minimo del blocco",
        min: 2,
        max: 64,
        step: 1,
        default: 8,
        code: "const int tsize = 8;",
      },
      {
        key: "mergeTh",
        label: "Soglia merge (differenza medie)",
        min: 0,
        max: 50,
        step: 1,
        default: 5,
        code: "const int mth = 5;",
      },
    ],
    description:
      "Split and Merge lavora in scala di grigi. Divide ricorsivamente l'immagine in quattro quadranti finché ogni blocco è omogeneo (fase di split, che costruisce un QuadTree), poi unisce i quadranti fratelli adiacenti che sono foglie (blocchi omogenei) con media simile (fase di merge) e colora ogni regione con la media delle medie dei suoi blocchi.",
    steps: [
      "Blur 5×5 e ritaglio al quadrato più grande con lato potenza di 2.",
      "Split: se un blocco è più largo di 8 pixel e la sua deviazione standard supera 10, lo si divide in 4 figli.",
      "Merge: tra i 4 figli di un nodo si uniscono due foglie adiacenti con medie che differiscono meno di 5 (ed eventualmente le foglie vicine); gli altri figli si esplorano ricorsivamente.",
      "Segment: ogni gruppo unito viene colorato con la media delle medie dei suoi blocchi.",
    ],
    explanations: [
      {
        startMatch: "const double sth = 10;",
        endMatch: "const int mth = 5;",
        title: "Parametri",
        text: "sth è la soglia di omogeneità dello split (deviazione standard), tsize il lato minimo sotto cui non si divide più, mth la massima differenza tra le medie di due blocchi perché vengano uniti.",
      },
      {
        startMatch: "Quadranti in ordine CIRCOLARE",
        endMatch: "TNode(Rect R) { region = R; }",
        title: "Nodo del QuadTree",
        text: "Ogni TNode rappresenta un blocco quadrato dell'immagine:",
        points: [
          "region: il rettangolo; mean e stddev: media e deviazione standard dei suoi livelli di grigio.",
          "children: i quattro figli (nullptr se il blocco è una foglia).",
          "merged: i nodi uniti in un'unica regione; mergedB[i] = true se il figlio i è già stato unito e non va più visitato.",
        ],
        note: "I figli sono numerati in ordine circolare (0 alto sx, 1 alto dx, 2 basso dx, 3 basso sx): i e (i + 1) % 4 sono sempre adiacenti, mentre i e (i + 2) % 4 sono opposti in diagonale.",
      },
      {
        startMatch: "TNode* split(Mat& img, Rect R) {",
        endMatch: "return root;",
        title: "Split",
        text: "Si crea il nodo e si calcolano media e deviazione standard del blocco con meanStdDev su img(R), una vista sul rettangolo senza copia. L'immagine è in grigio, quindi si usa solo il canale [0].",
        points: [
          "Se il blocco è più largo di tsize e stddev > sth non è omogeneo: si divide in 4 quadrati di lato h = width / 2, in ordine circolare, e si richiama split su ciascuno.",
          "Altrimenti il nodo resta una foglia.",
          "rectangle disegna il contorno del blocco su img per visualizzare il QuadTree. Avviene dopo il calcolo delle statistiche e dopo la ricorsione, quindi i bordi disegnati non alterano le misure.",
        ],
      },
      {
        startMatch: "// unisco solo foglie (regioni omogenee) con medie vicine",
        endMatch: "root->mergedB[i] = true;",
        title: "Funzioni di supporto",
        text: "similar dice se due blocchi si possono unire: devono essere entrambi foglie (nessun figlio, cioè blocchi già omogenei) e avere medie che differiscono meno di mth. addMerged aggiunge il figlio i alla lista merged del padre e lo marca come unito.",
        note: "Il controllo sulle foglie è importante: un nodo interno ha una media «riassuntiva» di zone diverse. Se venisse unito, segment lo colorerebbe tutto di un solo valore e la sua suddivisione andrebbe persa; così invece i nodi interni vengono sempre esplorati con merge.",
      },
      {
        startMatch: "void merge(TNode* root) {",
        endMatch: "merge(root->children[i]);",
        title: "Merge",
        text: "Una foglia è una regione a sé: aggiunge sé stessa a merged. Per un nodo diviso si guardano i figli:",
        points: [
          "Si cerca il primo i per cui il figlio i e il successivo (next) sono simili (due foglie con medie vicine): vengono uniti.",
          "Il gruppo può allargarsi: se next è simile all'opposto (opp) si aggiunge anche opp, se i è simile al precedente (prev) si aggiunge prev.",
          "Il break fa sì che per ogni nodo si formi un solo gruppo.",
          "I figli non uniti vengono esplorati ricorsivamente con merge: tra questi ci sono sempre tutti i nodi interni.",
        ],
        note: "Si uniscono solo fratelli dello stesso padre: blocchi adiacenti che appartengono a padri diversi restano separati anche se simili.",
      },
      {
        startMatch: "void segment(TNode* root, Mat& img) {",
        endMatch: "segment(root->children[i], img);",
        title: "Segmentazione finale",
        text: "Se il nodo ha regioni unite, si calcola la media delle loro medie e la si assegna a tutti i loro rettangoli (img(node->region) = val riempie il blocco). Poi si scende nei figli che esistono e non sono stati uniti.",
      },
      {
        startMatch: "GaussianBlur(src, src, Size(5, 5), 0, 0);",
        endMatch: "segment(root, seg);",
        title: "Main",
        text: "Un blur 5×5 riduce il rumore. Il QuadTree richiede un quadrato con lato potenza di 2, quindi s = 2^⌊log2(min(rows, cols))⌋ e si ritaglia l'immagine a s × s. seg è una copia fatta prima dello split, quindi senza i rettangoli: split disegna il QuadTree su src, merge e segment colorano seg.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <vector>

using namespace std;
using namespace cv;

const double sth = 10;  // split se la deviazione standard supera questa soglia
const int tsize = 8;    // dimensione minima di una regione
const int mth = 5;      // merge se le medie differiscono meno di questa soglia

/*
 Quadranti in ordine CIRCOLARE: i e (i+1)%4 sono sempre adiacenti
  _______
 | 0 | 1 |
 |---+---|
 | 3 | 2 |
  -------
*/
struct TNode {
    Rect region;
    double mean, stddev;
    vector<TNode*> children = vector<TNode*>(4, nullptr);
    vector<TNode*> merged;                     // nodi uniti in questa regione
    vector<bool> mergedB = vector<bool>(4, false);  // quali figli sono stati uniti
    TNode(Rect R) { region = R; }
};

// 1) SPLIT: divido in 4 finché la regione non è omogenea o troppo piccola
TNode* split(Mat& img, Rect R) {
    TNode* root = new TNode(R);
    Scalar mean, stddev;
    meanStdDev(img(R), mean, stddev);
    root->mean = mean[0];
    root->stddev = stddev[0];

    if (R.width > tsize && root->stddev > sth) {
        int h = R.width / 2;
        root->children[0] = split(img, Rect(R.x,     R.y,     h, h));  // alto sx
        root->children[1] = split(img, Rect(R.x + h, R.y,     h, h));  // alto dx
        root->children[2] = split(img, Rect(R.x + h, R.y + h, h, h));  // basso dx
        root->children[3] = split(img, Rect(R.x,     R.y + h, h, h));  // basso sx
    }
    rectangle(img, R, Scalar(0));  // disegno il quadtree
    return root;
}

// unisco solo foglie (regioni omogenee) con medie vicine
bool similar(TNode* a, TNode* b) {
    bool leaves = !a->children[0] && !b->children[0];
    return leaves && abs(a->mean - b->mean) < mth;
}

void addMerged(TNode* root, int i) {
    root->merged.push_back(root->children[i]);
    root->mergedB[i] = true;
}

// 2) MERGE: unisco due figli adiacenti simili (ed eventualmente i loro vicini), il resto lo ricorro
void merge(TNode* root) {
    if (!root->children[0]) {  // foglia: la regione è se stessa
        root->merged.push_back(root);
        return;
    }
    for (int i = 0; i < 4; i++) {
        int next = (i + 1) % 4, opp = (i + 2) % 4, prev = (i + 3) % 4;
        if (similar(root->children[i], root->children[next])) {
            addMerged(root, i);
            addMerged(root, next);
            if (similar(root->children[next], root->children[opp])) addMerged(root, opp);
            if (similar(root->children[i], root->children[prev])) addMerged(root, prev);
            break;
        }
    }
    for (int i = 0; i < 4; i++)
        if (!root->mergedB[i])
            merge(root->children[i]);
}

// 3) SEGMENT: coloro ogni gruppo unito con la media delle medie, poi ricorro sui figli non uniti
void segment(TNode* root, Mat& img) {
    if (!root->merged.empty()) {
        double val = 0;
        for (TNode* node : root->merged)
            val += node->mean;
        val /= root->merged.size();
        for (TNode* node : root->merged)
            img(node->region) = (int)val;
    }
    for (int i = 0; i < 4; i++)
        if (root->children[i] && !root->mergedB[i])
            segment(root->children[i], img);
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;

    GaussianBlur(src, src, Size(5, 5), 0, 0);

    // Ritaglio un quadrato di lato potenza di 2
    int s = pow(2, (int)log2(min(src.rows, src.cols)));
    src = src(Rect(0, 0, s, s)).clone();
    Mat seg = src.clone();

    TNode* root = split(src, Rect(0, 0, s, s));
    merge(root);
    segment(root, seg);

    imshow("quad tree", src);
    imshow("segmented", seg);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
];
