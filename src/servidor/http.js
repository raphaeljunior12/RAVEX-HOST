const http = require('http');
const fs = require('fs');
const path = require('path');

const { obterStatusSistema } = require('../servicos/sistema');
const { obterLogs } = require('../servicos/logsBot');
const { autenticar } = require('../servicos/autenticacao');

const {
  criarSessao,
  obterSessao,
  destruirSessao,
  DURACAO_SESSAO_MS
} = require('../servicos/sessoes');

const {
  obterStatusBot,
  iniciarBot,
  pararBot,
  reiniciarBot
} = require('../servicos/gerenciadorBot');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;

const RAIZ_PUBLICA = path.join(
  __dirname,
  '..',
  '..',
  'public'
);

const ARQUIVO_INDEX = path.join(RAIZ_PUBLICA, 'index.html');
const ARQUIVO_LOGIN = path.join(RAIZ_PUBLICA, 'login.html');

function responderJSON(res, status, dados) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  return res.end(JSON.stringify(dados));
}

function servirArquivo(res, arquivo, tipo) {
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      });

      return res.end('Erro ao carregar o arquivo.');
    }

    res.writeHead(200, {
      'Content-Type': tipo,
      'Cache-Control': 'no-store'
    });

    return res.end(conteudo);
  });
}

function obterCookies(req) {
  const cabecalho = req.headers.cookie || '';
  const cookies = {};

  for (const parte of cabecalho.split(';')) {
    const indice = parte.indexOf('=');

    if (indice === -1) {
      continue;
    }

    const nome = parte.slice(0, indice).trim();
    const valor = parte.slice(indice + 1).trim();

    if (!nome) {
      continue;
    }

    try {
      cookies[nome] = decodeURIComponent(valor);
    } catch {
      cookies[nome] = valor;
    }
  }

  return cookies;
}

function obterTokenSessao(req) {
  return obterCookies(req).ravex_host_session || null;
}

function estaAutenticado(req) {
  const token = obterTokenSessao(req);
  return Boolean(obterSessao(token));
}

function exigirAutenticacao(req, res) {
  if (estaAutenticado(req)) {
    return true;
  }

  responderJSON(res, 401, {
    sucesso: false,
    mensagem: 'Autenticação necessária.'
  });

  return false;
}

function lerJSON(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    let tamanho = 0;
    const LIMITE = 16 * 1024;

    req.setEncoding('utf8');

    req.on('data', (parte) => {
      tamanho += Buffer.byteLength(parte, 'utf8');

      if (tamanho > LIMITE) {
        reject(new Error('PAYLOAD_MUITO_GRANDE'));
        req.destroy();
        return;
      }

      corpo += parte;
    });

    req.on('end', () => {
      if (!corpo) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(corpo));
      } catch {
        reject(new Error('JSON_INVALIDO'));
      }
    });

    req.on('error', reject);
  });
}

function criarCookieSessao(token) {
  const maxAge = Math.floor(DURACAO_SESSAO_MS / 1000);

  return [
    `ravex_host_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`
  ].join('; ');
}

function criarCookieLogout() {
  return [
    'ravex_host_session=',
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0'
  ].join('; ');
}

