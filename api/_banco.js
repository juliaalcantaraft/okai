// Acesso ao banco de dados (Upstash Redis, criado pela aba Storage do Vercel).
// Arquivos de api/ que começam com "_" não viram rotas.

const crypto = require('crypto');

function credenciais() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token: token } : null;
}

// Envia vários comandos de uma vez e devolve os resultados na mesma ordem.
async function comandos(lista) {
  const c = credenciais();
  if (!c) throw Object.assign(new Error('sem banco'), { semBanco: true });
  const resposta = await fetch(c.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(lista)
  });
  if (!resposta.ok) throw new Error('banco respondeu ' + resposta.status);
  const dados = await resposta.json();
  return dados.map(function (d) {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

function lerCorpo(req) {
  let corpo = req.body;
  if (typeof corpo === 'string') {
    try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; }
  }
  return corpo || {};
}

// Remove e-mails e telefones antes de guardar o texto.
function semDadosPessoais(texto) {
  return String(texto)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[removido]')
    .replace(/(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[removido]');
}

function senhaCerta(req) {
  const certa = process.env.MODERACAO_SENHA;
  const enviada = req.headers['x-okai-senha'];
  if (!certa || typeof enviada !== 'string') return false;
  const a = crypto.createHash('sha256').update(certa).digest();
  const b = crypto.createHash('sha256').update(enviada).digest();
  return crypto.timingSafeEqual(a, b);
}

function publica(x) {
  return { id: x.id, cidade: x.cidade, hotel: x.hotel, nota: x.nota, texto: x.texto, classe: x.classe, temas: x.temas, mes: x.criada.slice(0, 7) };
}

module.exports = { comandos, lerCorpo, semDadosPessoais, senhaCerta, publica, credenciais };
