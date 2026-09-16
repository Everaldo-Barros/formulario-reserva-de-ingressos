const express = require("express");
const { chromium } = require("playwright");
const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());

// Rota GET - Acessar formulário
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
        "nomeCompleto",
        "email",
        "confirmarEmail",
        "telefone",
        "quantidadeIngressos",
        "dataEvento",
        "aceitoTermos"
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

// Rota POST - Enviar formulário com validação
app.post("/api/enviar-formulario", async (req, res) => {
  const dados = req.body;
  const erros = [];

  const camposObrigatorios = [
    "nomeCompleto",
    "email",
    "confirmarEmail",
    "telefone",
    "quantidadeIngressos",
    "dataEvento",
    "aceitoTermos"
  ];

  // Verificar campos obrigatórios
  camposObrigatorios.forEach(campo => {
    if (dados[campo] === undefined || dados[campo] === null || dados[campo] === "") {
      erros.push({
        campo: campo,
        mensagem: `O campo "${campo}" é obrigatório`
      });
    }
  });

  if (erros.length > 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Campos obrigatórios não enviados",
      totalErros: erros.length,
      erros: erros,
      camposEsperados: camposObrigatorios
    });
  }

  // Validação - Nome Completo
  if (dados.nomeCompleto.trim().length < 3) {
    erros.push({
      campo: "nomeCompleto",
      mensagem: "Nome completo deve ter pelo menos 3 caracteres"
    });
  }

  // Validação - E-mail
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(dados.email)) {
    erros.push({
      campo: "email",
      mensagem: "E-mail inválido"
    });
  }

  // Validação - Confirmação de E-mail
  if (dados.confirmarEmail !== dados.email) {
    erros.push({
      campo: "confirmarEmail",
      mensagem: "E-mail e confirmação não coincidem"
    });
  }

  // Validação - Telefone
  const telefoneLimpo = dados.telefone.replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    erros.push({
      campo: "telefone",
      mensagem: "Telefone deve ter 10 ou 11 dígitos"
    });
  }

  // Validação - Quantidade de Ingressos
  const quantidade = parseInt(dados.quantidadeIngressos);
  if (isNaN(quantidade) || quantidade < 1 || quantidade > 10) {
    erros.push({
      campo: "quantidadeIngressos",
      mensagem: "Quantidade deve ser entre 1 e 10"
    });
  }

  // Validação - Data do Evento
  const dataEvento = new Date(dados.dataEvento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (dataEvento <= hoje) {
    erros.push({
      campo: "dataEvento",
      mensagem: "Data do evento deve ser futura"
    });
  }

  // Validação - Aceite dos Termos
  if (dados.aceitoTermos !== true) {
    erros.push({
      campo: "aceitoTermos",
      mensagem: "Você deve aceitar os termos e condições"
    });
  }

  // Retorno com erros
  if (erros.length > 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Validação falhou. Verifique os campos abaixo.",
      totalErros: erros.length,
      erros: erros
    });
  }

  // Retorno com sucesso
  res.json({
    sucesso: true,
    mensagem: "Reserva realizada com sucesso!",
    dadosConfirmados: {
      nomeCompleto: dados.nomeCompleto.trim(),
      email: dados.email,
      telefone: telefoneLimpo,
      quantidadeIngressos: quantidade,
      dataEvento: dados.dataEvento
    },
    reserva: {
      codigo: "RES-" + Date.now(),
      dataHora: new Date().toISOString(),
      mensagem: "Seus ingressos foram reservados. Em breve você receberá a confirmação por e-mail."
    }
  });
});

// Iniciar servidor
app.listen(PORTA, () => {
  console.log("API rodando em http://localhost:" + PORTA);
  console.log("GET  /api/acessar-formulario");
  console.log("POST /api/enviar-formulario");
});