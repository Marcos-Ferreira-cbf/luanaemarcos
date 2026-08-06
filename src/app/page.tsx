import Contagem from "@/components/Contagem";
import CodigoConvite from "@/components/CodigoConvite";
import Gravata from "@/components/Gravata";
import ListaPresentes from "@/components/ListaPresentes";
import Surge from "@/components/Surge";
import { ProvedorPagamento } from "@/components/pagamento";
import { db } from "@/lib/db";
import type { Mare, Presente } from "@/lib/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAPELA = "https://maps.app.goo.gl/fMTQ4Yc7KDsu5yJo6";
const SITIO = "https://maps.app.goo.gl/JGumRb3QheYLotWR7";
const WHATSAPP = "https://wa.me/5562996325652";

const ENSAIO = [
  { arquivo: "foto-04.webp", alt: "Luana e Marcos na praia" },
  { arquivo: "foto-05.webp", alt: "Luana e Marcos abraçados" },
  { arquivo: "foto-06.webp", alt: "Luana sorrindo abraçada a Marcos" },
  { arquivo: "foto-07.webp", alt: "Marcos abraçando Luana por trás" },
  { arquivo: "foto-08.webp", alt: "Os dois caminhando de mãos dadas" },
  { arquivo: "foto-09.webp", alt: "Os dois frente a frente na praia" },
];

/**
 * Aqui o banco é lido direto, sem passar por /api/presentes: a rota existe
 * para o cliente, e um componente de servidor chamando a própria API só
 * pagaria um salto HTTP a mais para chegar na mesma consulta.
 */
async function carregar() {
  const [presentes, gravata] = await Promise.all([
    db.query<Presente>("select * from v_presentes"),
    db.query("select * from v_gravata"),
  ]);

  const g = gravata.rows[0];
  const mare: Mare = {
    arrecadadoCentavos: Number(g?.arrecadado_centavos ?? 0),
    metaCentavos: Number(g?.meta_centavos ?? 350_000),
    pessoas: Number(g?.pessoas ?? 0),
  };

  return {
    casa: presentes.rows.filter((p) => p.grupo === "casa"),
    luaDeMel: presentes.rows.filter((p) => p.grupo === "lua_de_mel"),
    cotasGravata: presentes.rows.filter((p) => p.grupo === "gravata"),
    mare,
  };
}

