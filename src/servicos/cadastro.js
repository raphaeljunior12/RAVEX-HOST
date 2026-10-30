const {
  criarConta,
  removerContaPorId
} = require('./contas');

const {
  validarCodigoLicenca,
  usarCodigoLicenca
} = require('./codigosLicenca');

async function cadastrarUsuario({
  nome,
  username,
  email,
  senha,
  confirmarSenha,
  codigo
}) {
  const senhaRecebida = String(senha || '');
  const confirmacao = String(confirmarSenha || '');
  const codigoRecebido = String(codigo || '').trim();

  if (senhaRecebida !== confirmacao) {
    throw new Error('SENHAS_DIFERENTES');
  }

  if (!codigoRecebido) {
    throw new Error('CODIGO_OBRIGATORIO');
  }

  /*
   * Fazemos a primeira validação antes de criar a conta.
   * Assim códigos inválidos ou esgotados são recusados
   * imediatamente.
   */
  const codigoValido =
    validarCodigoLicenca(codigoRecebido);

  if (!codigoValido) {
    throw new Error('CODIGO_INVALIDO_OU_ESGOTADO');
  }

  const conta = await criarConta({
    nome,
    username,
    email,
    senha: senhaRecebida
  });

  try {
    /*
     * usarCodigoLicenca valida novamente o código.
     * Essa segunda verificação é importante porque
     * o estado do código pode mudar entre operações.
     */
    const ativacao = usarCodigoLicenca({
      codigo: codigoRecebido,
      contaId: conta.id
    });

    return {
      sucesso: true,

      conta,

      licenca: ativacao.licenca,

      acesso: {
        plano: ativacao.plano,
        diasAdicionados:
          ativacao.diasAdicionados,

        usuarios: ativacao.usuarios
      }
    };
  } catch (erro) {
    /*
     * Se a ativação falhar depois da criação,
     * removemos imediatamente a conta incompleta.
     */
    const removida = removerContaPorId(
      conta.id
    );

    if (!removida) {
      const erroRollback =
        new Error('FALHA_ROLLBACK_CADASTRO');

      erroRollback.causa = erro.message;
      erroRollback.contaId = conta.id;

      throw erroRollback;
    }

    throw erro;
  }
}

module.exports = {
  cadastrarUsuario
};
