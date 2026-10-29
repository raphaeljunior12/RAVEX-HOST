const http = require('http');
const fs = require('fs');
const path = require('path');

const { obterStatusSistema } = require('../servicos/sistema');
const {
  obterLogsBot
} = require('../servicos/logsBot');
const { autenticar } = require('../servicos/autenticacao');

const {
  criarSessao,
  obterSessao,
  destruirSessao,
  DURACAO_SESSAO_MS
} = require('../servicos/sessoes');

const {
  obterStatusBot,
  listarStatusBots,
  iniciarBot,
  pararBot,
  reiniciarBot,
  removerBotGerenciado
} = require('../servicos/gerenciadorBot');

const {
  obterBot,
  atualizarBot
} = require('../servicos/registroBots');

const {
  adicionarPorDiretorio,
  adicionarPorRepositorio
} = require('../servicos/instaladorBots');

const {
  atualizarBotGit
} = require('../servicos/atualizadorBots');

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

    if (rota === '/api/bots' && req.method === 'GET') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      return responderJSON(res, 200, {
        sucesso: true,
        bots: listarStatusBots()
      });
    }

    if (rota === '/api/bots' && req.method === 'POST') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      try {
        const corpo = await lerJSON(req);

        const tipo = String(
          corpo.tipo || 'git'
        ).trim().toLowerCase();

        let bot;

        if (tipo === 'diretorio') {
          bot = adicionarPorDiretorio({
            nome: corpo.nome,
            diretorio: corpo.diretorio
          });
        } else if (tipo === 'git') {
          bot = await adicionarPorRepositorio({
            nome: corpo.nome,
            repositorio: corpo.repositorio,
            branch: corpo.branch || 'main'
          });
        } else {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Tipo de instalação inválido.'
          });
        }

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem: 'Bot adicionado com sucesso.',
          bot
        });
      } catch (erro) {
        const errosCliente = {
          NOME_INVALIDO:
            'Nome do bot inválido.',
          DIRETORIO_INVALIDO:
            'Diretório do bot inválido.',
          DIRETORIO_NAO_ENCONTRADO:
            'Diretório do bot não encontrado.',
          REPOSITORIO_INVALIDO:
            'Repositório Git inválido.',
          BRANCH_INVALIDA:
            'Branch inválida.',
          BOT_DUPLICADO:
            'Este bot já está cadastrado.',
          DIRETORIO_JA_EXISTE:
            'Já existe uma instalação com este nome.',
          PACKAGE_JSON_NAO_ENCONTRADO:
            'A pasta/repositório não possui package.json.',
          PACKAGE_JSON_INVALIDO:
            'O package.json do bot é inválido.',
          ARQUIVO_INICIAL_INVALIDO:
            'Arquivo inicial do bot inválido.',
          ARQUIVO_INICIAL_NAO_ENCONTRADO:
            'Arquivo inicial do bot não encontrado.'
        };

        if (errosCliente[erro.message]) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: errosCliente[erro.message]
          });
        }

        console.error(
          '❌ Erro ao adicionar bot:',
          erro
        );

        return responderJSON(res, 500, {
          sucesso: false,
          mensagem:
            'Não foi possível adicionar o bot.'
        });
      }
    }

    const rotaConfigurarBot = rota.match(
      /^\/api\/bots\/([a-zA-Z0-9_-]{1,80})$/
    );

    if (
      rotaConfigurarBot &&
      req.method === 'PATCH'
    ) {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      const idBot = rotaConfigurarBot[1];

      try {
        const corpo = await lerJSON(req);

        const botAtual = obterBot(idBot);

        if (!botAtual) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Bot não encontrado.'
          });
        }

        const status = obterStatusBot(idBot);

        if (status.online) {
          return responderJSON(res, 409, {
            sucesso: false,
            mensagem:
              'Pare o bot antes de alterar a configuração.'
          });
        }

        const bot = atualizarBot(idBot, {
          nome: corpo.nome,
          arquivoInicial: corpo.arquivoInicial,
          repositorio: corpo.repositorio,
          branch: corpo.branch
        });

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Configuração atualizada com sucesso.',
          bot
        });
      } catch (erro) {
        const errosCliente = {
          NOME_INVALIDO:
            'Nome do bot inválido.',
          ARQUIVO_INICIAL_INVALIDO:
            'Arquivo inicial inválido.',
          REPOSITORIO_INVALIDO:
            'Repositório Git inválido.',
          BRANCH_INVALIDA:
            'Branch inválida.',
          BOT_DUPLICADO:
            'Já existe outro bot com este nome.'
        };

        if (errosCliente[erro.message]) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: errosCliente[erro.message]
          });
        }

        if (erro.message === 'BOT_NAO_ENCONTRADO') {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Bot não encontrado.'
          });
        }

        console.error(
          '❌ Erro ao configurar bot:',
          erro
        );

        return responderJSON(res, 500, {
          sucesso: false,
          mensagem:
            'Não foi possível configurar o bot.'
        });
      }
    }

    const rotaRemoverBot = rota.match(
      /^\/api\/bots\/([a-zA-Z0-9_-]{1,80})$/
    );

    if (
      rotaRemoverBot &&
      req.method === 'DELETE'
    ) {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      const idBot = rotaRemoverBot[1];

      try {
        const resultado =
          await removerBotGerenciado(idBot);

        if (!resultado.sucesso) {
          return responderJSON(res, 409, resultado);
        }

        return responderJSON(res, 200, resultado);
      } catch (erro) {
        if (
          erro.message === 'BOT_NAO_ENCONTRADO'
        ) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Bot não encontrado.'
          });
        }

        console.error(
          '❌ Erro ao remover bot:',
          erro
        );

        return responderJSON(res, 500, {
          sucesso: false,
          mensagem:
            'Não foi possível remover o bot.'
        });
      }
    }

    const rotaBot = rota.match(
      /^\/api\/bots\/([a-zA-Z0-9_-]{1,80})\/(status|logs|iniciar|parar|reiniciar|atualizar|atualizar-reiniciar)$/
    );

    if (rotaBot) {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      const idBot = rotaBot[1];
      const acao = rotaBot[2];

      try {
        if (
          acao === 'status' &&
          req.method === 'GET'
        ) {
          return responderJSON(
            res,
            200,
            obterStatusBot(idBot)
          );
        }

        if (
          acao === 'logs' &&
          req.method === 'GET'
        ) {
          return responderJSON(res, 200, {
            sucesso: true,
            logs: obterLogsBot(idBot)
          });
        }

        if (
          acao === 'iniciar' &&
          req.method === 'POST'
        ) {
          const resultado = iniciarBot(idBot);

          return responderJSON(
            res,
            resultado.sucesso ? 200 : 409,
            resultado
          );
        }

        if (
          acao === 'parar' &&
          req.method === 'POST'
        ) {
          const resultado = pararBot(idBot);

          return responderJSON(
            res,
            resultado.sucesso ? 200 : 409,
            resultado
          );
        }

        if (
          acao === 'reiniciar' &&
          req.method === 'POST'
        ) {
          const resultado =
            await reiniciarBot(idBot);

          return responderJSON(
            res,
            resultado.sucesso ? 200 : 409,
            resultado
          );
        }

        if (
          acao === 'atualizar' &&
          req.method === 'POST'
        ) {
          const status = obterStatusBot(idBot);

          if (status.online) {
            return responderJSON(res, 409, {
              sucesso: false,
              mensagem:
                'Pare o bot antes de atualizá-lo.'
            });
          }

          const resultado =
            await atualizarBotGit(idBot);

          return responderJSON(
            res,
            200,
            resultado
          );
        }

        if (
          acao === 'atualizar-reiniciar' &&
          req.method === 'POST'
        ) {
          const statusAntes =
            obterStatusBot(idBot);

          if (statusAntes.online) {
            const parada = pararBot(idBot);

            if (!parada.sucesso) {
              return responderJSON(
                res,
                409,
                parada
              );
            }

            const limite = Date.now() + 10000;

            while (
              obterStatusBot(idBot).online &&
              Date.now() < limite
            ) {
              await new Promise(resolve =>
                setTimeout(resolve, 250)
              );
            }

            if (obterStatusBot(idBot).online) {
              return responderJSON(res, 409, {
                sucesso: false,
                mensagem:
                  'O bot não encerrou dentro do tempo esperado.'
              });
            }
          }

          await atualizarBotGit(idBot);

          const resultado =
            iniciarBot(idBot);

          return responderJSON(
            res,
            resultado.sucesso ? 200 : 409,
            resultado
          );
        }

        return responderJSON(res, 405, {
          sucesso: false,
          mensagem:
            'Método não permitido para esta rota.'
        });
      } catch (erro) {
        if (
          erro.message === 'BOT_NAO_ENCONTRADO'
        ) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Bot não encontrado.'
          });
        }

        if (
          erro.message === 'BOT_SEM_REPOSITORIO'
        ) {
          return responderJSON(res, 409, {
            sucesso: false,
            mensagem:
              'Este bot não possui repositório Git configurado.'
          });
        }

        if (
          erro.message === 'REPOSITORIO_GIT_NAO_ENCONTRADO'
        ) {
          return responderJSON(res, 409, {
            sucesso: false,
            mensagem:
              'A pasta deste bot não é um repositório Git.'
          });
        }

        if (
          erro.message === 'DIRETORIO_NAO_ENCONTRADO'
        ) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem:
              'Diretório do bot não encontrado.'
          });
        }

        if (
          erro.message === 'ID_BOT_INVALIDO'
        ) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: 'ID do bot inválido.'
          });
        }

        console.error(
          `❌ Erro na ação ${acao} do bot ${idBot}:`,
          erro
        );

        return responderJSON(res, 500, {
          sucesso: false,
          mensagem:
            'Erro interno ao processar a ação do bot.'
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
