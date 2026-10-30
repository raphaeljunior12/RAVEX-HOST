const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRETORIO_AVATARES = path.join(
  __dirname,
  '..',
  '..',
  'dados',
  'avatars'
);

function garantirDiretorio() {
  fs.mkdirSync(DIRETORIO_AVATARES, {
    recursive: true
  });
}

function detectarImagem(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      extensao: 'png',
      mime: 'image/png'
    };
  }

  // JPEG
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      extensao: 'jpg',
      mime: 'image/jpeg'
    };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return {
      extensao: 'webp',
      mime: 'image/webp'
    };
  }

  return null;
}

function salvarAvatar(contaId, buffer) {
  const id = String(contaId || '').trim();

  if (!id) {
    throw new Error('CONTA_INVALIDA');
  }

  const imagem = detectarImagem(buffer);

  if (!imagem) {
    throw new Error('IMAGEM_INVALIDA');
  }

  garantirDiretorio();

  const nome =
    `${crypto.randomUUID()}.${imagem.extensao}`;

  const destino = path.join(
    DIRETORIO_AVATARES,
    nome
  );

  fs.writeFileSync(destino, buffer);

  return {
    nome,
    mime: imagem.mime,
    url: `/api/avatars/${nome}`
  };
}

function obterAvatar(nome) {
  const nomeSeguro = path.basename(
    String(nome || '')
  );

  if (!nomeSeguro || nomeSeguro !== nome) {
    return null;
  }

  if (
    !/^[0-9a-f-]+\.(png|jpg|webp)$/i.test(nomeSeguro)
  ) {
    return null;
  }

  garantirDiretorio();

  const arquivo = path.join(
    DIRETORIO_AVATARES,
    nomeSeguro
  );

  if (!fs.existsSync(arquivo)) {
    return null;
  }

  const extensao =
    path.extname(nomeSeguro).toLowerCase();

  const tipos = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp'
  };

  return {
    arquivo,
    mime: tipos[extensao]
  };
}

function removerAvatar(nome) {
  if (!nome) {
    return false;
  }

  const avatar = obterAvatar(nome);

  if (!avatar) {
    return false;
  }

  try {
    fs.unlinkSync(avatar.arquivo);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  detectarImagem,
  salvarAvatar,
  obterAvatar,
  removerAvatar
};
