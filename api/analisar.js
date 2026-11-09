// Função do Vercel que analisa o sentimento de uma avaliação.
// Usa o modelo treinado no notebook 2 (TF-IDF + Regressão Logística),
// exportado para data/modelo_sentimento.json.

const MODELO = require('../data/modelo_sentimento.json');

const TEMAS = {
  'Segurança': /\b(?:seguranca|segura|seguro|inseguranca|insegura|inseguro|perigos[oa]|assalt\w*|roub\w*|furt\w*|tranca|destravada|fechadura)\b/,
  'Situações de risco': /\b(?:assedi\w*|cantadas?|importun\w*)\b/,
  'Iluminação': /\b(?:iluminad[oa]s?|iluminacao|escur[oa]s?|pouca luz)\b/,
  'Localização': /\b(?:localizacao|localizad[oa]|bairro|regiao|proximo|perto|longe|isolad[oa]|entorno|rua|centro)\b/,
  'Atendimento': /\b(?:atendimento|funcionari\w*|recepcao|equipe|gerente)\b/,
  'Acolhimento': /\b(?:acolhedor\w*|acolhid[oa]s?|receptiv\w*|atencios\w*|em casa|gentil\w*|carinho\w*|respeit\w*)\b/
};

function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

function analisar(texto) {
  const t = normalizar(texto);
  const palavras = t.match(/\b\w\w+\b/g) || [];
  const contagem = {};
  palavras.forEach(function (p, i) {
    contagem[p] = (contagem[p] || 0) + 1;
    if (i < palavras.length - 1) {
      const par = p + ' ' + palavras[i + 1];
      contagem[par] = (contagem[par] || 0) + 1;
    }
  });
  const termos = Object.keys(contagem).filter(function (k) { return MODELO.pesos[k]; });
  const escores = MODELO.intercepto.slice();
  const raiz = Math.sqrt(termos.length || 1);
  termos.forEach(function (k) {
    const valor = (1 + Math.log(contagem[k])) / raiz;
    MODELO.pesos[k].forEach(function (peso, i) { escores[i] += peso * valor; });
  });
  const maior = Math.max.apply(null, escores);
  const exp = escores.map(function (s) { return Math.exp(s - maior); });
  const soma = exp.reduce(function (a, b) { return a + b; }, 0);
  const melhor = escores.indexOf(maior);
  const probabilidades = {};
  MODELO.classes.forEach(function (c, i) { probabilidades[c] = Math.round(1000 * exp[i] / soma) / 1000; });
  const pistas = termos
    .map(function (k) { return [k, MODELO.pesos[k][melhor]]; })
    .filter(function (p) { return p[1] > 0; })
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 5)
    .map(function (p) { return p[0]; });
  return {
    classe: MODELO.classes[melhor],
    probabilidades: probabilidades,
    pistas: pistas,
    temas: Object.keys(TEMAS).filter(function (k) { return TEMAS[k].test(t); }),
    termos_reconhecidos: termos.length,
    modelo: 'TF-IDF + Regressão Logística'
  };
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'Use POST.' });
  }
  let corpo = req.body;
  if (typeof corpo === 'string') {
    try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; }
  }
  const texto = corpo && typeof corpo.texto === 'string' ? corpo.texto.trim().slice(0, 2000) : '';
  if (texto.length < 3) return res.status(400).json({ erro: 'Envie o texto da avaliação.' });
  return res.status(200).json(analisar(texto));
};

module.exports.analisar = analisar;
