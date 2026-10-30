const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO = path.join(
  __dirname,
  '..',
  '..',
  'dados',
  'licencas',
  'licencas.json'
);

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function garantirArquivo() {
  fs.mkdirSync(path.dirname(ARQUIVO), {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, '[]\n', 'utf8');
  }
}

function listarLicencas() {
  garantirArquivo();

  try {
    const dados = JSON.parse(
      fs.readFileSync(ARQUIVO, 'utf8')
    );

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvarLicencas(licencas) {
  garantirArquivo();

  const temporario = `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(licencas, null, 2) + '\n',
    'utf8'
  );

  fs.renameSync(temporario, ARQUIVO);
}

function obterLicencaConta(contaId) {
  const id = String(contaId || '').trim();

  return listarLicencas().find(
    licenca => licenca.contaId === id
  ) || null;
}

function calcularStatus(licenca) {
  if (!licenca) {
    return {
      ativa: false,
      status: 'sem_licenca',
      diasRestantes: 0,
      ativadoEm: null,
      renovadoEm: null,
      expiraEm: null,
      avisoRenovacao: null
    };
  }

  const agora = Date.now();
  const expiracao = new Date(
    licenca.expiraEm
  ).getTime();

  if (
    !Number.isFinite(expiracao) ||
    expiracao <= agora
  ) {
    return {
      ativa: false,
      status: 'expirada',
      diasRestantes: 0,
      ativadoEm: licenca.ativadoEm || null,
      renovadoEm: licenca.renovadoEm || null,
      expiraEm: licenca.expiraEm || null,
      avisoRenovacao: 'expirada'
    };
  }

  const diasRestantes = Math.ceil(
    (expiracao - agora) / UM_DIA_MS
  );

  let avisoRenovacao = null;

  if (diasRestantes <= 1) {
    avisoRenovacao = 'urgente';
  } else if (diasRestantes <= 3) {
    avisoRenovacao = 'alta';
  } else if (diasRestantes <= 7) {
    avisoRenovacao = 'aviso';
  }

  return {
    ativa: true,
    status: 'ativa',
    diasRestantes,
    ativadoEm: licenca.ativadoEm || null,
    renovadoEm: licenca.renovadoEm || null,
    expiraEm: licenca.expiraEm,
    avisoRenovacao
  };
}

function criarOuRenovarLicenca({
  contaId,
  dias,
  plano = 'RAVEX-HOST'
}) {
  const conta = String(contaId || '').trim();
  const quantidadeDias = Number(dias);
  const planoLimpo =
    String(plano || 'RAVEX-HOST').trim();

  if (!conta) {
    throw new Error('CONTA_INVALIDA');
  }

  if (
    !Number.isInteger(quantidadeDias) ||
    quantidadeDias < 1 ||
    quantidadeDias > 9999
  ) {
    throw new Error('LICENCA_INVALIDA');
  }

  const licencas = listarLicencas();

  const indice = licencas.findIndex(
    licenca => licenca.contaId === conta
  );

  const agora = Date.now();
  const agoraISO = new Date(agora).toISOString();

  if (indice === -1) {
    const expiraEm = new Date(
      agora + quantidadeDias * UM_DIA_MS
    ).toISOString();

    const registro = {
      id: crypto.randomUUID(),
      contaId: conta,
      plano: planoLimpo,

      ativadoEm: agoraISO,
      renovadoEm: null,
      expiraEm,

      criadoEm: agoraISO,
      atualizadoEm: agoraISO
    };

    licencas.push(registro);
    salvarLicencas(licencas);

    return {
      ...registro,
      ...calcularStatus(registro),
      diasAdicionados: quantidadeDias
    };
  }

  const atual = licencas[indice];

  const expiracaoAtual = new Date(
    atual.expiraEm
  ).getTime();

  // Se ainda estiver ativa, acrescenta os novos dias
  // ao final da licença atual.
  // Se já expirou, a nova validade começa agora.
  const base =
    Number.isFinite(expiracaoAtual) &&
    expiracaoAtual > agora
      ? expiracaoAtual
      : agora;

  const novaExpiracao = new Date(
    base + quantidadeDias * UM_DIA_MS
  ).toISOString();

  const registro = {
    ...atual,

    contaId: conta,
    plano: planoLimpo,

    // Mantém a data da primeira ativação.
    ativadoEm: atual.ativadoEm || agoraISO,

    // Registra quando ocorreu a renovação.
    renovadoEm: agoraISO,

    expiraEm: novaExpiracao,
    atualizadoEm: agoraISO
  };

  licencas[indice] = registro;
  salvarLicencas(licencas);

  return {
    ...registro,
    ...calcularStatus(registro),
    diasAdicionados: quantidadeDias
  };
}

function obterStatusLicenca(contaId) {
  const licenca = obterLicencaConta(contaId);

  if (!licenca) {
    return calcularStatus(null);
  }

  return {
    id: licenca.id,
    contaId: licenca.contaId,
    plano: licenca.plano,
    ...calcularStatus(licenca)
  };
}

function temLicencaAtiva(contaId) {
  return obterStatusLicenca(contaId).ativa;
}

module.exports = {
  listarLicencas,
  obterLicencaConta,
  obterStatusLicenca,
  criarOuRenovarLicenca,
  temLicencaAtiva
};
