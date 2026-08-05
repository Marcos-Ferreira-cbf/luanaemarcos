# Protótipo — estado atual

Arquivo: `prototipo.html`, 424 KB, autossuficiente. Abre offline, com as nove fotos do ensaio embutidas em WebP. Feito para ser aberto no celular e passado adiante para revisão.

---

## Os dados reais já no protótipo

| | |
|---|---|
| Data | Sábado, 10 de outubro de 2026 |
| Cerimônia | 09h30 — Capela Nossa Senhora de Lourdes, a Santinha · Barro Alto, GO |
| Almoço | 12h00 — Sítio Correa · Souzalândia, Barro Alto, GO |
| Ajuda | WhatsApp da Luana, ligado direto no `wa.me` |
| Domínio | marcoseluana.social.br |

Os dois botões de mapa apontam para os links do Google Maps que você mandou.

**Ainda é marcador de lugar:** o traje ("esporte fino"), o prazo de RSVP (10 de setembro) e o intervalo entre a capela e o sítio, que ainda não tem uma linha explicando o que fazer nas duas horas e meia.

---

## Rotas

| Rota | Papel |
|---|---|
| `/` | Página única: Capa → Convite → O dia → Confirmar → Presentes → Gravata → Ensaio → Ajuda |
| `/rsvp/[codigo]` | Confirmação de verdade: nomes já preenchidos, botões **Vou** / **Não vou** |
| `/pagamento/[pedidoId]` | QR do Pix, código para copiar, passo a passo · cartão pelo Brick do Mercado Pago |
| `/admin` | Painel do casal — confirmados, presentes, moderação |

Fora da primeira versão: hospedagem, mural de recados, álbum colaborativo dos convidados.

---

## Árvore de componentes

```
app/page.tsx
├── <Capa/>              foto de capa, nomes, "faltam N dias"
├── <Convite/>           a história real + versículo (Marcos 10:9)
├── <FaixaFoto/>         imagem full-bleed entre blocos
├── <ODia/>              cerimônia, almoço, traje + dois botões de mapa
├── <Confirmar/>         campo de código → /rsvp/[codigo]
├── <Presentes/>         dois grupos: Para a casa e Para a lua de mel
├── <Gravata/>           a maré + seleção de cota  ← elemento-assinatura
├── <Ensaio/>            trilho horizontal com scroll-snap
├── <Ajuda/>             WhatsApp direto
└── <FolhaPagamento/>    overlay: QR, copia-e-cola, quatro passos
```

---

## Direção visual

```css
--luz:   #FAF8F5   /* fundo — branco quente, quase imperceptível */
--areia: #EDE6DD   /* superfícies secundárias */
--mare:  #26333A   /* azul-ardósia dos costões — blocos escuros e botões */
--onda:  #55707B   /* rótulos, valores, links */
--tinta: #1F2A2F   /* corpo de texto */
```

Instrument Serif (títulos e nomes) + Instrument Sans (corpo, 17px) + DM Mono (códigos, valores e prazos — tudo que se copia ou se confere).

A paleta saiu das próprias fotos: areia, brancos lavados de sol e o azul-ardósia dos costões em preto e branco. **Nenhuma cor decorativa entra na página.** A cor vem das imagens e a interface fica em silêncio para não brigar com elas.

### As fotos e seus papéis

| Papel | Foto |
|---|---|
| Capa inteira | silhueta dos dois caminhando ao pôr do sol |
| Faixa após o convite | as mãos com as alianças, em P&B |
| Fundo da gravata | os dois frente a frente, P&B, dessaturado a 22% |
| Trilho do ensaio | as seis coloridas, com scroll-snap |

Em produção elas saem do base64 e viram `next/image` servidas de `public/`, com `sizes` correto e placeholder borrado.

---

## Elemento-assinatura: a maré

O progresso da gravata é uma linha de horizonte que sobe: um filete fino atravessando a tela, com um ponto marcando o nível e o valor em serifada grande acima. Sobe uma vez, quando a seção entra na tela, e respeita `prefers-reduced-motion`.

Vem direto do ensaio — todas as fotos têm uma linha de horizonte — e faz a explicação que nenhum texto faria: dá para ver que está enchendo junto com os outros.

