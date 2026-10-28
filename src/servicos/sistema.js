const os = require('os');
const fs = require('fs');

function obterQuantidadeCPUs() {
  const cpusNode = os.cpus();

  if (Array.isArray(cpusNode) && cpusNode.length > 0) {
    return cpusNode.length;
  }

  try {
    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');

    const quantidade = cpuinfo
      .split('\n')
      .filter(linha => /^processor\s*:/.test(linha))
      .length;

    if (quantidade > 0) {
      return quantidade;
    }
  } catch {}

  return null;
}

function obterStatusSistema() {
  const memoriaTotal = os.totalmem();
  const memoriaLivre = os.freemem();
  const memoriaUsada = memoriaTotal - memoriaLivre;

  return {
    plataforma: os.platform(),
    arquitetura: os.arch(),
    cpus: obterQuantidadeCPUs(),

    memoria: {
      totalMB: Math.round(memoriaTotal / 1024 / 1024),
      usadaMB: Math.round(memoriaUsada / 1024 / 1024),
      livreMB: Math.round(memoriaLivre / 1024 / 1024)
    },

    uptimeHostSegundos: Math.floor(process.uptime()),
    uptimeSistemaSegundos: Math.floor(os.uptime()),
    node: process.version,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  obterStatusSistema
};
