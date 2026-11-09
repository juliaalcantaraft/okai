# Okaí

Viaje sozinha, sinta-se em casa. Protótipo acadêmico da disciplina de Extração e Análise de Dados.

Grupo: Júlia Ferraz, Giovana Couto, Rebeca Bertozzi, Alicia Pizoni e Sofia Bastos.

## Como o projeto está organizado

| Pasta ou arquivo | O que é |
|---|---|
| `index.html` | A página do site |
| `assets/` | Estilos, código, imagens e o mapa |
| `data/` | Dados prontos: hospedagens, cidades, modelo e indicadores |
| `api/analisar.js` | API de análise de sentimento: recebe uma avaliação e devolve sentimento, confiança, temas e palavras-chave |
| `api/okaia.js` | API da OkaIA: conecta o chat ao Gemini |
| `notebooks/` | Notebooks do Colab que geraram os dados |

## Dados

- **Hospedagens:** base pública de CNPJ (CNAE 5510-8/01), limpa no notebook 1.
- **Avaliações:** Brazilian Portuguese Hotel's Reviews Corpus (Mendeley Data, CC BY 4.0), analisado no notebook 2.
- **Indicadores por estado:** 20º Anuário Brasileiro de Segurança Pública (2026).
- **Simulados:** hotéis fictícios, notas, preços e relatos, marcados no site.

## Variáveis no Vercel

| Nome | Valor |
|---|---|
| `GEMINI_API_KEY` | Sua chave do Google AI Studio |
| `GEMINI_MODEL` | Opcional. Padrão: `gemini-3.6-flash` |

Sem a chave, o site funciona normalmente e a OkaIA responde no modo simples.

## API

| Rota | Entrada (POST, JSON) | Saída |
|---|---|---|
| `/api/analisar` | `{"texto": "..."}` | `classe`, `probabilidades`, `temas`, `pistas` |
| `/api/okaia` | `{"mensagens": [{"papel": "eu", "texto": "..."}], "contexto": "..."}` | `texto` |

Se a API não responder, o site usa uma cópia do modelo no navegador e avisa que está no modo reserva.
