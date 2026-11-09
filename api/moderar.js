// Moderação das avaliações. Exige a senha da variável MODERACAO_SENHA,
// enviada no cabeçalho "x-okai-senha".
// GET: lista as pendentes e as publicadas. POST {id, acao: "aprovar" | "recusar" | "remover"}.

const { comandos, lerCorpo, senhaCerta, credenciais } = require('./_banco.js');

module.exports = async function handler(req, res) {
  if (!credenciais()) return res.status(503).json({ erro: 'O banco de dados ainda não foi conectado no Vercel.' });
  if (!process.env.MODERACAO_SENHA) return res.status(503).json({ erro: 'Falta a variável MODERACAO_SENHA no Vercel.' });
  if (!senhaCerta(req)) return res.status(401).json({ erro: 'Senha incorreta.' });

  try {
    if (req.method === 'GET') {
      const [pend, aprov] = await comandos([['LRANGE', 'pendentes', 0, 99], ['LRANGE', 'aprovadas', 0, 499]]);
      async function ler(ids) {
        if (!ids.length) return [];
        const [itens] = await comandos([['MGET'].concat(ids.map(function (i) { return 'aval:' + i; }))]);
        return itens.filter(Boolean).map(function (s) { return JSON.parse(s); });
      }
      const pendentes = await ler(pend), aprovadas = await ler(aprov);
      const resumo = { aprovadas: aprovadas.length, mulheres_sozinhas: aprovadas.filter(function (x) { return x.sozinha === 'sim' && x.perfil === 'mulher'; }).length };
      return res.status(200).json({ pendentes: pendentes, aprovadas: aprovadas.slice(0, 50), resumo: resumo });
    }

    if (req.method === 'POST') {
      const corpo = lerCorpo(req);
      const id = String(corpo.id || '').replace(/[^a-z0-9]/g, '');
      if (!id || ['aprovar', 'recusar', 'remover'].indexOf(corpo.acao) < 0) return res.status(400).json({ erro: 'Pedido inválido.' });
      const [s] = await comandos([['GET', 'aval:' + id]]);
      if (!s) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
      const item = JSON.parse(s);
      if (corpo.acao === 'aprovar') {
        item.status = 'aprovada';
        await comandos([['SET', 'aval:' + id, JSON.stringify(item)], ['LREM', 'pendentes', 0, id], ['LPUSH', 'aprovadas:' + item.cidade, id], ['LPUSH', 'aprovadas', id]]);
      } else {
        await comandos([['DEL', 'aval:' + id], ['LREM', 'pendentes', 0, id], ['LREM', 'aprovadas:' + item.cidade, 0, id], ['LREM', 'aprovadas', 0, id]]);
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Use GET ou POST.' });
  } catch (e) {
    console.error('Erro na moderação', e);
    return res.status(502).json({ erro: 'Não foi possível acessar o banco agora.' });
  }
};
