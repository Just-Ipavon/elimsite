import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { algorithms } from '../data/algorithms';
import lenaSrc from '../assets/lena.png';

// Prima frase della descrizione: basta come riassunto di una riga nell'indice.
const summary = (text) => {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const modes = [
  {
    to: '/study',
    name: 'Studio',
    cta: 'Apri lo studio',
    text: 'Codice di riferimento annotato riga per riga, con i passi dell’algoritmo e un visualizzatore OpenCV.js che lo esegue su Lena mentre muovi i parametri.',
  },
  {
    to: '/ide',
    name: 'Pratica',
    cta: 'Apri l’editor',
    text: 'Scrivi il codice in un editor C++ con il riferimento accanto. La verifica confronta il tuo sorgente riga per riga e indica cosa manca o non torna.',
  },
  {
    to: '/exam',
    name: 'Esame',
    cta: 'Avvia una simulazione',
    text: 'Un algoritmo estratto a caso, 90 minuti di tempo e nessuna soluzione visibile. Alla consegna ricevi l\u2019esito della verifica.',
  },
];

const Home = () => (
  <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 md:py-16">
    {/* Introduzione */}
    <section className="flex flex-col gap-10 border-b border-line pb-10 md:flex-row md:items-end md:justify-between md:pb-16">
      <div className="max-w-2xl">
        <p className="eyebrow mb-3 sm:mb-4">Elaborazione delle immagini · OpenCV C++</p>
        <h1 className="font-display text-[30px] leading-[1.12] sm:text-[34px] tracking-tight text-ink sm:text-5xl">
          I {algorithms.length} algoritmi dell&rsquo;esame, da studiare, riscrivere e provare a tempo.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] sm:mt-5 leading-relaxed text-ink-2">
          Per ogni algoritmo trovi l&rsquo;implementazione C++ di riferimento spiegata passo per passo, un editor per
          riscriverla da zero e una simulazione d&rsquo;esame con lo stesso limite di tempo della prova.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
          <Link to="/study" className="btn btn-primary h-10 sm:h-9">
            Inizia dallo studio
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/exam" className="btn btn-secondary h-10 sm:h-9">
            Simula l&rsquo;esame
          </Link>
        </div>
      </div>

      <figure className="hidden shrink-0 md:block">
        <img
          src={lenaSrc}
          alt="Lena, l'immagine di prova usata da tutti gli esempi"
          width="208"
          height="208"
          className="h-52 w-52 rounded-md border border-line object-cover"
        />
        <figcaption className="mt-2 font-mono text-2xs text-ink-3">
          lena.png · 512×512 · input di tutti gli esempi
        </figcaption>
      </figure>
    </section>

    <div className="grid gap-12 pt-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      {/* Indice degli algoritmi */}
      <section aria-labelledby="indice">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="indice" className="eyebrow">
            Indice degli algoritmi
          </h2>
          <span className="font-mono text-2xs tabular-nums text-ink-3">{algorithms.length} voci</span>
        </div>

        <ol className="border-t border-line">
          {algorithms.map((algo, i) => (
            <li key={algo.id} className="border-b border-line">
              <Link
                to="/study"
                className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 rounded-sm py-4 transition-colors hover:bg-surface sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-4 sm:px-2"
              >
                <span className="font-mono text-xs tabular-nums text-ink-3 group-hover:text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{algo.name}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-2">{summary(algo.description)}</span>
                </span>
                <span className="col-start-2 mt-2 flex items-center gap-2 font-mono text-2xs tabular-nums text-ink-3 sm:col-start-3 sm:mt-0 sm:justify-end sm:whitespace-nowrap">
                  {plural(algo.steps.length, 'passo', 'passi')}
                  <span aria-hidden="true">·</span>
                  {algo.params?.length ? plural(algo.params.length, 'parametro', 'parametri') : 'senza parametri'}
                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="hidden text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Le tre modalità, come percorso di lavoro */}
      <section aria-labelledby="percorso">
        <h2 id="percorso" className="eyebrow mb-3">
          Come usarlo
        </h2>
        <ol className="border-t border-line">
          {modes.map((mode, i) => (
            <li key={mode.to} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-line py-5">
              <span className="font-mono text-xs tabular-nums text-ink-3">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-ink">{mode.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{mode.text}</p>
                <Link
                  to={mode.to}
                  className="mt-2 inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent hover:underline hover:underline-offset-4"
                >
                  {mode.cta}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
          L&rsquo;ordine consigliato è questo: capire il codice, riscriverlo con il riferimento sotto gli occhi, poi
          rifarlo da soli contro il tempo.
        </p>
      </section>
    </div>

    <footer className="mt-12 border-t border-line pt-4 md:mt-16 font-mono text-2xs leading-relaxed text-ink-3">
      Il codice C++ non viene compilato: la verifica lo confronta testualmente con l&rsquo;implementazione di
      riferimento. Le anteprime usano OpenCV.js nel browser.
    </footer>
  </div>
);

export default Home;