**Meta de R$ 3.500, sem teto.** No schema, a gravata é o único presente com `meta_cotas` em null: nunca esgota, nunca devolve "cotas esgotadas" para quem chegou por último. A meta vive em `meta_valor_centavos` e só alimenta a barra, que trava visualmente em 100% enquanto a arrecadação continua subindo.

---

## Presentes — duas listas

### Para a casa
Panelas R$ 450 · Air fryer R$ 500 · Aparelho de jantar R$ 400 · Cafeteira R$ 350 · Lençóis R$ 300 · Faqueiro R$ 300 · Toalhas R$ 200 · Taças R$ 180

### Para a lua de mel
Iglu de vidro R$ 540 (5) · Aurora boreal R$ 260 (6) · Huskies R$ 240 (8) · Balsa até Tallinn R$ 240 (4) · Sauna no Löyly R$ 150 (2) · Rodada de drinks R$ 60 (4) · Valor livre

### A linha que fecha a seção

> *Os presentes são convertidos em valor. A gente compra tudo depois da viagem, com calma — e manda foto de cada um para quem deu.*

Não é ressalva, é promessa — e é o que separa uma lista de cotas normal de algo que constrange no pós-casamento. Com ela, ninguém descobre nada depois.

### Por que este dimensionamento

110 convidados são cerca de **55 famílias**, das quais talvez **30 presenteiam**. Com 37 unidades à venda (8 produtos + 29 cotas) e oferta total de R$ 13.860 contra arrecadação realista de R$ 9.810, a lista fecha em torno de **71% de preenchimento**.

Isso é o ponto. "Restam 2" faz alguém decidir; "restam 12" não move ninguém, e lista que termina vazia desanima quem chega na última semana.

---

## Pagamento

Mercado Pago, Pix e cartão na mesma integração. O CVV nunca toca o servidor — o Card Payment Brick tokeniza no navegador.

Invariantes que valem para as duas formas:

1. **Preço nunca vem do cliente.** `POST /api/pedidos` não aceita campo de valor; lê do banco dentro da função de reserva.
2. **Reserva de cota é atômica.** `reservar_cotas()` faz `UPDATE ... RETURNING` numa chamada; a `check constraint` derruba quem disputar a última cota.
3. **Toda cota reservada tem prazo.** Sem o cron de expiração, Pix abandonado prende estoque para sempre.
4. **Webhook é idempotente por construção** — `unique (psp, evento_id)`, não um `if` no código.
5. **O webhook do Mercado Pago manda só o ID.** O handler sempre consulta `/v1/payments/{id}` antes de confirmar.
6. **Webhook não é fonte única de verdade.** O cron reconcilia todo pendente com mais de 15 minutos.

---

## Acessibilidade — não negociável

- Alvo de toque mínimo de 52px
- Corpo em 17px, títulos fluidos com `clamp()`
- Foco visível de 2px com deslocamento em todo elemento interativo
- Toda animação atrás de `prefers-reduced-motion`
- Nenhuma informação transmitida só por cor
- `inputmode` correto nos campos, `autocomplete="off"` no código do convite

---

## Copy: o que mudou e por quê

| Antes | Depois | Motivo |
|---|---|---|
| "RSVP" | "Você vem?" | Sigla francesa não é vocabulário de convidado |
| "Realizar contribuição" | "Copiar código Pix" | O botão diz o que acontece ao tocar |
| "Depois de tanto tempo juntos" | "Diante de Deus, o sim que vale para sempre" | Vocês namoram desde maio de 2025 — e o altar é o que conta |
| "Dress code: black tie opcional" | "Grama no chão — evite salto fino" | Instrução útil vence etiqueta |
| "Dúvidas? Entre em contato" | "Chama a Luana no WhatsApp" | Uma pessoa concreta responde; um formulário não |

---

## Próximos passos

1. Trocar traje e prazo de RSVP pelos valores reais
2. Escrever a linha sobre o intervalo entre a capela e o sítio
3. Converter o protótipo em componentes React ligados ao schema
4. Fotos reais em `public/`, em WebP
5. Testar num Android antigo, em 4G, ao sol — não no seu celular
