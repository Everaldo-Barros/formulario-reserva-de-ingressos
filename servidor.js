const express = require("express");
const { chromium } = require("playwright");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());

const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const JOGOS_VALIDOS = [
  "Flamengo x Santos — 15/10/2026 · 16h00",
  "Palmeiras x Grêmio — 18/10/2026 · 19h30",
  "Corinthians x Bahia — 22/10/2026 · 21h00",
  "Cruzeiro x Vasco — 25/10/2026 · 15h00"
];

const SETORES_VALIDOS = {
  "Arquibancada — R$ 80,00": 80,
  "Arquibancada Superior — R$ 100,00": 100,
  "Cadeira Coberta — R$ 150,00": 150,
  "Setor VIP — R$ 300,00": 300
};

const PAGAMENTO_VALIDO = ["PIX", "Cartão de Crédito", "Boleto Bancário"];

app.get("/api/acessar-formulario", async (req, res) => {
  const navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage();

  try {
    await pagina.goto("https://everaldo-barros.github.io/formulario-reserva-de-ingressos/", {
      waitUntil: "domcontentloaded",
      timeout: 15000
    });

    const botao = pagina.getByText("Acessar Formulário", { exact: true });
    await botao.waitFor({ state: "visible", timeout: 5000 });
    await botao.click();
    await pagina.waitForTimeout(2000);

    res.json({
      sucesso: true,
      mensagem: "Formulário acessado com sucesso",
      urlOrigem: "https://everaldo-barros.github.io/formulario-reserva-de-ingressos/",
      urlDestino: pagina.url(),
      camposEsperados: [
        "nome",
        "sobrenome",
        "email",
        "telefone",
        "jogo",
        "setor",
        "quantidade",
        "formaPagamento",
        "pedidoEspecial"
      ],
      timestamp: new Date().toISOString()
    });

  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: erro.message,
      tipo: erro.name
    });
  } finally {
    await navegador.close();
  }
});

app.post("/api/enviar-formulario", async (req, res) => {
  const dados = req.body;
  const erros = [];

  const camposObrigatorios = ["nome", "sobrenome", "email", "telefone", "jogo", "setor", "quantidade", "formaPagamento"];

  camposObrigatorios.forEach(campo => {
    if (dados[campo] === undefined || dados[campo] === null || dados[campo] === "") {
      erros.push({ campo, mensagem: `O campo "${campo}" é obrigatório` });
    }
  });

  if (erros.length > 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Campos obrigatórios não enviados",
      totalErros: erros.length,
      erros
    });
  }

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

  const telefoneLimpo = (dados.telefone || "").replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    erros.push({ campo: "telefone", mensagem: "Telefone deve ter 10 ou 11 dígitos" });
  }

  if (!JOGOS_VALIDOS.includes(dados.jogo)) {
    erros.push({ campo: "jogo", mensagem: "Jogo selecionado não é válido" });
  }

  if (!SETORES_VALIDOS.hasOwnProperty(dados.setor)) {
    erros.push({ campo: "setor", mensagem: "Setor selecionado não é válido" });
  }

  const quantidade = parseInt(dados.quantidade);
  if (isNaN(quantidade) || quantidade < 1 || quantidade > 10) {
    erros.push({ campo: "quantidade", mensagem: "Quantidade deve ser entre 1 e 10" });
  }

  if (!PAGAMENTO_VALIDO.includes(dados.formaPagamento)) {
    erros.push({ campo: "formaPagamento", mensagem: "Forma de pagamento inválida" });
  }

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

  res.json({
    sucesso: true,
    mensagem: "Reserva realizada com sucesso!",
    dadosConfirmados: {
      nomeCompleto: `${dados.nome.trim()} ${dados.sobrenome.trim()}`,
      email: dados.email,
      telefone: telefoneLimpo,
      jogo: dados.jogo,
      setor: dados.setor,
      quantidade,
      valorUnitario,
      valorTotal,
      formaPagamento: dados.formaPagamento,
      pedidoEspecial: dados.pedidoEspecial || "Nenhum"
    },
    reserva: {
      codigo: "RES-" + Date.now(),
      dataHora: new Date().toISOString(),
      mensagem: "Ingressos reservados com sucesso! Confirmação enviada por e-mail."
    }
  });
});

app.listen(PORTA, () => {
  console.log("API rodando em http://localhost:" + PORTA);
  console.log("Documentação Swagger: http://localhost:" + PORTA + "/docs");
});