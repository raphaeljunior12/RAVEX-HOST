const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO_CONTAS = path.join(
  __dirname,
  '..',
  '..',
  'dados',
  'contas',
  'contas.json'
);

function garantirArquivo() {
  fs.mkdirSync(path.dirname(ARQUIVO_CONTAS), {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO_CONTAS)) {
    fs.writeFileSync(ARQUIVO_CONTAS, '[]\n', 'utf8');
  }
}

function listarContas() {
  garantirArquivo();

  try {
    const dados = JSON.parse(
      fs.readFileSync(ARQUIVO_CONTAS, 'utf8')
    );

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvarContas(contas) {
  garantirArquivo();

  const temporario = `${ARQUIVO_CONTAS}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(contas, null, 2) + '\n',
    'utf8'
  );

  fs.renameSync(temporario, ARQUIVO_CONTAS);
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizarUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function dadosPublicos(conta) {
  return {
    id: conta.id,
    nome: conta.nome,
    username: conta.username,
    email: conta.email,
    avatar: conta.avatar || null,
    bio: conta.bio || '',
    pais: conta.pais || '',
    tipo: conta.tipo,
    estado: conta.estado,
    criadoEm: conta.criadoEm,
    atualizadoEm: conta.atualizadoEm || conta.criadoEm
  };
}

function criarHashSenha(senha) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');

    crypto.scrypt(senha, salt, 64, (erro, chave) => {
      if (erro) {
        reject(erro);
        return;
      }

      resolve({
        salt,
        hash: chave.toString('hex')
      });
    });
  });
}

function verificarSenha(senha, salt, hash) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(senha, salt, 64, (erro, chave) => {
      if (erro) {
        reject(erro);
        return;
      }

      try {
        const esperado = Buffer.from(hash, 'hex');

        if (chave.length !== esperado.length) {
          resolve(false);
          return;
        }

        resolve(crypto.timingSafeEqual(chave, esperado));
      } catch {
        resolve(false);
      }
    });
  });
}

function obterContaPorEmail(email) {
  const procurado = normalizarEmail(email);

  return listarContas().find(
    conta => conta.email === procurado
  ) || null;
}

function obterContaPorUsername(username) {
  const procurado = normalizarUsername(username);

  return listarContas().find(
    conta => conta.username === procurado
  ) || null;
}

function obterContaPorId(id) {
  return listarContas().find(
    conta => conta.id === String(id || '')
  ) || null;
}

async function criarConta({
  nome,
  username,
  email,
  senha
}) {
  const nomeLimpo = String(nome || '').trim();
  const usernameLimpo = normalizarUsername(username);
  const emailLimpo = normalizarEmail(email);
  const senhaLimpa = String(senha || '');

  if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
    throw new Error('NOME_INVALIDO');
  }

  if (!/^[a-z0-9_.-]{3,32}$/.test(usernameLimpo)) {
    throw new Error('USERNAME_INVALIDO');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    throw new Error('EMAIL_INVALIDO');
  }

  if (senhaLimpa.length < 8 || senhaLimpa.length > 128) {
    throw new Error('SENHA_INVALIDA');
  }

  const contas = listarContas();

  if (contas.some(conta => conta.email === emailLimpo)) {
    throw new Error('EMAIL_JA_CADASTRADO');
  }

  if (
    contas.some(conta => conta.username === usernameLimpo)
  ) {
    throw new Error('USERNAME_JA_CADASTRADO');
  }

  const senhaProtegida = await criarHashSenha(senhaLimpa);
  const agora = new Date().toISOString();

  const conta = {
    id: crypto.randomUUID(),
    nome: nomeLimpo,
    username: usernameLimpo,
    email: emailLimpo,

    senha: {
      algoritmo: 'scrypt',
      salt: senhaProtegida.salt,
      hash: senhaProtegida.hash
    },

    avatar: null,
    bio: '',
    pais: '',

    tipo: 'usuario',
    estado: 'ativo',
    criadoEm: agora,
    atualizadoEm: agora
  };

  contas.push(conta);
  salvarContas(contas);

  return dadosPublicos(conta);
}

function atualizarPerfil(id, dados = {}) {
  const contaId = String(id || '').trim();

  if (!contaId) {
    throw new Error('CONTA_INVALIDA');
  }

  const contas = listarContas();

  const indice = contas.findIndex(
    conta => conta.id === contaId
  );

  if (indice === -1) {
    throw new Error('CONTA_NAO_ENCONTRADA');
  }

  const atual = contas[indice];

  const nome =
    dados.nome === undefined
      ? atual.nome
      : String(dados.nome || '').trim();

  const username =
    dados.username === undefined
      ? atual.username
      : normalizarUsername(dados.username);

  const bio =
    dados.bio === undefined
      ? (atual.bio || '')
      : String(dados.bio || '').trim();

  const pais =
    dados.pais === undefined
      ? (atual.pais || '')
      : String(dados.pais || '').trim();

  if (nome.length < 3 || nome.length > 100) {
    throw new Error('NOME_INVALIDO');
  }

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    throw new Error('USERNAME_INVALIDO');
  }

  if (bio.length > 240) {
    throw new Error('BIO_INVALIDA');
  }

  if (pais.length > 80) {
    throw new Error('PAIS_INVALIDO');
  }

  const usernameEmUso = contas.some(
    (conta, i) =>
      i !== indice &&
      conta.username === username
  );

  if (usernameEmUso) {
    throw new Error('USERNAME_JA_CADASTRADO');
  }

  const atualizado = {
    ...atual,
    nome,
    username,
    bio,
    pais,
    atualizadoEm: new Date().toISOString()
  };

  contas[indice] = atualizado;
  salvarContas(contas);

  return dadosPublicos(atualizado);
}

function atualizarAvatar(id, avatar = null) {
  const contaId = String(id || '').trim();

  if (!contaId) {
    throw new Error('CONTA_INVALIDA');
  }

  const contas = listarContas();

  const indice = contas.findIndex(
    conta => conta.id === contaId
  );

  if (indice === -1) {
    throw new Error('CONTA_NAO_ENCONTRADA');
  }

  let avatarSeguro = null;

  if (avatar !== null) {
    avatarSeguro = String(avatar || '').trim();

    if (
      !/^[0-9a-f-]+\.(png|jpg|webp)$/i.test(
        avatarSeguro
      )
    ) {
      throw new Error('AVATAR_INVALIDO');
    }
  }

  const atualizado = {
    ...contas[indice],
    avatar: avatarSeguro,
    atualizadoEm: new Date().toISOString()
  };

  contas[indice] = atualizado;
  salvarContas(contas);

  return dadosPublicos(atualizado);
}

async function autenticarConta(email, senha) {
  const conta = obterContaPorEmail(email);

  if (
    !conta ||
    conta.estado !== 'ativo' ||
    !conta.senha
  ) {
    return null;
  }

  const correta = await verificarSenha(
    String(senha || ''),
    conta.senha.salt,
    conta.senha.hash
  );

  return correta ? dadosPublicos(conta) : null;
}

function removerContaPorId(id) {
  const contaId = String(id || '').trim();

  if (!contaId) {
    return false;
  }

  const contas = listarContas();

  const novasContas = contas.filter(
    conta => conta.id !== contaId
  );

  if (novasContas.length === contas.length) {
    return false;
  }

  salvarContas(novasContas);
  return true;
}

module.exports = {
  listarContas,
  obterContaPorId,
  obterContaPorEmail,
  obterContaPorUsername,
  criarConta,
  atualizarPerfil,
  atualizarAvatar,
  autenticarConta,
  removerContaPorId
};
