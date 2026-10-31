const { Resend } = require('resend');

function obterConfiguracaoEmail() {
  const apiKey = String(
    process.env.RAVEX_HOST_RESEND_API_KEY || ''
  ).trim();

  if (!apiKey) {
    throw new Error('RESEND_NAO_CONFIGURADO');
  }

  return {
    apiKey,
    remetente:
      'RAVEX-HOST <onboarding@resend.dev>'
  };
}

function criarCliente() {
  const config = obterConfiguracaoEmail();

  return {
    cliente: new Resend(config.apiKey),
    remetente: config.remetente
  };
}

async function verificarEmail() {
  const { cliente, remetente } = criarCliente();

  const destino = String(
    process.env.RAVEX_HOST_OWNER_EMAIL || ''
  )
    .trim()
    .toLowerCase();

  if (!destino) {
    throw new Error(
      'EMAIL_PROPRIETARIO_NAO_CONFIGURADO'
    );
  }

  const resultado = await cliente.emails.send({
    from: remetente,
    to: destino,
    subject: 'Verificação — RAVEX-HOST',
    text:
      'RAVEX-HOST\n\n' +
      'O serviço de e-mail está funcionando.'
  });

  if (resultado.error) {
    const erro = new Error(
      resultado.error.message ||
      'RESEND_ENVIO_FALHOU'
    );

    erro.code =
      resultado.error.name ||
      'RESEND_ENVIO_FALHOU';

    throw erro;
  }

  return true;
}

async function enviarCodigoProprietario({
  destino,
  codigo
}) {
  const emailDestino = String(destino || '')
    .trim()
    .toLowerCase();

  const codigoLimpo = String(codigo || '')
    .trim();

  if (!emailDestino) {
    throw new Error('EMAIL_DESTINO_INVALIDO');
  }

  if (!/^\d{6}$/.test(codigoLimpo)) {
    throw new Error('CODIGO_EMAIL_INVALIDO');
  }

  const { cliente, remetente } = criarCliente();

  const resultado = await cliente.emails.send({
    from: remetente,
    to: emailDestino,

    subject:
      'Código de acesso — RAVEX-HOST',

    text:
      'RAVEX-HOST\n\n' +
      `O seu código de acesso é: ${codigoLimpo}\n\n` +
      'Este código expira em 5 minutos.\n' +
      'Se não solicitou este acesso, ' +
      'ignore esta mensagem.',

    html: `
      <div style="
        font-family:Arial,sans-serif;
        max-width:520px;
        margin:auto;
        padding:24px;
        background:#111722;
        color:#f5f7fa;
        border-radius:16px;
      ">
        <h2 style="margin-top:0;">
          ⚡ RAVEX-HOST
        </h2>

        <p>
          Código de confirmação do proprietário:
        </p>

        <div style="
          margin:24px 0;
          padding:18px;
          text-align:center;
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          background:#080b12;
          border-radius:12px;
        ">
          ${codigoLimpo}
        </div>

        <p>
          Este código expira em
          <strong>5 minutos</strong>.
        </p>

        <p style="
          color:#9ba8bb;
          font-size:13px;
        ">
          Se não solicitou este acesso,
          ignore esta mensagem.
        </p>
      </div>
    `
  });

  if (resultado.error) {
    const erro = new Error(
      resultado.error.message ||
      'RESEND_ENVIO_FALHOU'
    );

    erro.code =
      resultado.error.name ||
      'RESEND_ENVIO_FALHOU';

    throw erro;
  }

  return true;
}


async function enviarCodigoConfirmacaoUsuario({
  destino,
  codigo
}) {
  const emailDestino = String(destino || '')
    .trim()
    .toLowerCase();

  const codigoLimpo = String(codigo || '')
    .trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      emailDestino
    )
  ) {
    throw new Error('EMAIL_DESTINO_INVALIDO');
  }

  if (!/^\d{6}$/.test(codigoLimpo)) {
    throw new Error('CODIGO_EMAIL_INVALIDO');
  }

  const { cliente, remetente } = criarCliente();

  const resultado = await cliente.emails.send({
    from: remetente,
    to: emailDestino,

    subject:
      'Confirma o teu e-mail — RAVEX-HOST',

    text:
      'RAVEX-HOST\n\n' +
      'Confirma o teu e-mail para concluir ' +
      'a criação da conta.\n\n' +
      `Código: ${codigoLimpo}\n\n` +
      'Este código expira em 5 minutos.\n' +
      'Se não criaste uma conta, ' +
      'ignora esta mensagem.',

    html: `
      <div style="
        font-family:Arial,sans-serif;
        max-width:520px;
        margin:auto;
        padding:24px;
        background:#111722;
        color:#f5f7fa;
        border-radius:16px;
      ">
        <h2 style="margin-top:0;">
          ⚡ RAVEX-HOST
        </h2>

        <p>
          Confirma o teu e-mail para concluir
          a criação da tua conta.
        </p>

        <div style="
          margin:24px 0;
          padding:18px;
          text-align:center;
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          background:#080b12;
          border-radius:12px;
        ">
          ${codigoLimpo}
        </div>

        <p>
          Este código expira em
          <strong>5 minutos</strong>.
        </p>

        <p style="
          color:#9ba8bb;
          font-size:13px;
        ">
          Se não criaste uma conta
          no RAVEX-HOST, ignora esta mensagem.
        </p>
      </div>
    `
  });

  if (resultado.error) {
    const erro = new Error(
      resultado.error.message ||
      'RESEND_ENVIO_FALHOU'
    );

    erro.code =
      resultado.error.name ||
      'RESEND_ENVIO_FALHOU';

    throw erro;
  }

  return true;
}

module.exports = {
  verificarEmail,
  enviarCodigoProprietario,
  enviarCodigoConfirmacaoUsuario
};
