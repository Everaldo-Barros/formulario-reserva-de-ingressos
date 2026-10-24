const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const app = express();
const porta = 3000;

app.use(express.json());

// Carregar documentação Swagger
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Lista de jogos com data
const JOGOS_VALIDOS = [
  { nome: "Flamengo x Santos — 15/10/2026 · 16h00", data: new Date("2026-10-15T16:00:00") },
  { nome: "Palmeiras x Grêmio — 18/10/2026 · 19h30", data: new Date("2026-10-18T19:30:00") },
  { nome: "Corinthians x Bahia — 22/10/2026 · 21h00", data: new Date("2026-10-22T21:00:00") },
  { nome: "Cruzeiro x Vasco — 25/10/2026 · 15h00", data: new Date("2026-10-25T15:00:00") }
];

const NOMES_JOGOS_VALIDOS = JOGOS_VALIDOS.map(j => j.nome);

const SETORES_VALIDOS = {
  "Arquibancada — R$ 80,00": 80,
  "Arquibancada Superior — R$ 100,00": 100,
  "Cadeira Coberta — R$ 150,00": 150,
  "Setor VIP — R$ 300,00": 300
};

const FORMA_PAGAMENTO_VALIDA = ["PIX", "Cartão de Crédito", "Boleto Bancário"];

// Armazenamento em memória
const reservas = [];

// Validação completa
function validarDadosReserva(dados) {
  const erros = [];
  const camposObrigatorios = ["nome", "sobrenome", "email", "telefone", "jogo", "setor", "quantidade", "formaPagamento"];

  camposObrigatorios.forEach(campo => {
    if (!dados[campo] || String(dados[campo]).trim() === "") {
      erros.push({ campo, mensagem: `O campo "${campo}" é obrigatório` });
    }
  });

  if ((dados.nome || "").trim().length < 2) {
    erros.push({ campo: "nome", mensagem: "Nome deve ter pelo menos 2 caracteres" });
  }

  if ((dados.sobrenome || "").trim().length < 2) {
    erros.push({ campo: "sobrenome", mensagem: "Sobrenome deve ter pelo menos 2 caracteres" });
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(dados.email || "")) {
    erros.push({ campo: "email", mensagem: "E-mail inválido" });
  }

  const telefoneLimpo = String(dados.telefone || "").replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    erros.push({ campo: "telefone", mensagem: "Telefone deve ter 10 ou 11 dígitos" });
  }

  const jogoEncontrado = JOGOS_VALIDOS.find(j => j.nome === dados.jogo);
  if (!jogoEncontrado) {
    erros.push({ campo: "jogo", mensagem: "Jogo selecionado não é válido" });
  } else {
    const agora = new Date();
    if (jogoEncontrado.data < agora) {
      erros.push({ campo: "jogo", mensagem: "Não é possível reservar para jogos que já aconteceram" });
    }
  }

  if (!SETORES_VALIDOS.hasOwnProperty(dados.setor)) {
    erros.push({ campo: "setor", mensagem: "Setor selecionado não é válido" });
  }

  const quantidade = Number(dados.quantidade);
  if (isNaN(quantidade) || quantidade < 1 || quantidade > 10) {
    erros.push({ campo: "quantidade", mensagem: "Quantidade deve ser entre 1 e 10" });
  }

  if (!FORMA_PAGAMENTO_VALIDA.includes(dados.formaPagamento)) {
    erros.push({ campo: "formaPagamento", mensagem: "Forma de pagamento inválida" });
  }

  return { erros, telefoneLimpo, quantidade };
}

// Rota: Listar jogos válidos
app.get('/api/jogos', (req, res) => {
  res.json({ sucesso: true, jogos: NOMES_JOGOS_VALIDOS });
});

