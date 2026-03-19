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
    codeReference: `void Canny(const Mat src, Mat &dst) {
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
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "harris",
    name: "Harris Corner Detection",
    description:
      "Detects corners usando derivate, smoothing, traccia e determinante della matrice di autocorrelazione per calcolare il response R.",
    codeReference: `void circleCorners(Mat& src, Mat& dst) {
    for (int i = 0; i < src.rows; i++) {
        for (int j = 0; j < src.cols; j++) {
            if ((int)src.at<float>(i, j) > 100)
                circle(dst, Point(j, i), 5, Scalar(0), 1);
        }
    }
}

void harris(Mat& src, Mat& dst) {
    // 1
    Mat Dx, Dy;
    Sobel(src, Dx, CV_32FC1, 1, 0, 11);
    Sobel(src, Dy, CV_32FC1, 0, 1, 11);

    // 2
    Mat Dx2, Dy2, DxDy;
    pow(Dx, 2, Dx2);
    pow(Dy, 2, Dy2);
    multiply(Dx, Dy, DxDy);

    // 3-4
    Mat C00, C01, C10, C11;
    GaussianBlur(Dx2, C00, Size(7, 7), 2, 0);
    GaussianBlur(Dy2, C11, Size(7, 7), 0, 2);
    GaussianBlur(DxDy, C01, Size(7, 7), 2, 2);
    C10 = C01;

    // 5
    Mat det, trace, trace2, R, PPD, PSD;
    multiply(C00, C11, PPD);
    multiply(C01, C10, PSD);
    det = PPD - PSD;

    trace = C00 + C11;
    pow(trace, 2, trace2);

    R = det - 0.04f * trace2;

    // 6
    normalize(R, R, 0, 255, NORM_MINMAX, CV_32FC1);
    convertScaleAbs(R, dst);

    // 7
    circleCorners(R, dst);
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_circles",
    name: "Hough Circles",
    description:
      "Detects circles (Hough Transform). Calcola i gradienti con Canny e popola uno spazio dei voti 3D (x, y, raggio).",
    codeReference: `// Hough Circles
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
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "hough_lines",
    name: "Hough Lines",
    description:
      "Rilevamento linee (Hough Transform). Spazio di accumulazione rho-theta per estrarre rette dai bordi (Canny).",
    codeReference: `// Hough Lines
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
    //1
    int maxDist = hypot(src.rows, src.cols);
    vector<vector<int>> votes(maxDist*2, vector<int>(180, 0));

    //2
    Mat gsrc, edges;
    GaussianBlur(src,gsrc,Size(3,3),0,0);
    Canny(gsrc,edges,50,150);

    //3
    double rho;
    int theta;
    for(int x=0; x<edges.rows; x++)
        for(int y=0; y<edges.cols; y++)
            if(edges.at<uchar>(x,y) == 255)
                for(theta = 0; theta <= 180; theta++){
                    rho = round(y*cos(theta-90) + x*sin(theta-90)) + maxDist;
                    votes[rho][theta]++;
                }

    //4 - drawing
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
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "kmeans",
    name: "K-means Clustering",
    description:
      "Algoritmo K-means nativo. Sceglie centri random, ricalcola distanze e sposta i centri iterativamente fino a convergenza o soglia raggiunta.",
    codeReference: `// K-means (Simplified structure from the repo)
const int k = 6;
const double th = 0.05f;

double computeDistance(Scalar px, Scalar center) {
    double blue = abs( px[0] - center[0] );
    double green = abs( px[1] - center[1] );
    double red = abs( px[2] - center[2] );
    return (double) blue + green + red;
}

// ... random centers, populate, adjustCenter, segment logic ...
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
        populateCluster(src, center, cluster); // Assigns points to closest center
        dist = adjustCenter( src, center, cluster, oldValue, newValue );
    }
    segment(dst, center, cluster); // Color output
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "otsu",
    name: "Otsu Thresholding",
    description:
      "Otsu originale. Calcola istogramma, probabilità cumulate, e massimizza la varianza intraclass per trovare la soglia K ottimale.",
    codeReference: `vector<double> normalizedHistogram(Mat& src) {
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
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "otsu2k",
    name: "Otsu 2K (Multi-level)",
    description:
      "Estensione di Otsu per multipli threshold. Calcola varianza combinata su N settori per trovare le doppie/triple soglie di binarizzazione.",
    codeReference: `vector<int> otsu2k(Mat& src){
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
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "region_growing",
    name: "Region Growing",
    description:
      "Algoritmo a Stack per accrescere la regione. Usa una maschera su 8 direzioni.",
    codeReference: `void grow(const Mat src, const Mat dst, Mat& mask, Point seed) {
    stack<Point> front;
    front.push(seed);
    while (!front.empty()) {
        Point center = front.top();
        mask.at<uchar>(center) = 1;
        front.pop();
        for (int i=0; i<8; i++) { // 8 shifts
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
                    dst += mask * 255; // mark noise
                }
                mask -= mask;
            }
}`,
    cppSkeleton: baseTemplate,
  },
  {
    id: "split_merge",
    name: "Split and Merge",
    description:
      "Usa una struttura QuadTree (TNode) ricorsiva per dividere l'immagine per deviazione standard del colore, e le raggruppa in base a vicinanza.",
    codeReference: `// Split and Merge
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

// Merge and segment functions ...
void splitAndMerge(Mat& src) {
    GaussianBlur(src, src, Size(3,3), 0, 0);
    const int exp = log( min(src.rows, src.cols) ) / log(2);
    const int s = pow( 2, exp );
    Rect square( 0, 0, s, s );
    src = src(square).clone();
    
    Mat srcSplit = src.clone();
    Mat srcSeg = src.clone();
    TNode* root = split(srcSplit, Rect(0, 0, src.rows, src.cols));  
    merge(root); // Quadtree merging logic
    segment( srcSeg, root );
}`,
    cppSkeleton: baseTemplate,
  },
];
