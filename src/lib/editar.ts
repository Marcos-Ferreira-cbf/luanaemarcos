/**
 * Salva a correção de um convidado e devolve a mensagem de erro, ou null se
 * deu certo — o formato que o CampoEditavel espera.
 *
 * Vive fora dos dois painéis porque os dois editam a mesma coisa: o painel de
 * padrinhos e a aba de convites mexem na mesma tabela, e duplicar o fetch
 * garantiria que um dia as duas telas tratassem o mesmo erro de jeitos
 * diferentes.
 */
export async function editarConvidado(
  id: string,
  dados: { nome?: string; whatsapp?: string },
): Promise<string | null> {
  try {
    const r = await fetch("/api/admin/convidados", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...dados }),
    });
    if (r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return d.erro ?? "não deu para salvar";
  } catch {
    return "sem conexão";
  }
}
