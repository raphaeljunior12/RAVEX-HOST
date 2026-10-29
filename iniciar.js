require('dotenv').config();

console.log('🔐 RAVEX-HOST — Verificação de ambiente');
console.log(
  '👤 RAVEX_HOST_USUARIO:',
  process.env.RAVEX_HOST_USUARIO ? 'CONFIGURADO' : 'AUSENTE'
);
console.log(
  '🔑 RAVEX_HOST_SENHA:',
  process.env.RAVEX_HOST_SENHA ? 'CONFIGURADA' : 'AUSENTE'
);

const iniciarServidor = require('./src/servidor/http');

console.log('🚀 Iniciando RAVEX-HOST...');

iniciarServidor();
