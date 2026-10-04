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
    description:
      "Canny trova bordi sottili (larghi un pixel) e poco sensibili al rumore. Per ricordarlo bastano 5 parole: blur, Sobel, modulo/fase, NMS, isteresi. Il codice è diviso in tre funzioni: myCanny esegue la pipeline, nonMaxSuppression assottiglia i bordi, hysteresis decide quali tenere con due soglie.",
    steps: [
      "Blur gaussiano 5×5 per togliere il rumore.",
      "Sobel: derivate dx e dy (in float, perché possono essere negative).",
      "Modulo (forza del bordo, normalizzato in 0–255) e fase (direzione, in gradi).",
      "NMS: un pixel resta solo se è più forte dei due vicini lungo il gradiente.",
      "Isteresi: ≥ alta → bordo; tra bassa e alta → bordo solo se tocca un bordo forte.",
    ],
    explanations: [
      {
        startMatch: "void nonMaxSuppression(const Mat &mag, const Mat &angle, Mat &nms) {",
        endMatch: "if (a >= 180) a -= 180;",
        title: "NMS · Angolo in [0°, 180°)",
        text: "nms parte tutta nera: un pixel diventa bordo solo se lo decidiamo. I cicli partono da 1 e finiscono a rows-1 / cols-1, così i vicini (i±1, j±1) sono sempre dentro l'immagine.",
        points: [
          "phase restituisce angoli in [0°, 360°).",
          "Un angolo a e a + 180° indicano la stessa retta e quindi la stessa coppia di vicini: sottraendo 180 restano solo 4 casi da gestire invece di 8.",
        ],
      },
      {
        startMatch: "uchar q, r;",
        endMatch: "r = mag.at<uchar>(i + 1, j - 1);",
        title: "NMS · I 4 settori",
        text: "Il gradiente è perpendicolare al bordo. Confrontiamo il pixel con i due vicini lungo il gradiente (q e r), arrotondando la direzione al multiplo di 45° più vicino:",
        points: [
          "0° (a < 22,5 o a ≥ 157,5): sinistra e destra → (i, j−1), (i, j+1).",
          "45° (fino a 67,5): diagonale principale → (i−1, j−1), (i+1, j+1).",
          "90° (fino a 112,5): sopra e sotto → (i−1, j), (i+1, j).",
          "135° (il resto): anti-diagonale → (i−1, j+1), (i+1, j−1).",
        ],
        note: "Trucco per ricordarlo: le soglie sono 22,5 · 67,5 · 112,5 · 157,5 (cioè 45° · k ± 22,5°). Nelle immagini la y cresce verso il basso, quindi 45° punta in basso a destra: per questo i vicini sono (i−1, j−1) e (i+1, j+1).",
      },
      {
        startMatch: "if (mag.at<uchar>(i, j) >= q && mag.at<uchar>(i, j) >= r)",
        endMatch: "nms.at<uchar>(i, j) = mag.at<uchar>(i, j);",
        title: "NMS · Massimo locale",
        text: "Se il pixel è maggiore o uguale a entrambi i vicini è il «crinale» del bordo e ne copiamo il valore; altrimenti resta 0. Il risultato sono bordi larghi un pixel, ancora con intensità diverse: a decidere quali tenere sarà l'isteresi.",
      },
      {
        startMatch: "void hysteresis(const Mat &nms, Mat &dst, int lth, int hth) {",
        endMatch: "dst.at<uchar>(i + u, j + v) = 255;",
        title: "Isteresi",
        text: "dst parte nera. Ogni pixel con valore ≥ hth è un bordo forte e diventa 255. Attorno a lui si guarda l'intorno 3×3 (u, v ∈ {−1, 0, 1}): i vicini deboli, con valore in [lth, hth), vengono promossi a 255 perché collegati a un bordo certo.",
        points: [
          "Sotto lth → mai bordo. Sopra hth → sempre bordo. In mezzo → bordo solo se vicino a un forte.",
          "Con una sola soglia alta i bordi si spezzerebbero, con una sola soglia bassa entrerebbe il rumore.",
        ],
        note: "Versione semplificata: un solo passaggio, quindi promuove solo i deboli che toccano direttamente un forte e non segue le catene di deboli.",
      },
      {
        startMatch: "GaussianBlur(src, gauss, Size(5, 5), 0);",
        endMatch: "Sobel(gauss, dy, CV_32F, 0, 1, 3);",
        title: "Pipeline · Blur e Sobel",
        text: "Le derivate amplificano il rumore, quindi prima si sfoca con un filtro gaussiano 5×5 (sigma 0 = calcolato da OpenCV). Poi Sobel 3×3: dx = derivata in x (1, 0), dy = derivata in y (0, 1).",
        points: ["CV_32F perché le derivate possono essere negative: su 8 bit verrebbero tagliate a 0."],
      },
      {
        startMatch: "magnitude(dx, dy, mag);",
        endMatch: "phase(dx, dy, angle, true);",
        title: "Pipeline · Modulo e fase",
        text: "Per ogni pixel il gradiente è il vettore (dx, dy).",
        points: [
          "magnitude: √(dx² + dy²) = forza del bordo.",
          "normalize NORM_MINMAX → 0–255 su 8 bit (CV_8U): così le soglie non dipendono dal contrasto dell'immagine.",
          "phase con true → angolo in gradi in [0°, 360°).",
        ],
      },
      {
        startMatch: "nonMaxSuppression(mag, angle, nms);",
        endMatch: "hysteresis(nms, dst, lth, hth);",
        title: "Pipeline · NMS e isteresi",
        text: "Prima si assottigliano i bordi (nms), poi si binarizzano con le due soglie in dst (0 = sfondo, 255 = bordo).",
      },
      {
        startMatch: "myCanny(src, dst, 30, 90);",
        title: "Soglie 30 e 90",
        text: "Le soglie valgono sul modulo normalizzato 0–255. Il rapporto 1:3 è quello consigliato da Canny e usato anche nel tutorial OpenCV (highThreshold = lowThreshold × 3). Soglie più alte danno meno bordi e più puliti, più basse più dettagli ma anche più rumore.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

// 1. Non-maximum suppression: tiene solo i massimi lungo il gradiente
void nonMaxSuppression(const Mat &mag, const Mat &angle, Mat &nms) {
    nms = Mat::zeros(mag.size(), CV_8U);
    for (int i = 1; i < mag.rows - 1; i++) {
        for (int j = 1; j < mag.cols - 1; j++) {
            float a = angle.at<float>(i, j);
            if (a >= 180) a -= 180;          // a e a+180 sono la stessa direzione

            uchar q, r;                      // i due vicini lungo il gradiente
            if (a < 22.5 || a >= 157.5) {    // 0°: sinistra / destra
                q = mag.at<uchar>(i, j - 1);
                r = mag.at<uchar>(i, j + 1);
            } else if (a < 67.5) {           // 45°: diagonale
                q = mag.at<uchar>(i - 1, j - 1);
                r = mag.at<uchar>(i + 1, j + 1);
            } else if (a < 112.5) {          // 90°: sopra / sotto
                q = mag.at<uchar>(i - 1, j);
                r = mag.at<uchar>(i + 1, j);
            } else {                         // 135°: anti-diagonale
                q = mag.at<uchar>(i - 1, j + 1);
                r = mag.at<uchar>(i + 1, j - 1);
            }

            if (mag.at<uchar>(i, j) >= q && mag.at<uchar>(i, j) >= r)
                nms.at<uchar>(i, j) = mag.at<uchar>(i, j);
        }
    }
}

// 2. Isteresi: forti -> 255, deboli -> 255 solo se vicini a un forte
void hysteresis(const Mat &nms, Mat &dst, int lth, int hth) {
    dst = Mat::zeros(nms.size(), CV_8U);
    for (int i = 1; i < nms.rows - 1; i++) {
        for (int j = 1; j < nms.cols - 1; j++) {
            if (nms.at<uchar>(i, j) >= hth) {
                dst.at<uchar>(i, j) = 255;
                for (int u = -1; u <= 1; u++)
                    for (int v = -1; v <= 1; v++) {
                        uchar n = nms.at<uchar>(i + u, j + v);
                        if (n >= lth && n < hth)
                            dst.at<uchar>(i + u, j + v) = 255;
                    }
            }
        }
    }
}

// 3. Pipeline: blur -> Sobel -> modulo e fase -> NMS -> isteresi
void myCanny(const Mat &src, Mat &dst, int lth, int hth) {
    Mat gauss, dx, dy, mag, angle, nms;
    GaussianBlur(src, gauss, Size(5, 5), 0);
    Sobel(gauss, dx, CV_32F, 1, 0, 3);
    Sobel(gauss, dy, CV_32F, 0, 1, 3);
    magnitude(dx, dy, mag);
    normalize(mag, mag, 0, 255, NORM_MINMAX, CV_8U);
    phase(dx, dy, angle, true);          // gradi in [0, 360)
    nonMaxSuppression(mag, angle, nms);
    hysteresis(nms, dst, lth, hth);
}

int main(int argc, char** argv) {
    Mat src = imread(argv[1], IMREAD_GRAYSCALE);
    if (src.empty()) return -1;
    Mat dst;
    myCanny(src, dst, 30, 90);           // rapporto 1:3 tra le soglie
    imshow("src", src);
    imshow("Canny", dst);
    waitKey(0);
    return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "harris",
    name: "Harris Corner Detection",
    description:
      "Harris individua gli angoli (corner): punti in cui l'intensità cambia molto spostando una piccola finestra in qualunque direzione. Su una zona piatta non cambia nulla, lungo un bordo cambia solo attraversandolo, su un angolo cambia in tutte le direzioni. Questo comportamento è riassunto dalla matrice di struttura M e dalla risposta R = det(M) − k·trace(M)².",
    steps: [
      "Derivate Ix e Iy con Sobel e loro prodotti Ix², Iy², Ix·Iy.",
      "Smoothing gaussiano dei prodotti: è la somma pesata sulla finestra attorno a ogni pixel e fornisce gli elementi di M.",
      "Risposta R = det(M) − 0,04·trace(M)² per ogni pixel.",
      "Normalizzazione di R in [0, 255] e cerchio sui pixel con R > 100.",
    ],
    explanations: [
      {
        startMatch: "void circleCorners(Mat& src, Mat& dst) {",
        endMatch: "circle(dst, Point(j, i), 5, Scalar(0), 1);",
        title: "Disegno dei corner",
        text: "Funzione di supporto chiamata alla fine: scorre la mappa R già normalizzata in [0, 255] (float) e, dove il valore supera 100, disegna su dst un cerchio nero di raggio 5.",
        note: "Point vuole (x, y) = (colonna, riga): per questo si scrive Point(j, i) e non Point(i, j).",
      },
      {
        startMatch: "Mat Dx, Dy;",
        endMatch: "multiply(Dx, Dy, DxDy);",
        title: "Derivate e loro prodotti",
        text: "Sobel calcola le derivate Ix (1, 0) e Iy (0, 1) in float, perché possono essere negative. Il kernel 11×11 è molto grande: le derivate risultano già smussate, ma i valori diventano enormi (per questo alla fine si normalizza).",
        points: [
          "pow(Dx, 2) → Ix² e pow(Dy, 2) → Iy²: elementi sulla diagonale di M.",
          "multiply(Dx, Dy) → Ix·Iy: prodotto elemento per elemento (non matriciale), elemento fuori diagonale.",
        ],
      },
      {
        startMatch: "Mat C00, C01, C10, C11;",
        endMatch: "C10 = C01;",
        title: "Matrice di struttura M",
        text: "Per ogni pixel M = [[ΣIx², ΣIxIy], [ΣIxIy, ΣIy²]], dove le somme sono pesate da una finestra gaussiana. Applicare GaussianBlur 7×7 ai prodotti calcola proprio queste somme pesate per tutti i pixel insieme.",
        points: [
          "C00 = Σ w·Ix², C11 = Σ w·Iy², C01 = Σ w·IxIy.",
          "M è simmetrica, quindi C10 = C01 (assegnazione tra Mat: condividono gli stessi dati, nessuna copia).",
        ],
      },
      {
        startMatch: "Mat det, trace, trace2, R, PPD, PSD;",
        endMatch: "R = det - 0.04f * trace2;",
        title: "Risposta di Harris R",
        text: "Calcolare gli autovalori λ1, λ2 di M per ogni pixel è costoso; Harris usa det(M) = λ1·λ2 e trace(M) = λ1 + λ2, che si ottengono con semplici prodotti e somme.",
        points: [
          "det = C00·C11 − C01·C10 (prodotto della diagonale principale meno quello della secondaria).",
          "trace = C00 + C11, poi elevata al quadrato.",
          "R = det − k·trace² con k = 0,04 (valori tipici 0,04–0,06).",
          "R grande e positivo → entrambi gli autovalori grandi → angolo. R negativo → un solo autovalore grande → bordo. |R| piccolo → zona piatta.",
        ],
      },
      {
        startMatch: "normalize(R, R, 0, 255, NORM_MINMAX, CV_32FC1);",
        endMatch: "circleCorners(R, dst);",
        title: "Normalizzazione e output",
        text: "R viene riscalata in [0, 255] restando in float; convertScaleAbs la converte in 8 bit dentro dst, così l'output mostra la mappa di risposta. Infine circleCorners evidenzia i pixel con R normalizzata > 100.",
        note: "Non c'è una non-maximum suppression: attorno a un angolo forte più pixel adiacenti superano la soglia e i cerchi si sovrappongono.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

void circleCorners(Mat& src, Mat& dst) {
    for (int i = 0; i < src.rows; i++) {
        for (int j = 0; j < src.cols; j++) {
            if ((int)src.at<float>(i, j) > 100)
                circle(dst, Point(j, i), 5, Scalar(0), 1);
        }
    }
}

void harris(Mat& src, Mat& dst) {
    Mat Dx, Dy;
    Sobel(src, Dx, CV_32FC1, 1, 0, 11);
    Sobel(src, Dy, CV_32FC1, 0, 1, 11);

    Mat Dx2, Dy2, DxDy;
    pow(Dx, 2, Dx2);
    pow(Dy, 2, Dy2);
    multiply(Dx, Dy, DxDy);

    Mat C00, C01, C10, C11;
    GaussianBlur(Dx2, C00, Size(7, 7), 2, 0);
    GaussianBlur(Dy2, C11, Size(7, 7), 0, 2);
    GaussianBlur(DxDy, C01, Size(7, 7), 2, 2);
    C10 = C01;

    Mat det, trace, trace2, R, PPD, PSD;
    multiply(C00, C11, PPD);
    multiply(C01, C10, PSD);
    det = PPD - PSD;

    trace = C00 + C11;
    pow(trace, 2, trace2);

    R = det - 0.04f * trace2;

    normalize(R, R, 0, 255, NORM_MINMAX, CV_32FC1);
    convertScaleAbs(R, dst);

    circleCorners(R, dst);
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1], IMREAD_GRAYSCALE );
	if(src.empty()) return -1;
	Mat dst;
	harris(src, dst);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_circles",
    name: "Hough Circles",
    description:
      "La trasformata di Hough per i cerchi cerca cerchi di raggio noto (qui da 22 a 24 pixel). Ogni pixel di bordo «vota» tutti i possibili centri da cui potrebbe provenire; i veri centri accumulano molti voti perché ricevono il voto da tutti i punti della propria circonferenza.",
    steps: [
      "Smoothing, conversione in grigio e Canny per ottenere i pixel di bordo.",
      "Accumulatore 3D votes(y, x, r) inizializzato a zero.",
      "Per ogni pixel di bordo, raggio e angolo θ: voto al centro (a, b) = (x − r·cosθ, y − r·sinθ).",
      "Le celle con almeno 123 voti sono cerchi: si disegnano centro e circonferenza.",
    ],
    explanations: [
      {
        startMatch: "const int minRadius = 22;",
        endMatch: "#define DEG2RAD CV_PI / 180",
        title: "Parametri",
        text: "Si cercano raggi nell'intervallo [minRadius, maxRadius), cioè 22, 23 e 24 (il ciclo usa <). DEG2RAD converte i gradi in radianti, perché cos e sin lavorano in radianti.",
        note: "Ogni raggio in più aggiunge un intero «piano» all'accumulatore e un ciclo di 360 angoli per ogni pixel di bordo: l'intervallo stretto tiene bassi memoria e tempo.",
      },
      {
        startMatch: "src.copyTo(dst);",
        endMatch: "Canny(src_gray, edges, 100, 112);",
        title: "Pre-elaborazione e accumulatore",
        text: "dst è una copia a colori di src su cui disegneremo. L'immagine viene sfocata (meno bordi spuri), convertita in grigio e passata a Canny, che produce una mappa binaria dei bordi (0 o 255).",
        points: [
          "votes è una Mat a 3 dimensioni: righe × colonne × numero di raggi, float a zero. votes(b, a, r − minRadius) conta i voti per un cerchio di centro (a, b) e raggio r.",
          "CV_RGB2GRAY è la vecchia costante C; in OpenCV 4 l'equivalente è COLOR_BGR2GRAY.",
        ],
      },
      {
        startMatch: "for (int y=0; y<edges.rows; y++)",
        endMatch: "votes.at<float>(b,a,radius-minRadius)++;",
        title: "Votazione",
        text: "Un punto (x, y) di una circonferenza di raggio r ha il centro a distanza r. Non sapendo in che direzione, il punto vota tutti i 360 centri possibili, che formano a loro volta un cerchio di raggio r attorno a lui:",
        points: [
          "a = x − r·cos θ, b = y − r·sin θ per θ = 0…359°.",
          "Il controllo dei limiti scarta i centri fuori dall'immagine.",
          "Per un cerchio reale tutti i punti della circonferenza votano lo stesso centro, che diventa un picco dell'accumulatore.",
        ],
      },
      {
        startMatch: "for (int radius=minRadius; radius<maxRadius; radius++)\n        for (int i=0; i<src_gray.rows; i++)",
        endMatch: "circle(dst, Point(j,i), radius, Scalar(255,0,0), 2, LINE_AA);",
        title: "Estrazione dei cerchi",
        text: "Si scorre l'accumulatore: ogni cella con almeno 123 voti è un cerchio. Si disegna un punto nel centro e la circonferenza di raggio radius, in blu (Scalar è in ordine BGR).",
        points: [
          "Perché 123? Una circonferenza di raggio 22 ha circa 2π·22 ≈ 138 pixel: la soglia richiede che quasi tutto il contorno sia visibile.",
          "Soglia più bassa → trova cerchi parziali ma anche falsi positivi; più alta → solo cerchi quasi perfetti.",
        ],
        note: "Senza non-maximum suppression nell'accumulatore, un cerchio reale può essere disegnato più volte con centri o raggi vicini.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

const int minRadius = 22;
const int maxRadius = 25;
#define DEG2RAD CV_PI / 180

void houghCircles(const Mat src, Mat& dst) {
    src.copyTo(dst);
    Mat gauss, edges, src_gray;
    GaussianBlur(src, gauss, Size(5,5), 0, 0);
    const int sz[] = {gauss.rows, gauss.cols, maxRadius - minRadius};
    Mat votes(3, sz, CV_32F, Scalar(0));
    cvtColor(gauss, src_gray, CV_RGB2GRAY);
    Canny(src_gray, edges, 100, 112);
    
    for (int y=0; y<edges.rows; y++)
        for (int x=0; x<edges.cols; x++)
            if (edges.at<uchar>(y,x) == 255)
                for (int radius=minRadius; radius<maxRadius; radius++)
                    for (int theta=0; theta<360; theta++) {
                        int a = x - radius * cos(theta * DEG2RAD);
                        int b = y - radius * sin(theta * DEG2RAD);
                        if (a>=0 && b>=0 && a<src.cols && b<src.rows)
                            votes.at<float>(b,a,radius-minRadius)++;
                    }
                    
    for (int radius=minRadius; radius<maxRadius; radius++)
        for (int i=0; i<src_gray.rows; i++)
            for (int j=0; j<src_gray.cols; j++)
                if (votes.at<float>(i,j,radius-minRadius) >= 123) {
                    circle(dst, Point(j,i), 1, Scalar(255,0,0), 2, LINE_AA);
                    circle(dst, Point(j,i), radius, Scalar(255,0,0), 2, LINE_AA);
                }
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1] );
	if(src.empty()) return -1;
	Mat dst;
	houghCircles(src, dst);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_lines",
    name: "Hough Lines",
    description:
      "La trasformata di Hough per le rette rappresenta ogni retta in forma polare ρ = x·cos θ + y·sin θ, dove ρ è la distanza dall'origine e θ l'angolo della normale. Ogni pixel di bordo vota tutte le rette (ρ, θ) che passano per lui; le rette vere raccolgono i voti di tutti i loro pixel.",
    steps: [
      "Accumulatore votes[ρ][θ] dimensionato con la diagonale dell'immagine.",
      "Smoothing e Canny per ottenere i pixel di bordo.",
      "Per ogni pixel di bordo e per ogni θ: calcolo di ρ e voto.",
      "Le celle con almeno 100 voti diventano rette, convertite in due punti cartesiani e disegnate.",
    ],
    explanations: [
      {
        startMatch: "void polarToCartesian(double rho, int theta, Point& p1, Point& p2){",
        endMatch: "p2.y = cvRound(y0 - alpha*(cos(rad)));",
        title: "Da (ρ, θ) a due punti",
        text: "Per disegnare una retta con line() servono due punti. (x0, y0) = (ρ·cos θ, ρ·sin θ) è il piede della perpendicolare dall'origine alla retta. La retta è perpendicolare alla normale, quindi la sua direzione è (−sin θ, cos θ).",
        points: [
          "p1 = (x0, y0) + 1000·(−sin θ, cos θ) e p2 = (x0, y0) − 1000·(−sin θ, cos θ).",
          "alpha = 1000 basta a portare i punti fuori dall'immagine: la retta attraversa tutta la figura.",
        ],
      },
      {
        startMatch: "int maxDist = hypot(src.rows, src.cols);",
        endMatch: "Canny(gsrc,edges,50,150);",
        title: "Accumulatore e bordi",
        text: "|ρ| non può superare la diagonale dell'immagine (hypot = √(rows² + cols²)). Poiché ρ può essere negativo, l'accumulatore ha 2·maxDist + 1 righe e l'indice di riga è ρ + maxDist. Le colonne sono i 180 angoli possibili (θ e θ + 180° individuano la stessa retta).",
        points: [
          "GaussianBlur 3×3 riduce il rumore, Canny(50, 150) produce i bordi binari.",
        ],
      },
      {
        startMatch: "for(int x=0; x<edges.rows; x++)",
        endMatch: "votes[(int)rho][theta]++;",
        title: "Votazione",
        text: "Per ogni pixel di bordo (255) si provano tutti i 180 angoli e si calcola il ρ della retta che passa per quel pixel con quell'inclinazione, poi si incrementa votes[ρ + maxDist][θ].",
        points: [
          "Attenzione ai nomi: qui x è la riga e y la colonna, quindi ρ = colonna·cos(θ − 90°) + riga·sin(θ − 90°).",
          "L'indice theta = 0…179 rappresenta l'angolo reale θ − 90° ∈ [−90°, 89°].",
        ],
      },
      {
        startMatch: "dst=src.clone();",
        endMatch: "line(dst,p1,p2,Scalar(0,0,255),2,LINE_AA);",
        title: "Estrazione delle rette",
        text: "Si scorre l'accumulatore: una cella con almeno 100 voti significa che almeno 100 pixel di bordo stanno sulla stessa retta. Dagli indici si torna ai valori reali, ρ = i − maxDist e θ = j − 90, si convertono in due punti e si disegna la retta in rosso (BGR = 0, 0, 255).",
        note: "src è in scala di grigi, quindi anche dst ha un solo canale e la retta appare con l'intensità del primo valore dello Scalar. Per vederla rossa bisognerebbe prima convertire dst in BGR.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

#define DEG2RAD CV_PI / 180

void polarToCartesian(double rho, int theta, Point& p1, Point& p2){
    double rad = theta * DEG2RAD;
    int x0 = cvRound(rho*cos(rad));
    int y0 = cvRound(rho*sin(rad));
    int alpha = 1000;
    p1.x = cvRound(x0 + alpha*(-sin(rad)));
    p1.y = cvRound(y0 + alpha*(cos(rad)));
    p2.x = cvRound(x0 - alpha*(-sin(rad)));
    p2.y = cvRound(y0 - alpha*(cos(rad)));
}

void houghLines(Mat& src, Mat& dst){
    int maxDist = hypot(src.rows, src.cols);
    vector<vector<int>> votes(maxDist*2+1, vector<int>(180, 0));

    Mat gsrc, edges;
    GaussianBlur(src,gsrc,Size(3,3),0,0);
    Canny(gsrc,edges,50,150);

    double rho;
    int theta;
    for(int x=0; x<edges.rows; x++)
        for(int y=0; y<edges.cols; y++)
            if(edges.at<uchar>(x,y) == 255)
                for(theta = 0; theta < 180; theta++){
                    rho = round(y*cos((theta-90)*DEG2RAD) + x*sin((theta-90)*DEG2RAD)) + maxDist;
                    votes[(int)rho][theta]++;
                }

    dst=src.clone();
    Point p1, p2;
    for(size_t i=0; i<votes.size(); i++)
        for(size_t j=0; j<votes[i].size(); j++)
            if(votes[i][j] >= 100){
                rho = i-maxDist;
                theta = j-90;
                polarToCartesian(rho,theta,p1,p2);
                line(dst,p1,p2,Scalar(0,0,255),2,LINE_AA);
            }
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1], IMREAD_GRAYSCALE );
	if(src.empty()) return -1;
	Mat dst;
	houghLines(src, dst);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "kmeans",
    name: "K-means Clustering",
    description:
      "K-means divide i pixel in k = 6 gruppi (cluster) di colore simile. Ogni cluster è rappresentato da un centro (un colore BGR); l'algoritmo alterna assegnazione dei pixel al centro più vicino e ricalcolo dei centri come media, finché i centri smettono di muoversi in modo significativo.",
    steps: [
      "Inizializzazione: k centri presi dal colore di k pixel casuali.",
      "Assegnazione: ogni pixel va nel cluster del centro più vicino.",
      "Aggiornamento: ogni centro diventa la media dei colori del suo cluster.",
      "Ripetizione di assegnazione e aggiornamento fino a convergenza, poi ogni pixel viene colorato con il proprio centro.",
    ],
    explanations: [
      {
        startMatch: "const int k = 6;",
        endMatch: "return (double) blue + green + red;",
        title: "Parametri e distanza",
        text: "k è il numero di cluster, th la soglia di convergenza. computeDistance misura quanto due colori sono diversi sommando le differenze assolute dei tre canali B, G, R.",
        note: "È la distanza di Manhattan (L1), non quella euclidea: |ΔB| + |ΔG| + |ΔR|. È più veloce da calcolare e funziona bene per confrontare colori.",
      },
      {
        startMatch: "void computeRandomCenter(",
        endMatch: "cluster.push_back( vector<Point>() );",
        title: "1. Centri iniziali casuali",
        text: "Il generatore RNG, inizializzato con getTickCount() (quindi diverso a ogni esecuzione), estrae k posizioni casuali. Il colore Vec3b di quei pixel diventa il centro iniziale di ogni cluster, e per ogni cluster si crea una lista vuota di punti.",
        note: "Il risultato dipende dai centri iniziali: esecuzioni diverse possono dare segmentazioni leggermente diverse.",
      },
      {
        startMatch: "void populateCluster(",
        endMatch: "cluster.at(labelID).push_back(Point(j,i));",
        title: "2. Assegnazione dei pixel",
        text: "Per ogni pixel si calcola la distanza dal colore di ciascuno dei k centri e si tiene il minimo (dist parte da INFINITY così il primo confronto vince sempre). Il punto viene aggiunto alla lista del cluster più vicino, labelID.",
      },
      {
        startMatch: "double adjustCenter(",
        endMatch: "return change;",
        title: "3. Aggiornamento dei centri",
        text: "Per ogni cluster si sommano i canali B, G, R di tutti i suoi pixel e si divide per il numero di pixel: la media diventa il nuovo centro.",
        points: [
          "newValue accumula di quanto si è spostato ogni centro (distanza tra vecchio e nuovo) e alla fine viene diviso per k: è lo spostamento medio.",
          "change = |oldValue − newValue| è la variazione dello spostamento medio rispetto all'iterazione precedente; oldValue viene aggiornato (passato per riferimento).",
        ],
        note: "Se un cluster resta vuoto, la divisione per size() = 0 produce NaN: è un caso raro ma possibile con centri iniziali sfortunati.",
      },
      {
        startMatch: "void segment(Mat& dst, vector<Scalar> center, vector<vector<Point>> cluster) {",
        endMatch: "dst.at<Vec3b>(point)[i] = center.at(label)[i];",
        title: "4. Colorazione finale",
        text: "Ogni pixel di ogni cluster viene sostituito, canale per canale, con il colore del proprio centro. L'immagine finale contiene quindi solo k colori.",
      },
      {
        startMatch: "void Kmeans(const Mat src, Mat& dst) {",
        endMatch: "segment(dst, center, cluster);",
        title: "Ciclo di convergenza",
        text: "dst parte come copia di src. oldValue = INFINITY rende infinita la prima distanza, quindi si entra sempre nel ciclo. A ogni iterazione si svuotano i cluster, si riassegnano i pixel e si aggiornano i centri; quando la variazione scende sotto th = 0,05 i centri sono stabili e si colora l'output.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

const int k = 6;
const double th = 0.05f;

double computeDistance(Scalar px, Scalar center) {
    double blue = abs( px[0] - center[0] );
    double green = abs( px[1] - center[1] );
    double red = abs( px[2] - center[2] );
    return (double) blue + green + red;
}

void computeRandomCenter(const Mat src, vector<Scalar>& center, vector<vector<Point>>& cluster) {
	RNG randomNumberGenerator( getTickCount() );
	for (int label=0; label<k; label++) {
		Point px;
		px.x = randomNumberGenerator.uniform(0, src.cols);
		px.y = randomNumberGenerator.uniform(0, src.rows);
		center.push_back( src.at<Vec3b>(px) );
		cluster.push_back( vector<Point>() );
	}
}

void populateCluster(const Mat src, vector<Scalar> center, vector<vector<Point>>& cluster) {
	for (int i=0; i<src.rows; i++)
		for (int j=0; j<src.cols; j++) {
			int labelID = 0;
			double dist = INFINITY;
			for (int label=0; label<k; label++) {
				double pxDist = computeDistance( src.at<Vec3b>(i,j), center.at(label) );
				if (pxDist < dist) {
					dist = pxDist;
					labelID = label;
				}
			}
			cluster.at(labelID).push_back(Point(j,i));
		}
}

double adjustCenter(const Mat src, vector<Scalar>& center, vector<vector<Point>> cluster, double& oldValue, double newValue) {
	for (int label=0; label<k; label++) {
		double blue = 0.0f, green = 0.0f, red = 0.0f;
		for (auto point: cluster.at(label)) {
			blue += src.at<Vec3b>( point )[0];
			green += src.at<Vec3b>( point )[1];
			red += src.at<Vec3b>( point )[2];
		}
		blue /= cluster.at(label).size(); green /= cluster.at(label).size(); red /= cluster.at(label).size();
		Scalar newCenter( cvRound(blue), cvRound(green), cvRound(red) );
		newValue += computeDistance( newCenter, center.at(label) );
		center.at(label) = newCenter;
	}
	newValue /= k;
	double change = abs( oldValue - newValue );
	oldValue = newValue;
	return change;
}

void segment(Mat& dst, vector<Scalar> center, vector<vector<Point>> cluster) {
	for (int label=0; label<k; label++)
		for (auto point: cluster.at(label))
			for (int i=0; i<3; i++)
				dst.at<Vec3b>(point)[i] = center.at(label)[i]; 
}

void Kmeans(const Mat src, Mat& dst) {
    src.copyTo(dst);
    vector<Scalar> center;
    vector<vector<Point>> cluster;
    computeRandomCenter(src, center, cluster);
    double oldValue = INFINITY;
    double newValue = 0.0f;
    double dist = abs( oldValue - newValue );
    
    while (dist > th) {
        newValue = 0.0f;
        for (int label=0; label<k; label++) cluster.at(label).clear();
        populateCluster(src, center, cluster);
        dist = adjustCenter( src, center, cluster, oldValue, newValue );
    }
    segment(dst, center, cluster);
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1] );
	if(src.empty()) return -1;
	Mat dst;
	Kmeans(src, dst);
	imshow("src", src);
	imshow("dst", dst);
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
      "La soglia k* è quella con σB² massima; si binarizza con threshold().",
    ],
    explanations: [
      {
        startMatch: "vector<double> normalizedHistogram(Mat& src) {",
        endMatch: "return his;",
        title: "Istogramma normalizzato",
        text: "Si contano i pixel per ciascuno dei 256 livelli di grigio (il valore del pixel è usato direttamente come indice). Dividendo per il numero totale di pixel si ottiene p(i), la probabilità che un pixel abbia livello i; la somma di tutti i p(i) è 1.",
      },
      {
        startMatch: "for (int i = 0; i < 256; i++) gMean += i * his[i];",
        title: "Media globale",
        text: "mG = Σ i·p(i) è l'intensità media dell'intera immagine. È il riferimento rispetto a cui si misura quanto le due classi si allontanano.",
      },
      {
        startMatch: "double currProb1 = 0.0f;",
        endMatch: "int kstar = 0;",
        title: "Accumulatori",
        text: "Invece di ricalcolare tutto da zero per ogni soglia, si usano valori cumulativi aggiornati di un passo a ogni iterazione:",
        points: [
          "currProb1 = P1(k): frazione di pixel nella classe scura (livelli 0…k).",
          "currCumMean = m(k) = Σ i·p(i) fino a k.",
          "maxVar e kstar memorizzano il miglior valore trovato finora e la soglia corrispondente.",
        ],
      },
      {
        startMatch: "for (int i = 0; i < 256; i++) {",
        endMatch: "return kstar;",
        title: "Massimizzazione di σB²",
        text: "Per ogni soglia i si aggiornano P1 e m, poi si calcola la varianza tra le classi con la formula di Otsu σB² = (mG·P1 − m)² / (P1·(1 − P1)). Se è la più alta vista finora, i diventa la nuova soglia ottima k*.",
        points: [
          "Massimizzare la varianza tra le classi equivale a minimizzare la varianza dentro le classi.",
          "Quando P1 = 0 o P1 = 1 il denominatore è 0 e il risultato è NaN o infinito; un confronto con NaN è sempre falso, quindi quei casi vengono ignorati.",
        ],
      },
      {
        startMatch: "int th = otsu(src);",
        endMatch: "threshold(src, dst, th, 255, THRESH_BINARY);",
        title: "Binarizzazione",
        text: "La soglia trovata viene passata a threshold con THRESH_BINARY: i pixel > th diventano 255 (bianco), gli altri 0 (nero).",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

vector<double> normalizedHistogram(Mat& src) {
    vector<double> his(256, 0);
    for (int i = 0; i < src.rows; i++)
        for (int j = 0; j < src.cols; j++)
            his[src.at<uchar>(i, j)]++;

    for (int i = 0; i < 256; i++) his[i] /= src.rows * src.cols;
    return his;
}

int otsu(Mat& src) {
    vector<double> his = normalizedHistogram(src);
    double gMean = 0.0f;
    for (int i = 0; i < 256; i++) gMean += i * his[i];

    double currProb1 = 0.0f;
    double currCumMean = 0.0f;
    double currIntVar = 0.0f;
    double maxVar = 0.0f;
    int kstar = 0;
    
    for (int i = 0; i < 256; i++) {
        currProb1 += his[i];
        currCumMean += i * his[i];
        currIntVar = pow(gMean * currProb1 - currCumMean, 2) / (currProb1 * (1 - currProb1));
        if (currIntVar > maxVar) {
            maxVar = currIntVar;
            kstar = i;
        }
    }
    return kstar;
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1], IMREAD_GRAYSCALE );
	if(src.empty()) return -1;
	Mat dst;
	int th = otsu(src);
    threshold(src, dst, th, 255, THRESH_BINARY);
	imshow("src", src);
	imshow("dst", dst);
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
      "Ricerca esaustiva su tutte le coppie i < j (e sull'ultima classe tramite k).",
      "Per ogni partizione: σB² = Σ Pw·(mw − mG)² sulle tre classi.",
      "Output a tre livelli: 0, 127, 255.",
    ],
    explanations: [
      {
        startMatch: "vector<int> otsu2k(Mat& src){",
        endMatch: "for(int i=0; i<256; i++) gMean += i*his[i];",
        title: "Istogramma e media globale",
        text: "Come in Otsu: normalizedHistogram restituisce le probabilità p(i) e gMean è la media globale mG = Σ i·p(i).",
      },
      {
        startMatch: "vector<double> currProb(3,0.0f);",
        endMatch: "vector<int> kstar(2,0);",
        title: "Accumulatori per tre classi",
        text: "Con due soglie le classi diventano tre, quindi probabilità cumulata e media cumulata sono vettori di 3 elementi (indice w = 0, 1, 2). kstar conterrà le due soglie migliori.",
      },
      {
        startMatch: "for(int i=0; i<256-2; i++){",
        endMatch: "currProb[1] = currCumMean[1] = 0.0f;\n    }",
        title: "Ricerca esaustiva",
        text: "Tre cicli annidati costruiscono le classi in modo incrementale:",
        points: [
          "i chiude la classe 0 (livelli 0…i): ad ogni passo si aggiunge solo il livello i.",
          "j chiude la classe 1 (livelli i+1…j).",
          "k accumula la classe 2 (da j+1 in poi); quando k arriva a 255 la classe copre j+1…255.",
          "Per ogni configurazione si calcola σB² = Σw Pw·(mw − mG)², con mw = currCumMean[w] / currProb[w] (media della classe). Se supera il massimo, si memorizzano i e j.",
          "Alla fine dei cicli interni gli accumulatori della classe 2 e della classe 1 vengono azzerati, per ripartire con la soglia successiva.",
        ],
        note: "La complessità è O(256³) ≈ 16 milioni di passi: va bene per 2 soglie, ma con più soglie la ricerca esaustiva diventa troppo lenta.",
      },
      {
        startMatch: "void multipleThresholds(Mat& src, Mat& dst, int th1, int th2){",
        endMatch: "dst.at<uchar>(i,j) = 127;",
        title: "Segmentazione a tre livelli",
        text: "dst parte nera (0). I pixel ≥ th2 diventano 255 (classe chiara), quelli ≥ th1 ma < th2 diventano 127 (classe media), gli altri restano 0 (classe scura).",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

vector<double> normalizedHistogram(Mat& src) {
    vector<double> his(256, 0);
    for (int i = 0; i < src.rows; i++)
        for (int j = 0; j < src.cols; j++)
            his[src.at<uchar>(i, j)]++;

    for (int i = 0; i < 256; i++) his[i] /= src.rows * src.cols;
    return his;
}

vector<int> otsu2k(Mat& src){
    vector<double> his = normalizedHistogram(src);
    double gMean = 0.0f;
    for(int i=0; i<256; i++) gMean += i*his[i];

    vector<double> currProb(3,0.0f);
    vector<double> currCumMean(3,0.0f);
    double currIntVar = 0.0f;
    double maxVar = 0.0f;
    vector<int> kstar(2,0);
    
    for(int i=0; i<256-2; i++){
        currProb[0] += his[i];
        currCumMean[0] += i*his[i];
        for(int j=i+1; j<256-1; j++){
            currProb[1] += his[j];
            currCumMean[1] += j*his[j];
            for(int k=j+1; k<256; k++){
                currProb[2] += his[k];
                currCumMean[2] += k*his[k];
                currIntVar = 0.0f;
                for(int w=0; w<3; w++)
                    currIntVar += currProb[w]*pow(currCumMean[w]/currProb[w]-gMean,2);
                if(currIntVar > maxVar){
                    maxVar = currIntVar;
                    kstar[0] = i;
                    kstar[1] = j;
                }
            }
            currProb[2] = currCumMean[2] = 0.0f;
        }
        currProb[1] = currCumMean[1] = 0.0f;
    }
    return kstar;
}

void multipleThresholds(Mat& src, Mat& dst, int th1, int th2){
    dst = Mat::zeros(src.rows, src.cols, CV_8U);
    for(int i=0; i<src.rows; i++)
        for(int j=0; j<src.cols; j++)
            if(src.at<uchar>(i,j) >= th2)
                dst.at<uchar>(i,j) = 255;
            else if(src.at<uchar>(i,j) >= th1)
                dst.at<uchar>(i,j) = 127;
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1], IMREAD_GRAYSCALE );
	if(src.empty()) return -1;
	Mat dst;
	vector<int> ths = otsu2k(src);
    multipleThresholds(src, dst, ths[0], ths[1]);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "region_growing",
    name: "Region Growing",
    description:
      "Il region growing segmenta l'immagine facendo «crescere» regioni a partire da un pixel seme: un vicino viene aggiunto alla regione se il suo colore è abbastanza simile a quello del pixel da cui lo si raggiunge. L'immagine viene scandita tutta, quindi ogni pixel finisce in una regione; le regioni troppo piccole sono considerate rumore.",
    steps: [
      "Si scandisce l'immagine; il primo pixel non ancora assegnato diventa un seme.",
      "Partendo dal seme, uno stack esplora gli 8 vicini e aggiunge quelli con colore simile (distanza² < 204).",
      "Se la regione supera l'1% dell'immagine riceve una nuova etichetta (1, 2, 3, …), altrimenti viene marcata come rumore (255).",
      "Si azzera la maschera e si continua con il seme successivo.",
    ],
    explanations: [
      {
        startMatch: "const int th = 204;",
        endMatch: "Point( 0, 1), Point( 1,-1), Point( 1, 0), Point( 1, 1)\n};",
        title: "Soglia e vicinato a 8",
        text: "th è la soglia sulla distanza al quadrato tra due colori: 204 corrisponde a una distanza euclidea di circa 14 livelli. pointShift2D contiene gli 8 spostamenti (dx, dy) verso i vicini: 4 laterali e 4 diagonali (connettività a 8).",
        note: "Lavorare con la distanza al quadrato evita di calcolare una radice per ogni confronto.",
      },
      {
        startMatch: "void grow(const Mat src, const Mat dst, Mat& mask, Point seed) {",
        endMatch: "front.pop();",
        title: "Esplorazione con lo stack",
        text: "La crescita usa uno stack esplicito (front) invece della ricorsione: su regioni grandi la ricorsione supererebbe lo stack di sistema. Si inserisce il seme; finché lo stack non è vuoto si estrae un punto (top + pop) e lo si segna nella maschera della regione corrente (mask = 1).",
      },
      {
        startMatch: "for (int i=0; i<8; i++) {\n            Point neigh = center + pointShift2D[i];",
        endMatch: "front.push(neigh);",
        title: "Criterio di crescita",
        text: "Per ognuno degli 8 vicini:",
        points: [
          "Se è fuori dall'immagine lo si salta.",
          "Si calcola delta = ΔB² + ΔG² + ΔR² tra il colore del pixel corrente e quello del vicino.",
          "Il vicino entra nello stack se delta < th, se non appartiene già a un'altra regione (dst = 0) e se non è già nella regione corrente (mask = 0).",
        ],
        note: "Il confronto è con il pixel corrente, non con il seme: la regione può seguire sfumature graduali e arrivare a colori molto diversi dal seme. Un pixel può essere inserito più volte nello stack prima di essere segnato, ma il risultato non cambia.",
      },
      {
        startMatch: "void regionGrowing(const Mat src, Mat& dst) {",
        endMatch: "int label = 0;",
        title: "Inizializzazione",
        text: "dst è la mappa delle etichette (0 = non ancora assegnato), mask la regione in costruzione. minRegionArea = 1% dei pixel: regioni più piccole sono considerate rumore.",
      },
      {
        startMatch: "for (int i=0; i<src.rows; i++)\n        for (int j=0; j<src.cols; j++)\n            if (dst.at<uchar>(i,j) == 0) {",
        endMatch: "mask -= mask;",
        title: "Scansione dei semi ed etichettatura",
        text: "Ogni pixel ancora non assegnato diventa un seme e si fa crescere la sua regione. sum(mask) conta i pixel della regione (la maschera vale 1 al suo interno):",
        points: [
          "Regione grande: dst += mask * (++label) scrive la nuova etichetta su tutti i suoi pixel.",
          "Regione piccola: dst += mask * 255 la marca come rumore; così non viene più usata come seme.",
          "mask -= mask azzera la maschera per la regione successiva.",
        ],
        note: "Le etichette sono valori piccoli (1, 2, 3, …): mostrata con imshow, dst appare quasi nera. Per vederla meglio si può moltiplicare per una costante o assegnare un colore a ogni etichetta, come fa il visualizzatore.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>
#include <stack>

using namespace cv;
using namespace std;

const int th = 204;
const Point pointShift2D[8] = {
	Point(-1,-1), Point(-1, 0), Point(-1, 1), Point( 0,-1),
	Point( 0, 1), Point( 1,-1), Point( 1, 0), Point( 1, 1)
};

void grow(const Mat src, const Mat dst, Mat& mask, Point seed) {
    stack<Point> front;
    front.push(seed);
    while (!front.empty()) {
        Point center = front.top();
        mask.at<uchar>(center) = 1;
        front.pop();
        for (int i=0; i<8; i++) {
            Point neigh = center + pointShift2D[i];
            if ( neigh.x < 0 || neigh.x >= src.cols || neigh.y < 0 || neigh.y >= src.rows )
                continue;
            else {
                int delta = cvRound( pow( src.at<Vec3b>(center)[0] - src.at<Vec3b>(neigh)[0], 2 ) +
                                     pow( src.at<Vec3b>(center)[1] - src.at<Vec3b>(neigh)[1], 2 ) +
                                     pow( src.at<Vec3b>(center)[2] - src.at<Vec3b>(neigh)[2], 2 ) );
                if (delta < th && !dst.at<uchar>(neigh) && !mask.at<uchar>(neigh))
                    front.push(neigh);
            }
        }
    }
}

void regionGrowing(const Mat src, Mat& dst) {
    dst = Mat::zeros(src.rows, src.cols, CV_8UC1);
    Mat mask = Mat::zeros(src.rows, src.cols, CV_8UC1);
    const int minRegionArea = int(src.rows * src.cols * 0.01f);
    int label = 0;
    
    for (int i=0; i<src.rows; i++)
        for (int j=0; j<src.cols; j++)
            if (dst.at<uchar>(i,j) == 0) {
                grow(src, dst, mask, Point(j,i));
                if (sum(mask).val[0] > minRegionArea) {
                    dst += mask * (++label);
                } else {
                    dst += mask * 255;
                }
                mask -= mask;
            }
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1] );
	if(src.empty()) return -1;
	Mat dst;
	regionGrowing(src, dst);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "split_merge",
    name: "Split and Merge",
    description:
      "Split and Merge divide ricorsivamente l'immagine in quadranti finché ogni blocco è omogeneo (fase di split, che costruisce un QuadTree), poi riunisce i blocchi vicini omogenei (fase di merge) e colora ogni regione con il suo colore medio.",
    steps: [
      "Si ritaglia l'immagine al quadrato più grande con lato potenza di 2.",
      "Split: se la deviazione standard di un blocco supera 30 e il blocco è più largo di 4 pixel, lo si divide in 4 figli.",
      "Merge: si uniscono i figli adiacenti che risultano omogenei.",
      "Segment: ogni regione unita viene colorata con la media dei suoi blocchi.",
    ],
    explanations: [
      {
        startMatch: "class TNode {",
        endMatch: "void addRegion(TNode* region) { merged.push_back(region); }\n};",
        title: "Nodo del QuadTree",
        text: "Ogni TNode rappresenta un blocco rettangolare dell'immagine:",
        points: [
          "region: il rettangolo; UL, UR, LR, LL: i quattro figli (nullptr se il blocco è una foglia).",
          "mean e stddev: colore medio e deviazione standard del blocco.",
          "merged: i nodi uniti in un'unica regione; mergedB[i] = true se il figlio i è già stato unito e non va più visitato.",
        ],
      },
      {
        startMatch: "TNode* split(Mat& src, Rect R) {",
        endMatch: "return root;",
        title: "Split",
        text: "Si crea il nodo e si calcolano media e deviazione standard del blocco con meanStdDev. L'omogeneità è misurata sommando le deviazioni standard dei tre canali (sqrt(pow(x, 2)) equivale al valore assoluto della somma).",
        points: [
          "Se il blocco è più largo di 4 pixel e stddev > 30 non è omogeneo: si divide in 4 sotto-rettangoli di metà lato e si richiama split su ciascuno.",
          "Altrimenti il nodo resta una foglia.",
          "rectangle disegna il contorno del blocco su src, per visualizzare la suddivisione.",
        ],
        note: "I nomi UR/LL non corrispondono alla posizione geometrica (le coordinate x e y vengono scambiate), ma poiché i blocchi sono quadrati i quattro figli coprono comunque tutto il blocco padre.",
      },
      {
        startMatch: "void merge(TNode* root) {",
        endMatch: "root->setMergedB(0); root->setMergedB(1); root->setMergedB(2); root->setMergedB(3); \n\t}\n}",
        title: "Merge",
        text: "Se il nodo era stato diviso si guardano i suoi figli:",
        points: [
          "Se UL e UR sono entrambi omogenei (stddev ≤ 30) vengono uniti nella stessa regione del padre e marcati come uniti.",
          "Si controlla allo stesso modo la coppia LR e LL; le coppie non omogenee vengono esplorate ricorsivamente.",
          "Se nessuna coppia è omogenea, merge viene richiamato su tutti e quattro i figli.",
          "Una foglia (blocco omogeneo) è una regione a sé: aggiunge sé stessa a merged e marca tutti i figli come gestiti.",
        ],
      },
      {
        startMatch: "void segment(Mat& src, TNode* root) {",
        endMatch: "if ( !root->getMergedB(3) ) segment( src, root->getLL() );\n\t\t}\n\t}\n}",
        title: "Segmentazione finale",
        text: "Si visita l'albero. Un nodo senza regioni unite viene attraversato scendendo nei 4 figli. Un nodo con regioni unite calcola il colore medio dei nodi in merged e lo assegna a tutti i loro rettangoli; se la regione contiene più blocchi, si continua nei figli non ancora uniti.",
      },
      {
        startMatch: "void splitAndMerge(Mat& src) {",
        endMatch: "segment( srcSeg, root );",
        title: "Funzione principale",
        text: "Un leggero blur riduce il rumore. Il QuadTree richiede un quadrato con lato potenza di 2, quindi si calcola exp = ⌊log2(min(rows, cols))⌋ e si ritaglia l'immagine a 2^exp × 2^exp. Lo split lavora su una copia (srcSplit, dove disegna i blocchi), merge e segment su un'altra (srcSeg).",
        note: "Il main mostra solo src: per vedere i risultati si possono aggiungere imshow di srcSplit e srcSeg dentro splitAndMerge.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>
#include <vector>

using namespace cv;
using namespace std;

class TNode {
	private:
		Rect region;
		TNode *UL, *UR, *LR, *LL;
		vector<TNode*> merged;
		vector<bool> mergedB = vector<bool>(4, false);
		Scalar mean = Scalar(0,0,0);
		double stddev = 0.0f;
	public:
		TNode(Rect region) { this->region = region; UL=UR=LR=LL=nullptr; }
		Rect& getRegion() { return region; }
		TNode* getUL() { return UL; }
		TNode* getUR() { return UR; }
		TNode* getLR() { return LR; }
		TNode* getLL() { return LL; }
		vector<TNode*>& getMerged() { return merged; }
		bool getMergedB(int i) { return mergedB.at(i); }
		Scalar getMean() { return mean; }
		double getStddev() { return stddev; }
		void setUL(TNode* UL) { this->UL = UL; }
		void setUR(TNode* UR) { this->UR = UR; }
		void setLR(TNode* LR) { this->LR = LR; }
		void setLL(TNode* LL) { this->LL = LL; }
		void setMergedB(int i) { mergedB.at(i) = true; }
		void setMean(Scalar mean) { this->mean = mean; }
		void setStddev(double stddev) { this->stddev = stddev; }
		void addRegion(TNode* region) { merged.push_back(region); }
};

TNode* split(Mat& src, Rect R) {
    TNode* root = new TNode(R);
    Scalar mean, stddev;
    meanStdDev( src(R), mean, stddev );
    root->setMean( mean );
    root->setStddev( sqrt(pow(stddev[0]+stddev[2]+stddev[1],2)) );
    
    if ( R.width > 4 && root->getStddev() > 30 ) {
        Rect ul( R.x, R.y, R.width/2, R.height/2  );
        root->setUL( split(src, ul) );
        Rect ur( R.x, R.y+R.width/2, R.width/2, R.height/2  );
        root->setUR( split(src, ur) );
        Rect lr( R.x+R.height/2, R.y+R.width/2, R.width/2, R.height/2  );
        root->setLR( split(src, lr) );
        Rect ll( R.x+R.height/2, R.y, R.width/2, R.height/2  );
        root->setLL( split(src, ll) );
    }
    rectangle(src, R, Scalar(0,0,0));
    return root;
}

void merge(TNode* root) {
	if ( root->getRegion().width > 4 && root->getStddev() > 30 ) {
		if ( root->getUL()->getStddev() <= 30 && root->getUR()->getStddev() <= 30 ) {
			root->addRegion( root->getUL() ); root->setMergedB(0);
			root->addRegion( root->getUR() ); root->setMergedB(1);
			if ( root->getLR()->getStddev() <= 30 && root->getLL()->getStddev() <= 30 ) {
				merge( root->getLR() ); root->setMergedB(2);
				merge( root->getLL() ); root->setMergedB(3);
			} else {
				merge( root->getLR() );
				merge( root->getLL() );
			}
		} else {
			merge( root->getUL() );
			merge( root->getUR() );
			merge( root->getLR() );
			merge( root->getLL() );
		}
	} else {
		root->addRegion( root );
		root->setMergedB(0); root->setMergedB(1); root->setMergedB(2); root->setMergedB(3); 
	}
}

void segment(Mat& src, TNode* root) {
	vector<TNode*> merged = root->getMerged();
	if (!merged.size()) {
		segment( src, root->getUL() );
		segment( src, root->getUR() );
		segment( src, root->getLR() );
		segment( src, root->getLL() );
	} else {
		Scalar intensity = Scalar(0,0,0);
		for (auto x: merged)
			intensity += x->getMean();
		intensity[0] /= merged.size();
		intensity[1] /= merged.size();
		intensity[2] /= merged.size();
		for (auto x: merged)
			src(x->getRegion()) = intensity;
		if ( merged.size() > 1 ) {
			if ( !root->getMergedB(0) ) segment( src, root->getUL() );
			if ( !root->getMergedB(1) ) segment( src, root->getUR() );
			if ( !root->getMergedB(2) ) segment( src, root->getLR() );
			if ( !root->getMergedB(3) ) segment( src, root->getLL() );
		}
	}
}

void splitAndMerge(Mat& src) {
    GaussianBlur(src, src, Size(3,3), 0, 0);
    const int exp = log( min(src.rows, src.cols) ) / log(2);
    const int s = pow( 2, exp );
    Rect square( 0, 0, s, s );
    src = src(square).clone();
    
    Mat srcSplit = src.clone();
    Mat srcSeg = src.clone();
    TNode* root = split(srcSplit, Rect(0, 0, src.rows, src.cols));  
    merge(root);
    segment( srcSeg, root );
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1] );
	if(src.empty()) return -1;
	splitAndMerge(src);
	imshow("src", src);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
];
