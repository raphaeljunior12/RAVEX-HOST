const {
  listarContas,
  obterContaPorId
} = require('./contas');

const {
  listarLicencas,
  obterStatusLicenca
} = require('./licencas');

const {
  listarCodigos
} = require('./codigosLicenca');

const {
  listarBots
} = require('./registroBots');

const {
  listarStatusBots
} = require('./gerenciadorBot');

const {
  listarTickets,
  contarTicketsAbertos
} = require('./tickets');

function texto(valor) {
  return String(valor ?? '');
}

function normalizarBusca(valor) {
  return texto(valor)
    .trim()
    .toLowerCase();
}

function sanitizarConta(conta) {
  if (!conta) return null;

  return {
    id: conta.id,
    nome: conta.nome || '',
    username: conta.username || '',
    email: conta.email || '',
    tipo: conta.tipo || 'usuario',
    estado: conta.estado || 'ativo',
    criadoEm: conta.criadoEm || null,
    atualizadoEm: conta.atualizadoEm || null
  };
}

function listarClientesAdmin() {
  const bots = listarStatusBots();

  return listarContas().map((conta) => {
    const publica = sanitizarConta(conta);
    const licenca = obterStatusLicenca(conta.id);

    const botsConta = bots.filter(
      (bot) =>
        bot.contaId !== undefined &&
        bot.contaId !== null &&
        String(bot.contaId) === String(conta.id)
    );

    return {
      ...publica,

      licenca: {
        ativa: Boolean(licenca.ativa),
        status: licenca.status || null,
        plano: licenca.plano || null,
        expiraEm: licenca.expiraEm || null,
        diasRestantes:
          licenca.diasRestantes ?? null
      },

      bots: {
        total: botsConta.length,
        online: botsConta.filter(
          (bot) => bot.online === true
        ).length
      }
    };
  });
}

function listarBotsAdmin() {
  const registros = listarBots();
  const estados = listarStatusBots();

  return registros.map((bot) => {
    const estado = estados.find(
      (item) => String(item.id) === String(bot.id)
    );

    const conta = bot.contaId
      ? sanitizarConta(
          obterContaPorId(bot.contaId)
        )
      : null;

    return {
      id: bot.id,
      contaId: bot.contaId || null,
      nome: bot.nome || bot.id,
      repositorio: bot.repositorio || null,
      branch: bot.branch || null,
      arquivoInicial:
        bot.arquivoInicial || null,
      criadoEm: bot.criadoEm || null,
      atualizadoEm: bot.atualizadoEm || null,

      online:
        Boolean(estado?.online),

      status:
        estado?.status ||
        (estado?.online ? 'online' : 'offline'),

      iniciadoEm:
        estado?.iniciadoEm || null,

      conta: conta
        ? {
            id: conta.id,
            nome: conta.nome,
            username: conta.username
          }
        : null
    };
  });
}

function listarLicencasAdmin() {
  return listarLicencas().map((licenca) => {
    const conta =
      obterContaPorId(licenca.contaId);

    const status =
      obterStatusLicenca(licenca.contaId);

    return {
      id: licenca.id || null,
      contaId: licenca.contaId,
      plano:
        status.plano ||
        licenca.plano ||
        null,

      ativa: Boolean(status.ativa),
      status: status.status || null,

      ativadoEm:
        status.ativadoEm ||
        licenca.ativadoEm ||
        null,

      renovadoEm:
        status.renovadoEm ||
        licenca.renovadoEm ||
        null,

      expiraEm:
        status.expiraEm ||
        licenca.expiraEm ||
        null,

      diasRestantes:
        status.diasRestantes ?? null,

      conta: conta
        ? {
            id: conta.id,
            nome: conta.nome || '',
            username: conta.username || '',
            email: conta.email || ''
          }
        : null
    };
  });
}

