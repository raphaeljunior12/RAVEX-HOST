const abas = document.querySelectorAll('.aba-acesso');

const paineis = {
  login: document.getElementById('painelLogin'),
  cadastro: document.getElementById('painelCadastro'),
  proprietario: document.getElementById(
    'painelProprietario'
  )
};

const formularioLogin =
  document.getElementById('formLogin');

const mensagemLogin =
  document.getElementById('mensagemLogin');

const botaoEntrar =
  document.getElementById('entrar');

const formularioCadastro =
  document.getElementById('formCadastro');

const mensagemCadastro =
  document.getElementById('mensagemCadastro');

const botaoCriarConta =
  document.getElementById('criarConta');

const confirmacaoEmailCadastro =
  document.getElementById(
    'confirmacaoEmailCadastro'
  );

const codigoEmailCadastro =
  document.getElementById(
    'codigoEmailCadastro'
  );

const botaoConfirmarEmailCadastro =
  document.getElementById(
    'confirmarEmailCadastro'
  );

let verificacaoCadastroId = null;

function mostrarPainel(nome) {
  for (const [chave, painel] of Object.entries(paineis)) {
    const ativo = chave === nome;

    painel.hidden = !ativo;
    painel.classList.toggle('ativo', ativo);
  }

  abas.forEach(aba => {
    aba.classList.toggle(
      'ativa',
      aba.dataset.painel === nome
    );
  });
}

abas.forEach(aba => {
  aba.addEventListener('click', () => {
    mostrarPainel(aba.dataset.painel);
  });
});

formularioLogin.addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    const email = document
      .getElementById('emailLogin')
      .value
      .trim();

    const senha = document
      .getElementById('senhaLogin')
      .value;

    mensagemLogin.textContent = '';
    mensagemLogin.className =
      'mensagem-formulario';

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = '⏳ Entrando...';

    try {
      const resposta = await fetch('/api/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          email,
          senha
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          'Não foi possível entrar.'
        );
      }

      mensagemLogin.textContent =
        '✅ Login realizado. Abrindo painel...';

      mensagemLogin.classList.add('sucesso');

      window.location.replace('/');
    } catch (erro) {
      mensagemLogin.textContent =
        `❌ ${erro.message}`;

      mensagemLogin.classList.add('erro');
    } finally {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = '🔓 Entrar';
    }
  }
);

formularioCadastro.addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    const nome = document
      .getElementById('nomeCadastro')
      .value
      .trim();

    const username = document
      .getElementById('usernameCadastro')
      .value
      .trim();

    const email = document
      .getElementById('emailCadastro')
      .value
      .trim();

    const senha = document
      .getElementById('senhaCadastro')
      .value;

    const confirmarSenha = document
      .getElementById('confirmarSenhaCadastro')
      .value;

    const codigo = document
      .getElementById('codigoCadastro')
      .value
      .trim()
      .toUpperCase();

    mensagemCadastro.textContent = '';
    mensagemCadastro.className =
      'mensagem-formulario';

    if (senha !== confirmarSenha) {
      mensagemCadastro.textContent =
        '❌ As senhas não são iguais.';

      mensagemCadastro.classList.add('erro');
      return;
    }

    botaoCriarConta.disabled = true;
    botaoCriarConta.textContent =
      '⏳ Enviando código...';

    try {
      const resposta = await fetch('/api/cadastro/solicitar-confirmacao', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          nome,
          username,
          email,
          senha,
          confirmarSenha,
          codigo
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          'Não foi possível criar a conta.'
        );
      }

      verificacaoCadastroId =
        resultado.verificacaoId;

      if (!verificacaoCadastroId) {
        throw new Error(
          'Identificação da confirmação não recebida.'
        );
      }

      confirmacaoEmailCadastro.hidden = false;

      mensagemCadastro.textContent =
        '✅ Código enviado. Verifica o teu e-mail.';

      mensagemCadastro.classList.add('sucesso');

      codigoEmailCadastro.value = '';

      codigoEmailCadastro.focus();
    } catch (erro) {
      mensagemCadastro.textContent =
        `❌ ${erro.message}`;

      mensagemCadastro.classList.add('erro');
    } finally {
      botaoCriarConta.disabled = false;
      botaoCriarConta.textContent =
        '📧 Enviar código de confirmação';
    }
  }
);


