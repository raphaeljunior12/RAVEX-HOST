function verificarSessaoExpirada(resposta) {
  if (resposta.status === 401) {
    window.location.replace('/login');
    return true;
  }

  return false;
}

function formatarUptime(segundos) {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);

  return `${dias}d ${horas}h ${minutos}m`;
}

async function atualizarStatus() {
  try {
    const resposta = await fetch('/api/status', {
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    const cpu = document.getElementById('cpu');
    const memoria = document.getElementById('memoria');
    const uptimeHost = document.getElementById('uptimeHost');
    const uptimeSistema = document.getElementById('uptimeSistema');

    if (cpu) {
      cpu.textContent = dados.cpus
        ? `⚙️ CPU: ${dados.cpus} núcleos`
        : '⚙️ CPU: indisponível';
    }

    if (memoria) {
      memoria.textContent =
        `🧠 Memória: ${dados.memoria.usadaMB} MB / ${dados.memoria.totalMB} MB`;
    }

    if (uptimeHost) {
      uptimeHost.textContent =
        `⚡ RAVEX-HOST: ${formatarUptime(dados.uptimeHostSegundos)}`;
    }

    if (uptimeSistema) {
      uptimeSistema.textContent =
        `📱 Sistema: ${formatarUptime(dados.uptimeSistemaSegundos)}`;
    }
  } catch (erro) {
    console.error('Erro ao obter status do RAVEX-HOST:', erro);
  }
}

atualizarStatus();

setInterval(atualizarStatus, 5000);

async function atualizarStatusBot() {
  const elemento = document.getElementById('statusBot');

  if (!elemento) {
    return;
  }

  try {
    const resposta = await fetch('/api/bot/status', {
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const bot = await resposta.json();

    if (bot.online) {
      elemento.textContent = 'Status: 🟢 ONLINE';

      const botao = document.getElementById('iniciarBot');

      if (botao) {
        botao.disabled = true;
        botao.textContent = '✅ Online';
      }

      const botaoParar = document.getElementById('pararBot');

      if (botaoParar) {
        botaoParar.disabled = false;
        botaoParar.textContent = '⏹ Parar';
      }
    } else {
      elemento.textContent = 'Status: 🔴 OFFLINE';

      const botao = document.getElementById('iniciarBot');

      if (botao) {
        botao.disabled = false;
        botao.textContent = '▶ Iniciar';
      }

      const botaoParar = document.getElementById('pararBot');

      if (botaoParar) {
        botaoParar.disabled = true;
        botaoParar.textContent = '⏹ Parar';
      }
    }
  } catch (erro) {
    elemento.textContent = 'Status: ⚠️ Indisponível';
    console.error('Erro ao consultar o RAVEX-BOT:', erro);
  }
}

atualizarStatusBot();

setInterval(atualizarStatusBot, 5000);

const botaoIniciarBot = document.getElementById('iniciarBot');

async function iniciarBotPeloPainel() {
  if (!botaoIniciarBot) {
    return;
  }

  botaoIniciarBot.disabled = true;
  botaoIniciarBot.textContent = '⏳ Iniciando...';

  try {
    const resposta = await fetch('/api/bot/iniciar', {
      method: 'POST',
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok && !resultado.status?.online) {
      throw new Error(resultado.mensagem || `HTTP ${resposta.status}`);
    }

    await atualizarStatusBot();
  } catch (erro) {
    console.error('Erro ao iniciar o RAVEX-BOT:', erro);
    alert(`Não foi possível iniciar o RAVEX-BOT: ${erro.message}`);
  } finally {
    const status = await fetch('/api/bot/status', {
      cache: 'no-store'
    }).then((resposta) => {
      if (verificarSessaoExpirada(resposta)) {
        return null;
      }

      return resposta.json();
    }).catch(() => null);

    if (status?.online) {
      botaoIniciarBot.disabled = true;
      botaoIniciarBot.textContent = '✅ Online';
    } else {
      botaoIniciarBot.disabled = false;
      botaoIniciarBot.textContent = '▶ Iniciar';
    }
  }
}

if (botaoIniciarBot) {
  botaoIniciarBot.addEventListener('click', iniciarBotPeloPainel);
}

const botaoPararBot = document.getElementById('pararBot');

async function pararBotPeloPainel() {
  if (!botaoPararBot) {
    return;
  }

  botaoPararBot.disabled = true;
  botaoPararBot.textContent = '⏳ Parando...';

  try {
    const resposta = await fetch('/api/bot/parar', {
      method: 'POST',
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok && resultado.status?.online !== false) {
      throw new Error(resultado.mensagem || `HTTP ${resposta.status}`);
    }

    await atualizarStatusBot();
  } catch (erro) {
    console.error('Erro ao parar o RAVEX-BOT:', erro);
    alert(`Não foi possível parar o RAVEX-BOT: ${erro.message}`);
  } finally {
    await atualizarStatusBot();
  }
}

if (botaoPararBot) {
  botaoPararBot.addEventListener('click', pararBotPeloPainel);
}

const botaoReiniciarBot = document.getElementById('reiniciarBot');

async function reiniciarBotPeloPainel() {
  if (!botaoReiniciarBot) {
    return;
  }

  botaoReiniciarBot.disabled = true;
  botaoReiniciarBot.textContent = '⏳ Reiniciando...';

  try {
    const resposta = await fetch('/api/bot/reiniciar', {
      method: 'POST',
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.mensagem || `HTTP ${resposta.status}`);
    }

    await atualizarStatusBot();
  } catch (erro) {
    console.error('Erro ao reiniciar o RAVEX-BOT:', erro);
    alert(`Não foi possível reiniciar o RAVEX-BOT: ${erro.message}`);
  } finally {
    botaoReiniciarBot.disabled = false;
    botaoReiniciarBot.textContent = '🔄 Reiniciar';

    await atualizarStatusBot();
  }
}

if (botaoReiniciarBot) {
  botaoReiniciarBot.addEventListener('click', reiniciarBotPeloPainel);
}

async function atualizarLogsBot() {
  const elemento = document.getElementById('logsBot');

  if (!elemento) return;

  try {
    const resposta = await fetch('/api/bot/logs', {
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const resultado = await resposta.json();
    const logs = Array.isArray(resultado.logs) ? resultado.logs : [];

    if (logs.length === 0) {
      elemento.textContent = 'Nenhum log disponível.';
      return;
    }

    elemento.replaceChildren();

    for (const log of logs.slice(-50)) {
      const linha = document.createElement('div');
      linha.className =
        log.tipo === 'stderr'
          ? 'linha-log log-erro'
          : 'linha-log log-normal';

      const data = new Date(log.timestamp);
      const horario = Number.isNaN(data.getTime())
        ? '--:--:--'
        : data.toLocaleTimeString();

      linha.textContent = `[${horario}] ${log.mensagem}`;
      elemento.appendChild(linha);
    }

    elemento.scrollTop = elemento.scrollHeight;
  } catch (erro) {
    elemento.textContent = '⚠️ Não foi possível carregar os logs.';
    console.error('Erro ao obter logs do RAVEX-BOT:', erro);
  }
}

atualizarLogsBot();
setInterval(atualizarLogsBot, 3000);

const botaoSairPainel = document.getElementById('sairPainel');

async function sairDoPainel() {
  if (!botaoSairPainel) {
    return;
  }

  botaoSairPainel.disabled = true;
  botaoSairPainel.textContent = '⏳ Saindo...';

  try {
    const resposta = await fetch('/api/logout', {
      method: 'POST',
      cache: 'no-store'
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    window.location.replace('/login');
  } catch (erro) {
    console.error(
      'Erro ao encerrar sessão do RAVEX-HOST:',
      erro
    );

    alert('Não foi possível sair do painel.');

    botaoSairPainel.disabled = false;
    botaoSairPainel.textContent = '🚪 Sair';
  }
}

if (botaoSairPainel) {
  botaoSairPainel.addEventListener(
    'click',
    sairDoPainel
  );
}
