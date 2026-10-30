const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  criarOuRenovarLicenca
} = require('./licencas');

const ARQUIVO = path.join(
  __dirname,
  '..',
  '..',
  'dados',
  'codigos',
  'codigos.json'
);

function garantirArquivo() {
  fs.mkdirSync(path.dirname(ARQUIVO), {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, '[]\n', 'utf8');
  }
}

function listarCodigos() {
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

function salvarCodigos(codigos) {
  garantirArquivo();

  const temporario = `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(codigos, null, 2) + '\n',
    'utf8'
  );

  fs.renameSync(temporario, ARQUIVO);
}

function hashCodigo(codigo) {
  return crypto
    .createHash('sha256')
    .update(
      String(codigo || '')
        .trim()
        .toUpperCase()
    )
    .digest('hex');
}

function gerarTextoCodigo() {
  const parte = crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase();

  return `RAVEX-${parte}`;
}

function gerarCodigoLicenca({
  dias,
  usuarios = 1,
  plano = 'RAVEX-HOST'
}) {
  const quantidadeDias = Number(dias);
  const quantidadeUsuarios = Number(usuarios);

  if (
    !Number.isInteger(quantidadeDias) ||
    quantidadeDias < 1 ||
    quantidadeDias > 9999
  ) {
    throw new Error('DIAS_INVALIDOS');
  }

  if (
    !Number.isInteger(quantidadeUsuarios) ||
    quantidadeUsuarios < 1 ||
    quantidadeUsuarios > 9999
  ) {
    throw new Error('USUARIOS_INVALIDOS');
  }

  const codigo = gerarTextoCodigo();
  const codigos = listarCodigos();

  const planoLimpo =
    String(plano || 'RAVEX-HOST').trim();

  codigos.push({
    id: crypto.randomUUID(),

    // Nunca guardamos o código puro.
    hash: hashCodigo(codigo),

    plano: planoLimpo,
    dias: quantidadeDias,

    limiteUsuarios: quantidadeUsuarios,
    contasAtivadas: [],

    status: 'disponivel',

    criadoEm: new Date().toISOString(),
    esgotadoEm: null
  });

  salvarCodigos(codigos);

  return {
    codigo,
    plano: planoLimpo,
    dias: quantidadeDias,
    limiteUsuarios: quantidadeUsuarios,
    ativados: 0,
    restantes: quantidadeUsuarios
  };
}

function obterInformacoesCodigo(registro) {
  const contasAtivadas = Array.isArray(
    registro.contasAtivadas
  )
    ? registro.contasAtivadas
    : [];

  const limite = Number(
    registro.limiteUsuarios || 1
  );

  const ativados = contasAtivadas.length;

  return {
    id: registro.id,
    plano: registro.plano,
    dias: registro.dias,
    limiteUsuarios: limite,
    ativados,
    restantes: Math.max(
      0,
      limite - ativados
    ),
    status:
      ativados >= limite
        ? 'esgotado'
        : 'disponivel'
  };
}

function validarCodigoLicenca(codigo) {
  const hash = hashCodigo(codigo);

  const registro = listarCodigos().find(
    item => item.hash === hash
  );

  if (!registro) {
    return null;
  }

  const informacoes =
    obterInformacoesCodigo(registro);

  if (informacoes.restantes <= 0) {
    return null;
  }

  return informacoes;
}

function usarCodigoLicenca({
  codigo,
  contaId
}) {
  const conta = String(contaId || '').trim();

  if (!conta) {
    throw new Error('CONTA_INVALIDA');
  }

  const hash = hashCodigo(codigo);
  const codigos = listarCodigos();

  const indice = codigos.findIndex(
    item => item.hash === hash
  );

  if (indice === -1) {
    throw new Error('CODIGO_INVALIDO');
  }

  const registro = codigos[indice];

  if (!Array.isArray(registro.contasAtivadas)) {
    registro.contasAtivadas = [];
  }

  const limite = Number(
    registro.limiteUsuarios || 1
  );

  // A mesma conta não pode consumir duas vagas.
  if (registro.contasAtivadas.includes(conta)) {
    throw new Error('CONTA_JA_ATIVOU_CODIGO');
  }

  if (
    registro.status === 'esgotado' ||
    registro.contasAtivadas.length >= limite
  ) {
    throw new Error('CODIGO_ESGOTADO');
  }

  // Cada conta recebe a duração completa
  // a partir da sua própria ativação.
  const licenca = criarOuRenovarLicenca({
    contaId: conta,
    dias: registro.dias,
    plano: registro.plano
  });

  registro.contasAtivadas.push(conta);

  const ativados =
    registro.contasAtivadas.length;

  const restantes = Math.max(
    0,
    limite - ativados
  );

  if (restantes === 0) {
    registro.status = 'esgotado';
    registro.esgotadoEm =
      new Date().toISOString();
  } else {
    registro.status = 'disponivel';
  }

  codigos[indice] = registro;
  salvarCodigos(codigos);

  return {
    sucesso: true,
    plano: registro.plano,
    diasAdicionados: registro.dias,

    usuarios: {
      limite,
      ativados,
      restantes
    },

    licenca
  };
}

module.exports = {
  gerarCodigoLicenca,
  validarCodigoLicenca,
  usarCodigoLicenca
};
