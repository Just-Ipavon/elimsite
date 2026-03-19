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
      "Finds edges in an image using the Canny algorithm. Implementa Gaussiana, Sobel per derivate x e y, calcolo magnitudo e fase, non-maximum suppression.",
    explanations: [
      {
        startMatch: "Mat gauss, dx, dy, magnitude, phase;",
        endMatch: "cv::phase(dx, dy, phase, true);",
        title: "Smoothing & Gradienti (Sobel)",
        text: "Primo step: il filtro Gaussiano rimuove il rumore. Poi si applicano i filtri di Sobel per trovare i gradienti orizzontali e verticali, da cui si calcola magnitudo (forza del bordo) e fase (orientamento).",
      },
      {
        startMatch: "for (int y = 1; y < magnitude.rows - 1; y++) {",
        endMatch: "magnitude.at<uchar>(y, x) = 0;\n        }\n    }",
        title: "Non-Maximum Suppression",
        text: "Passo per assottigliare i bordi: il valore del gradiente di ogni pixel viene confrontato con i due vicini lungo la direzione identificata dalla fase. Se non è un massimo locale, viene scartato (reso nero).",
      },
      {
        startMatch: "int th1 = 20;",
        endMatch: "magnitude.copyTo(dst);",
        title: "Hysteresis Thresholding",
        text: "Ultimo step con doppia soglia. I pixel con gradiente > th2 sono bordi 'certi'. I pixel tra th1 e th2 sono bordi 'deboli', mantenuti solo se adiacenti a un bordo certo.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

void Canny(const Mat src, Mat &dst) {
    Mat gauss, dx, dy, magnitude, phase;
    GaussianBlur(src, gauss, Size(5, 5), 0, 0);
    Sobel(gauss, dx, CV_32FC1, 1, 0, 3);
    Sobel(gauss, dy, CV_32FC1, 0, 1, 3);
    cv::magnitude(dx, dy, magnitude);
    normalize(magnitude, magnitude, 0, 255, NORM_MINMAX, CV_8UC1);
    cv::phase(dx, dy, phase, true);
    
    uchar q, r;
    for (int y = 1; y < magnitude.rows - 1; y++) {
        for (int x = 1; x < magnitude.cols - 1; x++) {
            float angle = phase.at<float>(y, x) > 180 ? phase.at<float>(y, x) - 360 : phase.at<float>(y, x);
            uchar mag = magnitude.at<uchar>(y, x);
            if ((angle <= -157.5 || angle > 157.5) || (angle > -22.5 && angle <= 22.5)) {
                q = magnitude.at<uchar>(y, x - 1);
                r = magnitude.at<uchar>(y, x + 1);
            } else if ((angle > -157.5 && angle <= -112.5) || (angle > 22.5 && angle <= 67.5)) {
                q = magnitude.at<uchar>(y + 1, x - 1);
                r = magnitude.at<uchar>(y - 1, x + 1);
            } else if ((angle > -67.5 && angle <= 67.5)) {
                q = magnitude.at<uchar>(y + 1, x);
                r = magnitude.at<uchar>(y - 1, x);
            } else if ((angle > 67.5 && angle <= 112.5) || (angle > -112.5 && angle <= -67.5)) {
                q = magnitude.at<uchar>(y - 1, x - 1);
                r = magnitude.at<uchar>(y + 1, x + 1);
            }
            if (mag < r || mag < q)
                magnitude.at<uchar>(y, x) = 0;
        }
    }
    
    int th1 = 20;
    int th2 = 50;
    for (int i = 1; i < magnitude.rows - 1; i++) {
        for (int j = 1; j < magnitude.cols - 1; j++) {
            uchar px = magnitude.at<uchar>(i, j);
            if (px >= th2) px = 255;
            else if (px < th1) px = 0;
            else {
                bool sn = false;
                for (int x = -1; x <= 1 && !sn; x++)
                    for (int y = -1; y <= 1 && !sn; y++)
                        if (magnitude.at<uchar>(i + x, j + y) > th2)
                            sn = true;
                if (sn) px = 255;
                else px = 0;
            }
            magnitude.at<uchar>(i, j) = px;
        }
    }
    magnitude.copyTo(dst);
}

int main( int argc, char** argv ) {
	Mat src = imread( argv[1], IMREAD_GRAYSCALE );
	if(src.empty()) return -1;
	Mat dst;
	Canny(src, dst);
	imshow("src", src);
	imshow("dst", dst);
	waitKey(0);
	return 0;
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "harris",
    name: "Harris Corner Detection",
    description:
      "Detects corners usando derivate, smoothing, traccia e determinante della matrice di autocorrelazione per calcolare il response R.",
    explanations: [
      {
        startMatch: "Mat Dx, Dy;",
        endMatch: "multiply(Dx, Dy, DxDy);",
        title: "Derivate Spaziali",
        text: "Si calcolano le derivate orientate (Dx, Dy) tramite l'operatore di Sobel e poi i loro prodotti (Dx2, Dy2, DxDy) che andranno a formare la matrice di autocorrelazione.",
      },
      {
        startMatch: "GaussianBlur(Dx2, C00",
        endMatch: "C10 = C01;",
        title: "Smoothing Matrice (Finestra Pesata)",
        text: "I prodotti delle derivate vengono sfocati gaussianamente per simulare una somma pesata di finestra attorno ad ogni pixel, creando le componenti effettive C00, C11, C01 della matrice.",
      },
      {
        startMatch: "multiply(C00, C11, PPD);",
        endMatch: "R = det - 0.04f * trace2;",
        title: "Response Score (R)",
        text: "Si approssima il calcolo degli autovalori usando la formula R = Det(M) - k * Trace(M)^2. Un valore R alto e positivo ci assicura di essere caduti proprio su uno spigolo (corner).",
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
      "Detects circles (Hough Transform). Calcola i gradienti con Canny e popola uno spazio dei voti 3D (x, y, raggio).",
    explanations: [
      {
        startMatch: "Canny(src_gray, edges, 100, 112);",
        title: "Estrazione preliminare dei bordi",
        text: "La trasformata di Hough lavora specificamente sui pixel di bordo, quindi usiamo Canny in anticipo per creare una mappa binaria delineata.",
      },
      {
        startMatch: "for (int radius=minRadius; radius<maxRadius; radius++)",
        endMatch: "votes.at<float>(b,a,radius-minRadius)++;",
        title: "Spazio di Accumulazione (Votazioni)",
        text: "Per ogni punto del bordo, e per ogni possibile raggio, calcoliamo le coordinate (a,b) del centro del cerchio tramite angolo polare iterativo e 'votiamo' quella coordinata nello spazio di Hough 3D.",
      },
      {
        startMatch: "if (votes.at<float>(i,j,radius-minRadius) >= 123)",
        endMatch: "circle(dst, Point(j,i), radius",
        title: "Recupero Cerchi (Massimi)",
        text: "Esaminiamo i voti accumulati: se una cella (x,y,r) ha ricevuto sufficienti voti (>123), confermiamo il cerchio e procediamo a disegnarlo!",
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
      "Rilevamento linee (Hough Transform). Spazio di accumulazione rho-theta per estrarre rette dai bordi (Canny).",
    explanations: [
      {
        startMatch: "int maxDist = hypot(src.rows, src.cols);",
        endMatch: "Canny(gsrc,edges,50,150);",
        title: "Setup & Canny",
        text: "Calcoliamo la massima estensione possibile della retta (la diagonale) per dimensionare l'accumulatore, e filtriamo l'immagine per avere solo i bordi binari.",
      },
      {
        startMatch: "for(theta = 0; theta <= 180; theta++){",
        endMatch: "votes[rho][theta]++;",
        title: "Votazione (ρ e θ)",
        text: "Scorrendo i pixel di bordo (255), iteriamo su tutti i 180 angoli e calcoliamo ρ. Incrementiamo il contatore dei voti nella matrice parametrica (rho, theta) per evidenziare la retta passante per il pixel.",
      },
      {
        startMatch: "if(votes[i][j] >= 100){",
        endMatch: "line(dst,p1,p2,Scalar(0,0,255),2,LINE_AA);",
        title: "Estrazione Rette",
        text: "Se una cellula ha più di 100 hit, vuol dire che 100 pixel di bordo appartengono a quella stessa retta polare. Trasformiamo quindi in coordinate Cartesiane (p1, p2) e la disegniamo fissa.",
      },
    ],
    codeReference: `#include <opencv2/opencv.hpp>
#include <stdlib.h>

using namespace cv;
using namespace std;

void polarToCartesian(double rho, int theta, Point& p1, Point& p2){
    int x0 = cvRound(rho*cos(theta));
    int y0 = cvRound(rho*sin(theta));
    int alpha = 1000;
    p1.x = cvRound(x0 + alpha*(-sin(theta)));
    p1.y = cvRound(y0 + alpha*(cos(theta)));
    p2.x = cvRound(x0 - alpha*(-sin(theta)));
    p2.y = cvRound(y0 - alpha*(cos(theta)));
}

void houghLines(Mat& src, Mat& dst){
    int maxDist = hypot(src.rows, src.cols);
    vector<vector<int>> votes(maxDist*2, vector<int>(180, 0));

    Mat gsrc, edges;
    GaussianBlur(src,gsrc,Size(3,3),0,0);
    Canny(gsrc,edges,50,150);

    double rho;
    int theta;
    for(int x=0; x<edges.rows; x++)
        for(int y=0; y<edges.cols; y++)
            if(edges.at<uchar>(x,y) == 255)
                for(theta = 0; theta <= 180; theta++){
                    rho = round(y*cos(theta-90) + x*sin(theta-90)) + maxDist;
                    votes[rho][theta]++;
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
      "Algoritmo K-means nativo. Sceglie centri random, ricalcola distanze e sposta i centri iterativamente fino a convergenza o soglia raggiunta.",
    explanations: [
      {
        startMatch: "void computeRandomCenter",
        endMatch: "cluster.push_back( vector<Point>() );\n\t}",
        title: "1. Semi Casuali",
        text: "Estrae col generatore uniform casuale K punti nell'immagine e ne assume il colore come Centro Iniziale per ciascun segmento.",
      },
      {
        startMatch: "void populateCluster",
        endMatch: "cluster.at(labelID).push_back(Point(j,i));\n\t\t}",
        title: "2. Assegnazione",
        text: "Calcola la distanza Euclidea tra il colore del pixel attuale e ciascuno dei K cluster. Assegna inevitabilmente il pixel al cluster il cui centro dista meno matematicamente.",
      },
      {
        startMatch: "double adjustCenter",
        endMatch: "return change;",
        title: "3. Rideterminazione del Centro",
        text: "Ora che migliaia di pixel appartengono allo stesso gruppo, l'algoritmo fa la media dei loro colori in R, G e B, generando il vero colore mediano e aggiornando il Centro del cluster. Calcola anche di quanto il centro si è 'spostato' (change).",
      },
      {
        startMatch: "while (dist > th) {",
        endMatch: "segment(dst, center, cluster);",
        title: "4. Loop di Convergenza",
        text: "Finché la distanza di aggiustamento dei baricentri è maggiore di una soglia minima (th), riassocia da zero i pixel e calcola i nuovi centri. Alla fine si usa 'segment' per colorare appiattiti i cluster di output!",
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
      "Otsu originale. Calcola istogramma, probabilità cumulate, e massimizza la varianza intraclass per trovare la soglia K ottimale.",
    explanations: [
      {
        startMatch: "vector<double> normalizedHistogram(Mat& src) {",
        endMatch: "return his;",
        title: "Istogramma Normalizzato (Probabilità)",
        text: "Conta quanti pixel hanno un certo livello di grigio, dopodichè divide tutto per il numero totale dei pixel. Il risultato è la Probabilità (da 0 a 1) di beccare quel colore nell'immagine.",
      },
      {
        startMatch: "for (int i = 0; i < 256; i++) gMean += i * his[i];",
        endMatch: "for (int i = 0; i < 256; i++) gMean += i * his[i];",
        title: "Media Globale (gMean)",
        text: "Costituisce la media pesata di tutta l'immagine basata sul suo istogramma. Serve alla varianza per quantificare lo scarto delle due classi.",
      },
      {
        startMatch: "for (int i = 0; i < 256; i++) {",
        endMatch: "kstar = i;\n        }",
        title: "Massimizzazione Varianza Between Classes",
        text: "Iteriamo ogni possibile intensità (soglia i). Calcoliamo la Varianza Tra Le Classi: se è superiore al massimo trovato finora, aggiorniamo il max e settiamo Kstar alla nuova soglia ottima.",
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
      "Estensione di Otsu per multipli threshold. Calcola varianza combinata su N settori per trovare le doppie/triple soglie di binarizzazione.",
    explanations: [
      {
        startMatch: "vector<double> currProb(3,0.0f);",
        endMatch: "vector<int> kstar(2,0);",
        title: "Setup N-Classi",
        text: "Dal momento che vogliamo segmentare l'immagine con soglie multiple (es. 2 soglie = 3 classi finali), istanziamo vettori tripli per tenere conto delle probabilità sommate e delle medie accumulate di ogni classe.",
      },
      {
        startMatch: "for(int i=0; i<256-2; i++){",
        endMatch: "currProb[2] = currCumMean[2] = 0.0f;\n        }",
        title: "Ricerca Esaustiva Combinata",
        text: "Scorre tutte le possibili combinazioni delle due soglie (i e j) per partizionare l'istogramma, ricalcolando la varianza di separazione (sommatoria per ogni classe w: currProb * (mediaClasse - mediaGlobale)^2). Ritorna le soglie kstar[0] e kstar[1] che massimizzano lo stacco cromatico!",
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
      "Algoritmo a Stack per accrescere la regione. Usa una maschera su 8 direzioni.",
    explanations: [
      {
        startMatch: "const Point pointShift2D[8] = {",
        endMatch: "Point( 1,-1), Point( 1, 0), Point( 1, 1)\n};",
        title: "Mappa delle Adiacenze",
        text: "Offre lo scarto flat delle 8 posizioni adiacenti (sopra, lati, e 4 diagonali) necessario per procedere con l'esplorazione del pixel.",
      },
      {
        startMatch: "while (!front.empty()) {",
        endMatch: "front.push(neigh);",
        title: "Navigazione Maschera Condizionata",
        text: "Controlla ogni adiacenza alla cella attuale nello Stack: se la distanza cromatica (somma dei quadrati di R, G, B) è sotto la Soglia (th) e la cella non è già stata visitata, il compagno è idoneo e viene inserito nello stack di espansione!",
      },
      {
        startMatch: "if (sum(mask).val[0] > minRegionArea) {",
        endMatch: "mask -= mask;\n            }",
        title: "Integrazione Regione o Rumore",
        text: "Si isolano le regioni piccolissime (che contano come rumore sfuso, colorate in grigio opzionale / scartate) e le regioni valide più grandi vengono finalmente impresse sulla 'dst' con la Label dedicata, incrementata dopo ogni area trovata.",
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
      "Usa una struttura QuadTree (TNode) ricorsiva per dividere l'immagine per deviazione standard del colore, e le raggruppa in base a vicinanza.",
    explanations: [
      {
        startMatch: "class TNode {",
        endMatch:
          "void addRegion(TNode* region) { merged.push_back(region); }\n};",
        title: "QuadTree Wrapper",
        text: "Per segmentare lo spazio l'algoritmo fa uso di un albero a 4 settori (UL, UR, LR, LL). Questa classe incapsula ogni nodo registrando l'area, le statistiche cromatiche (mean, stdev) e le regioni parzialmente fuse.",
      },
      {
        startMatch: "TNode* split(Mat& src, Rect R) {",
        endMatch: "return root;",
        title: "Processo di SPLIT",
        text: "Partendo dall'immagine globale, se la Deviazione Standard della zona supera 30, significa che non è un'area uniforme. Si divide il rettangolo in 4 sotto-rettangoli precisi e per ciascuno si richiama ricorsivamente SPLIT.",
      },
      {
        startMatch: "void merge(TNode* root) {",
        endMatch:
          "root->setMergedB(0); root->setMergedB(1); root->setMergedB(2); root->setMergedB(3); \n\t}\n}",
        title: "Processo di MERGE",
        text: "Arrivati alla profondità minima del frammento in Split, l'algoritmo risale riunendo in macro-aree le celle adiacenti che mostrano omogeneità strutturale (stddev <= 30), accorpadole nello stesso puntatore d'area Node.",
      },
      {
        startMatch: "void segment(Mat& src, TNode* root) {",
        endMatch:
          "if ( !root->getMergedB(3) ) segment( src, root->getLL() );\n\t\t}\n\t}\n}",
        title: "Finalizzazione e Ricolorazione",
        text: "Una volta consolidato l'albero di Merge, si naviga il grafo calcolando in automatico l'Intensity Media totale dei blocchi espansi e ricolorando il Canvas finale con la media globale dei micro-quadrati fusi.",
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
