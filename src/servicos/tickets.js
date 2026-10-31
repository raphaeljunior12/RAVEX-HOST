const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRETORIO_DADOS = path.join(
  __dirname,
  '..',
  '..',
  'dados'
);

const ARQUIVO = path.join(
  DIRETORIO_DADOS,
  'tickets.json'
);

function garantirArquivo() {
  fs.mkdirSync(
    DIRETORIO_DADOS,
    { recursive: true }
  );

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(
      ARQUIVO,
      '[]',
      'utf8'
    );
  }
}

function listarTickets() {
  garantirArquivo();

  try {
    const dados = JSON.parse(
      fs.readFileSync(ARQUIVO, 'utf8')
    );

    return Array.isArray(dados)
      ? dados
      : [];
  } catch {
    return [];
  }
}

function salvarTickets(tickets) {
  garantirArquivo();

  const temporario =
    `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(tickets, null, 2),
    'utf8'
  );

  fs.renameSync(
    temporario,
    ARQUIVO
  );
}

function limparTexto(valor, maximo) {
  return String(valor || '')
    .trim()
    .slice(0, maximo);
}

function criarTicket({
  contaId,
  categoria,
  assunto,
  descricao
}) {
  if (!contaId) {
    throw new Error(
      'Conta inválida.'
    );
  }

  categoria = limparTexto(
    categoria,
    40
  );

  assunto = limparTexto(
    assunto,
    120
  );

  descricao = limparTexto(
    descricao,
    3000
  );

  if (!categoria) {
    throw new Error(
      'Selecione uma categoria.'
    );
  }

  if (assunto.length < 3) {
    throw new Error(
      'Informe o assunto.'
    );
  }

  if (descricao.length < 10) {
    throw new Error(
      'Descreva melhor o problema.'
    );
  }

  const tickets =
    listarTickets();

  const agora = Date.now();

  const ticket = {
    id:
      'RXT-' +
      crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase(),

    contaId,

    categoria,
    assunto,
    descricao,

    status: 'aberto',
    criadoEm: agora,
    atualizadoEm: agora
  };

  tickets.unshift(ticket);

  salvarTickets(tickets);

  return ticket;
}

function listarTicketsConta(
  contaId
) {
  return listarTickets()
    .filter(
      ticket =>
        ticket.contaId === contaId
    );
}

function obterTicket(id) {
  return listarTickets()
    .find(
      ticket =>
        ticket.id === id
    ) || null;
}

function atualizarStatusTicket(
  id,
  status
) {
  const permitidos = [
    'aberto',
    'em_analise',
    'resolvido',
    'fechado'
  ];

  if (!permitidos.includes(status)) {
    throw new Error(
      'Estado de ticket inválido.'
    );
  }

  const tickets =
    listarTickets();

  const indice =
    tickets.findIndex(
      ticket =>
        ticket.id === id
    );

  if (indice === -1) {
    throw new Error(
      'Ticket não encontrado.'
    );
  }

  tickets[indice].status =
    status;

  tickets[indice].atualizadoEm =
    Date.now();

  salvarTickets(tickets);

  return tickets[indice];
}

function contarTicketsAbertos() {
  return listarTickets()
    .filter(
      ticket =>
        ticket.status === 'aberto' ||
        ticket.status === 'em_analise'
    )
    .length;
}

module.exports = {
  listarTickets,
  listarTicketsConta,
  obterTicket,
  criarTicket,
  atualizarStatusTicket,
  contarTicketsAbertos
};