function sanitizarCodigo(registro) {
  /*
   * Não enviamos hash ou qualquer material
   * interno de validação para o navegador.
   */
  const ativadas =
    Array.isArray(registro.contasAtivadas)
      ? registro.contasAtivadas
      : [];

  const limite =
    Number(
      registro.limiteUsuarios ??
      registro.usuarios ??
      registro.limite ??
      1
    ) || 1;

  return {
    id: registro.id || null,
    plano: registro.plano || null,
    dias: Number(registro.dias) || 0,
    status:
      registro.status || 'disponivel',

    limiteUsuarios: limite,
    usuariosAtivados: ativadas.length,
    usuariosRestantes:
      Math.max(0, limite - ativadas.length),

    criadoEm: registro.criadoEm || null,
    esgotadoEm: registro.esgotadoEm || null
  };
}

function listarCodigosAdmin() {
  return listarCodigos()
    .map(sanitizarCodigo);
}

function obterResumoAdmin() {
  const clientes =
    listarClientesAdmin();

  const bots =
    listarBotsAdmin();

  const licencas =
    listarLicencasAdmin();

  const tickets =
    listarTickets();

  const codigos =
    listarCodigosAdmin();

  return {
    clientes: {
      total: clientes.length,
      ativos: clientes.filter(
        (c) => c.estado === 'ativo'
      ).length
    },

    bots: {
      total: bots.length,
      online: bots.filter(
        (b) => b.online
      ).length
    },

    licencas: {
      total: licencas.length,
      ativas: licencas.filter(
        (l) => l.ativa
      ).length
    },

    tickets: {
      total: tickets.length,
      abertos: contarTicketsAbertos()
    },

    codigos: {
      total: codigos.length,
      disponiveis: codigos.filter(
        (c) => c.status === 'disponivel'
      ).length
    }
  };
}

function pesquisarAdmin(termo) {
  const q = normalizarBusca(termo);

  if (q.length < 2) {
    return {
      termo: q,
      total: 0,
      resultados: []
    };
  }

  const resultados = [];

  for (const conta of listarClientesAdmin()) {
    const alvo = [
      conta.nome,
      conta.username,
      conta.email,
      conta.id,
      conta.licenca?.plano
    ]
      .map(normalizarBusca)
      .join(' ');

    if (alvo.includes(q)) {
      resultados.push({
        tipo: 'cliente',
        id: conta.id,
        titulo:
          conta.nome ||
          conta.username ||
          'Cliente',
        subtitulo:
          conta.username
            ? `@${conta.username}`
            : conta.email,
        estado: conta.estado
      });
    }
  }

  for (const bot of listarBotsAdmin()) {
    const alvo = [
      bot.id,
      bot.nome,
      bot.repositorio,
      bot.branch,
      bot.conta?.nome,
      bot.conta?.username
    ]
      .map(normalizarBusca)
      .join(' ');

    if (alvo.includes(q)) {
      resultados.push({
        tipo: 'bot',
        id: bot.id,
        titulo: bot.nome,
        subtitulo:
          bot.conta?.username
            ? `@${bot.conta.username}`
            : 'Bot hospedado',
        estado:
          bot.online
            ? 'online'
            : 'offline'
      });
    }
  }

  for (const ticket of listarTickets()) {
    const alvo = [
      ticket.id,
      ticket.categoria,
      ticket.assunto,
      ticket.descricao,
      ticket.status
    ]
      .map(normalizarBusca)
      .join(' ');

    if (alvo.includes(q)) {
      resultados.push({
        tipo: 'ticket',
        id: ticket.id,
        titulo: ticket.assunto,
        subtitulo: ticket.categoria,
        estado: ticket.status
      });
    }
  }

  return {
    termo: q,
    total: resultados.length,
    resultados:
      resultados.slice(0, 50)
  };
}

module.exports = {
  sanitizarConta,
  listarClientesAdmin,
  listarBotsAdmin,
  listarLicencasAdmin,
  listarCodigosAdmin,
  obterResumoAdmin,
  pesquisarAdmin
};