export default async function Pagina() {
  const { casa, luaDeMel, cotasGravata, mare } = await carregar();

  return (
    <ProvedorPagamento>
      {/* ============ capa ============ */}
      <header className="capa">
        <div className="capa__foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fotos/foto-01.webp"
            alt="Luana e Marcos caminhando de mãos dadas na praia ao pôr do sol"
            fetchPriority="high"
          />
        </div>
        <div className="capa__veu" />
        <div className="capa__texto">
          <p className="capa__rotulo">10 de outubro de 2026 · Barro Alto, GO</p>
          <h1 className="capa__nomes serifa">
            Luana <em>&amp;</em> Marcos
          </h1>
          <Contagem />
        </div>
      </header>

      {/* ============ convite ============ */}
      <section className="bloco">
        <Surge className="col">
          <p className="rotulo">O convite</p>
          <h2 className="titulo">Diante de Deus, o sim que vale para sempre.</h2>
          <p className="texto">
            Nos conhecemos em maio de 2025 e, em outubro, assinamos os papéis no
            cartório. Mas o casamento que a gente esperava é este: receber a bênção no
            altar, com a nossa gente por perto.
          </p>
          <p className="texto" style={{ marginTop: "1.1rem" }}>
            Será de manhã, na Santinha, e depois seguimos para o almoço no sítio. A gente
            adoraria ter você lá.
          </p>

          <figure className="verso">
            <blockquote className="verso__texto serifa">
              Portanto, o que Deus uniu, não o separe o homem.
            </blockquote>
            <figcaption className="verso__ref">Marcos 10:9</figcaption>
          </figure>
        </Surge>
      </section>

      <div className="faixa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fotos/foto-02.webp" alt="As mãos dos dois, com as alianças" loading="lazy" />
      </div>

      {/* ============ o dia ============ */}
      <section className="bloco">
        <Surge className="col">
          <p className="rotulo">O dia</p>
          <h2 className="titulo">Sábado, 10 de outubro</h2>

          {/* O mapa fica na linha do próprio evento: embaixo, num bloco de
              botões, ele se lê como rodapé da seção e passa batido. */}
          <div className="linha">
            <span className="rotulo">09h30</span>
            <span className="linha__val">
              Cerimônia
              <span className="linha__obs">
                Capela Nossa Senhora de Lourdes, a Santinha — Barro Alto, GO
              </span>
            </span>
            <a href={CAPELA} target="_blank" rel="noopener" className="linha__mapa">
              Como chegar
            </a>
          </div>
          <div className="linha">
            <span className="rotulo">12h00</span>
            <span className="linha__val">
              Almoço
              <span className="linha__obs">Sítio Correa — Souzalândia, Barro Alto, GO</span>
            </span>
            <a href={SITIO} target="_blank" rel="noopener" className="linha__mapa">
              Como chegar
            </a>
          </div>
          <div className="linha">
            <span className="rotulo">Traje</span>
            <span className="linha__val">Esporte fino</span>
          </div>
        </Surge>
      </section>

      {/* ============ confirmar ============ */}
      <section className="bloco bloco--escuro" id="confirmar">
        <Surge className="col">
          <p className="rotulo">Presença</p>
          <h2 className="titulo">Você vem?</h2>
          <p className="texto" style={{ marginBottom: "2rem" }}>
            Seu convite chegou pelo WhatsApp com um link. Se preferir, digite aqui o
            código que está nele.
          </p>

          <CodigoConvite />

          <p className="texto" style={{ marginTop: "1.5rem", fontSize: ".92rem" }}>
            Confirme até <strong style={{ color: "var(--luz)" }}>10 de setembro</strong>,
            para a gente fechar o almoço.
          </p>
        </Surge>
      </section>

      {/* ============ presentes ============ */}
      <section className="bloco">
        <Surge className="col">
          <p className="rotulo">Presentes</p>
          <h2 className="titulo">A lista</h2>
          <p className="texto">
            Se quiser nos presentear, separamos duas listas: o que falta na nossa casa e
            os pedaços da nossa lua de mel. O pagamento é por Pix e leva menos de um
            minuto.
          </p>

          <div className="grupo">
            <p className="grupo__nome">Para a casa</p>
            <p className="texto" style={{ marginBottom: ".6rem" }}>
              As coisas que ainda faltam para a nossa.
            </p>
            <ListaPresentes presentes={casa} />
          </div>

          <div className="grupo">
            <p className="grupo__nome">Para a lua de mel</p>
            <p className="texto" style={{ marginBottom: ".6rem" }}>
              Treze dias na Finlândia, entre Helsinque e a Lapônia. Escolha um pedaço.
            </p>
            <ListaPresentes presentes={luaDeMel} />
          </div>

          <p className="aviso">
            Os presentes são convertidos em valor. A gente compra tudo depois da viagem,
            com calma — e manda foto de cada um para quem deu.
          </p>
        </Surge>
      </section>

      {/* ============ gravata ============ */}
      <Gravata cotas={cotasGravata} mare={mare} />

      {/* ============ galeria ============ */}
      <section className="bloco" style={{ paddingBottom: "calc(var(--ar) * .6)" }}>
        <Surge className="col" style={{ marginBottom: "2rem" }}>
          <p className="rotulo">O ensaio</p>
          <h2 className="titulo">A gente.</h2>
        </Surge>
        <div className="rail">
          {ENSAIO.map((f) => (
            <div className="rail__item" key={f.arquivo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/fotos/${f.arquivo}`} alt={f.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* ============ ajuda ============ */}
      <section
        className="bloco"
        style={{ paddingTop: "calc(var(--ar) * .6)", textAlign: "center" }}
      >
        <Surge className="col">
          <h2 className="titulo" style={{ fontSize: "clamp(1.8rem,7vw,2.4rem)" }}>
            Ficou com alguma dúvida?
          </h2>
          <p className="texto" style={{ margin: "0 auto 1.8rem" }}>
            Chama a Luana no WhatsApp que ela resolve.
          </p>
          <a href={WHATSAPP} target="_blank" rel="noopener" className="btn btn--linha">
            Chamar no WhatsApp
          </a>
        </Surge>
      </section>

      <footer className="rodape">
        <div className="col">
          <p className="rodape__nomes serifa">
            Com a bênção de Deus,
            <br />
            até lá.
          </p>
          <p className="rodape__url">marcoseluana.social.br</p>
        </div>
      </footer>
    </ProvedorPagamento>
  );
}
