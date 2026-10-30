// Concetti di base richiamati dalla sezione "Concetti di base" dello Studio.
// Ogni algoritmo elenca in `concepts` le chiavi che gli servono.
export const concepts = {
  mat: {
    term: "Immagine digitale e Mat",
    text: "Un'immagine digitale è una griglia (matrice) di pixel: rows righe e cols colonne. In OpenCV è una Mat. Ogni pixel contiene uno o più numeri, i canali: 1 per un'immagine in grigio, 3 per una a colori. Il tipo, ad esempio CV_8UC1, dice quanti bit ha ogni valore (8), se è con segno o in virgola mobile (U = unsigned) e quanti canali ci sono (C1).",
  },
  coords: {
    term: "Coordinate: riga, colonna e (x, y)",
    text: "L'origine è in alto a sinistra; x cresce verso destra (colonne) e y verso il basso (righe), al contrario del piano cartesiano. at<T>(y, x) vuole prima la riga e poi la colonna, mentre Point(x, y) vuole prima x: confonderli è l'errore più comune. Per questo nei cicli si usa y per le righe e x per le colonne.",
  },
  types: {
    term: "Tipi dei pixel: CV_8U, CV_32F, CV_32S",
    text: "CV_8U (uchar) contiene interi da 0 a 255 ed è il tipo delle immagini lette da file: i risultati fuori intervallo vengono «saturati» (−5 diventa 0, 300 diventa 255). CV_32F (float) serve per valori con la virgola o negativi, come derivate e angoli. CV_32S (int) serve per contatori grandi, come i voti di Hough. Il tipo in at<T> deve corrispondere a quello della Mat (uchar, float, int, Vec3b): se non corrisponde il programma legge byte sbagliati senza dare errori.",
  },
  color: {
    term: "Scala di grigi e colore BGR",
    text: "In un'immagine in grigio ogni pixel è un solo valore, l'intensità: 0 = nero, 255 = bianco. In un'immagine a colori ogni pixel ha tre valori, uno per canale; OpenCV li memorizza in ordine B, G, R (blu, verde, rosso) e non R, G, B. Un pixel a colori si legge con at<Vec3b>(y, x), un vettore di 3 uchar.",
  },
  neighborhood: {
    term: "Intorno e connettività (4 o 8)",
    text: "L'intorno di un pixel sono i pixel che lo circondano. Con la connettività a 4 i vicini sono sopra, sotto, sinistra e destra; con quella a 8 si aggiungono le 4 diagonali. L'intorno 3×3 è il pixel con i suoi 8 vicini: si scorre con due cicli da −1 a 1 sugli spostamenti di riga e colonna. Ai bordi dell'immagine alcuni vicini non esistono: per questo i cicli partono da 1, oppure si controlla che le coordinate siano valide.",
  },
  kernel: {
    term: "Kernel e convoluzione (filtro)",
    text: "Un filtro lineare sostituisce ogni pixel con una somma pesata del suo intorno. I pesi formano una piccola matrice, il kernel (es. 3×3 o 5×5), che viene fatta scorrere su tutta l'immagine: questa operazione è la convoluzione. Kernel diversi fanno cose diverse: con pesi tutti positivi si sfoca (media, gaussiano), con pesi positivi da un lato e negativi dall'altro si calcolano differenze, cioè derivate (Sobel).",
  },
  gaussian: {
    term: "Filtro gaussiano (blur)",
    text: "È un kernel i cui pesi seguono una campana di Gauss: il pixel centrale pesa di più, quelli lontani sempre meno. Sfoca l'immagine e riduce il rumore senza creare gli artefatti di una media semplice. σ (sigma) regola quanto è larga la campana: più è grande, più l'immagine si sfoca. Con sigma = 0 OpenCV lo ricava dalla dimensione del kernel, che deve essere dispari.",
  },
  gradient: {
    term: "Gradiente, modulo e direzione",
    text: "La derivata di un'immagine misura quanto cambia l'intensità: Dx in orizzontale, Dy in verticale (con Sobel). Il vettore (Dx, Dy) è il gradiente. Il modulo √(Dx² + Dy²) dice quanto è brusco il cambiamento; la direzione atan2(Dy, Dx) dice verso dove l'intensità aumenta di più, ed è perpendicolare al bordo.",
  },
  edge: {
    term: "Bordo (edge)",
    text: "Un bordo è una zona in cui l'intensità cambia bruscamente, ad esempio il contorno di un oggetto su uno sfondo diverso. Corrisponde a un modulo del gradiente alto. Un rilevatore di bordi (come Canny) produce un'immagine binaria: 255 sui pixel di bordo, 0 altrove. Gli algoritmi di Hough partono proprio da questa mappa.",
  },
  corner: {
    term: "Angolo (corner)",
    text: "Un angolo è un punto in cui si incontrano due bordi con direzioni diverse. Spostando una piccola finestra attorno a un angolo l'immagine cambia in qualunque direzione ci si muova; lungo un bordo cambia solo attraversandolo; su una zona piatta non cambia. Gli angoli sono punti facili da ritrovare in immagini diverse della stessa scena.",
  },
  eigen: {
    term: "Autovalori (intuizione)",
    text: "Una matrice 2×2 simmetrica come quella di Harris si può vedere come un'ellisse: gli autovalori λ1 e λ2 sono le lunghezze dei suoi due assi principali, cioè quanto varia l'immagine nelle due direzioni più importanti. Entrambi piccoli: zona piatta. Uno grande: bordo. Entrambi grandi: angolo. Il determinante vale λ1·λ2 e la traccia λ1 + λ2, quindi si possono usare senza calcolare gli autovalori.",
  },
  normalize: {
    term: "Normalizzazione (NORM_MINMAX)",
    text: "Normalizzare significa riscalare i valori in un intervallo noto. Con NORM_MINMAX il valore minimo diventa alpha, il massimo beta e gli altri vengono scalati in proporzione: con alpha = 0 e beta = 255 si ottiene un'immagine visualizzabile. Così una soglia fissa ha lo stesso significato su immagini più o meno contrastate.",
  },
  threshold: {
    term: "Soglia e binarizzazione",
    text: "Una soglia divide i pixel in due gruppi: quelli sopra e quelli sotto un valore. Binarizzare significa produrre un'immagine con soli due valori, di solito 0 (nero) e 255 (bianco). Le soglie compaiono ovunque: sul modulo del gradiente (Canny), sulla risposta R (Harris), sui voti (Hough), sulle intensità (Otsu).",
  },
  nms: {
    term: "Non-maximum suppression (NMS)",
    text: "Quando una risposta (gradiente, voti, R di Harris) è alta in una zona, di solito lo è anche nei pixel vicini al punto migliore. La non-maximum suppression tiene solo il valore massimo e azzera gli altri: un pixel sopravvive solo se è maggiore o uguale ai suoi vicini. Senza NMS si ottengono bordi spessi o rilevamenti multipli dello stesso oggetto.",
  },
  hysteresis: {
    term: "Isteresi (due soglie)",
    text: "Invece di una soglia sola se ne usano due. Sopra la soglia alta un pixel è sicuramente bordo, sotto la bassa sicuramente no; in mezzo la decisione dipende dai vicini: è bordo solo se è collegato a un pixel sicuro. Così i bordi non si spezzano dove si indeboliscono e il rumore isolato non entra.",
  },
  hough: {
    term: "Spazio dei parametri e accumulatore",
    text: "Una forma geometrica è descritta da pochi numeri, i parametri: una retta da (ρ, θ), un cerchio da centro (a, b) e raggio r. L'accumulatore è una matrice con una cella per ogni combinazione di parametri, inizialmente a zero. Ogni pixel di bordo vota (incrementa) tutte le celle delle forme che potrebbero passare per lui; le celle con molti voti corrispondono alle forme presenti nell'immagine.",
  },
  polar: {
    term: "Forma polare di una retta (ρ, θ)",
    text: "Una retta si può descrivere con la distanza ρ dall'origine e l'angolo θ della sua normale (la perpendicolare che la collega all'origine): ρ = x·cos θ + y·sin θ. A differenza di y = mx + q funziona anche per le rette verticali, dove m sarebbe infinito, e θ è limitato a [0°, 180°).",
  },
  radians: {
    term: "Gradi e radianti",
    text: "Le funzioni cos, sin e atan2 lavorano in radianti: un giro completo vale 2π (≈ 6,28) invece di 360°. Per convertire: radianti = gradi · π / 180 (in OpenCV π è CV_PI). Nei cicli si usano gradi interi perché sono comodi come indici, e si convertono solo per calcolare cos e sin.",
  },
  histogram: {
    term: "Istogramma (e istogramma normalizzato)",
    text: "L'istogramma conta quanti pixel hanno ciascun livello di grigio: un vettore di 256 contatori, dove il valore del pixel fa da indice. Dividendo ogni conteggio per il numero totale di pixel si ottiene l'istogramma normalizzato: p(i) è la probabilità che un pixel scelto a caso abbia livello i, e tutti i p(i) sommano a 1. Un istogramma con due «gobbe» (bimodale) indica di solito oggetto e sfondo.",
  },
  stats: {
    term: "Media, varianza e deviazione standard",
    text: "La media è il valore «tipico»: Σ valori / numero di valori, oppure Σ i·p(i) se si usa l'istogramma normalizzato. La varianza misura quanto i valori si allontanano dalla media (media dei quadrati degli scarti); la deviazione standard è la sua radice ed è nella stessa unità dei valori. Una regione uniforme ha deviazione standard bassa, una con dettagli o bordi alta.",
  },
  classes: {
    term: "Classi e varianza tra le classi",
    text: "Una soglia divide i livelli di grigio in classi (es. scuri e chiari). Ogni classe ha una probabilità P (frazione di pixel che contiene) e una media m. La varianza tra le classi Σ P·(m − mG)² misura quanto le medie delle classi sono lontane dalla media globale mG: è alta quando le classi sono ben separate. Otsu sceglie la soglia che la rende massima.",
  },
  segmentation: {
    term: "Segmentazione",
    text: "Segmentare un'immagine significa dividerla in regioni, assegnando ogni pixel a un gruppo: idealmente ogni regione corrisponde a un oggetto o a una parte omogenea della scena. Si può segmentare per soglia (Otsu), per somiglianza di colore senza guardare la posizione (K-means) o facendo crescere e unendo regioni connesse (Region Growing, Split and Merge).",
  },
  centroid: {
    term: "Cluster e centroide",
    text: "Un cluster è un gruppo di elementi simili tra loro; in K-means gli elementi sono i colori dei pixel, visti come punti nello spazio a 3 dimensioni (B, G, R). Il centroide (o centro) di un cluster è la media dei suoi punti: il colore medio dei pixel del gruppo. È il punto che minimizza la somma delle distanze al quadrato da tutti i punti del cluster, e rappresenta l'intero gruppo.",
  },
  distance: {
    term: "Distanza tra colori",
    text: "Due colori si confrontano come punti in 3 dimensioni. La distanza euclidea è √(ΔB² + ΔG² + ΔR²): 0 se i colori sono uguali, grande se sono molto diversi. Se serve solo confrontarla con una soglia si può evitare la radice e usare la distanza al quadrato, confrontandola con la soglia al quadrato.",
  },
  convergence: {
    term: "Algoritmo iterativo e convergenza",
    text: "Un algoritmo iterativo ripete gli stessi passi migliorando ogni volta la soluzione. Converge quando le ripetizioni smettono di cambiare qualcosa di significativo: si misura di quanto è cambiata la soluzione e ci si ferma sotto una soglia. La soluzione trovata può essere un minimo locale, buono ma non necessariamente il migliore possibile, e dipende dal punto di partenza.",
  },
  labels: {
    term: "Etichette (labeling)",
    text: "Un'etichetta è un numero che identifica il gruppo di un pixel: la mappa delle etichette è un'immagine della stessa dimensione dove ogni pixel contiene l'indice del suo cluster o della sua regione (0, 1, 2…). Non è pensata per essere guardata così com'è: i valori sono piccoli e appare quasi nera. Per visualizzarla si assegna un colore a ogni etichetta.",
  },
  mask: {
    term: "Maschera",
    text: "Una maschera è un'immagine (di solito a un canale, CV_8U) della stessa dimensione dell'originale che indica quali pixel considerare: diverso da 0 = pixel selezionato, 0 = pixel escluso. Serve per marcare una regione, per limitare un'operazione a una parte dell'immagine o per contare i pixel selezionati (countNonZero). Con valori 0/1 si può moltiplicare per un numero per «dipingere» la regione con quel valore.",
  },
  seed: {
    term: "Seme (seed)",
    text: "Il seme è il pixel da cui parte la crescita di una regione. Può essere scelto a mano, in modo casuale o, come nel codice, scandendo l'immagine e prendendo il primo pixel non ancora assegnato. Da lì la regione si espande ai vicini che rispettano il criterio di somiglianza.",
  },
  stack: {
    term: "Stack (pila) e visita di una regione",
    text: "Uno stack è una lista in cui si inserisce (push) e si toglie (pop) sempre dalla cima: l'ultimo entrato è il primo a uscire (LIFO). Per visitare una regione si mettono nello stack i pixel da esplorare: si estrae un pixel, si guardano i suoi vicini e si inseriscono quelli validi, finché lo stack si svuota. È la versione senza ricorsione della visita in profondità e non rischia di esaurire la memoria delle chiamate.",
  },
  homogeneity: {
    term: "Regione omogenea (predicato)",
    text: "Una regione è omogenea se i suoi pixel sono abbastanza simili tra loro secondo un criterio, detto predicato. Nel codice il predicato è la deviazione standard: sotto la soglia la regione è omogenea, sopra va divisa. Per unire due regioni invece si confrontano le loro medie.",
  },
  quadtree: {
    term: "QuadTree e ricorsione",
    text: "Un QuadTree è un albero in cui ogni nodo ha 0 figli (foglia) oppure 4, uno per quadrante. La radice è l'intera immagine; dividendo ricorsivamente si scende verso blocchi sempre più piccoli. Una funzione ricorsiva chiama sé stessa sui quattro figli e si ferma nel caso base (blocco omogeneo o troppo piccolo). Il lato deve dimezzarsi esattamente, per questo si usano immagini con lato potenza di 2.",
  },
  roi: {
    term: "ROI: vista su una parte dell'immagine",
    text: "img(Rect(x, y, w, h)) restituisce una ROI (Region Of Interest): una Mat che vede solo quel rettangolo dell'immagine, senza copiare i pixel. Leggerla o modificarla agisce direttamente sull'originale: per questo img(regione) = valore riempie il rettangolo nell'immagine di partenza. Per avere una copia separata si usa clone().",
  },
  pointers: {
    term: "Puntatori e new",
    text: "TNode* è un puntatore: contiene l'indirizzo di un nodo, non il nodo stesso. new TNode(R) crea il nodo in una zona di memoria che sopravvive alla fine della funzione, e la freccia root->campo accede ai suoi campi. nullptr è il puntatore «vuoto»: un figlio uguale a nullptr significa che non esiste.",
  },
  clone: {
    term: "Copia di una Mat: clone e assegnazione",
    text: "Assegnare una Mat a un'altra (dst = src) non copia i pixel: le due variabili condividono gli stessi dati e modificare l'una modifica anche l'altra. clone() crea una copia indipendente. Si usa clone quando si vuole disegnare o modificare un'immagine lasciando intatto l'originale.",
  },
};