// Rota: Criar reserva
app.post('/api/enviar-formulario', (req, res) => {
  const dados = req.body;
  const { erros, telefoneLimpo, quantidade } = validarDadosReserva(dados);

  if (erros.length > 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Validação falhou. Verifique os campos abaixo.",
      totalErros: erros.length,
      erros
    });
  }

  const valorUnitario = SETORES_VALIDOS[dados.setor];
  const valorTotal = valorUnitario * quantidade;
  const codigo = `RES-${Date.now()}`;

  const novaReserva = {
    codigo,
    nomeCompleto: `${dados.nome.trim()} ${dados.sobrenome.trim()}`,
    email: dados.email.trim(),
    telefone: telefoneLimpo,
    jogo: dados.jogo,
    setor: dados.setor,
    quantidade,
    valorUnitario,
    valorTotal,
    formaPagamento: dados.formaPagamento,
    pedidoEspecial: dados.pedidoEspecial || "Nenhum",
    dataHora: new Date().toISOString()
  };

  reservas.push(novaReserva);

  res.status(201).json({
    sucesso: true,
    mensagem: "Reserva realizada com sucesso!",
    dadosConfirmados: novaReserva,
    reserva: {
      codigo,
      dataHora: novaReserva.dataHora,
      mensagem: "Ingressos reservados com sucesso! Confirmação enviada por e-mail."
    }
  });
});

// Rota: Atualizar reserva
app.put('/api/reserva/:codigo', (req, res) => {
  const { codigo } = req.params;
  const dados = req.body;
  const indice = reservas.findIndex(r => r.codigo === codigo);

  if (indice === -1) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Reserva não encontrada",
      codigo
    });
  }

  const { erros, telefoneLimpo, quantidade } = validarDadosReserva(dados);

  if (erros.length > 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Validação falhou. Verifique os campos abaixo.",
      totalErros: erros.length,
      erros
    });
  }

  const reservaAntiga = reservas[indice];
  const valorUnitario = SETORES_VALIDOS[dados.setor];
  const valorTotal = valorUnitario * quantidade;

  reservas[indice] = {
    ...reservaAntiga,
    nomeCompleto: `${dados.nome.trim()} ${dados.sobrenome.trim()}`,
    email: dados.email.trim(),
    telefone: telefoneLimpo,
    jogo: dados.jogo,
    setor: dados.setor,
    quantidade,
    valorUnitario,
    valorTotal,
    formaPagamento: dados.formaPagamento,
    pedidoEspecial: dados.pedidoEspecial || "Nenhum",
    dataHoraUltimaAtualizacao: new Date().toISOString()
  };

  res.json({
    sucesso: true,
    mensagem: "Reserva atualizada com sucesso!",
    dadosOriginais: {
      nomeCompleto: reservaAntiga.nomeCompleto,
      jogo: reservaAntiga.jogo,
      quantidade: reservaAntiga.quantidade,
      valorTotal: reservaAntiga.valorTotal
    },
    dadosAtualizados: reservas[indice],
    reserva: {
      codigo,
      dataHoraAtualizacao: reservas[indice].dataHoraUltimaAtualizacao,
      valorAnterior: reservaAntiga.valorTotal,
      valorAtual: valorTotal
    }
  });
});

// Rota: Excluir reserva
app.delete('/api/reserva/:codigo', (req, res) => {
  const { codigo } = req.params;
  const indice = reservas.findIndex(r => r.codigo === codigo);

  if (indice === -1) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Reserva não encontrada",
      codigo
    });
  }

  const reservaRemovida = reservas.splice(indice, 1)[0];

  res.json({
    sucesso: true,
    mensagem: "Reserva cancelada com sucesso!",
    reservaCancelada: {
      codigo: reservaRemovida.codigo,
      nomeCompleto: reservaRemovida.nomeCompleto,
      jogo: reservaRemovida.jogo,
      valorTotal: reservaRemovida.valorTotal,
      dataHoraCancelamento: new Date().toISOString()
    }
  });
});

app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
  console.log(`Documentação: http://localhost:${porta}/docs`);
  console.log(`Rotas disponíveis:`);
  console.log(`GET  /api/jogos`);
  console.log(`POST /api/enviar-formulario`);
  console.log(`PUT  /api/reserva/:codigo`);
  console.log(`DELETE /api/reserva/:codigo`);
});