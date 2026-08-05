"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { reais } from "@/lib/formato";
import { mascararWhatsapp, normalizarWhatsapp } from "@/lib/telefone";
import type { Escolha } from "@/lib/tipos";

type Pedido = {
  pedidoId: string;
  valorCentavos: number;
  qrBase64: string | null;
  copiaECola: string | null;
  expiraEm: string;
};

const Contexto = createContext<((e: Escolha) => void) | null>(null);

/** Abre a folha de pagamento. Usado pela lista de presentes e pela gravata. */
export function useAbrirPagamento() {
  const abrir = useContext(Contexto);
  if (!abrir) throw new Error("useAbrirPagamento fora do ProvedorPagamento");
  return abrir;
}

function Cronometro({ ate }: { ate: string }) {
  const alvo = useMemo(() => new Date(ate).getTime(), [ate]);
  const [restante, setRestante] = useState(() => alvo - Date.now());

  useEffect(() => {
    const t = setInterval(() => setRestante(alvo - Date.now()), 1000);
    return () => clearInterval(t);
  }, [alvo]);

  if (restante <= 0) {
    return <p className="folha__prazo">O código expirou. Feche e escolha de novo.</p>;
  }
  const s = Math.floor(restante / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <p className="folha__prazo">
      O código vale por {mm}:{ss}
    </p>
  );
}

