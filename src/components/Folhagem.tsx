/**
 * A folhagem do convite, desenhada em SVG.
 *
 * Podia ser um PNG do Canva, e seria mais rápido de fazer. Mas um canto de
 * folhagem em PNG que não serrilhe na impressão passa de 1 MB, e são dois
 * cantos; em vetor são poucos kB, imprime nítido em qualquer tamanho e a cor
 * acompanha o resto da peça.
 *
 * O sorteio das folhas usa semente fixa — o mesmo desenho no servidor e no
 * navegador. Com Math.random o React acusaria divergência de hidratação, e a
 * folhagem mudaria de forma a cada F5.
 */

type Ponto = [number, number];

/** Gerador linear congruente. Determinístico e curto — não precisa ser bom. */
function sorteio(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function emCurva([a, b, c, d]: Ponto[], t: number): Ponto {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0],
    w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1],
  ];
}

/** Ângulo da tangente, em graus: é o que faz a folha nascer do galho e não atravessá-lo. */
function anguloEm([a, b, c, d]: Ponto[], t: number): number {
  const u = 1 - t;
  const w = [3 * u * u, 6 * u * t, 3 * t * t];
  const x = w[0] * (b[0] - a[0]) + w[1] * (c[0] - b[0]) + w[2] * (d[0] - c[0]);
  const y = w[0] * (b[1] - a[1]) + w[1] * (c[1] - b[1]) + w[2] * (d[1] - c[1]);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

const dCurva = ([a, b, c, d]: Ponto[]) =>
  `M${a[0]},${a[1]} C${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`;

type Galho = {
  curva: Ponto[];
  tipo: "eucalipto" | "pinheiro" | "bagas";
  quantidade: number;
  tamanho: number;
  cor: string;
  /** Abertura da folha em relação ao galho. Aberto lê como eucalipto, fechado como samambaia. */
  abertura?: number;
};

const ESCURO = "#5f7d55";
const MEDIO = "#7d9c70";
const CLARO = "#a8c39c";

/**
 * O buquê do canto superior esquerdo. O de baixo é o mesmo girado 180°, como
 * nos convites impressos: dois cantos opostos emolduram sem fechar a página.
 */
const GALHOS: Galho[] = [
  // arco longo que atravessa o topo — é ele que dá a moldura
  { curva: [[10, 40], [120, 8], [260, 20], [390, 62]], tipo: "eucalipto", quantidade: 22, tamanho: 21, cor: MEDIO },
  { curva: [[6, 74], [110, 46], [250, 58], [372, 104]], tipo: "pinheiro", quantidade: 30, tamanho: 26, cor: ESCURO },
  // descida pela lateral esquerda
  { curva: [[34, 14], [16, 130], [42, 240], [30, 352]], tipo: "eucalipto", quantidade: 20, tamanho: 23, cor: ESCURO },
  { curva: [[74, 26], [60, 120], [86, 208], [70, 300]], tipo: "pinheiro", quantidade: 24, tamanho: 22, cor: MEDIO },
  { curva: [[8, 120], [70, 190], [64, 268], [96, 340]], tipo: "eucalipto", quantidade: 14, tamanho: 18, cor: CLARO },
  // ramo curto que avança para dentro da folha
  { curva: [[120, 30], [178, 74], [206, 60], [268, 96]], tipo: "bagas", quantidade: 26, tamanho: 7, cor: MEDIO },
  { curva: [[160, 12], [214, 40], [252, 30], [318, 52]], tipo: "bagas", quantidade: 20, tamanho: 5, cor: CLARO },
];

/** Brilhos de quatro pontas. Poucos, e só onde o galho está ralo. */
const ESTRELAS: [number, number, number][] = [
  [292, 34, 9],
  [330, 78, 6],
  [96, 268, 7],
  [140, 92, 5],
  [46, 178, 6],
];

const dEstrela = (x: number, y: number, r: number) =>
  `M${x},${y - r} Q${x + r * 0.16},${y - r * 0.16} ${x + r},${y}` +
  ` Q${x + r * 0.16},${y + r * 0.16} ${x},${y + r}` +
  ` Q${x - r * 0.16},${y + r * 0.16} ${x - r},${y}` +
  ` Q${x - r * 0.16},${y - r * 0.16} ${x},${y - r} Z`;

function Buque({ id }: { id: string }) {
  const rand = sorteio(20261010);

  return (
    <g>
      {GALHOS.map((g, i) => {
        const folhas = [];
        for (let n = 0; n < g.quantidade; n++) {
          const t = 0.06 + (0.92 * n) / (g.quantidade - 1);
          const [x, y] = emCurva(g.curva, t);
          const lado = n % 2 === 0 ? 1 : -1;
          // Folha grande na base, miúda na ponta: galho real afina.
          const escala = (1 - t * 0.45) * (0.82 + rand() * 0.36);
          const tam = g.tamanho * escala;
          const giro =
            anguloEm(g.curva, t) + lado * (g.abertura ?? 52) + (rand() - 0.5) * 16;

          if (g.tipo === "bagas") {
            folhas.push(
              <circle key={n} cx={x} cy={y} r={tam * escala * 0.5} fill={g.cor} />,
            );
            continue;
          }

          folhas.push(
            <g key={n} transform={`translate(${x} ${y}) rotate(${giro})`}>
              {g.tipo === "eucalipto" ? (
                <ellipse cx={tam * 0.52} cy={0} rx={tam * 0.52} ry={tam * 0.36} fill={g.cor} />
              ) : (
                // agulha: um traço fino que sai do galho
                <path
                  d={`M0,0 L${tam},${-tam * 0.1}`}
                  stroke={g.cor}
                  strokeWidth={tam * 0.11}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>,
          );
        }

        return (
          <g key={i}>
            <path
              d={dCurva(g.curva)}
              stroke={g.cor}
              strokeWidth={g.tipo === "bagas" ? 1 : 1.6}
              fill="none"
              opacity={0.85}
            />
            {folhas}
          </g>
        );
      })}

      {ESTRELAS.map(([x, y, r], i) => (
        <path key={`e${id}${i}`} d={dEstrela(x, y, r)} fill={ESCURO} opacity={0.55} />
      ))}
    </g>
  );
}

/**
 * As duas manchas de aquarela. São só círculos borrados: num convite de papel
 * o fundo aguado é o que impede a folhagem de parecer adesivo colado no branco.
 */
function Aguada({ id }: { id: string }) {
  return (
    <g filter={`url(#borrao-${id})`} opacity={0.28}>
      <circle cx={150} cy={150} r={135} fill={CLARO} />
      <circle cx={280} cy={90} r={90} fill={CLARO} />
      <circle cx={70} cy={280} r={100} fill={CLARO} />
    </g>
  );
}

/**
 * `canto` decide qual dos dois desenhar. São o mesmo buquê: o de baixo entra
 * girado meia volta, que é como o convite impresso resolve a moldura.
 */
export default function Folhagem({ canto }: { canto: "cima" | "baixo" }) {
  const id = canto;
  return (
    <svg
      className={`folhagem folhagem--${canto}`}
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id={`borrao-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
      </defs>
      <g transform={canto === "baixo" ? "rotate(180 200 200)" : undefined}>
        <Aguada id={id} />
        <Buque id={id} />
      </g>
    </svg>
  );
}
