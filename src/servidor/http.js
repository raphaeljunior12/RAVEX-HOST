const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { obterStatusSistema } = require('../servicos/sistema');
const {
  obterLogsBot
} = require('../servicos/logsBot');
const { autenticar } = require('../servicos/autenticacao');

const {
  cadastrarUsuario
} = require('../servicos/cadastro');

const {
  autenticarConta,
  obterContaPorId,
  atualizarPerfil,
  atualizarAvatar
} = require('../servicos/contas');

const {
  salvarAvatar,
  obterAvatar,
  removerAvatar
} = require('../servicos/avatars');

const {
  obterStatusLicenca,
  temLicencaAtiva
} = require('../servicos/licencas');

const {
  criarSessao,
  obterSessao,
  registrarAtividade,
  listarPresencas,
  destruirSessao,
  DURACAO_SESSAO_MS
} = require('../servicos/sessoes');

const {
  emailAutorizado,
  numeroAutorizado,
  gerarCodigo,
  verificarCodigo,
  invalidarCodigo
} = require('../servicos/codigoAcesso');

const {
  enviarCodigoProprietario,
  enviarCodigoConfirmacaoUsuario
} = require('../servicos/email');

const {
  gerarCodigoConfirmacao,
  verificarCodigoConfirmacao,
  invalidarConfirmacaoEmail
} = require('../servicos/confirmacaoEmail');

const {
  criarCadastroPendente,
  obterCadastroPendente,
  removerCadastroPendente
} = require('../servicos/cadastrosPendentes');

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

const {
  listarTickets,
  listarTicketsConta,
  criarTicket,
  atualizarStatusTicket,
  contarTicketsAbertos
} = require('../servicos/tickets');

const {
  listarClientesAdmin,
  listarBotsAdmin,
  listarLicencasAdmin,
  listarCodigosAdmin,
  obterResumoAdmin,
  pesquisarAdmin
} = require('../servicos/administracao');

const {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  removerProduto,
  solicitarAluguel,
  listarAlugueis,
  criarSubmissaoBotAluguel,
  listarSubmissoes,
  decidirSubmissao
} = require('../servicos/marketplace');

const {
  listarNovidades,
  criarNovidade,
  atualizarNovidade,
  removerNovidade
} = require('../servicos/novidades');

const {
  gerarCodigoAluguel,
  consumirCodigoAluguel,
  validarConfirmacaoAluguel
} = require('../servicos/codigosAluguel');

const {
  gerarCodigoLicenca
} = require('../servicos/codigosLicenca');

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

