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
      "Canny trova bordi sottili (larghi un pixel), ben localizzati e poco sensibili al rumore: sono i tre criteri con cui Canny ha progettato il suo rilevatore nel 1986. Un bordo è un punto in cui l'intensità cambia bruscamente, cioè dove il gradiente è grande. Per ricordarlo bastano 5 parole: blur, Sobel, modulo/fase, NMS, isteresi. Il codice è diviso in tre funzioni: myCanny esegue la pipeline, nonMaxSuppression assottiglia i bordi, hysteresis decide quali tenere usando le due soglie globali lth e hth.",
    steps: [
      "Blur gaussiano 5×5: le derivate amplificano il rumore, quindi prima si sfoca.",
      "Sobel 3×3: derivate Dx e Dy in float, perché possono essere negative.",
      "Modulo √(Dx² + Dy²), normalizzato in 0–255, e fase atan2(Dy, Dx) in gradi.",
      "NMS: la direzione del gradiente viene arrotondata a 0°, 45°, 90° o 135° e un pixel resta solo se è un massimo rispetto ai due vicini in quella direzione.",
      "Isteresi: > hth → bordo forte; tra lth e hth → bordo solo se tocca un bordo forte; il resto viene scartato.",
    ],
    concepts: ["mat", "coords", "types", "neighborhood", "kernel", "gaussian", "gradient", "edge", "normalize", "nms", "threshold", "hysteresis"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const int lth = 40;",
        endMatch: "const int hth = 90;",
        title: "Soglie dell'isteresi",
        text: "Le due soglie sono costanti globali perché hysteresis le legge direttamente, senza riceverle come parametri. Valgono sul modulo normalizzato 0–255, quindi non dipendono dal contrasto dell'immagine.",
        points: [
          "Canny consiglia un rapporto tra 1:2 e 1:3 tra soglia bassa e alta: 40 e 90 stanno in questo intervallo.",
          "Soglie più alte danno meno bordi e più puliti, più basse più dettagli ma anche più rumore.",
          "Abbassare solo lth allunga i bordi esistenti (più pixel deboli vengono «accesi»); abbassare hth fa comparire bordi nuovi.",
        ],
      },
      {
        startMatch: "void nonMaxSuppression(const Mat& mag, const Mat& angle, Mat& nms) {",
        endMatch: "float a = fmod(angle.at<float>(y, x), 180);",
        title: "NMS · Angolo in [0°, 180°)",
        text: "Il modulo del gradiente produce bordi «spessi»: attorno a un bordo vero anche i pixel vicini hanno un gradiente alto. La non-maximum suppression tiene solo il crinale. nms parte tutta nera (Mat::zeros, un canale da 8 bit, stessa dimensione di mag): un pixel diventa bordo solo se lo decidiamo.",
        points: [
          "y è la riga e x la colonna, quindi at<>(y, x). I cicli partono da 1 e finiscono a rows-1 / cols-1, così i vicini (y±1, x±1) sono sempre dentro l'immagine.",
          "angle è CV_32F (lo produce phase), quindi si legge con at<float>: usare il tipo sbagliato in at<> legge byte a caso senza errori di compilazione.",
          "phase restituisce angoli in [0°, 360°). Un angolo a e a + 180° indicano la stessa retta e quindi la stessa coppia di vicini: fmod(a, 180) riporta tutto in [0°, 180°) e restano solo 4 casi.",
        ],
      },
      {
        startMatch: "int dy, dx;",
        endMatch: "{ dy = 1; dx = -1; }",
        title: "NMS · I 4 settori",
        text: "Il gradiente è perpendicolare al bordo. (dy, dx) è il passo verso uno dei due vicini lungo il gradiente: i vicini da confrontare sono (y + dy, x + dx) e (y − dy, x − dx). La direzione viene arrotondata al multiplo di 45° più vicino:",
        points: [
          "0° (a < 22,5 o a ≥ 157,5): passo (0, 1) → sinistra e destra. Il gradiente è orizzontale, quindi il bordo è verticale.",
          "45° (fino a 67,5): passo (1, 1) → diagonale principale.",
          "90° (fino a 112,5): passo (1, 0) → sopra e sotto. Il bordo è orizzontale.",
          "135° (il resto): passo (1, −1) → anti-diagonale.",
        ],
        note: "Trucco per ricordarlo: le soglie sono 22,5 · 67,5 · 112,5 · 157,5 (cioè 45° · k ± 22,5°). Nelle immagini la y cresce verso il basso, quindi 45° punta in basso a destra: per questo il passo è (1, 1).",
      },
      {
        startMatch: "uchar m = mag.at<uchar>(y, x);",
        endMatch: "nms.at<uchar>(y, x) = m;",
        title: "NMS · Massimo locale",
        text: "Se il pixel è maggiore o uguale a entrambi i vicini è il «crinale» del bordo e ne copiamo il valore; altrimenti resta 0. Il risultato sono bordi larghi un pixel, ancora con intensità diverse: a decidere quali tenere sarà l'isteresi.",
        points: [
          "mag è stato normalizzato in CV_8U, quindi si legge con at<uchar>.",
          "Con ≥ invece di > due pixel con lo stesso valore vengono tenuti entrambi: su un «altopiano» il bordo può risultare largo due pixel, ma non si perde.",
        ],
      },
      {
        startMatch: "void hysteresis(const Mat& nms, Mat& dst) {",
        endMatch: "dst.at<uchar>(y + dy, x + dx) = 255;",
        title: "Isteresi",
        text: "dst parte nera. Ogni pixel con valore > hth è un bordo forte e diventa 255. Attorno a lui si guarda l'intorno 3×3 (dy, dx ∈ {−1, 0, 1}): i vicini deboli, con lth < valore < hth, vengono «accesi» perché collegati a un bordo certo.",
        points: [
          "Fino a lth → mai bordo. Sopra hth → sempre bordo. In mezzo → bordo solo se vicino a un forte.",
          "Con una sola soglia alta i bordi si spezzerebbero, con una sola soglia bassa entrerebbe il rumore: l'isteresi combina i vantaggi delle due.",
          "Qui dy e dx sono le variabili dei cicli sull'intorno, non i passi della NMS: sono variabili locali diverse con lo stesso nome.",
          "I confronti sono stretti: un pixel che vale esattamente hth non è forte, uno che vale esattamente lth non è debole.",
        ],
        note: "Versione semplificata: un solo passaggio, quindi accende solo i deboli che toccano direttamente un forte e non segue le catene di deboli. Il Canny di OpenCV invece segue i bordi deboli finché restano collegati a uno forte.",
      },
      {
        startMatch: "void myCanny(const Mat& src, Mat& dst) {",
        endMatch: "GaussianBlur(src, gauss, Size(5, 5), 0, 0);",
        title: "Pipeline · Blur gaussiano",
        text: "Le derivate amplificano il rumore: un singolo pixel diverso dai vicini produce un gradiente altissimo. Per questo prima si sfoca con un filtro gaussiano 5×5.",
        points: [
          "GaussianBlur(src, dst, ksize, sigmaX, sigmaY): ksize deve avere lati dispari e positivi.",
          "sigmaX = 0 → OpenCV lo calcola dalla dimensione del kernel: σ = 0,3·((k − 1)·0,5 − 1) + 0,8, cioè 1,1 per k = 5. sigmaY = 0 → uguale a sigmaX.",
          "Un kernel più grande toglie più rumore ma sposta e arrotonda i bordi.",
        ],
      },
      {
        startMatch: "Mat Dx, Dy;",
        endMatch: "Sobel(gauss, Dy, CV_32F, 0, 1, 3);",
        title: "Pipeline · Sobel",
        text: "Sobel(src, dst, ddepth, dx, dy, ksize) approssima la derivata con un kernel 3×3: (1, 0) dà la derivata in x, (0, 1) quella in y. Il kernel in x è [−1 0 1; −2 0 2; −1 0 1]: differenza tra destra e sinistra, con un leggero smoothing in verticale.",
        points: [
          "ddepth = CV_32F perché le derivate possono essere negative (passaggio da chiaro a scuro): su 8 bit verrebbero tagliate a 0.",
          "Dx è grande sui bordi verticali, Dy su quelli orizzontali.",
        ],
      },
      {
        startMatch: "Mat mag, angle;",
        endMatch: "phase(Dx, Dy, angle, true);",
        title: "Pipeline · Modulo e fase",
        text: "Per ogni pixel il gradiente è il vettore (Dx, Dy): il modulo dice quanto è forte il bordo, la fase in che direzione cambia l'intensità.",
        points: [
          "magnitude(Dx, Dy, mag): √(Dx² + Dy²), in float come gli ingressi.",
          "normalize(mag, mag, 0, 255, NORM_MINMAX, CV_8U): il minimo diventa 0, il massimo 255 e il risultato viene convertito in 8 bit. Così le soglie non dipendono dal contrasto dell'immagine.",
          "phase(Dx, Dy, angle, true): atan2(Dy, Dx) per ogni pixel; con true l'angolo è in gradi in [0°, 360°), altrimenti in radianti.",
        ],
      },
      {
        startMatch: "Mat nms;",
        endMatch: "hysteresis(nms, dst);",
        title: "Pipeline · NMS e isteresi",
        text: "Prima si assottigliano i bordi (nms), poi si binarizzano con le due soglie in dst: 0 = sfondo, 255 = bordo. dst è passato per riferimento, quindi il risultato arriva direttamente al main.",
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "dst viene creata vuota: sarà myCanny (tramite hysteresis) ad allocarla con Mat::zeros della dimensione giusta. Poi si mostrano l'originale e la mappa dei bordi.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "Harris individua gli angoli (corner): punti in cui l'intensità cambia molto spostando una piccola finestra in qualunque direzione. Su una zona piatta non cambia nulla, lungo un bordo cambia solo attraversandolo, su un angolo cambia in tutte le direzioni. Questo comportamento è riassunto dalla matrice C (detta anche M, matrice di struttura) e dalla risposta R = det(C) − k·trace(C)², che evita di calcolare gli autovalori.",
    steps: [
      "Derivate Dx e Dy con Sobel 3×3 (in float).",
      "Prodotti pixel per pixel: Dx², Dy², Dx·Dy.",
      "Smoothing gaussiano 7×7 dei prodotti: è la somma pesata sulla finestra attorno a ogni pixel e fornisce gli elementi Sx2, Sy2, Sxy di C.",
      "Risposta R = (Sx2·Sy2 − Sxy²) − k·(Sx2 + Sy2)² con k = 0,04.",
      "Normalizzazione di R in [0, 255] e cerchio bianco sui pixel con R > th = 100.",
    ],
    concepts: ["mat", "coords", "types", "kernel", "gaussian", "gradient", "corner", "eigen", "normalize", "threshold", "clone"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const float k = 0.04f;",
        endMatch: "const int th = 100;",
        title: "Parametri",
        text: "k è la costante empirica di Harris (valori tipici 0,04–0,06) e th la soglia applicata a R dopo averla normalizzata in [0, 255].",
        points: [
          "k più grande penalizza di più i bordi: vengono trovati meno angoli, solo i più netti.",
          "th più alta → meno angoli; più bassa → compaiono anche angoli deboli e rumore.",
          "0.04f con la f è un float: senza f sarebbe un double (funziona lo stesso, ma è il tipo dichiarato).",
        ],
      },
      {
        startMatch: "void harris(const Mat& src, Mat& dst) {",
        endMatch: "Sobel(src, Dy, CV_32F, 0, 1, 3);",
        title: "Derivate con Sobel",
        text: "Spostando una finestra di (u, v) la variazione di intensità si approssima con lo sviluppo di Taylor: dipende solo dalle derivate Ix e Iy. Sobel 3×3 le calcola in float (CV_32F) perché possono essere negative.",
        points: [
          "Sobel(src, Dx, CV_32F, 1, 0, 3) → derivata in x; (0, 1) → derivata in y.",
          "Qui non c'è un blur prima di Sobel: lo smoothing arriva dopo, sui prodotti, e fa da finestra.",
        ],
      },
      {
        startMatch: "Mat Dx2, Dy2, Dxy;",
        endMatch: "multiply(Dx, Dy, Dxy);",
        title: "Prodotti delle derivate",
        text: "Gli elementi della matrice C sono somme di prodotti di derivate. Prima si calcolano i prodotti pixel per pixel:",
        points: [
          "pow(Dx, 2, Dx2) → Dx²: elevamento a potenza di ogni elemento.",
          "pow(Dy, 2, Dy2) → Dy².",
          "multiply(Dx, Dy, Dxy) → Dx·Dy: prodotto elemento per elemento. Attenzione: Dx * Dy tra due Mat sarebbe il prodotto matriciale, non questo.",
        ],
      },
      {
        startMatch: "Mat Sx2, Sy2, Sxy;",
        endMatch: "GaussianBlur(Dxy, Sxy, Size(7, 7), 2, 2);",
        title: "Matrice C",
        text: "Per ogni pixel C = [[ΣDx², ΣDxDy], [ΣDxDy, ΣDy²]], dove le somme sono fatte su una finestra attorno al pixel, pesate con una gaussiana (i pixel vicini al centro contano di più). Applicare GaussianBlur 7×7 con σ = 2 ai prodotti calcola proprio queste somme pesate per tutti i pixel insieme.",
        points: [
          "Sx2 = Σ w·Dx², Sy2 = Σ w·Dy², Sxy = Σ w·DxDy.",
          "C è simmetrica: i due elementi fuori diagonale sono entrambi Sxy, quindi bastano tre matrici.",
          "La finestra gaussiana rende la risposta isotropa (uguale in tutte le direzioni), a differenza di una finestra quadrata.",
        ],
      },
      {
        startMatch: "Mat SxSy, Sxy2, trace2;",
        endMatch: "Mat R = (SxSy - Sxy2) - k * trace2;",
        title: "Risposta di Harris R",
        text: "Gli autovalori λ1, λ2 di C dicono quanto cambia l'intensità nelle due direzioni principali. Calcolarli per ogni pixel è costoso; Harris usa det(C) = λ1·λ2 e trace(C) = λ1 + λ2, che si ottengono con semplici prodotti e somme.",
        points: [
          "det = Sx2·Sy2 − Sxy² (prodotto della diagonale principale meno quello della secondaria).",
          "trace = Sx2 + Sy2, elevata al quadrato con pow (Sx2 + Sy2 è un'espressione tra Mat, valutata elemento per elemento).",
          "R = det − k·trace²: le operazioni + − e il prodotto per uno scalare tra Mat sono elemento per elemento.",
          "R grande e positivo → entrambi gli autovalori grandi → angolo. R negativo → un solo autovalore grande → bordo. |R| piccolo → zona piatta.",
        ],
      },
      {
        startMatch: "normalize(R, R, 0, 255, NORM_MINMAX, CV_32F);",
        endMatch: "dst = src.clone();",
        title: "Normalizzazione",
        text: "I valori di R sono enormi (prodotti di quarta potenza delle derivate) e dipendono dall'immagine. normalize con NORM_MINMAX li riscala in [0, 255] restando in float (CV_32F): così la soglia th ha sempre lo stesso significato.",
        points: [
          "dst = src.clone() crea una copia indipendente dell'immagine su cui disegnare: con dst = src le due Mat condividerebbero gli stessi pixel e si disegnerebbe anche sull'originale.",
        ],
      },
      {
        startMatch: "for (int y = 0; y < R.rows; y++)",
        endMatch: "circle(dst, Point(x, y), 5, Scalar(255), 2);",
        title: "Disegno degli angoli",
        text: "Si scorre R e, dove supera la soglia, si disegna su dst un cerchio bianco (Scalar(255), l'immagine ha un solo canale) di raggio 5 e spessore 2.",
        points: [
          "R è float, quindi at<float>(y, x).",
          "Point vuole (x, y) = (colonna, riga): per questo si scrive Point(x, y) mentre at<float> vuole (y, x).",
        ],
        note: "Non c'è una non-maximum suppression: attorno a un angolo forte più pixel adiacenti superano la soglia e i cerchi si sovrappongono formando una macchia. Il visualizzatore, per leggibilità, disegna un solo cerchio per angolo.",
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "harris riempie dst con la copia dell'immagine e i cerchi; poi si mostrano originale e risultato.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "La trasformata di Hough per i cerchi cerca cerchi di raggio noto (qui da 22 a 25 pixel). Un cerchio di centro (a, b) e raggio r è l'insieme dei punti con (x − a)² + (y − b)² = r²: si cerca nello spazio dei parametri (a, b, r) invece che nell'immagine. Ogni pixel di bordo «vota» tutti i possibili centri da cui potrebbe provenire; i veri centri accumulano molti voti perché ricevono il voto da tutti i punti della propria circonferenza.",
    steps: [
      "Smoothing gaussiano 5×5 e Canny (100, 112) per ottenere i pixel di bordo.",
      "Accumulatore 3D votes(b, a, r − rMin) inizializzato a zero.",
      "Per ogni pixel di bordo (x, y), raggio r e angolo θ: voto al centro (a, b) = (x − r·cos θ, y − r·sin θ).",
      "Ogni pixel di bordo vota quindi una circonferenza di possibili centri: dove molte circonferenze si incrociano c'è un centro vero.",
      "Le celle con almeno 123 voti sono cerchi: si disegnano centro e circonferenza.",
    ],
    concepts: ["mat", "coords", "types", "edge", "hough", "radians", "threshold", "nms", "clone"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const int cth1 = 100;",
        endMatch: "const int hth = 123;",
        title: "Parametri",
        text: "cth1 e cth2 sono le soglie di Canny. Si cercano i raggi da rMin a rMax inclusi (i cicli usano <=), cioè 22, 23, 24 e 25. hth è il numero minimo di voti perché una cella dell'accumulatore sia considerata un cerchio.",
        points: [
          "hth troppo alta → nessun cerchio; troppo bassa → molti falsi cerchi, soprattutto su zone ricche di bordi (capelli, tessuti).",
          "Le soglie di Canny vicine (100 e 112) tengono quasi solo i bordi netti.",
        ],
        note: "Ogni raggio in più aggiunge un intero «piano» all'accumulatore e 360 calcoli per ogni pixel di bordo: l'intervallo stretto tiene bassi memoria e tempo.",
      },
      {
        startMatch: "void houghCircles(const Mat& src, Mat& dst) {",
        endMatch: "Canny(gauss, edges, cth1, cth2);",
        title: "Bordi",
        text: "L'immagine viene sfocata (meno bordi spuri) e passata al Canny di OpenCV, che produce una mappa binaria: 255 sui bordi, 0 altrove. Solo i pixel di bordo voteranno.",
        points: [
          "Canny(src, edges, soglia1, soglia2): le soglie hanno lo stesso significato di lth e hth del Canny scritto a mano.",
        ],
      },
      {
        startMatch: "int sizes[] = {src.rows, src.cols, rMax - rMin + 1};",
        endMatch: "Mat votes(3, sizes, CV_32S, Scalar(0));",
        title: "Accumulatore 3D",
        text: "votes è una Mat a 3 dimensioni: righe × colonne × numero di raggi, di interi (CV_32S) inizializzati a zero da Scalar(0). La cella votes(b, a, r − rMin) conta i voti per un cerchio di centro (a, b) e raggio r.",
        points: [
          "Il costruttore Mat(numero di dimensioni, array delle dimensioni, tipo, valore iniziale) serve per Mat con più di 2 dimensioni.",
          "Il +1 serve perché anche rMax è incluso: i raggi sono rMax − rMin + 1.",
          "r − rMin trasforma il raggio in un indice da 0: con r = 22 si usa il piano 0.",
          "CV_32S (int) e non CV_8U: un centro può ricevere più di 255 voti.",
        ],
      },
      {
        startMatch: "for (int y = 0; y < edges.rows; y++)",
        endMatch: "for (int t = 0; t < 360; t++) {",
        title: "Votazione · Cicli",
        text: "Si scorrono tutti i pixel; solo quelli di bordo (255) votano. Per ognuno si provano tutti i raggi e tutti i 360 angoli (in gradi interi).",
        points: [
          "Il costo è circa (pixel di bordo) × (numero di raggi) × 360: per questo si usa Canny con soglie alte e un intervallo di raggi stretto.",
        ],
      },
      {
        startMatch: "double theta = t * CV_PI / 180;",
        endMatch: "int b = cvRound(y - r * sin(theta));",
        title: "Votazione · Centro candidato",
        text: "Se (x, y) sta su un cerchio di raggio r, il centro si trova a distanza r da lui in qualche direzione θ: a = x − r·cos θ, b = y − r·sin θ. Al variare di θ i centri candidati formano a loro volta una circonferenza di raggio r attorno al pixel.",
        points: [
          "cos e sin vogliono radianti: theta = t·π/180.",
          "cvRound arrotonda all'intero più vicino: a e b diventano indici di colonna e di riga.",
        ],
      },
      {
        startMatch: "if (a >= 0 && a < src.cols && b >= 0 && b < src.rows)",
        endMatch: "votes.at<int>(b, a, r - rMin)++;",
        title: "Votazione · Voto",
        text: "I centri fuori dall'immagine vengono scartati (non hanno una cella nell'accumulatore), gli altri ricevono un voto.",
        points: [
          "at<int>(b, a, r − rMin): riga, colonna, piano del raggio. Il tipo int corrisponde a CV_32S.",
          "La circonferenza ha circa 2πr ≈ 140–160 pixel ma gli angoli sono 360: angoli vicini cadono nella stessa cella, quindi ogni pixel dà al vero centro 2–3 voti.",
        ],
      },
      {
        startMatch: "dst = src.clone();",
        endMatch: "if (votes.at<int>(b, a, r - rMin) >= hth) {",
        title: "Estrazione dei cerchi",
        text: "Su una copia di src si scorre l'accumulatore, piano per piano: ogni cella con almeno hth voti è un cerchio di centro (a, b) e raggio r.",
        note: "Non c'è una non-maximum suppression: anche le celle vicine al vero centro (o con raggio vicino) possono superare la soglia, e allora si vedono più cerchi quasi sovrapposti.",
      },
      {
        startMatch: "circle(dst, Point(a, b), 3, Scalar(0), 2);",
        endMatch: "circle(dst, Point(a, b), r, Scalar(0), 2);",
        title: "Disegno",
        text: "Si disegnano in nero un piccolo cerchio di raggio 3 (il centro) e la circonferenza di raggio r, entrambi con spessore 2.",
        points: [
          "Point vuole (colonna, riga) = (a, b), mentre at<int> vuole (riga, colonna) = (b, a).",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "houghCircles riempie dst con la copia dell'immagine e i cerchi trovati; poi si mostrano originale e risultato.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "La trasformata di Hough per le rette descrive ogni retta in forma polare: ρ = x·cos θ + y·sin θ, dove ρ è la distanza dall'origine e θ l'angolo della normale. Non si usa y = mx + q perché per le rette verticali m è infinito. Ogni pixel di bordo vota tutte le rette (ρ, θ) che passano per lui, che nello spazio (θ, ρ) formano una sinusoide; dove molte sinusoidi si incrociano c'è una retta su cui stanno molti pixel.",
    steps: [
      "Smoothing gaussiano 5×5 e Canny (90, 160) per ottenere i pixel di bordo.",
      "Accumulatore votes(ρ + maxDist, θ) con θ ∈ [0°, 180°) e ρ ∈ [−maxDist, maxDist].",
      "Per ogni pixel di bordo e ogni θ: ρ = x·cos θ + y·sin θ e un voto alla cella.",
      "Le celle con almeno 90 voti sono rette.",
      "Da (ρ, θ) si ricavano due punti lontani sulla retta e la si disegna con line().",
    ],
    concepts: ["mat", "coords", "types", "edge", "hough", "polar", "radians", "threshold", "nms", "clone"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const int cth1 = 90;",
        endMatch: "const int hth = 90;",
        title: "Parametri",
        text: "cth1 e cth2 sono le soglie di Canny; hth è il numero minimo di pixel di bordo che devono stare sulla stessa retta perché venga disegnata.",
        points: [
          "hth più bassa → compaiono anche segmenti corti e rette spurie; più alta → solo le rette lunghe e nette.",
          "Le soglie di Canny più basse danno più pixel di bordo, quindi più voti ovunque.",
        ],
      },
      {
        startMatch: "void houghLines(const Mat& src, Mat& dst) {",
        endMatch: "Canny(gauss, edges, cth1, cth2);",
        title: "Bordi",
        text: "L'immagine viene sfocata con un filtro gaussiano 5×5 e passata al Canny di OpenCV, che produce una mappa binaria: 255 sui bordi, 0 altrove. Solo i pixel di bordo voteranno.",
      },
      {
        startMatch: "int maxDist = hypot(src.rows, src.cols);",
        endMatch: "Mat votes = Mat::zeros(2 * maxDist + 1, 180, CV_32S);",
        title: "Accumulatore",
        text: "|ρ| non può superare la diagonale dell'immagine (hypot = √(rows² + cols²)). Poiché ρ può essere negativo, l'accumulatore ha 2·maxDist + 1 righe e l'indice di riga è ρ + maxDist. Le colonne sono i 180 angoli possibili: θ e θ + 180° individuano la stessa retta (con ρ di segno opposto).",
        points: [
          "Risoluzione: 1 pixel in ρ e 1° in θ. Una risoluzione più fine distingue rette più vicine ma divide i voti tra più celle.",
          "CV_32S (int) perché una retta lunga può ricevere centinaia di voti.",
        ],
      },
      {
        startMatch: "for (int y = 0; y < edges.rows; y++)",
        endMatch: "for (int t = 0; t < 180; t++) {",
        title: "Votazione · Cicli",
        text: "Si scorrono tutti i pixel; solo quelli di bordo (255) votano. Per ognuno si provano tutti i 180 angoli.",
        points: [
          "Il costo è (pixel di bordo) × 180: molto meno dei cerchi, che hanno un parametro in più.",
        ],
      },
      {
        startMatch: "double theta = t * CV_PI / 180;",
        endMatch: "votes.at<int>(rho, t)++;",
        title: "Votazione · Calcolo di ρ",
        text: "Per l'angolo θ si calcola il ρ della retta con normale inclinata di θ che passa per (x, y), lo si sposta di maxDist per avere un indice ≥ 0 e si incrementa la cella.",
        points: [
          "x è la colonna e y la riga, come nelle coordinate dell'immagine: ρ = x·cos θ + y·sin θ.",
          "Al variare di θ i valori (θ, ρ) di un pixel disegnano una sinusoide: due pixel sulla stessa retta hanno sinusoidi che si incrociano nella cella (θ, ρ) di quella retta.",
        ],
      },
      {
        startMatch: "dst = src.clone();",
        endMatch: "double theta = t * CV_PI / 180;",
        title: "Estrazione delle rette",
        text: "Su una copia di src si scorre l'accumulatore: una cella con almeno hth voti è una retta. Dagli indici si torna ai valori reali: ρ = r − maxDist e θ in radianti.",
        note: "Non c'è una non-maximum suppression: celle vicine a una retta forte possono superare anch'esse la soglia e si vedono fasci di rette quasi sovrapposte.",
      },
      {
        startMatch: "double x0 = rho * cos(theta), y0 = rho * sin(theta);",
        endMatch: "Point p2(cvRound(x0 + maxDist * sin(theta)), cvRound(y0 - maxDist * cos(theta)));",
        title: "Da (ρ, θ) a due punti",
        text: "line() vuole due punti, quindi la retta in forma polare va convertita:",
        points: [
          "(x0, y0) = (ρ·cos θ, ρ·sin θ) è il punto della retta più vicino all'origine (piede della perpendicolare).",
          "La retta è perpendicolare alla normale (cos θ, sin θ), quindi la sua direzione è (−sin θ, cos θ).",
          "p1 e p2 si ottengono spostandosi di ±maxDist lungo la direzione: maxDist è la diagonale, quindi i punti cadono fuori dall'immagine e la retta la attraversa tutta (line taglia ciò che esce).",
        ],
      },
      {
        startMatch: "line(dst, p1, p2, Scalar(127), 2);",
        title: "Disegno",
        text: "La retta viene disegnata in grigio (127) con spessore 2. src è in scala di grigi, quindi anche dst ha un solo canale e lo Scalar usa un solo valore.",
        points: [
          "Il grigio medio resta visibile sia sulle zone chiare sia su quelle scure; per un colore servirebbe prima convertire dst in BGR con cvtColor.",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "houghLines riempie dst con la copia dell'immagine e le rette trovate; poi si mostrano originale e risultato.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "K-means divide i pixel in k = 6 gruppi (cluster) di colore simile. Ogni cluster è rappresentato da un centro (un colore BGR); l'algoritmo alterna l'assegnazione dei pixel al centro più vicino e il ricalcolo dei centri come media, finché i centri si spostano in media meno di th = 0,5. Così minimizza la somma delle distanze al quadrato tra ogni pixel e il suo centro. La posizione dei pixel non conta: due zone lontane dello stesso colore finiscono nello stesso cluster.",
    steps: [
      "Inizializzazione: k centri presi dal colore di k pixel casuali.",
      "Assegnazione: ogni pixel riceve l'etichetta del centro più vicino (distanza euclidea tra i colori).",
      "Aggiornamento: ogni centro diventa la media dei colori dei suoi pixel; si misura di quanto si sono spostati i centri.",
      "Si ripetono assegnazione e aggiornamento finché lo spostamento medio è maggiore di th.",
      "Ogni pixel viene colorato con il colore del proprio centro: l'immagine finale ha solo k colori.",
    ],
    concepts: ["mat", "color", "coords", "segmentation", "centroid", "distance", "convergence", "labels", "types"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "<vector> serve per vector (lista dei centri, somme e conteggi); in pratica è già incluso da opencv.hpp, ma scriverlo rende esplicita la dipendenza.",
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const int k = 6;",
        endMatch: "const double th = 0.5;",
        title: "Parametri",
        text: "k è il numero di cluster, e quindi di colori nell'immagine finale. th è la soglia di convergenza: quando i centri si spostano in media meno di 0,5 livelli di colore, l'algoritmo si ferma.",
        points: [
          "k piccolo → immagine molto semplificata (effetto poster); k grande → più fedele all'originale ma più lento.",
          "th più grande → si ferma prima, con centri meno precisi.",
        ],
      },
      {
        startMatch: "void kmeansSegmentation(const Mat& src, Mat& dst) {",
        endMatch: "centers[c] = src.at<Vec3b>(rng.uniform(0, src.rows), rng.uniform(0, src.cols));",
        title: "1. Centri iniziali casuali",
        text: "Il generatore RNG, inizializzato con getTickCount() (quindi diverso a ogni esecuzione), estrae k posizioni casuali: il colore di quei pixel diventa il centro iniziale di ogni cluster.",
        points: [
          "rng.uniform(a, b) restituisce un intero in [a, b): righe in [0, rows), colonne in [0, cols).",
          "I centri sono Vec3f (float) e non Vec3b: le medie calcolate dopo non vengono troncate a interi. L'assegnazione da Vec3b a Vec3f converte da sola.",
        ],
        note: "Il risultato dipende dai centri iniziali: esecuzioni diverse possono dare segmentazioni leggermente diverse. K-means converge sempre, ma a un minimo locale, non necessariamente al migliore.",
      },
      {
        startMatch: "Mat labels(src.size(), CV_32S);",
        endMatch: "while (shift > th) {",
        title: "Ciclo di convergenza",
        text: "labels contiene, per ogni pixel, l'indice (0…k−1) del cluster a cui appartiene; è CV_32S, quindi si legge con at<int>. shift parte da INFINITY, quindi si entra sempre nel ciclo almeno una volta.",
      },
      {
        startMatch: "for (int y = 0; y < src.rows; y++)",
        endMatch: "Vec3f px = src.at<Vec3b>(y, x);",
        title: "2. Assegnazione · Lettura del pixel",
        text: "Si scorrono tutti i pixel e se ne legge il colore come Vec3b (tre uchar B, G, R), convertito in Vec3f per poterlo sottrarre ai centri float.",
      },
      {
        startMatch: "double minDist = INFINITY;",
        endMatch: "labels.at<int>(y, x) = c;",
        title: "2. Assegnazione · Centro più vicino",
        text: "Si calcola la distanza del colore da ciascuno dei k centri e si tiene la minima: minDist parte da INFINITY, così il primo confronto vince sempre. L'etichetta del pixel diventa l'indice del centro più vicino.",
        points: [
          "norm(px − centers[c]) è la distanza euclidea √(ΔB² + ΔG² + ΔR²).",
          "Costo di un'iterazione: pixel × k distanze.",
        ],
      },
      {
        startMatch: "vector<Vec3f> sum(k, Vec3f(0, 0, 0));",
        endMatch: "count[c]++;",
        title: "3. Aggiornamento · Somme",
        text: "Per ogni cluster si sommano i colori dei suoi pixel (sum) e si contano (count), in un solo passaggio sull'immagine.",
      },
      {
        startMatch: "shift = 0;",
        endMatch: "shift /= k;",
        title: "3. Aggiornamento · Nuovi centri",
        text: "Il nuovo centro è sum / count, cioè il colore medio del cluster. shift somma di quanto si è spostato ogni centro (norm tra nuovo e vecchio) e alla fine viene diviso per k: è lo spostamento medio, confrontato con th nella condizione del while.",
        points: [
          "Un cluster vuoto (count = 0) mantiene il suo centro: così si evita una divisione per zero.",
        ],
      },
      {
        startMatch: "dst.create(src.size(), src.type());",
        endMatch: "dst.at<Vec3b>(y, x) = centers[labels.at<int>(y, x)];",
        title: "4. Colorazione finale",
        text: "dst.create alloca dst con la stessa dimensione e lo stesso tipo di src (CV_8UC3). Ogni pixel viene sostituito con il colore del proprio centro: l'immagine finale contiene solo k colori.",
        points: [
          "La conversione da Vec3f a Vec3b arrotonda e satura i valori in 0–255.",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_COLOR la carica a colori: una Mat a tre canali da 8 bit (CV_8UC3), in ordine B, G, R e non R, G, B.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "Si accede ai pixel con at<Vec3b>(y, x): un vettore di 3 uchar, [0] = blu, [1] = verde, [2] = rosso.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "kmeansSegmentation riempie dst con l'immagine a k colori; poi si mostrano originale e risultato.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "Il metodo di Otsu sceglie automaticamente la soglia di binarizzazione. Prova tutte le soglie k da 0 a 255: ognuna divide i pixel in due classi (scuri ≤ k, chiari > k). La soglia migliore è quella che rende le due classi il più separate possibile, cioè che massimizza la varianza tra le classi σB². Funziona bene quando l'istogramma è bimodale (due «gobbe», es. oggetto e sfondo).",
    steps: [
      "Istogramma normalizzato: probabilità p(i) di ogni livello di grigio.",
      "Media globale mG = Σ i·p(i).",
      "Per ogni k: probabilità cumulata P1(k) = Σ p(i) e media cumulata m(k) = Σ i·p(i) fino a k.",
      "σB²(k) = (mG·P1 − m)² / (P1·(1 − P1)); la soglia k* è quella con σB² massima.",
      "Nel main: blur 3×3, calcolo di k* e binarizzazione con threshold().",
    ],
    concepts: ["mat", "color", "histogram", "stats", "classes", "threshold", "gaussian", "segmentation"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "vector<double> normalizedHistogram(const Mat& src) {",
        endMatch: "return p;",
        title: "Istogramma normalizzato",
        text: "Si contano i pixel per ciascuno dei 256 livelli di grigio: il valore del pixel è usato direttamente come indice, p[src.at<uchar>(y, x)]++. Dividendo per il numero totale di pixel (rows·cols) si ottiene p(i), la probabilità che un pixel abbia livello i.",
        points: [
          "La somma di tutti i p(i) è 1.",
          "vector<double> e non int: dopo la divisione i valori sono frazioni.",
          "Normalizzare rende il metodo indipendente dalla dimensione dell'immagine.",
        ],
      },
      {
        startMatch: "int otsu(const Mat& src) {",
        endMatch: "mG += i * p[i];",
        title: "Media globale",
        text: "mG = Σ i·p(i) è l'intensità media dell'intera immagine (la media dei livelli pesata per la loro probabilità). È il riferimento rispetto a cui si misura quanto le due classi si allontanano.",
      },
      {
        startMatch: "double P1 = 0.0, m = 0.0, maxVar = 0.0;",
        endMatch: "int kstar = 0;",
        title: "Accumulatori",
        text: "Invece di ricalcolare tutto da zero per ogni soglia, si usano valori cumulativi aggiornati di un passo a ogni iterazione:",
        points: [
          "P1 = P1(k): frazione di pixel nella classe scura (livelli 0…k). La classe chiara ha probabilità 1 − P1.",
          "m = m(k) = Σ i·p(i) fino a k: media cumulata (non ancora divisa per P1).",
          "maxVar e kstar memorizzano il miglior valore trovato finora e la soglia corrispondente.",
        ],
      },
      {
        startMatch: "for (int k = 0; k < 256; k++) {",
        endMatch: "if (P1 <= 0 || P1 >= 1) continue;",
        title: "Aggiornamento incrementale",
        text: "Passando da k − 1 a k, la classe scura acquista solo il livello k: basta aggiungere p[k] a P1 e k·p[k] a m. Così tutto il ciclo costa 256 passi.",
        points: [
          "Se P1 = 0 (nessun pixel scuro) o P1 = 1 (nessun pixel chiaro) una classe è vuota e la formula dividerebbe per zero: continue salta quel k.",
        ],
      },
      {
        startMatch: "double sigmaB2 = pow(mG * P1 - m, 2) / (P1 * (1 - P1));",
        endMatch: "return kstar;",
        title: "Massimizzazione di σB²",
        text: "La varianza tra le classi è σB² = P1·P2·(m1 − m2)², dove m1 e m2 sono le medie delle due classi. Sostituendo m1 = m/P1 e m2 = (mG − m)/(1 − P1) si ottiene la formula del codice, che usa solo gli accumulatori: σB² = (mG·P1 − m)² / (P1·(1 − P1)).",
        points: [
          "Se σB² è la più alta vista finora, k diventa la nuova soglia ottima k*.",
          "La varianza totale σG² = σW² + σB² non dipende da k: massimizzare la varianza tra le classi equivale a minimizzare quella dentro le classi (σW²).",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat gauss, dst;",
        endMatch: "threshold(gauss, dst, th, 255, THRESH_BINARY);",
        title: "Main · Blur e binarizzazione",
        text: "L'immagine viene prima sfocata con un filtro gaussiano 3×3: il rumore si riduce e l'istogramma diventa più regolare, con «gobbe» più nette. otsu calcola la soglia sull'immagine sfocata e threshold la applica:",
        points: [
          "threshold(src, dst, soglia, maxval, THRESH_BINARY): pixel > soglia → maxval (255), altrimenti 0.",
          "Il valore restituito da otsu è proprio il k* per cui i pixel ≤ k* sono la classe scura.",
        ],
        note: "OpenCV ha già Otsu integrato: threshold(src, dst, 0, 255, THRESH_BINARY | THRESH_OTSU) ignora la soglia passata e la calcola da solo. All'esame va scritto a mano.",
      },
      {
        startMatch: "imshow(\"src\", src);",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "Si mostrano l'immagine originale e quella binarizzata.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "Estensione di Otsu a due soglie (k1, k2), che dividono i pixel in tre classi: scuri [0, k1], medi (k1, k2] e chiari (k2, 255]. Il principio è lo stesso: si provano tutte le coppie di soglie e si sceglie quella che massimizza la varianza tra le classi σB² = Σ Pw·(mw − mG)². Serve quando l'istogramma ha tre «gobbe», ad esempio sfondo, oggetto e ombra.",
    steps: [
      "Istogramma normalizzato p(i) e media globale mG.",
      "Ciclo esterno su k1: probabilità e media cumulate della classe 1.",
      "Ciclo interno su k2 > k1: probabilità e media cumulate della classe 2; la classe 3 si ricava per differenza.",
      "σB² = Σ Pw·(mw − mG)² sulle tre classi; si tiene la coppia (k1, k2) con σB² massima.",
      "Output a tre livelli: 0, 127, 255.",
    ],
    concepts: ["mat", "color", "histogram", "stats", "classes", "threshold", "gaussian", "segmentation"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "vector<double> normalizedHistogram(const Mat& src) {",
        endMatch: "return p;",
        title: "Istogramma normalizzato",
        text: "Identico a Otsu: si contano i pixel per ogni livello di grigio (il valore del pixel fa da indice) e si divide per il numero di pixel, ottenendo le probabilità p(i), che sommano a 1.",
      },
      {
        startMatch: "vector<int> otsu2k(const Mat& src) {",
        endMatch: "mG += i * p[i];",
        title: "Media globale",
        text: "La funzione restituisce le due soglie in un vector<int> {k1, k2}. Come in Otsu, mG = Σ i·p(i) è la media dell'intera immagine.",
      },
      {
        startMatch: "double maxVar = 0.0;",
        endMatch: "m1 += k1 * p[k1];",
        title: "Classe 1 (ciclo esterno)",
        text: "maxVar e kstar memorizzano la miglior varianza e la coppia di soglie corrispondente. Il ciclo su k1 chiude la prima classe (livelli 0…k1): P1 e m1 sono probabilità e media cumulate, aggiornate di un livello a ogni passo come in Otsu.",
        points: [
          "k1 arriva al massimo a 253 e k2 a 254: così ogni classe contiene almeno un livello di grigio.",
        ],
      },
      {
        startMatch: "double P2 = 0.0, m2 = 0.0;",
        endMatch: "double m3 = mG - m1 - m2;",
        title: "Classi 2 e 3",
        text: "Per ogni k1 si azzerano P2 e m2 e il ciclo su k2 (da k1 + 1) accumula la seconda classe, livelli k1+1…k2. La terza classe è «tutto il resto» e si ottiene per differenza:",
        points: [
          "P3 = 1 − P1 − P2, perché le probabilità delle tre classi sommano a 1.",
          "m3 = mG − m1 − m2, perché le medie cumulate delle tre classi sommano alla media globale.",
          "P2 e m2 vanno azzerati dentro il ciclo su k1: altrimenti accumulerebbero i valori delle iterazioni precedenti.",
        ],
        note: "Ricavare la terza classe per differenza evita un terzo ciclo annidato: la ricerca costa O(256²) ≈ 32 mila coppie invece di O(256³).",
      },
      {
        startMatch: "double P[3] = {P1, P2, P3};",
        endMatch: "return kstar;",
        title: "Varianza tra le classi",
        text: "Si mettono probabilità e medie cumulate in due array per scorrere le tre classi con un solo ciclo. σB² = Σw Pw·(mw − mG)², dove mw = m[w] / P[w] è la media della classe w: è la varianza delle medie delle classi rispetto alla media globale, pesata per la grandezza di ogni classe. Se supera il massimo, si memorizzano k1 e k2.",
        points: [
          "Le classi vuote (P[w] = 0) vengono saltate per non dividere per zero.",
          "Con due classi questa formula dà lo stesso valore di quella usata in Otsu.",
        ],
      },
      {
        startMatch: "void multipleThreshold(const Mat& src, Mat& dst, int k1, int k2) {",
        endMatch: "dst.at<uchar>(y, x) = 127;",
        title: "Segmentazione a tre livelli",
        text: "dst parte nera (0). I pixel > k2 diventano 255 (classe chiara), quelli > k1 ma ≤ k2 diventano 127 (classe media), gli altri restano 0 (classe scura).",
        points: [
          "L'ordine dei controlli conta: prima > k2, poi > k1 con else if. Invertendoli, tutti i pixel > k1 diventerebbero 127, anche i chiari.",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "Mat gauss, dst;",
        endMatch: "multipleThreshold(gauss, dst, k[0], k[1]);",
        title: "Main · Blur e soglie",
        text: "Come in Otsu, prima si sfoca con un filtro gaussiano 3×3 per regolarizzare l'istogramma; poi otsu2k trova le due soglie e multipleThreshold produce l'immagine a tre livelli.",
      },
      {
        startMatch: "imshow(\"src\", src);",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "Si mostrano l'immagine originale e quella a tre livelli.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "Il region growing segmenta l'immagine facendo «crescere» regioni a partire da un pixel seme: un vicino viene aggiunto alla regione se il suo colore è abbastanza simile a quello del pixel da cui lo si raggiunge. A differenza di K-means tiene conto della posizione: una regione è sempre un insieme di pixel connessi. L'immagine viene scandita tutta, quindi ogni pixel finisce in una regione; le regioni troppo piccole vengono ignorate.",
    steps: [
      "Nel main le immagini più grandi di 500 pixel vengono dimezzate.",
      "Si scandisce l'immagine; il primo pixel non ancora visitato diventa un seme.",
      "Partendo dal seme, uno stack esplora gli 8 vicini e aggiunge quelli con colore simile (distanza² < 200) al pixel da cui sono stati raggiunti.",
      "Se la regione supera l'1% dell'immagine riceve una nuova etichetta (1, 2, 3, …), altrimenti viene marcata come ignorata (255).",
      "Si azzera la maschera e si continua con il seme successivo, fino a un massimo di 100 regioni.",
    ],
    concepts: ["mat", "color", "coords", "segmentation", "neighborhood", "seed", "distance", "stack", "mask", "labels"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "<stack> serve per stack, la struttura LIFO usata per esplorare la regione.",
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const int th = 200;",
        endMatch: "const double minRegionAreaFactor = 0.01;",
        title: "Parametri",
        text: "th è la soglia sulla distanza al quadrato tra due colori: 200 corrisponde a una distanza euclidea di circa 14 livelli (√200 ≈ 14,1). maxRegions limita il numero di etichette; minRegionAreaFactor = 1% è l'area minima perché una regione venga tenuta.",
        points: [
          "th più alta → regioni più grandi, che inglobano anche sfumature e oggetti diversi; più bassa → tante regioni piccole.",
          "maxRegions resta sotto 255 perché 255 è riservato alle regioni ignorate e dst è a 8 bit.",
        ],
      },
      {
        startMatch: "int colorDist2(Vec3b a, Vec3b b) {",
        endMatch: "return d0 * d0 + d1 * d1 + d2 * d2;",
        title: "Distanza di colore",
        text: "Restituisce ΔB² + ΔG² + ΔR² tra due pixel. Le differenze vengono salvate in int perché possono essere negative (con uchar sarebbero «arrotolate» a valori grandi).",
        note: "Lavorare con la distanza al quadrato evita di calcolare una radice per ogni confronto: basta confrontarla con una soglia al quadrato.",
      },
      {
        startMatch: "void grow(const Mat& src, const Mat& dst, Mat& mask, Point seed) {",
        endMatch: "front.pop();",
        title: "Esplorazione con lo stack",
        text: "La crescita usa uno stack esplicito (front) invece della ricorsione: su regioni grandi la ricorsione supererebbe lo stack di sistema (una chiamata per pixel). Si inserisce il seme e lo si segna subito nella maschera della regione corrente (mask = 1); finché lo stack non è vuoto si estrae un punto: top lo legge, pop lo rimuove.",
        points: [
          "mask.at<uchar>(seed): at accetta anche un Point, che è già (x, y) nell'ordine giusto.",
          "dst è const: grow lo legge soltanto, per sapere quali pixel appartengono già ad altre regioni.",
          "Con una coda (queue) invece dello stack la regione crescerebbe «a cerchi»; il risultato finale è lo stesso.",
        ],
      },
      {
        startMatch: "for (int dy = -1; dy <= 1; dy++)",
        endMatch: "if (dst.at<uchar>(q) || mask.at<uchar>(q)) continue;",
        title: "Vicini da esaminare",
        text: "Si generano gli 8 vicini q del punto p (dy, dx ∈ {−1, 0, 1}: connettività a 8, anche in diagonale) e si scartano quelli che non vanno esaminati:",
        points: [
          "fuori dall'immagine (coordinate negative o oltre cols/rows);",
          "già in un'altra regione (dst ≠ 0) o già nella regione corrente (mask ≠ 0). Con (0, 0) si ritrova p stesso, che è già in mask.",
        ],
      },
      {
        startMatch: "if (colorDist2(src.at<Vec3b>(p), src.at<Vec3b>(q)) < th) {",
        endMatch: "front.push(q);",
        title: "Criterio di crescita",
        text: "Se la distanza di colore tra p e q è minore di th, q entra nella regione: viene segnato in mask e inserito nello stack, così a sua volta esplorerà i propri vicini.",
        note: "Il confronto è con il pixel corrente, non con il seme: la regione può seguire sfumature graduali e arrivare a colori molto diversi dal seme. Segnare q in mask prima di inserirlo evita che finisca nello stack due volte.",
      },
      {
        startMatch: "void regionGrowing(const Mat& src, Mat& dst) {",
        endMatch: "int label = 1;",
        title: "Inizializzazione",
        text: "dst è la mappa delle etichette: 0 = non visitato, 1…maxRegions = regione, 255 = ignorato. mask è la regione in costruzione (0/1). minRegionArea è l'1% dei pixel dell'immagine; label parte da 1 perché 0 significa «non visitato».",
      },
      {
        startMatch: "for (int y = 0; y < src.rows; y++)",
        endMatch: "grow(src, dst, mask, Point(x, y));",
        title: "Scansione dei semi",
        text: "Si scorre l'immagine riga per riga: ogni pixel ancora non visitato (dst = 0) diventa un seme e si fa crescere la sua regione nella maschera.",
        points: [
          "Point(x, y) vuole prima la colonna: i cicli sono su y (righe) e x (colonne).",
        ],
      },
      {
        startMatch: "if (countNonZero(mask) > minRegionArea) {",
        endMatch: "mask.setTo(0);",
        title: "Etichettatura",
        text: "countNonZero(mask) conta i pixel della regione appena cresciuta:",
        points: [
          "Regione grande: dst += mask * label scrive l'etichetta su tutti i suoi pixel (mask vale 1 dentro, 0 fuori). imshow + waitKey(0) mostrano la regione appena trovata: premi un tasto per passare alla successiva.",
          "Se le etichette superano maxRegions si stampa un messaggio e ci si ferma: i pixel rimasti restano a 0.",
          "Regione piccola: dst += mask * 255 la marca come ignorata, così non verrà più usata come seme.",
          "mask.setTo(0) azzera la maschera per la regione successiva.",
        ],
        note: "Le etichette sono valori piccoli (1, 2, 3, …): mostrata con imshow, dst appare quasi nera. Per vederla meglio si può moltiplicare per una costante o assegnare un colore a ogni etichetta, come fa il visualizzatore.",
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_COLOR la carica a colori: una Mat a tre canali da 8 bit (CV_8UC3), in ordine B, G, R e non R, G, B.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "Si accede ai pixel con at<Vec3b>(y, x): un vettore di 3 uchar, [0] = blu, [1] = verde, [2] = rosso.",
        ],
      },
      {
        startMatch: "if (src.rows > 500 || src.cols > 500)",
        endMatch: "resize(src, src, Size(0, 0), 0.5, 0.5);",
        title: "Main · Ridimensionamento",
        text: "Se l'immagine supera i 500 pixel in altezza o larghezza viene dimezzata prima di segmentarla: con Size(0, 0) la dimensione finale si ricava dai fattori di scala 0,5 in x e in y.",
        points: [
          "Con un quarto dei pixel la crescita è molto più veloce e ci sono meno regioni da mostrare una per una con waitKey.",
        ],
      },
      {
        startMatch: "Mat dst;",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "regionGrowing riempie dst con la mappa delle etichette; poi si mostrano l'originale e le regioni.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
      "Split and Merge lavora in scala di grigi. Divide ricorsivamente l'immagine in quattro quadranti finché ogni blocco è omogeneo (fase di split, che costruisce un QuadTree: ogni nodo ha 0 o 4 figli), poi unisce i quadranti fratelli adiacenti che sono foglie con media simile (fase di merge) e colora ogni regione con la media delle medie dei suoi blocchi. Lo split da solo produrrebbe tanti blocchi quadrati; il merge serve a riunire quelli che appartengono alla stessa zona.",
    steps: [
      "Blur 5×5 e ritaglio al quadrato più grande con lato potenza di 2.",
      "Split: se un blocco è più largo di 8 pixel e la sua deviazione standard supera 10, lo si divide in 4 figli; altrimenti è una foglia.",
      "Merge: tra i 4 figli di un nodo si uniscono due foglie adiacenti con medie che differiscono meno di 5 (ed eventualmente le foglie vicine); gli altri figli si esplorano ricorsivamente.",
      "Segment: ogni gruppo unito viene colorato con la media delle medie dei suoi blocchi.",
    ],
    concepts: ["mat", "coords", "segmentation", "stats", "homogeneity", "quadtree", "pointers", "roi", "gaussian", "clone"],
    explanations: [
      {
        startMatch: "#include <opencv2/opencv.hpp>",
        endMatch: "using namespace cv;",
        title: "Include e namespace",
        text: "opencv.hpp include in un colpo solo tutti i moduli principali di OpenCV: core (Mat, operazioni aritmetiche), imgproc (filtri, Sobel, Canny, disegno), imgcodecs (imread) e highgui (imshow, waitKey). Le due direttive using permettono di scrivere Mat, Size, vector… invece di cv::Mat, cv::Size, std::vector.",
        points: [
          "<vector> serve per vector (figli, nodi uniti, flag).",
          "Senza using namespace cv il compilatore non riconosce Mat, Point, Scalar: è uno degli errori più frequenti quando si scrive il codice a mano.",
        ],
      },
      {
        startMatch: "const double sth = 10;",
        endMatch: "const int mth = 5;",
        title: "Parametri",
        text: "sth è la soglia di omogeneità dello split (deviazione standard), tsize il lato minimo sotto cui non si divide più, mth la massima differenza tra le medie di due blocchi perché vengano uniti.",
        points: [
          "sth più bassa → si divide di più: blocchi piccoli, più dettagli.",
          "tsize più grande → blocchi minimi più grossi, risultato più «a quadretti».",
          "mth più alta → si uniscono anche blocchi meno simili.",
        ],
      },
      {
        startMatch: "Quadranti in ordine CIRCOLARE",
        endMatch: "TNode(Rect R) { region = R; }",
        title: "Nodo del QuadTree",
        text: "Ogni TNode rappresenta un blocco quadrato dell'immagine:",
        points: [
          "region: il rettangolo (x, y, larghezza, altezza); mean e stddev: media e deviazione standard dei suoi livelli di grigio.",
          "children: i quattro figli, inizializzati a nullptr; se children[0] è nullptr il nodo è una foglia.",
          "merged: i nodi uniti in un'unica regione; mergedB[i] = true se il figlio i è già stato unito e non va più visitato.",
          "Il costruttore TNode(Rect R) salva solo il rettangolo: le statistiche le calcola split.",
        ],
        note: "I figli sono numerati in ordine circolare (0 alto sx, 1 alto dx, 2 basso dx, 3 basso sx): i e (i + 1) % 4 sono sempre adiacenti, mentre i e (i + 2) % 4 sono opposti in diagonale.",
      },
      {
        startMatch: "TNode* split(Mat& img, Rect R) {",
        endMatch: "root->stddev = stddev[0];",
        title: "Split · Statistiche del blocco",
        text: "Si crea il nodo con new (deve sopravvivere alla funzione) e si calcolano media e deviazione standard del blocco con meanStdDev su img(R), una vista sul rettangolo senza copia dei pixel.",
        points: [
          "meanStdDev restituisce due Scalar (un valore per canale): l'immagine è in grigio, quindi si usa solo [0].",
        ],
      },
      {
        startMatch: "if (R.width > tsize && root->stddev > sth) {",
        endMatch: "return root;",
        title: "Split · Divisione",
        text: "Se il blocco è più largo di tsize e stddev > sth non è omogeneo: si divide in 4 quadrati di lato h = width / 2, in ordine circolare, e si richiama split su ciascuno. Altrimenti il nodo resta una foglia.",
        points: [
          "La divisione in metà esatte funziona perché il lato è una potenza di 2 (vedi il main).",
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
          "Il gruppo può allargarsi: se next è simile all'opposto (opp) si aggiunge anche opp, se i è simile al precedente (prev) si aggiunge prev. Al massimo si uniscono tutti e 4.",
          "Il break fa sì che per ogni nodo si formi un solo gruppo.",
          "I figli non uniti vengono esplorati ricorsivamente con merge: tra questi ci sono sempre tutti i nodi interni.",
        ],
        note: "Si uniscono solo fratelli dello stesso padre: blocchi adiacenti che appartengono a padri diversi restano separati anche se simili.",
      },
      {
        startMatch: "void segment(TNode* root, Mat& img) {",
        endMatch: "segment(root->children[i], img);",
        title: "Segmentazione finale",
        text: "Se il nodo ha regioni unite, si calcola la media delle loro medie e la si assegna a tutti i loro rettangoli: img(node->region) = val riempie il blocco con quel valore. Poi si scende nei figli che esistono e non sono stati uniti.",
        points: [
          "La media delle medie non è pesata per l'area: i blocchi uniti sono fratelli, quindi hanno tutti la stessa dimensione.",
        ],
      },
      {
        startMatch: "int main(int argc, char** argv) {",
        endMatch: "if (src.empty()) return -1;",
        title: "Main · Lettura dell'immagine",
        text: "argv[1] è il percorso dell'immagine passato da riga di comando (es. ./programma lena.jpg). IMREAD_GRAYSCALE la carica già in scala di grigi: una Mat a un canale, 8 bit per pixel (CV_8UC1), valori 0–255.",
        points: [
          "Se il file non esiste o non è un'immagine, imread non dà errore ma restituisce una Mat vuota: il controllo empty() evita di lavorare su un'immagine inesistente.",
          "L'algoritmo lavora su un solo canale: senza IMREAD_GRAYSCALE l'immagine sarebbe a 3 canali e at<uchar> leggerebbe i byte sbagliati. In Pratica ed Esame questo errore viene segnalato.",
        ],
      },
      {
        startMatch: "GaussianBlur(src, src, Size(5, 5), 0, 0);",
        endMatch: "Mat seg = src.clone();",
        title: "Main · Preparazione",
        text: "Un blur 5×5 riduce il rumore, che altrimenti renderebbe quasi ogni blocco «non omogeneo». Il QuadTree richiede un quadrato con lato potenza di 2, quindi s = 2^⌊log2(min(rows, cols))⌋ e si ritaglia l'immagine a s × s partendo dall'angolo in alto a sinistra.",
        points: [
          "src(Rect(...)) è una vista; clone() la copia in una Mat indipendente.",
          "seg è una copia fatta prima dello split, quindi senza i rettangoli disegnati.",
        ],
      },
      {
        startMatch: "TNode* root = split(src, Rect(0, 0, s, s));",
        endMatch: "segment(root, seg);",
        title: "Main · Split, merge, segment",
        text: "split costruisce il QuadTree partendo dall'intera immagine e disegna i blocchi su src; merge decide quali foglie unire; segment colora seg.",
      },
      {
        startMatch: "imshow(\"quad tree\", src);",
        endMatch: "return 0;",
        title: "Main · Esecuzione e output",
        text: "Si mostrano il QuadTree (src con i rettangoli dei blocchi) e l'immagine segmentata.",
        points: [
          "imshow apre (o aggiorna) una finestra con il nome indicato; waitKey(0) aspetta la pressione di un tasto. Senza waitKey le finestre non vengono nemmeno disegnate e il programma termina subito.",
        ],
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
