export const algorithms = [
  {
    id: "canny",
    name: "Canny Edge Detector",
    description:
      "Finds edges in an image using the Canny algorithm. It involves Gaussian filtering, Sobel masks, non-maximum suppression, and hysteresis thresholding.",
    codeReference: `void applyCanny(const cv::Mat& src, cv::Mat& dst, double lowThresh, double highThresh) {
    cv::Mat gray, blurred;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    cv::GaussianBlur(gray, blurred, cv::Size(5, 5), 1.5);
    cv::Canny(blurred, dst, lowThresh, highThresh);
}`,
    cppSkeleton: `// Apply Canny Edge Detection
// Make sure to convert to grayscale and optionally blur first
void applyCanny(const cv::Mat& src, cv::Mat& dst, double lowThresh, double highThresh) {
    // Write your code here...
    
}
`,
  },
  {
    id: "harris",
    name: "Harris Corner Detection",
    description:
      "Detects corners using the Harris corner detector algorithm. Responds to areas with large gradients in all directions.",
    codeReference: `void applyHarris(const cv::Mat& src, cv::Mat& dst, int blockSize, int kSize, double k) {
    cv::Mat gray;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    cv::cornerHarris(gray, dst, blockSize, kSize, k);
    cv::normalize(dst, dst, 0, 255, cv::NORM_MINMAX, CV_32FC1, cv::Mat());
    cv::convertScaleAbs(dst, dst);
}`,
    cppSkeleton: `// Apply Harris Corner Detection
void applyHarris(const cv::Mat& src, cv::Mat& dst, int blockSize, int kSize, double k) {
    // Write your code here...
    
}
`,
  },
  {
    id: "hough_circles",
    name: "Hough Circles",
    description: "Detects circles in an image using the Hough Transform.",
    codeReference: `void applyHoughCircles(const cv::Mat& src, cv::Mat& dst) {
    cv::Mat gray, blurred;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    cv::medianBlur(gray, blurred, 5);
    
    std::vector<cv::Vec3f> circles;
    cv::HoughCircles(blurred, circles, cv::HOUGH_GRADIENT, 1, gray.rows/16, 100, 30, 1, 30);
    
    src.copyTo(dst);
    for(size_t i = 0; i < circles.size(); i++) {
        cv::Vec3i c = circles[i];
        cv::Point center = cv::Point(c[0], c[1]);
        int radius = c[2];
        cv::circle(dst, center, radius, cv::Scalar(255, 0, 255), 3, cv::LINE_AA);
    }
}`,
    cppSkeleton: `// Apply Hough Circles
void applyHoughCircles(const cv::Mat& src, cv::Mat& dst) {
    // Write your code here...
    
}
`,
  },
  {
    id: "hough_lines",
    name: "Hough Lines",
    description:
      "Detects straight lines in an image using the standard Hough Transform.",
    codeReference: `void applyHoughLines(const cv::Mat& src, cv::Mat& dst) {
    cv::Mat gray, edges;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    cv::Canny(gray, edges, 50, 200, 3);
    
    std::vector<cv::Vec2f> lines;
    cv::HoughLines(edges, lines, 1, CV_PI/180, 150);
    
    src.copyTo(dst);
    for(size_t i = 0; i < lines.size(); i++) {
        float rho = lines[i][0], theta = lines[i][1];
        cv::Point pt1, pt2;
        double a = cos(theta), b = sin(theta);
        double x0 = a*rho, y0 = b*rho;
        pt1.x = cvRound(x0 + 1000*(-b));
        pt1.y = cvRound(y0 + 1000*(a));
        pt2.x = cvRound(x0 - 1000*(-b));
        pt2.y = cvRound(y0 - 1000*(a));
        cv::line(dst, pt1, pt2, cv::Scalar(0,0,255), 3, cv::LINE_AA);
    }
}`,
    cppSkeleton: `// Apply Hough Lines
void applyHoughLines(const cv::Mat& src, cv::Mat& dst) {
    // Write your code here...
    
}
`,
  },
  {
    id: "kmeans",
    name: "K-means Clustering",
    description:
      "Partitions an image into K clusters. Useful for color quantization or simple segmentation.",
    codeReference: `void applyKMeans(const cv::Mat& src, cv::Mat& dst, int K) {
    cv::Mat data;
    src.convertTo(data, CV_32F);
    data = data.reshape(1, data.total());
    
    cv::Mat labels, centers;
    cv::TermCriteria criteria(cv::TermCriteria::EPS + cv::TermCriteria::MAX_ITER, 10, 1.0);
    cv::kmeans(data, K, labels, criteria, 3, cv::KMEANS_PP_CENTERS, centers);
    
    centers = centers.reshape(3, centers.rows);
    data = data.reshape(3, data.rows);
    
    cv::Vec3f *p = data.ptr<cv::Vec3f>();
    for (size_t i = 0; i < data.rows; i++) {
       int center_id = labels.at<int>(i);
       p[i] = centers.at<cv::Vec3f>(center_id);
    }
    
    dst = data.reshape(3, src.rows);
    dst.convertTo(dst, CV_8U);
}`,
    cppSkeleton: `// Apply K-means Clustering
void applyKMeans(const cv::Mat& src, cv::Mat& dst, int K) {
    // Write your code here...
    
}
`,
  },
  {
    id: "otsu",
    name: "Otsu Thresholding",
    description:
      "Automatically calculates the optimal threshold value by maximizing intra-class variance.",
    codeReference: `void applyOtsu(const cv::Mat& src, cv::Mat& dst) {
    cv::Mat gray;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    cv::threshold(gray, dst, 0, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);
}`,
    cppSkeleton: `// Apply Otsu Thresholding
void applyOtsu(const cv::Mat& src, cv::Mat& dst) {
    // Write your code here...
    
}
`,
  },
  {
    id: "otsu2k",
    name: "Otsu 2K (Multi-level)",
    description:
      "Extension of Otsu to find multiple thresholds for segmentation (simulated with standard OpenCV calls or manual stats).",
    codeReference: `void applyOtsu2k(const cv::Mat& src, cv::Mat& dst) {
    // Typically Multi-Otsu requires custom implementation or successive applying
    // Here is a simplified placeholder
    cv::Mat gray;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    // Standard OpenCV only supports single-level Otsu natively in C++ via threshold()
    cv::threshold(gray, dst, 0, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);
}`,
    cppSkeleton: `// Apply 2K Multi-level Otsu
void applyOtsu2k(const cv::Mat& src, cv::Mat& dst) {
    // Write your code here...
    
}
`,
  },
  {
    id: "region_growing",
    name: "Region Growing",
    description:
      "A region-based image segmentation algorithm starting from seed points.",
    codeReference: `void applyRegionGrowing(const cv::Mat& src, cv::Mat& dst, cv::Point seed, int threshold) {
    // Often implemented using FloodFill in OpenCV C++
    cv::Mat mask = cv::Mat::zeros(src.rows + 2, src.cols + 2, CV_8U);
    src.copyTo(dst);
    cv::floodFill(dst, mask, seed, cv::Scalar(255, 0, 0), 0, cv::Scalar(threshold, threshold, threshold), cv::Scalar(threshold, threshold, threshold), 4 | cv::FLOODFILL_FIXED_RANGE);
}`,
    cppSkeleton: `// Apply Region Growing
void applyRegionGrowing(const cv::Mat& src, cv::Mat& dst, cv::Point seed, int threshold) {
    // Write your code here...
    
}
`,
  },
  {
    id: "split_merge",
    name: "Split and Merge",
    description: "A quadtree-based image segmentation algorithm.",
    codeReference: `void applySplitAndMerge(const cv::Mat& src, cv::Mat& dst) {
    // Very complex custom pure C++ implementation. 
    // This is typically done manually via recursion dividing into 4 quadrants.
    // Ensure you divide image into 4 sub-regions recursively based on variance.
    dst = src.clone();
    cv::blur(dst, dst, cv::Size(3,3)); // Placeholder for visual
}`,
    cppSkeleton: `// Apply Split and Merge algorithm
void applySplitAndMerge(const cv::Mat& src, cv::Mat& dst) {
    // Write your code here...
    
}
`,
  },
];