function validarChaveRavexBot(req) {
  const esperada = String(
    process.env.RAVEX_BOT_API_KEY || ''
  );

  const recebida = String(
    req.headers['x-ravex-bot-key'] || ''
  );

  if (!esperada || !recebida) {
    return false;
  }

  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(recebida, 'utf8');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
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

function obterSessaoAtual(req) {
  const token = obterTokenSessao(req);

  if (!token) {
    return null;
  }

  const sessao = obterSessao(token);

  if (!sessao) {
    return null;
  }

  registrarAtividade(token);

  return sessao;
}

function estaAutenticado(req) {
  return Boolean(obterSessaoAtual(req));
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

function exigirLicencaAtiva(req, res) {
  const sessao = obterSessaoAtual(req);

  if (!sessao) {
    responderJSON(res, 401, {
      sucesso: false,
      mensagem: 'Autenticação necessária.'
    });

    return false;
  }

  if (sessao.tipo === 'proprietario') {
    return true;
  }

  if (
    !sessao.contaId ||
    !temLicencaAtiva(sessao.contaId)
  ) {
    responderJSON(res, 403, {
      sucesso: false,
      codigo: 'LICENCA_INATIVA',
      mensagem:
        'Sua licença RAVEX-HOST está inativa ou expirada.',
      renovacaoNecessaria: true
    });

    return false;
  }

  return true;
}

function podeAcessarBot(sessao, bot) {
  if (!sessao || !bot) {
    return false;
  }

  if (sessao.tipo === 'proprietario') {
    return true;
  }

  if (!sessao.contaId || !bot.contaId) {
    return false;
  }

  return (
    String(bot.contaId) ===
    String(sessao.contaId)
  );
}

function obterBotAutorizado(req, idBot) {
  const sessao = obterSessaoAtual(req);

  if (!sessao) {
    return {
      autorizado: false,
      motivo: 'NAO_AUTENTICADO',
      bot: null,
      sessao: null
    };
  }

  const bot = obterBot(idBot);

  if (!bot) {
    return {
      autorizado: false,
      motivo: 'BOT_NAO_ENCONTRADO',
      bot: null,
      sessao
    };
  }

  if (!podeAcessarBot(sessao, bot)) {
    return {
      autorizado: false,
      motivo: 'SEM_PERMISSAO',
      bot: null,
      sessao
    };
  }

  return {
    autorizado: true,
    motivo: null,
    bot,
    sessao
  };
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

function lerBinario(req, limite = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tamanho = 0;
    let encerrado = false;

    req.on('data', parte => {
      if (encerrado) {
        return;
      }

      tamanho += parte.length;

      if (tamanho > limite) {
        encerrado = true;
        reject(new Error('PAYLOAD_MUITO_GRANDE'));
        req.destroy();
        return;
      }

      partes.push(parte);
    });

    req.on('end', () => {
      if (encerrado) {
        return;
      }

      resolve(Buffer.concat(partes));
    });

    req.on('error', erro => {
      if (!encerrado) {
        reject(erro);
      }
    });
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

    if (
      rota === '/api/integracao/bot/codigos' &&
      req.method === 'POST'
    ) {
      if (!validarChaveRavexBot(req)) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Acesso não autorizado.'
        });
      }

      try {
        const corpo = await lerJSON(req);
        const dias = Number(corpo.dias);
        const usuarios = Number(corpo.usuarios);

        if (
          !Number.isInteger(dias) ||
          dias < 1 ||
          dias > 999
        ) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: 'Os dias devem estar entre 1 e 999.'
          });
        }

        if (
          !Number.isInteger(usuarios) ||
          usuarios < 1 ||
          usuarios > 999
        ) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: 'Os utilizadores devem estar entre 1 e 999.'
          });
        }

        const resultado = gerarCodigoLicenca({
          dias,
          usuarios,
          plano: 'RAVEX-HOST'
        });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem: 'Código RAVEX-HOST criado com sucesso.',
          ...resultado
        });
      } catch (erro) {
        console.error(
          '[RAVEX-HOST] Erro na geração integrada de código:',
          erro.message
        );

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem: 'Não foi possível gerar o código.'
        });
      }
    }



    if (
      rota === '/api/cadastro/solicitar-confirmacao' &&
      req.method === 'POST'
    ) {
      let cadastroPendente = null;

      try {
        const corpo = await lerJSON(req);

        cadastroPendente =
          criarCadastroPendente({
            nome: corpo.nome,
            username: corpo.username,
            email: corpo.email,
            senha: corpo.senha,
            confirmarSenha:
              corpo.confirmarSenha,
            codigo: corpo.codigo
          });

        const confirmacao =
          gerarCodigoConfirmacao(
            cadastroPendente.email
          );

        try {
          await enviarCodigoConfirmacaoUsuario({
            destino: cadastroPendente.email,
            codigo: confirmacao.codigo
          });
        } catch (erroEmail) {
          invalidarConfirmacaoEmail(
            cadastroPendente.email
          );

          removerCadastroPendente(
            cadastroPendente.id
          );

          console.error(
            '[RAVEX-HOST] Falha ao enviar ' +
            'confirmação de cadastro:',
            erroEmail.message
          );

          return responderJSON(res, 502, {
            sucesso: false,
            mensagem:
              'Não foi possível enviar o ' +
              'código de confirmação.'
          });
        }

        return responderJSON(res, 200, {
          sucesso: true,

          mensagem:
            'Enviámos um código de 6 dígitos ' +
            'para o teu e-mail.',

          verificacaoId:
            cadastroPendente.id,

          expiraEm:
            confirmacao.expiraEm
        });
      } catch (erro) {
        if (
          cadastroPendente &&
          cadastroPendente.id
        ) {
          removerCadastroPendente(
            cadastroPendente.id
          );
        }

        const mensagens = {
          SENHAS_DIFERENTES:
            'As senhas não são iguais.',

          CODIGO_OBRIGATORIO:
            'Informe o código de acesso.',

          CODIGO_INVALIDO_OU_ESGOTADO:
            'Código de acesso inválido ou esgotado.',

          EMAIL_INVALIDO:
            'E-mail inválido.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível iniciar o cadastro.'
        });
      }
    }

    if (
      rota === '/api/cadastro/confirmar-email' &&
      req.method === 'POST'
    ) {
      try {
        const corpo = await lerJSON(req);

        const verificacaoId = String(
          corpo.verificacaoId || ''
        ).trim();

        const codigoEmail = String(
          corpo.codigoEmail || ''
        ).trim();

        if (!verificacaoId) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Identificação da confirmação inválida.'
          });
        }

        if (!/^\d{6}$/.test(codigoEmail)) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Informe o código de 6 dígitos.'
          });
        }

        const pendente =
          obterCadastroPendente(
            verificacaoId
          );

        if (!pendente) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Esta confirmação expirou ou ' +
              'não existe. Solicite um novo código.'
          });
        }

        const codigoCorreto =
          verificarCodigoConfirmacao(
            pendente.email,
            codigoEmail
          );

        if (!codigoCorreto) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Código de confirmação inválido ' +
              'ou expirado.'
          });
        }

        /*
         * Somente agora criamos a conta.
         * cadastrarUsuario valida novamente
         * o código RAVEX e só depois o consome.
         */
        const resultado =
          await cadastrarUsuario({
            nome: pendente.nome,
            username: pendente.username,
            email: pendente.email,
            senha: pendente.senha,
            confirmarSenha:
              pendente.confirmarSenha,
            codigo: pendente.codigo
          });

        removerCadastroPendente(
          verificacaoId
        );

        return responderJSON(res, 201, {
          sucesso: true,

          mensagem:
            'E-mail confirmado. Conta criada ' +
            'e acesso ativado com sucesso.',

          conta: resultado.conta,

          licenca: {
            plano:
              resultado.licenca.plano,

            status:
              resultado.licenca.status,

            diasRestantes:
              resultado.licenca.diasRestantes,

            ativadoEm:
              resultado.licenca.ativadoEm,

            expiraEm:
              resultado.licenca.expiraEm
          }
        });
      } catch (erro) {
        const mensagens = {
          SENHAS_DIFERENTES:
            'As senhas não são iguais.',

          CODIGO_OBRIGATORIO:
            'Informe o código de acesso.',

          CODIGO_INVALIDO_OU_ESGOTADO:
            'O código RAVEX tornou-se inválido ' +
            'ou ficou sem vagas.',

          CODIGO_INVALIDO:
            'Código de acesso inválido.',

          CODIGO_ESGOTADO:
            'Este código não possui mais vagas.',

          NOME_INVALIDO:
            'Nome completo inválido.',

          USERNAME_INVALIDO:
            'Username inválido.',

          EMAIL_INVALIDO:
            'E-mail inválido.',

          SENHA_INVALIDA:
            'A senha deve possuir entre ' +
            '8 e 128 caracteres.',

          EMAIL_JA_CADASTRADO:
            'Este e-mail já possui uma conta.',

          USERNAME_JA_CADASTRADO:
            'Este username já está em uso.'
        };

        console.error(
          '[RAVEX-HOST] Erro ao concluir cadastro:',
          erro.message
        );

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível concluir o cadastro.'
        });
      }
    }

    if (
      rota === '/api/cadastro' &&
      req.method === 'POST'
    ) {
      return responderJSON(res, 410, {
        sucesso: false,
        mensagem:
          'O cadastro direto foi desativado. ' +
          'Confirme primeiro o seu e-mail.'
      });
    }

    if (
      rota === '/api/proprietario/solicitar' &&
      req.method === 'POST'
    ) {
      let email = '';

      try {
        const corpo = await lerJSON(req);

        email = String(
          corpo.email || ''
        ).trim().toLowerCase();

        const numero = String(
          corpo.numero || ''
        ).trim();

        if (!email || !numero) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem:
              'Informe o e-mail e o número do proprietário.'
          });
        }

        if (
          !emailAutorizado(email) ||
          !numeroAutorizado(numero)
        ) {
          return responderJSON(res, 401, {
            sucesso: false,
            mensagem: 'Acesso não autorizado.'
          });
        }

        const codigo = gerarCodigo(email);

        try {
          await enviarCodigoProprietario({
            destino: email,
            codigo
          });
        } catch (erroEmail) {
          invalidarCodigo(email);

          console.error(
            '❌ Falha ao enviar código do proprietário:',
            erroEmail.code || erroEmail.message
          );

          return responderJSON(res, 503, {
            sucesso: false,
            mensagem:
              'Envio do código temporariamente indisponível.'
          });
        }

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Código de confirmação enviado por e-mail.'
        });
      } catch (erro) {
        if (email) {
          invalidarCodigo(email);
        }

        if (erro.message === 'PAYLOAD_MUITO_GRANDE') {
          return responderJSON(res, 413, {
            sucesso: false,
            mensagem: 'Requisição muito grande.'
          });
        }

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            'Não foi possível solicitar o acesso.'
        });
      }
    }

    if (
      rota === '/api/proprietario/confirmar' &&
      req.method === 'POST'
    ) {
      try {
        const corpo = await lerJSON(req);

        const email = String(
          corpo.email || ''
        ).trim().toLowerCase();

          const numero = String(
            corpo.numero || ''
          ).trim();

        const codigo = String(
          corpo.codigo || ''
        ).trim();

          if (!email || !numero || !codigo) {
          return responderJSON(res, 400, {
            sucesso: false,
              mensagem: 'Informe o e-mail, o número e o código.'
          });
        }

          if (
            !emailAutorizado(email) ||
            !numeroAutorizado(numero)
          ) {
          return responderJSON(res, 401, {
            sucesso: false,
            mensagem: 'Acesso não autorizado.'
          });
        }

        const valido = verificarCodigo(
          email,
          codigo
        );

        if (!valido) {
          return responderJSON(res, 401, {
            sucesso: false,
            mensagem:
              'Código inválido, expirado ou bloqueado.'
          });
        }

        const sessao = criarSessao({
          contaId: null,
          tipo: 'proprietario'
        });

        res.setHeader(
          'Set-Cookie',
          criarCookieSessao(sessao.token)
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Acesso de proprietário confirmado.',

          proprietario: {
            tipo: 'proprietario'
          },

          sessao: {
            expiraEm: sessao.expiraEm
          }
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
          mensagem:
            'Não foi possível confirmar o acesso.'
        });
      }
    }

    if (rota === '/api/login' && req.method === 'POST') {
      try {
        const corpo = await lerJSON(req);

        const email = String(corpo.email || '').trim();
        const senha = String(corpo.senha || '');

        if (!email || !senha) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: 'Informe o e-mail e a senha.'
          });
        }

        const conta = await autenticarConta(
          email,
          senha
        );

        if (!conta) {
          return responderJSON(res, 401, {
            sucesso: false,
            mensagem: 'E-mail ou senha incorretos.'
          });
        }

        const licenca = obterStatusLicenca(
          conta.id
        );

        const sessao = criarSessao({
          contaId: conta.id,
          tipo: conta.tipo || 'usuario'
        });

        res.setHeader(
          'Set-Cookie',
          criarCookieSessao(sessao.token)
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Login realizado com sucesso.',

          conta,

          licenca: {
            ativa: licenca.ativa,
            status: licenca.status,
            plano: licenca.plano || null,
            diasRestantes:
              licenca.diasRestantes,
            ativadoEm:
              licenca.ativadoEm,
            renovadoEm:
              licenca.renovadoEm,
            expiraEm:
              licenca.expiraEm,
            avisoRenovacao:
              licenca.avisoRenovacao
          }
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

    if (
      rota === '/api/proprietario/usuarios-online' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const presencas = listarPresencas();
      const bots = listarStatusBots();

      const contasOnline = new Map();
      let proprietarioOnline = false;

      for (const presenca of presencas) {
        if (presenca.tipo === 'proprietario') {
          proprietarioOnline = true;
          continue;
        }

        if (!presenca.contaId) {
          continue;
        }

        const id = String(presenca.contaId);
        const existente = contasOnline.get(id);

        if (
          !existente ||
          presenca.ultimaAtividade >
            existente.ultimaAtividade
        ) {
          contasOnline.set(id, presenca);
        }
      }

      const usuarios = [];

      for (const [contaId, presenca] of contasOnline) {
        const conta = obterContaPorId(contaId);

        if (!conta) {
          continue;
        }

        const licenca = obterStatusLicenca(contaId);

        const botsOnline = bots.filter((bot) => {
          return (
            bot.online === true &&
            bot.contaId !== null &&
            bot.contaId !== undefined &&
            String(bot.contaId) === contaId
          );
        }).length;

        usuarios.push({
          contaId,
          nome: conta.nome,
          username: conta.username,
          tipo: conta.tipo || 'usuario',
          estado: conta.estado,
          licenca: {
            ativa: Boolean(licenca.ativa),
            status: licenca.status,
            plano: licenca.plano || null,
            expiraEm: licenca.expiraEm || null
          },
          botsOnline,
          sessaoCriadaEm: presenca.criadaEm,
          ultimaAtividade: presenca.ultimaAtividade
        });
      }

      usuarios.sort(
        (a, b) =>
          b.ultimaAtividade - a.ultimaAtividade
      );

      return responderJSON(res, 200, {
        sucesso: true,
        atualizadoEm: Date.now(),
        limiteInatividadeMs: 2 * 60 * 1000,
        totalUsuariosOnline: usuarios.length,
        proprietarioOnline,
        usuarios
      });
    }


    // =====================================================
    // RAVEX-HOST - ADMINISTRACAO COMPLETA
    // =====================================================

    if (rota === '/api/presenca' && req.method === 'GET') {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      return responderJSON(res, 200, {
        sucesso: true,
        agora: Date.now()
      });
    }

    if (
      rota === '/api/proprietario/resumo' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      return responderJSON(res, 200, {
        sucesso: true,
        atualizadoEm: Date.now(),
        resumo: obterResumoAdmin()
      });
    }

    if (
      rota === '/api/proprietario/clientes' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const clientes =
        listarClientesAdmin();

      return responderJSON(res, 200, {
        sucesso: true,
        total: clientes.length,
        clientes
      });
    }

    if (
      rota === '/api/proprietario/bots' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const bots =
        listarBotsAdmin();

      return responderJSON(res, 200, {
        sucesso: true,
        total: bots.length,
        bots
      });
    }

    if (
      rota === '/api/proprietario/licencas' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const licencas =
        listarLicencasAdmin();

      return responderJSON(res, 200, {
        sucesso: true,
        total: licencas.length,
        licencas
      });
    }

    if (
      rota === '/api/proprietario/codigos' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const codigos =
        listarCodigosAdmin();

      return responderJSON(res, 200, {
        sucesso: true,
        total: codigos.length,
        codigos
      });
    }

    if (
      rota === '/api/proprietario/pesquisar' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const termo =
        String(
          url.searchParams.get('q') || ''
        ).slice(0, 120);

      return responderJSON(res, 200, {
        sucesso: true,
        ...pesquisarAdmin(termo)
      });
    }

    // =====================================================
    // RAVEX-HOST - SUPORTE / TICKETS
    // =====================================================

    if (rota === '/api/tickets' && req.method === 'GET') {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo === 'proprietario') {
        return responderJSON(res, 200, {
          sucesso: true,
          tickets: listarTickets()
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'Conta inválida.'
        });
      }

      return responderJSON(res, 200, {
        sucesso: true,
        tickets: listarTicketsConta(
          String(sessao.contaId)
        )
      });
    }

    if (rota === '/api/tickets' && req.method === 'POST') {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (
        sessao.tipo !== 'proprietario' &&
        !sessao.contaId
      ) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'Conta inválida.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const contaId =
          sessao.tipo === 'proprietario'
            ? 'proprietario'
            : String(sessao.contaId);

        const ticket = criarTicket({
          contaId,
          categoria: corpo.categoria,
          assunto: corpo.assunto,
          descricao: corpo.descricao
        });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem:
            'Problema relatado com sucesso.',
          ticket
        });
      } catch (erro) {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            erro.message ||
            'Não foi possível criar o ticket.'
        });
      }
    }

    if (
      rota === '/api/proprietario/tickets' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const tickets = listarTickets();

      return responderJSON(res, 200, {
        sucesso: true,
        total: tickets.length,
        abertos: contarTicketsAbertos(),
        tickets
      });
    }

    const rotaStatusTicket = rota.match(
      /^\/api\/proprietario\/tickets\/([^/]+)$/
    );

    if (
      rotaStatusTicket &&
      req.method === 'PATCH'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const idTicket =
          decodeURIComponent(
            rotaStatusTicket[1]
          );

        const corpo = await lerJSON(req);

        const ticket =
          atualizarStatusTicket(
            idTicket,
            String(corpo.status || '')
          );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Estado do ticket atualizado.',
          ticket
        });
      } catch (erro) {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            erro.message ||
            'Não foi possível atualizar o ticket.'
        });
      }
    }

    if (rota === '/api/minha-conta' && req.method === 'GET') {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo === 'proprietario') {
        return responderJSON(res, 200, {
          sucesso: true,

          conta: {
            id: null,
            nome: 'Proprietário',
            username: 'proprietario',
            email: null,
            tipo: 'proprietario',
            estado: 'ativo',
            criadoEm: null,
            atualizadoEm: null
          },

          licenca: {
            ativa: true,
            status: 'proprietario',
            plano: 'RAVEX-HOST OWNER',
            diasRestantes: null,
            avisoRenovacao: null,
            ativadoEm: null,
            renovadoEm: null,
            expiraEm: null
          }
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Sessão sem conta associada.'
        });
      }

      const conta = obterContaPorId(
        sessao.contaId
      );

      if (!conta) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Conta não encontrada.'
        });
      }

      const licenca = obterStatusLicenca(
        conta.id
      );

      return responderJSON(res, 200, {
        sucesso: true,

        conta: {
          id: conta.id,
          nome: conta.nome,
          username: conta.username,
          email: conta.email,
          avatar: conta.avatar
            ? `/api/avatars/${conta.avatar}`
            : null,
          bio: conta.bio || '',
          pais: conta.pais || '',
          tipo: conta.tipo,
          estado: conta.estado,
          criadoEm: conta.criadoEm,
          atualizadoEm: conta.atualizadoEm
        },

        licenca: {
          ativa: licenca.ativa,
          status: licenca.status,
          plano: licenca.plano || null,
          diasRestantes:
            licenca.diasRestantes,
          avisoRenovacao:
            licenca.avisoRenovacao,
          ativadoEm:
            licenca.ativadoEm,
          renovadoEm:
            licenca.renovadoEm,
          expiraEm:
            licenca.expiraEm
        }
      });
    }

    if (
      rota === '/api/minha-conta' &&
      req.method === 'PATCH'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (
        sessao.tipo === 'proprietario' ||
        !sessao.contaId
      ) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Este perfil não pode ser editado por esta rota.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const conta = atualizarPerfil(
          sessao.contaId,
          {
            nome: corpo.nome,
            username: corpo.username,
            bio: corpo.bio,
            pais: corpo.pais
          }
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Perfil atualizado com sucesso.',
          conta
        });
      } catch (erro) {
        const mensagens = {
          CONTA_INVALIDA:
            'Conta inválida.',
          CONTA_NAO_ENCONTRADA:
            'Conta não encontrada.',
          NOME_INVALIDO:
            'O nome deve ter entre 3 e 100 caracteres.',
          USERNAME_INVALIDO:
            'Username inválido.',
          USERNAME_JA_CADASTRADO:
            'Este username já está em uso.',
          BIO_INVALIDA:
            'A bio pode ter no máximo 240 caracteres.',
          PAIS_INVALIDO:
            'O país pode ter no máximo 80 caracteres.',
          PAYLOAD_MUITO_GRANDE:
            'Requisição muito grande.'
        };

        const status =
          erro.message === 'CONTA_NAO_ENCONTRADA'
            ? 404
            : erro.message === 'PAYLOAD_MUITO_GRANDE'
              ? 413
              : 400;

        return responderJSON(res, status, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível atualizar o perfil.'
        });
      }
    }

    if (
      rota === '/api/minha-conta/avatar' &&
      req.method === 'PUT'
    ) {
      const sessao = obterSessaoAtual(req);

      if (
        !sessao ||
        sessao.tipo === 'proprietario' ||
        !sessao.contaId
      ) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Não é possível alterar este avatar.'
        });
      }

      let novoAvatar = null;

      try {
        const contaAtual = obterContaPorId(
          sessao.contaId
        );

        if (!contaAtual) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Conta não encontrada.'
          });
        }

        const buffer = await lerBinario(req);

        if (!buffer.length) {
          return responderJSON(res, 400, {
            sucesso: false,
            mensagem: 'Nenhuma imagem recebida.'
          });
        }

        novoAvatar = salvarAvatar(
          sessao.contaId,
          buffer
        );

        const conta = atualizarAvatar(
          sessao.contaId,
          novoAvatar.nome
        );

        if (
          contaAtual.avatar &&
          contaAtual.avatar !== novoAvatar.nome
        ) {
          removerAvatar(contaAtual.avatar);
        }

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Foto de perfil atualizada.',
          avatar: novoAvatar.url,
          conta
        });
      } catch (erro) {
        if (novoAvatar?.nome) {
          removerAvatar(novoAvatar.nome);
        }

        const mensagens = {
          PAYLOAD_MUITO_GRANDE:
            'A imagem pode ter no máximo 2 MB.',
          IMAGEM_INVALIDA:
            'Use uma imagem PNG, JPEG ou WebP.',
          CONTA_INVALIDA:
            'Conta inválida.',
          CONTA_NAO_ENCONTRADA:
            'Conta não encontrada.',
          AVATAR_INVALIDO:
            'Avatar inválido.'
        };

        const status =
          erro.message === 'PAYLOAD_MUITO_GRANDE'
            ? 413
            : erro.message === 'CONTA_NAO_ENCONTRADA'
              ? 404
              : 400;

        return responderJSON(res, status, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível atualizar a foto.'
        });
      }
    }

    if (
      rota === '/api/minha-conta/avatar' &&
      req.method === 'DELETE'
    ) {
      const sessao = obterSessaoAtual(req);

      if (
        !sessao ||
        sessao.tipo === 'proprietario' ||
        !sessao.contaId
      ) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Não é possível remover este avatar.'
        });
      }

      try {
        const contaAtual = obterContaPorId(
          sessao.contaId
        );

        if (!contaAtual) {
          return responderJSON(res, 404, {
            sucesso: false,
            mensagem: 'Conta não encontrada.'
          });
        }

        const avatarAnterior =
          contaAtual.avatar || null;

        const conta = atualizarAvatar(
          sessao.contaId,
          null
        );

        if (avatarAnterior) {
          removerAvatar(avatarAnterior);
        }

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Foto de perfil removida.',
          avatar: null,
          conta
        });
      } catch {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            'Não foi possível remover a foto.'
        });
      }
    }

    const rotaAvatar = rota.match(
      /^\/api\/avatars\/([0-9a-f-]+\.(?:png|jpg|webp))$/i
    );

    if (rotaAvatar && req.method === 'GET') {
      const avatar = obterAvatar(
        rotaAvatar[1]
      );

      if (!avatar) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Avatar não encontrado.'
        });
      }

      res.writeHead(200, {
        'Content-Type': avatar.mime,
        'Cache-Control':
          'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff'
      });

      return fs.createReadStream(
        avatar.arquivo
      ).pipe(res);
    }


    // =====================================================
    // RAVEX-HOST - MARKETPLACE API
    // =====================================================

    // Catálogo público para utilizadores autenticados.
    if (
      rota === '/api/marketplace' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      const tipo =
        String(
          url.searchParams.get('tipo') || ''
        )
          .trim()
          .toLowerCase();

      const permitidos = new Set([
        'api',
        'bot-venda',
        'bot-free',
        'script',
        'bot-aluguel'
      ]);

      if (tipo && !permitidos.has(tipo)) {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            'Tipo de produto inválido.'
        });
      }

      const produtos = listarProdutos({
        tipo: tipo || null,
        somenteAtivos:
          sessao.tipo !== 'proprietario'
      });

      return responderJSON(res, 200, {
        sucesso: true,
        total: produtos.length,
        produtos
      });
    }


    // Proprietário adiciona produtos ao catálogo.
    if (
      rota === '/api/proprietario/marketplace' &&
      req.method === 'POST'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const produto = criarProduto({
          tipo: corpo.tipo,
          nome: corpo.nome,
          descricao: corpo.descricao,
          preco: corpo.preco,
          moeda: corpo.moeda,
          gratuito: corpo.gratuito,
          versao: corpo.versao,
          url: corpo.url,
          conteudoPublico:
            corpo.conteudoPublico,
          periodoAluguel:
            corpo.periodoAluguel,
          ativo:
            corpo.ativo !== false
        });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem:
            'Produto adicionado com sucesso.',
          produto
        });
      } catch (erro) {
        const mensagens = {
          TIPO_INVALIDO:
            'Tipo de produto inválido.',
          NOME_INVALIDO:
            'Nome inválido.',
          DESCRICAO_INVALIDA:
            'Descrição inválida.',
          PRECO_INVALIDO:
            'Preço inválido.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível adicionar o produto.'
        });
      }
    }


    // Editar produto.
    const rotaEditarMarketplace =
      rota.match(
        /^\/api\/proprietario\/marketplace\/([^/]+)$/
      );

    if (
      rotaEditarMarketplace &&
      req.method === 'PATCH'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const produto = atualizarProduto(
          decodeURIComponent(
            rotaEditarMarketplace[1]
          ),
          corpo
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Produto atualizado com sucesso.',
          produto
        });
      } catch (erro) {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            erro.message ===
            'PRODUTO_NAO_ENCONTRADO'
              ? 'Produto não encontrado.'
              : 'Não foi possível atualizar o produto.'
        });
      }
    }


    // Remover produto.
    const rotaRemoverMarketplace =
      rota.match(
        /^\/api\/proprietario\/marketplace\/([^/]+)$/
      );

    if (
      rotaRemoverMarketplace &&
      req.method === 'DELETE'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const removido = removerProduto(
          decodeURIComponent(
            rotaRemoverMarketplace[1]
          )
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Produto removido com sucesso.',
          produto: removido
        });
      } catch {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Produto não encontrado.'
        });
      }
    }


    // Cliente solicita aluguel de um bot.
    if (
      rota === '/api/alugueis' &&
      req.method === 'POST'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'É necessária uma conta de cliente.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const pedido = solicitarAluguel({
          produtoId: corpo.produtoId,
          contaId: sessao.contaId,
          grupoWhatsApp:
            corpo.grupoWhatsApp,
          observacao: corpo.observacao
        });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem:
            'Pedido de aluguel enviado.',
          pedido
        });
      } catch {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            'Não foi possível solicitar o aluguel.'
        });
      }
    }


    // Cliente consulta os próprios pedidos.
    if (
      rota === '/api/meus-alugueis' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 200, {
          sucesso: true,
          total: 0,
          alugueis: []
        });
      }

      const alugueis = listarAlugueis({
        contaId: sessao.contaId
      });

      return responderJSON(res, 200, {
        sucesso: true,
        total: alugueis.length,
        alugueis
      });
    }


    // Proprietário consulta todos os alugueis.
    if (
      rota === '/api/proprietario/alugueis' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const alugueis = listarAlugueis();

      return responderJSON(res, 200, {
        sucesso: true,
        total: alugueis.length,
        alugueis
      });
    }


    // Proprietário gera código de autorização.
    if (
      rota ===
        '/api/proprietario/codigos-aluguel' &&
      req.method === 'POST'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const resultado =
          gerarCodigoAluguel({
            validadeMinutos:
              Number(
                corpo.validadeMinutos || 60
              )
          });

        /*
         * O código puro só aparece nesta resposta.
         * O ficheiro persistente guarda apenas o hash.
         */
        return responderJSON(res, 201, {
          sucesso: true,
          codigo: resultado.codigo,
          expiraEm: resultado.expiraEm
        });
      } catch {
        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            'Não foi possível gerar o código.'
        });
      }
    }


    /*
     * Cliente valida/consome o código recebido
     * antes de poder enviar o próprio bot para
     * publicação no catálogo de aluguel.
     */
    if (
      rota === '/api/codigos-aluguel/confirmar' &&
      req.method === 'POST'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'É necessária uma conta de cliente.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const resultado =
          consumirCodigoAluguel({
            codigo: corpo.codigo,
            contaId: sessao.contaId
          });

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            'Código confirmado com sucesso.',
          confirmacaoId: resultado.id
        });
      } catch (erro) {
        const mensagens = {
          CODIGO_INVALIDO:
            'Código de confirmação inválido.',
          CODIGO_JA_USADO:
            'Este código já foi utilizado.',
          CODIGO_EXPIRADO:
            'Este código expirou.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível confirmar o código.'
        });
      }
    }



    // =====================================================
    // RAVEX-HOST - SUBMISSOES DE BOTS PARA ALUGUEL
    // =====================================================

    // Cliente envia o próprio bot para análise.
    if (
      rota === '/api/marketplace/submissoes' &&
      req.method === 'POST'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'É necessária uma conta de cliente.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const confirmacaoId = String(
          corpo.confirmacaoId || ''
        ).trim();

        if (
          !validarConfirmacaoAluguel({
            confirmacaoId,
            contaId: sessao.contaId
          })
        ) {
          return responderJSON(res, 403, {
            sucesso: false,
            mensagem:
              'Confirmação de aluguel inválida para esta conta.'
          });
        }

        const submissao =
          criarSubmissaoBotAluguel({
            contaId: sessao.contaId,
            confirmacaoId,
            nome: corpo.nome,
            descricao: corpo.descricao,
            preco: corpo.preco,
            moeda: corpo.moeda || 'AOA',
            periodoAluguel:
              corpo.periodoAluguel,
            url: corpo.url
          });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem:
            'Bot enviado para análise do proprietário.',
          submissao
        });
      } catch (erro) {
        const mensagens = {
          CONTA_INVALIDA:
            'Conta inválida.',
          NOME_INVALIDO:
            'Nome do bot inválido.',
          DESCRICAO_INVALIDA:
            'Descrição inválida.',
          PRECO_INVALIDO:
            'Preço inválido.',
          CONFIRMACAO_INVALIDA:
            'Confirmação inválida.',
          CONFIRMACAO_JA_USADA:
            'Esta confirmação já foi utilizada numa submissão.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível enviar o bot.'
        });
      }
    }


    // Cliente consulta as próprias submissões.
    if (
      rota === '/api/marketplace/minhas-submissoes' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (!sessao.contaId) {
        return responderJSON(res, 200, {
          sucesso: true,
          total: 0,
          submissoes: []
        });
      }

      const submissoes = listarSubmissoes({
        contaId: sessao.contaId
      });

      return responderJSON(res, 200, {
        sucesso: true,
        total: submissoes.length,
        submissoes
      });
    }


    // Proprietário consulta todas as submissões.
    if (
      rota ===
        '/api/proprietario/marketplace/submissoes' &&
      req.method === 'GET'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      const status = String(
        url.searchParams.get('status') || ''
      ).trim();

      const submissoes = listarSubmissoes({
        status: status || null
      });

      return responderJSON(res, 200, {
        sucesso: true,
        total: submissoes.length,
        submissoes
      });
    }


    // Proprietário aprova ou rejeita uma submissão.
    const rotaDecidirSubmissao = rota.match(
      /^\/api\/proprietario\/marketplace\/submissoes\/([^/]+)$/
    );

    if (
      rotaDecidirSubmissao &&
      req.method === 'PATCH'
    ) {
      const sessao = obterSessaoAtual(req);

      if (!sessao) {
        return responderJSON(res, 401, {
          sucesso: false,
          mensagem: 'Autenticação necessária.'
        });
      }

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const resultado = decidirSubmissao({
          id: decodeURIComponent(
            rotaDecidirSubmissao[1]
          ),
          status: String(
            corpo.status || ''
          ).trim().toLowerCase(),
          motivo: corpo.motivo
        });

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem:
            resultado.submissao.status === 'aprovado'
              ? 'Bot aprovado e publicado para aluguel.'
              : 'Submissão rejeitada.',
          ...resultado
        });
      } catch (erro) {
        const mensagens = {
          STATUS_INVALIDO:
            'Use aprovado ou rejeitado.',
          SUBMISSAO_NAO_ENCONTRADA:
            'Submissão não encontrada.',
          SUBMISSAO_JA_DECIDIDA:
            'Esta submissão já foi analisada.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem:
            mensagens[erro.message] ||
            'Não foi possível analisar a submissão.'
        });
      }
    }



    // ROTA_NOVIDADES_RAVEX

    // Utilizadores autenticados consultam novidades publicadas.
    if (
      rota === '/api/novidades' &&
      req.method === 'GET'
    ) {
      if (!exigirAutenticacao(req, res)) return;

      const sessao = obterSessaoAtual(req);
      const incluirOcultas =
        sessao.tipo === 'proprietario' &&
        url.searchParams.get('todas') === '1';

      const novidades = listarNovidades({
        incluirOcultas
      });

      return responderJSON(res, 200, {
        sucesso: true,
        total: novidades.length,
        novidades
      });
    }

    // Proprietário publica uma novidade.
    if (
      rota === '/api/proprietario/novidades' &&
      req.method === 'POST'
    ) {
      if (!exigirAutenticacao(req, res)) return;

      const sessao = obterSessaoAtual(req);

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const novidade = criarNovidade({
          titulo: corpo.titulo,
          conteudo: corpo.conteudo,
          tipo: corpo.tipo,
          importante: corpo.importante === true,
          publicada: corpo.publicada !== false
        });

        return responderJSON(res, 201, {
          sucesso: true,
          mensagem: 'Novidade criada com sucesso.',
          novidade
        });
      } catch (erro) {
        const mensagens = {
          TITULO_NOVIDADE_INVALIDO: 'O título deve ter pelo menos 3 caracteres.',
          CONTEUDO_NOVIDADE_INVALIDO: 'O conteúdo deve ter pelo menos 3 caracteres.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem: mensagens[erro.message] ||
            'Não foi possível criar a novidade.'
        });
      }
    }

    // Proprietário edita ou oculta uma novidade.
    const rotaEditarNovidade = rota.match(
      /^\/api\/proprietario\/novidades\/([^/]+)$/
    );

    if (
      rotaEditarNovidade &&
      req.method === 'PATCH'
    ) {
      if (!exigirAutenticacao(req, res)) return;

      const sessao = obterSessaoAtual(req);

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const corpo = await lerJSON(req);
        const alteracoes = {};

        for (const campo of [
          'titulo',
          'conteudo',
          'importante',
          'publicada'
        ]) {
          if (Object.prototype.hasOwnProperty.call(corpo, campo)) {
            alteracoes[campo] = corpo[campo];
          }
        }

        const novidade = atualizarNovidade(
          decodeURIComponent(rotaEditarNovidade[1]),
          alteracoes
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Novidade atualizada.',
          novidade
        });
      } catch (erro) {
        const mensagens = {
          NOVIDADE_NAO_ENCONTRADA: 'Novidade não encontrada.',
          TITULO_NOVIDADE_INVALIDO: 'Título inválido.',
          CONTEUDO_NOVIDADE_INVALIDO: 'Conteúdo inválido.'
        };

        return responderJSON(res, 400, {
          sucesso: false,
          mensagem: mensagens[erro.message] ||
            'Não foi possível atualizar a novidade.'
        });
      }
    }

    // Proprietário remove uma novidade.
    const rotaRemoverNovidade = rota.match(
      /^\/api\/proprietario\/novidades\/([^/]+)$/
    );

    if (
      rotaRemoverNovidade &&
      req.method === 'DELETE'
    ) {
      if (!exigirAutenticacao(req, res)) return;

      const sessao = obterSessaoAtual(req);

      if (sessao.tipo !== 'proprietario') {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem: 'Acesso exclusivo do proprietário.'
        });
      }

      try {
        const removida = removerNovidade(
          decodeURIComponent(rotaRemoverNovidade[1])
        );

        return responderJSON(res, 200, {
          sucesso: true,
          mensagem: 'Novidade removida.',
          novidade: removida
        });
      } catch (erro) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Novidade não encontrada.'
        });
      }
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

      const sessao = obterSessaoAtual(req);
      const todosBots = listarStatusBots();

      const bots =
        sessao.tipo === 'proprietario'
          ? todosBots
          : todosBots.filter(
              bot =>
                bot.contaId &&
                String(bot.contaId) ===
                  String(sessao.contaId)
            );

      return responderJSON(res, 200, {
        sucesso: true,
        bots
      });
    }

    if (rota === '/api/bots' && req.method === 'POST') {
      if (!exigirAutenticacao(req, res)) {
        return;
      }

      if (!exigirLicencaAtiva(req, res)) {
        return;
      }

      const sessao = obterSessaoAtual(req);

      if (
        sessao.tipo !== 'proprietario' &&
        !sessao.contaId
      ) {
        return responderJSON(res, 403, {
          sucesso: false,
          mensagem:
            'Sessão sem permissão para hospedar bots.'
        });
      }

      const contaIdBot =
        sessao.tipo === 'proprietario'
          ? null
          : sessao.contaId;

      try {
        const corpo = await lerJSON(req);

        const tipo = String(
          corpo.tipo || 'git'
        ).trim().toLowerCase();

        let bot;

        if (tipo === 'diretorio') {
          bot = adicionarPorDiretorio({
            contaId: contaIdBot,
            nome: corpo.nome,
            diretorio: corpo.diretorio
          });
        } else if (tipo === 'git') {
          bot = await adicionarPorRepositorio({
            contaId: contaIdBot,
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

      if (!exigirLicencaAtiva(req, res)) {
        return;
      }

      const idBot = rotaConfigurarBot[1];

      const acessoBot =
        obterBotAutorizado(req, idBot);

      if (!acessoBot.autorizado) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Bot não encontrado.'
        });
      }

      try {
        const corpo = await lerJSON(req);

        const botAtual = acessoBot.bot;

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

      if (!exigirLicencaAtiva(req, res)) {
        return;
      }

      const idBot = rotaRemoverBot[1];

      const acessoBot =
        obterBotAutorizado(req, idBot);

      if (!acessoBot.autorizado) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Bot não encontrado.'
        });
      }

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

      if (!exigirLicencaAtiva(req, res)) {
        return;
      }

      const idBot = rotaBot[1];
      const acao = rotaBot[2];

      const acessoBot =
        obterBotAutorizado(req, idBot);

      if (!acessoBot.autorizado) {
        return responderJSON(res, 404, {
          sucesso: false,
          mensagem: 'Bot não encontrado.'
        });
      }

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
