const formulario = document.getElementById('formLogin');
const mensagem = document.getElementById('mensagemLogin');
const botao = document.getElementById('entrar');

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  botao.disabled = true;
  botao.textContent = '⏳ Entrando...';
  mensagem.textContent = '';

  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario,
        senha
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem || 'Não foi possível entrar.'
      );
    }

    window.location.replace('/');
  } catch (erro) {
    mensagem.textContent = `❌ ${erro.message}`;
  } finally {
    botao.disabled = false;
    botao.textContent = '🔓 Entrar';
  }
});
