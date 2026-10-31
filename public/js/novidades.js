(function () {
  'use strict';

  ravexCriarDestinoMenu(
    'novidades',
    'Novidades',
    'Acompanha os avisos e as atualizações da RAVEX-HOST.'
  );

  async function ravexRenderizarNovidades() {
    const destino = document.querySelector(
      '[data-ravex-destino="novidades"]'
    );
    if (!destino) return;

    const proprietario = minhaConta?.tipo === 'proprietario';

    destino.innerHTML = `
      <section class="ravex-novidades-secao">
        <div class="ravex-novidades-topo">
          <div>
            <h3>📰 Novidades da RAVEX-HOST</h3>
            <p>Informações, atualizações e avisos da plataforma.</p>
          </div>
          <button type="button" class="ravex-btn-secundario" id="ravexAtualizarNovidades">
            Atualizar
          </button>
        </div>

        ${proprietario ? `
          <form id="ravexFormularioNovidade" class="ravex-novidade-formulario">
            <h3>Publicar novidade</h3>
            <label>Título</label>
            <input name="titulo" maxlength="120" minlength="3" required>

            <label>Categoria</label>
            <select name="tipo">
              <option value="novidade">Novidade</option>
              <option value="atualizacao">Atualização</option>
              <option value="manutencao">Manutenção</option>
              <option value="aviso">Aviso</option>
              <option value="seguranca">Segurança</option>
            </select>

            <label>Mensagem</label>
            <textarea name="conteudo" rows="5" minlength="3" maxlength="5000" required></textarea>

            <label class="ravex-novidade-opcao">
              <input type="checkbox" name="importante">
              Marcar como importante
            </label>

            <label class="ravex-novidade-opcao">
              <input type="checkbox" name="publicada" checked>
              Publicar imediatamente
            </label>

            <button type="submit" class="ravex-btn-principal">Publicar</button>
            <p id="ravexMensagemNovidade" aria-live="polite"></p>
          </form>
        ` : ''}

        <div id="ravexListaNovidades" class="ravex-novidades-lista">
          <p>A carregar novidades...</p>
        </div>
      </section>
    `;

    const lista = destino.querySelector('#ravexListaNovidades');
    const mensagem = destino.querySelector('#ravexMensagemNovidade');

    async function carregar() {
      lista.innerHTML = '<p>A carregar novidades...</p>';

      try {
        const url = proprietario
          ? '/api/novidades?todas=1'
          : '/api/novidades';

        const resposta = await ravexFetchJSON(url);
        const itens = Array.isArray(resposta.novidades)
          ? resposta.novidades
          : [];

        if (!itens.length) {
          lista.innerHTML =
            '<div class="ravex-market-vazio">Ainda não existem novidades.</div>';
          return;
        }

        lista.innerHTML = itens.map(item => {
          const data = item.criadaEm
            ? new Date(item.criadaEm).toLocaleString('pt-PT')
            : '';

          return `
            <article class="ravex-novidade-card">
              <div class="ravex-novidade-card-topo">
                <span class="ravex-novidade-tipo">
                  ${ravexEscaparHtml(item.tipo || 'novidade')}
                </span>
                ${item.importante
                  ? '<span class="ravex-novidade-importante">Importante</span>'
                  : ''}
                ${proprietario && item.publicada === false
                  ? '<span class="ravex-novidade-rascunho">Não publicada</span>'
                  : ''}
              </div>
              <h4>${ravexEscaparHtml(item.titulo || 'Sem título')}</h4>
              <p class="ravex-novidade-texto">
                ${ravexEscaparHtml(item.conteudo || '')}
              </p>
              <small>${ravexEscaparHtml(data)}</small>
            </article>
          `;
        }).join('');
      } catch (erro) {
        lista.innerHTML =
          `<p class="ravex-mensagem-erro">${ravexEscaparHtml(erro.message)}</p>`;
      }
    }

    destino.querySelector('#ravexAtualizarNovidades')
      ?.addEventListener('click', carregar);

    const formulario = destino.querySelector('#ravexFormularioNovidade');

    formulario?.addEventListener('submit', async evento => {
      evento.preventDefault();

      const botao = formulario.querySelector('[type="submit"]');
      const dados = new FormData(formulario);

      const corpo = {
        titulo: String(dados.get('titulo') || '').trim(),
        tipo: String(dados.get('tipo') || 'novidade'),
        conteudo: String(dados.get('conteudo') || '').trim(),
        importante: dados.has('importante'),
        publicada: dados.has('publicada')
      };

      botao.disabled = true;
      ravexMensagem(mensagem, 'A publicar...');

      try {
        await ravexFetchJSON('/api/proprietario/novidades', {
          method: 'POST',
          body: JSON.stringify(corpo)
        });

        formulario.reset();
        formulario.querySelector('[name="publicada"]').checked = true;
        ravexMensagem(mensagem, 'Novidade criada com sucesso.');
        await carregar();
      } catch (erro) {
        ravexMensagem(mensagem, erro.message, true);
      } finally {
        botao.disabled = false;
      }
    });

    await carregar();
  }

  const botao = document.getElementById('menuNovidades');

  if (botao) {
    botao.addEventListener('click', () => {
      window.navegarPainel('novidades');

      if (typeof fecharMenuRavex === 'function') {
        fecharMenuRavex({ devolverFoco: false });
      }
    });
  }

  const navegarOriginal = window.navegarPainel;

  if (typeof navegarOriginal === 'function') {
    window.navegarPainel = function (pagina) {
      const resultado = navegarOriginal.apply(this, arguments);

      if (pagina === 'novidades') {
        void ravexRenderizarNovidades();
      }

      return resultado;
    };
  }

  window.ravexRenderizarNovidades = ravexRenderizarNovidades;
})();