if (botaoConfirmarEmailCadastro) {
  botaoConfirmarEmailCadastro.addEventListener(
    'click',
    async () => {
      mensagemCadastro.textContent = '';
      mensagemCadastro.className =
        'mensagem-formulario';

      const codigoEmail = String(
        codigoEmailCadastro?.value || ''
      ).trim();

      if (!verificacaoCadastroId) {
        mensagemCadastro.textContent =
          '❌ Solicita primeiro um novo código.';

        mensagemCadastro.classList.add('erro');
        return;
      }

      if (!/^\d{6}$/.test(codigoEmail)) {
        mensagemCadastro.textContent =
          '❌ Introduz os 6 dígitos recebidos por e-mail.';

        mensagemCadastro.classList.add('erro');

        codigoEmailCadastro?.focus();
        return;
      }

      botaoConfirmarEmailCadastro.disabled = true;
      botaoConfirmarEmailCadastro.textContent =
        '⏳ Confirmando...';

      try {
        const resposta = await fetch(
          '/api/cadastro/confirmar-email',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({
              verificacaoId:
                verificacaoCadastroId,

              codigoEmail
            })
          }
        );

        const resultado =
          await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.mensagem ||
            'Não foi possível confirmar o e-mail.'
          );
        }

        const emailCriado = document
          .getElementById('emailCadastro')
          ?.value
          ?.trim();

        mensagemCadastro.textContent =
          '✅ E-mail confirmado. Conta criada e licença ativada.';

        mensagemCadastro.classList.add(
          'sucesso'
        );

        verificacaoCadastroId = null;

        confirmacaoEmailCadastro.hidden = true;

        if (
          formularioLogin &&
          formularioLogin.email &&
          emailCriado
        ) {
          formularioLogin.email.value =
            emailCriado;
        }

        formularioCadastro?.reset();

        setTimeout(() => {
          mostrarPainel('login');

          document
            .getElementById('senhaLogin')
            ?.focus();
        }, 1000);
      } catch (erro) {
        mensagemCadastro.textContent =
          `❌ ${erro.message}`;

        mensagemCadastro.classList.add(
          'erro'
        );
      } finally {
        botaoConfirmarEmailCadastro.disabled =
          false;

        botaoConfirmarEmailCadastro.textContent =
          '✅ Confirmar e criar conta';
      }
    }
  );
}

const formularioProprietario =
  document.getElementById('formProprietario');

const emailProprietario =
  document.getElementById('emailProprietario');

const numeroProprietario =
  document.getElementById('numeroProprietario');

const botaoEnviarCodigoProprietario =
  document.getElementById(
    'enviarCodigoProprietario'
  );

const areaCodigoProprietario =
  document.getElementById(
    'areaCodigoProprietario'
  );

const codigoProprietario =
  document.getElementById('codigoProprietario');

const botaoConfirmarProprietario =
  document.getElementById(
    'confirmarProprietario'
  );

const mensagemProprietario =
  document.getElementById(
    'mensagemProprietario'
  );

function limparMensagemProprietario() {
  mensagemProprietario.textContent = '';
  mensagemProprietario.className =
    'mensagem-formulario';
}

botaoEnviarCodigoProprietario.addEventListener(
  'click',
  async () => {
    const email = emailProprietario.value
      .trim()
      .toLowerCase();

      const numero = numeroProprietario.value
        .trim();

    limparMensagemProprietario();

    if (!email || !numero) {
      mensagemProprietario.textContent =
          '❌ Informe o e-mail e o número do proprietário.';

      mensagemProprietario.classList.add('erro');
      return;
    }

    botaoEnviarCodigoProprietario.disabled = true;
    botaoEnviarCodigoProprietario.textContent =
      '⏳ Enviando...';

    try {
      const resposta = await fetch(
        '/api/proprietario/solicitar',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
              email,
              numero
          })
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          'Não foi possível enviar o código.'
        );
      }

      mensagemProprietario.textContent =
        '✅ Código enviado. Verifique o seu e-mail.';

      mensagemProprietario.classList.add('sucesso');

      areaCodigoProprietario.hidden = false;

      codigoProprietario.required = true;
      codigoProprietario.focus();
    } catch (erro) {
      mensagemProprietario.textContent =
        `❌ ${erro.message}`;

      mensagemProprietario.classList.add('erro');
    } finally {
      botaoEnviarCodigoProprietario.disabled = false;
      botaoEnviarCodigoProprietario.textContent =
        '📩 Enviar código';
    }
  }
);

formularioProprietario.addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    const email = emailProprietario.value
      .trim()
      .toLowerCase();

      const numero = numeroProprietario.value
        .trim();

    const codigo = codigoProprietario.value
      .trim();

    limparMensagemProprietario();

    if (!/^\d{6}$/.test(codigo)) {
      mensagemProprietario.textContent =
        '❌ Informe o código de 6 dígitos.';

      mensagemProprietario.classList.add('erro');
      return;
    }

    botaoConfirmarProprietario.disabled = true;
    botaoConfirmarProprietario.textContent =
      '⏳ Confirmando...';

    try {
      const resposta = await fetch(
        '/api/proprietario/confirmar',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            email,
              numero,
            codigo
          })
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          'Não foi possível confirmar o acesso.'
        );
      }

      mensagemProprietario.textContent =
        '✅ Acesso confirmado. Abrindo painel...';

      mensagemProprietario.classList.add('sucesso');

      window.location.replace('/');
    } catch (erro) {
      mensagemProprietario.textContent =
        `❌ ${erro.message}`;

      mensagemProprietario.classList.add('erro');
    } finally {
      botaoConfirmarProprietario.disabled = false;
      botaoConfirmarProprietario.textContent =
        '👑 Confirmar acesso';
    }
  }
);
