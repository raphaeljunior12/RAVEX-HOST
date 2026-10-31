const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'marketplace.json'
);

function garantirArquivo() {
  fs.mkdirSync(path.dirname(ARQUIVO), {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(
      ARQUIVO,
      JSON.stringify({
        produtos: [],
        alugueis: [],
        submissoes: []
      }, null, 2) + '\n',
      'utf8'
    );
  }
}

function ler() {
  garantirArquivo();

  try {
    const dados = JSON.parse(
      fs.readFileSync(ARQUIVO, 'utf8')
    );

    return {
      produtos: Array.isArray(dados.produtos)
        ? dados.produtos
        : [],
      alugueis: Array.isArray(dados.alugueis)
        ? dados.alugueis
        : [],
      submissoes: Array.isArray(dados.submissoes)
        ? dados.submissoes
        : []
    };
  } catch {
    return {
      produtos: [],
      alugueis: [],
      submissoes: []
    };
  }
}

function salvar(dados) {
  garantirArquivo();

  const temporario = `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(dados, null, 2) + '\n',
    'utf8'
  );

  fs.renameSync(temporario, ARQUIVO);
}

function texto(valor, maximo = 500) {
  return String(valor || '')
    .trim()
    .slice(0, maximo);
}

function listarProdutos({
  tipo = null,
  somenteAtivos = false
} = {}) {
  let produtos = ler().produtos;

  if (tipo) {
    produtos = produtos.filter(
      item => item.tipo === tipo
    );
  }

  if (somenteAtivos) {
    produtos = produtos.filter(
      item => item.ativo === true
    );
  }

  return produtos;
}

function criarProduto(dados = {}) {
  const tipos = new Set([
    'api',
    'bot-venda',
    'bot-free',
    'script',
    'bot-aluguel'
  ]);

  const tipo = texto(dados.tipo, 30);
  const nome = texto(dados.nome, 100);
  const descricao = texto(
    dados.descricao,
    2000
  );

  if (!tipos.has(tipo)) {
    throw new Error('TIPO_INVALIDO');
  }

  if (nome.length < 2) {
    throw new Error('NOME_INVALIDO');
  }

  if (descricao.length < 3) {
    throw new Error('DESCRICAO_INVALIDA');
  }

  const gratuito =
    tipo === 'bot-free' ||
    dados.gratuito === true;

  const precoNumero = gratuito
    ? 0
    : Number(dados.preco || 0);

  if (
    !Number.isFinite(precoNumero) ||
    precoNumero < 0
  ) {
    throw new Error('PRECO_INVALIDO');
  }

  const agora = new Date().toISOString();

  const produto = {
    id: crypto.randomUUID(),
    tipo,
    nome,
    descricao,
    preco: precoNumero,
    moeda: texto(
      dados.moeda || 'AOA',
      10
    ),
    gratuito,
    versao: texto(dados.versao, 50) || null,

    /*
     * URL pública/documentação.
     * Nunca colocar tokens ou credenciais aqui.
     */
    url: texto(dados.url, 1000) || null,

    conteudoPublico:
      texto(dados.conteudoPublico, 10000) ||
      null,

    periodoAluguel:
      texto(dados.periodoAluguel, 100) ||
      null,

    ativo:
      dados.ativo === false
        ? false
        : true,

    criadoEm: agora,
    atualizadoEm: agora
  };

  const banco = ler();
  banco.produtos.push(produto);
  salvar(banco);

  return produto;
}

function atualizarProduto(id, alteracoes = {}) {
  const banco = ler();

  const indice = banco.produtos.findIndex(
    item => item.id === String(id)
  );

  if (indice === -1) {
    throw new Error(
      'PRODUTO_NAO_ENCONTRADO'
    );
  }

  const atual = banco.produtos[indice];

  const permitido = [
    'nome',
    'descricao',
    'preco',
    'moeda',
    'versao',
    'url',
    'conteudoPublico',
    'periodoAluguel',
    'ativo'
  ];

  const novo = { ...atual };

  for (const chave of permitido) {
    if (alteracoes[chave] === undefined) {
      continue;
    }

    if (chave === 'ativo') {
      novo.ativo =
        alteracoes.ativo === true;
      continue;
    }

    if (chave === 'preco') {
      const preco =
        Number(alteracoes.preco);

      if (
        !Number.isFinite(preco) ||
        preco < 0
      ) {
        throw new Error(
          'PRECO_INVALIDO'
        );
      }

      novo.preco = preco;
      continue;
    }

    novo[chave] = texto(
      alteracoes[chave],
      chave === 'conteudoPublico'
        ? 10000
        : 2000
    ) || null;
  }

  novo.atualizadoEm =
    new Date().toISOString();

  banco.produtos[indice] = novo;
  salvar(banco);

  return novo;
}

function removerProduto(id) {
  const banco = ler();

  const indice = banco.produtos.findIndex(
    item => item.id === String(id)
  );

  if (indice === -1) {
    throw new Error(
      'PRODUTO_NAO_ENCONTRADO'
    );
  }

  const [removido] =
    banco.produtos.splice(indice, 1);

  salvar(banco);

  return removido;
}

function solicitarAluguel({
  produtoId,
  contaId,
  grupoWhatsApp = '',
  observacao = ''
}) {
  const banco = ler();

  const produto = banco.produtos.find(
    item =>
      item.id === String(produtoId) &&
      item.tipo === 'bot-aluguel' &&
      item.ativo
  );

  if (!produto) {
    throw new Error(
      'BOT_ALUGUEL_NAO_ENCONTRADO'
    );
  }

  const pedido = {
    id: crypto.randomUUID(),
    produtoId: produto.id,
    contaId: String(contaId),
    grupoWhatsApp:
      texto(grupoWhatsApp, 300) || null,
    observacao:
      texto(observacao, 1000) || null,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  banco.alugueis.push(pedido);
  salvar(banco);

  return pedido;
}

function listarAlugueis({
  contaId = null
} = {}) {
  const pedidos = ler().alugueis;

  if (!contaId) {
    return pedidos;
  }

  return pedidos.filter(
    item =>
      item.contaId === String(contaId)
  );
}


function criarSubmissaoBotAluguel({
  contaId,
  confirmacaoId,
  nome,
  descricao,
  preco = 0,
  moeda = 'AOA',
  periodoAluguel = '',
  url = ''
}) {
  if (!contaId) {
    throw new Error('CONTA_INVALIDA');
  }

  const nomeLimpo = texto(nome, 100);
  const descricaoLimpa = texto(descricao, 2000);

  if (nomeLimpo.length < 2) {
    throw new Error('NOME_INVALIDO');
  }

  if (descricaoLimpa.length < 3) {
    throw new Error('DESCRICAO_INVALIDA');
  }

  const precoNumero = Number(preco);

  if (
    !Number.isFinite(precoNumero) ||
    precoNumero < 0
  ) {
    throw new Error('PRECO_INVALIDO');
  }

  const confirmacao = texto(confirmacaoId, 100);

  if (!confirmacao) {
    throw new Error('CONFIRMACAO_INVALIDA');
  }

  const banco = ler();

  const confirmacaoJaUsada =
    banco.submissoes.some(
      item =>
        item.confirmacaoId === confirmacao
    );

  if (confirmacaoJaUsada) {
    throw new Error('CONFIRMACAO_JA_USADA');
  }

  const agora = new Date().toISOString();

  const submissao = {
    id: crypto.randomUUID(),
    contaId: String(contaId),
    confirmacaoId: confirmacao,

    nome: nomeLimpo,
    descricao: descricaoLimpa,

    preco: precoNumero,
    moeda: texto(moeda || 'AOA', 10),

    periodoAluguel:
      texto(periodoAluguel, 100) || null,

    /*
     * Apenas URL pública/repositório informativo.
     * Uma submissão NÃO instala nem executa o bot.
     */
    url: texto(url, 1000) || null,

    status: 'pendente',
    motivo: null,

    criadoEm: agora,
    atualizadoEm: agora
  };

  banco.submissoes.push(submissao);
  salvar(banco);

  return submissao;
}

function listarSubmissoes({
  contaId = null,
  status = null
} = {}) {
  let itens = ler().submissoes;

  if (contaId) {
    itens = itens.filter(
      item =>
        item.contaId === String(contaId)
    );
  }

  if (status) {
    itens = itens.filter(
      item => item.status === String(status)
    );
  }

  return itens;
}

function decidirSubmissao({
  id,
  status,
  motivo = ''
}) {
  const permitidos =
    new Set(['aprovado', 'rejeitado']);

  if (!permitidos.has(status)) {
    throw new Error('STATUS_INVALIDO');
  }

  const banco = ler();

  const indice = banco.submissoes.findIndex(
    item => item.id === String(id)
  );

  if (indice === -1) {
    throw new Error(
      'SUBMISSAO_NAO_ENCONTRADA'
    );
  }

  const submissao = banco.submissoes[indice];

  if (submissao.status !== 'pendente') {
    throw new Error(
      'SUBMISSAO_JA_DECIDIDA'
    );
  }

  submissao.status = status;
  submissao.motivo =
    texto(motivo, 1000) || null;

  submissao.atualizadoEm =
    new Date().toISOString();

  let produto = null;

  if (status === 'aprovado') {
    const agora = new Date().toISOString();

    produto = {
      id: crypto.randomUUID(),
      tipo: 'bot-aluguel',

      nome: submissao.nome,
      descricao: submissao.descricao,

      preco: submissao.preco,
      moeda: submissao.moeda,
      gratuito: false,

      versao: null,
      url: submissao.url,
      conteudoPublico: null,

      periodoAluguel:
        submissao.periodoAluguel,

      ativo: true,

      /*
       * Identifica quem submeteu o anúncio.
       * Não concede acesso ao servidor.
       */
      contaProprietariaId:
        submissao.contaId,

      submissaoId:
        submissao.id,

      criadoEm: agora,
      atualizadoEm: agora
    };

    banco.produtos.push(produto);
  }

  banco.submissoes[indice] = submissao;
  salvar(banco);

  return {
    submissao,
    produto
  };
}

module.exports = {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  removerProduto,
  solicitarAluguel,
  listarAlugueis,
  criarSubmissaoBotAluguel,
  listarSubmissoes,
  decidirSubmissao
};