function iniciarServidor() {
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    const rota = url.pathname;

    if (rota === '/api/login' && req.method === 'POST') {
      try {
        const corpo = await lerJSON(req);

        const usuario = String(corpo.usuario || '');
        const senha = String(corpo.senha || '');

        if (!autenticar(usuario, senha)) {
          return responderJSON(res, 401, {
            sucesso: false,
            mensagem: 'Usuário ou senha incorretos.'
          });
        }

        const sessao = criarSessao();

        res.setHeader(
          'Set-Cookie',
          criarCookieSessao(sessao.token)
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Login realizado com sucesso.'
        });
      } catch (erro) {
        if (erro.message === 'PAYLOAD_MUITO_GRANDE') {
          return responderJSON(res, 413, {
            sucesso: false,
            mensagem: 'Requisição muito grande.'
          });
        }

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem: 'Dados de login inválidos.'
        });
      }
    }

    if (rota === '/api/logout' && req.method === 'POST') {
      const token = obterTokenSessao(req);

      destruirSessao(token);

      res.setHeader(
        'Set-Cookie',
        criarCookieLogout()
      );

      return responderJSON(res, 200, {
        sucesso: true,
        mensagem: 'Sessão encerrada.'
      });
    }

    if (rota === '/login' && req.method === 'GET') {
      if (estaAutenticado(req)) {
        res.writeHead(302, {
          Location: '/',
          'Cache-Control': 'no-store'
        });

        return res.end();
      }

      return servirArquivo(
        res,
        ARQUIVO_LOGIN,
        'text/html; charset=utf-8'
      );
    }

    if (rota === '/css/painel.css' && req.method === 'GET') {
      return servirArquivo(
        res,
        path.join(RAIZ_PUBLICA, 'css', 'painel.css'),
        'text/css; charset=utf-8'
      );
    }

    if (rota === '/js/login.js' && req.method === 'GET') {
      return servirArquivo(
        res,
        path.join(RAIZ_PUBLICA, 'js', 'login.js'),
        'application/javascript; charset=utf-8'
      );
    }

    if (rota === '/' && req.method === 'GET') {
      if (!estaAutenticado(req)) {
        res.writeHead(302, {
          Location: '/login',
          'Cache-Control': 'no-store'
        });

        return res.end();
      }

      return servirArquivo(
        res,
        ARQUIVO_INDEX,
        'text/html; charset=utf-8'
      );
    }

    if (rota === '/js/painel.js' && req.method === 'GET') {
      if (!estaAutenticado(req)) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      return servirArquivo(
        res,
        path.join(RAIZ_PUBLICA, 'js', 'painel.js'),
        'application/javascript; charset=utf-8'
      );
    }

    if (rota === '/api/status' && req.method === 'GET') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      return responderJSON(
        res,
        200,
        obterStatusSistema()
      );
    }

    if (rota === '/api/bot/status' && req.method === 'GET') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      return responderJSON(
        res,
        200,
        obterStatusBot()
      );
    }

    if (rota === '/api/bot/logs' && req.method === 'GET') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      return responderJSON(res, 200, {
        sucesso: true,
        logs: obterLogs()
      });
    }

    if (rota === '/api/bot/iniciar' && req.method === 'POST') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      const resultado = iniciarBot();

      return responderJSON(
        res,
        resultado.sucesso ? 200 : 409,
        resultado
      );
    }

    if (rota === '/api/bot/parar' && req.method === 'POST') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      const resultado = pararBot();

      return responderJSON(
        res,
        resultado.sucesso ? 200 : 409,
        resultado
      );
    }

    if (rota === '/api/bot/reiniciar' && req.method === 'POST') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      try {
        const resultado = await reiniciarBot();

        return responderJSON(
          res,
          resultado.sucesso ? 200 : 409,
          resultado
        );
      } catch (erro) {
        console.error(
          '❌ Erro ao reiniciar RAVEX-BOT:',
          erro
        );

        return responderJSON(res, 500, {
          sucesso: false,
          mensagem:
            'Erro interno ao reiniciar o RAVEX-BOT.'
        });
      }
    }

    return responderJSON(res, 404, {
      erro: 'Rota não encontrada'
    });
  });

  servidor.on('error', (erro) => {
    if (erro.code === 'EADDRINUSE') {
      console.error(
        `❌ A porta ${PORT} já está sendo utilizada.`
      );
      return;
    }

    console.error(
      '❌ Erro no servidor RAVEX-HOST:',
      erro
    );
  });

  servidor.listen(PORT, HOST, () => {
    console.log('╔════════════════════════════════════╗');
    console.log('║          ⚡ RAVEX-HOST ⚡         ║');
    console.log('╚════════════════════════════════════╝');
    console.log(`🌐 Servidor: http://${HOST}:${PORT}`);
    console.log('🔐 Painel: protegido por autenticação');
    console.log('🟢 Status: ONLINE');
  });

  return servidor;
}

module.exports = iniciarServidor;