export function ProvedorPagamento({ children }: { children: React.ReactNode }) {
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [valorLivre, setValorLivre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState(false);

  const folha = useRef<HTMLDivElement>(null);
  const primeiroCampo = useRef<HTMLInputElement>(null);

  const aberta = escolha !== null;

  const abrir = useCallback((e: Escolha) => {
    setEscolha(e);
    setPedido(null);
    setErro(null);
    setCopiado(false);
    setValorLivre("");
  }, []);

  const fechar = useCallback(() => {
    setEscolha(null);
  }, []);

  // Trava a rolagem do fundo. Sem isso o iOS rola a página atrás da folha e
  // o convidado perde o QR de vista no meio do pagamento.
  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    folha.current?.scrollTo(0, 0);
    primeiroCampo.current?.focus();

    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta, fechar]);

  const cotasLivres = Number.parseInt(valorLivre, 10);
  const cotas = escolha?.valorLivre
    ? Number.isFinite(cotasLivres) && cotasLivres > 0
      ? cotasLivres
      : 0
    : (escolha?.cotas ?? 1);
  const total = (escolha?.valorUnitario ?? 0) * cotas;

  async function gerar() {
    if (!escolha) return;
    if (!nome.trim()) {
      setErro("Escreva seu nome para o casal saber de quem veio.");
      return;
    }
    if (escolha.valorLivre && cotas <= 0) {
      setErro("Escolha um valor.");
      return;
    }
    // Validado aqui e de novo no servidor. Aqui é para a pessoa corrigir na
    // hora, com o teclado ainda aberto; lá é porque o servidor não confia.
    if (whatsapp.trim() && !normalizarWhatsapp(whatsapp)) {
      setErro("Esse número não parece um WhatsApp. Confira o DDD e o 9 na frente.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Nenhum campo de valor: o preço sai do banco (invariante 1).
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim() || undefined,
          mensagem: mensagem.trim() || undefined,
          itens: [{ presenteId: escolha.presenteId, cotas }],
        }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados.erro ?? "Não foi possível gerar o código. Tente de novo.");
        return;
      }
      setPedido(dados as Pedido);
      folha.current?.scrollTo(0, 0);
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (!pedido?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pedido.copiaECola);
      setCopiado(true);
    } catch {
      setErro("Não deu para copiar. Selecione o código acima e copie na mão.");
    }
  }

  return (
    <Contexto.Provider value={abrir}>
      {children}

      <div
        className="folha"
        ref={folha}
        data-aberta={aberta ? "true" : "false"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folha-item"
        aria-hidden={!aberta}
      >
        <div className="col">
          <div className="folha__topo">
            <button className="folha__voltar" onClick={fechar} aria-label="Voltar">
              ←
            </button>
            <span className="rotulo">Pagar com Pix</span>
          </div>

          <p className="folha__item serifa" id="folha-item">
            {escolha?.nome ?? "—"}
          </p>
          <p className="folha__valor">
            {escolha?.valorLivre && cotas <= 0 ? "valor que você escolher" : reais(total)}
          </p>

          {pedido ? (
            <>
              <Cronometro ate={pedido.expiraEm} />

              <div className="folha__qr">
                {pedido.qrBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${pedido.qrBase64}`}
                    alt="QR code do Pix"
                    width={190}
                    height={190}
                  />
                ) : (
                  <span className="folha__prazo">use o código abaixo</span>
                )}
              </div>

              <p className="folha__codigo">{pedido.copiaECola}</p>

              {erro && <p className="folha__erro">{erro}</p>}

              <button className="btn btn--cheio" onClick={copiar}>
                {copiado ? "Código copiado" : "Copiar código Pix"}
              </button>

              <div style={{ margin: "2.2rem 0 3.5rem" }}>
                <p className="rotulo" style={{ marginBottom: ".6rem" }}>
                  Como pagar
                </p>
                <div className="passo">
                  <span className="passo__n">01</span>
                  <span>
                    Toque em <strong>Copiar código Pix</strong> aqui em cima.
                  </span>
                </div>
                <div className="passo">
                  <span className="passo__n">02</span>
                  <span>
                    Abra o aplicativo do seu banco e escolha <strong>Pix</strong>.
                  </span>
                </div>
                <div className="passo">
                  <span className="passo__n">03</span>
                  <span>
                    Toque em <strong>Pix copia e cola</strong> e cole o código.
                  </span>
                </div>
                <div className="passo">
                  <span className="passo__n">04</span>
                  <span>Confirme. A gente recebe na hora e te manda uma mensagem.</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ margin: "2rem 0 3.5rem" }}>
              {escolha?.valorLivre && (
                <>
                  <label className="rotulo" htmlFor="valor-livre">
                    Quanto você quer dar
                  </label>
                  <input
                    id="valor-livre"
                    className="folha__campo"
                    style={{ marginTop: ".6rem" }}
                    inputMode="numeric"
                    placeholder="R$ 150"
                    value={valorLivre}
                    onChange={(e) => setValorLivre(e.target.value.replace(/\D/g, ""))}
                  />
                </>
              )}

              <label className="rotulo" htmlFor="pagador-nome">
                Seu nome
              </label>
              <input
                id="pagador-nome"
                ref={primeiroCampo}
                className="folha__campo"
                style={{ marginTop: ".6rem" }}
                autoComplete="name"
                placeholder="Como o casal te chama"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <label className="rotulo" htmlFor="pagador-whatsapp">
                Seu WhatsApp
              </label>
              <input
                id="pagador-whatsapp"
                className="folha__campo"
                style={{ marginTop: ".6rem" }}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(62) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(mascararWhatsapp(e.target.value))}
                aria-describedby="whatsapp-ajuda"
              />
              <p
                id="whatsapp-ajuda"
                className="folha__prazo"
                style={{ margin: "-.35rem 0 1rem" }}
              >
                É por aqui que o casal manda o obrigado.
              </p>

              <label className="rotulo" htmlFor="pagador-mensagem">
                Um recado (opcional)
              </label>
              <textarea
                id="pagador-mensagem"
                className="folha__campo"
                style={{ marginTop: ".6rem" }}
                placeholder="o casal vai ler"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />

              {erro && <p className="folha__erro">{erro}</p>}

              <button className="btn btn--cheio" onClick={gerar} disabled={enviando}>
                {enviando ? "Gerando…" : "Gerar código Pix"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Contexto.Provider>
  );
}
