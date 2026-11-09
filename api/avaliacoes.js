// Avaliações das viajantes.
// POST: recebe uma avaliação, analisa e guarda como PENDENTE (ninguém vê até ser aprovada).
// GET ?cidade=<código IBGE>: devolve as avaliações APROVADAS daquela cidade.

const { comandos, lerCorpo, semDadosPessoais, publica, credenciais } = require('./_banco.js');
const { analisar } = require('./analisar.js');

const LIMITE_POR_HORA = 5;

module.exports = async function handler(req, res) {
  if (!credenciais()) return res.status(503).json({ erro: 'O banco de dados ainda não foi conectado no Vercel.' });

  try {
    if (req.method === 'GET') {
      const cidade = String((req.query && req.query.cidade) || '').replace(/\D/g, '');
      if (!cidade) return res.status(400).json({ erro: 'Informe a cidade.' });
      const [ids] = await comandos([['LRANGE', 'aprovadas:' + cidade, 0, 29]]);
      if (!ids.length) return res.status(200).json({ avaliacoes: [] });
      const [itens] = await comandos([['MGET'].concat(ids.map(function (i) { return 'aval:' + i; }))]);
      const lista = itens.filter(Boolean).map(function (s) { return publica(JSON.parse(s)); });
      res.setHeader('Cache-Control', 's-maxage=60');
      return res.status(200).json({ avaliacoes: lista });
    }

    if (req.method === 'POST') {
      const corpo = lerCorpo(req);
      const cidade = String(corpo.cidade || '').replace(/\D/g, '').slice(0, 7);
      const nota = Number(corpo.nota);
      const texto = typeof corpo.texto === 'string' ? corpo.texto.trim() : '';
      const hotel = typeof corpo.hotel === 'string' ? corpo.hotel.trim().slice(0, 80) : '';
      if (!cidade || !(nota >= 1 && nota <= 5) || texto.length < 10) return res.status(400).json({ erro: 'Avaliação incompleta.' });
      const sozinha = ['sim', 'nao'].indexOf(corpo.sozinha) >= 0 ? corpo.sozinha : '';
      const perfil = ['mulher', 'homem', 'outro', 'nao_dizer'].indexOf(corpo.perfil) >= 0 ? corpo.perfil : '';
      if (corpo.consentimento !== true) return res.status(400).json({ erro: 'É preciso concordar com a publicação.' });

      const ip = String(req.headers['x-forwarded-for'] || 'sem-ip').split(',')[0].trim();
      const chaveLimite = 'limite:' + ip;
      const [vezes] = await comandos([['INCR', chaveLimite], ['EXPIRE', chaveLimite, 3600]]);
      if (vezes > LIMITE_POR_HORA) return res.status(429).json({ erro: 'Muitas avaliações seguidas. Tente de novo mais tarde.' });

      const limpo = semDadosPessoais(texto.slice(0, 1500));
      const r = analisar(limpo);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const item = { id: id, cidade: cidade, hotel: semDadosPessoais(hotel), nota: nota, texto: limpo, sozinha: sozinha, perfil: perfil, classe: r.classe, temas: r.temas, criada: new Date().toISOString(), status: 'pendente' };
      await comandos([['SET', 'aval:' + id, JSON.stringify(item)], ['LPUSH', 'pendentes', id]]);
      return res.status(201).json({ status: 'pendente', analise: r });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Use GET ou POST.' });
  } catch (e) {
    console.error('Erro no banco de avaliações', e);
    return res.status(502).json({ erro: 'Não foi possível acessar o banco agora.' });
  }
};
