# Formulario de Reserva de Ingressos

Este repositorio contem exercicios para fins didaticos em automacao Web. Alem das paginas estaticas, o projeto possui uma API em Node.js com Express para acessar o formulario publicado e validar uma reserva de ingressos.

## Visao geral do sistema

O projeto e composto por uma interface Web estatica e uma API local para exercicios de automacao e validacao:

```text
index.html
	|
	+-- formulario.html ---- css/estilo.css
	|
	+-- API local (servidor.js)
			|
			+-- GET /api/acessar-formulario -> Playwright -> GitHub Pages
			+-- POST /api/enviar-formulario -> validacao -> resposta JSON
```

### Componentes

| Componente | Responsabilidade |
| --- | --- |
| `index.html` | Pagina inicial com a apresentacao do simulador e link para o formulario |
| `formulario.html` | Formulario estatico de compra, com validacoes basicas executadas no navegador |
| `css/estilo.css` | Estilos compartilhados das paginas |
| `servidor.js` | Servidor Express, rotas da API e validacao do payload JSON |
| `package.json` | Dependencias e metadados do projeto |
| `package-lock.json` | Versoes exatas das dependencias instaladas |
| `.gitignore` | Arquivos locais que nao devem ser enviados ao repositorio |

### Fluxo do sistema

1. O usuario abre `index.html` ou a versao publicada no GitHub Pages.
2. O link **Acessar Formulario** leva para `formulario.html`.
3. O formulario executa uma validacao simples no navegador e exibe uma mensagem de sucesso ou erro.
4. A API pode ser iniciada separadamente com `node servidor.js`.
5. O `GET /api/acessar-formulario` automatiza o fluxo dos passos 1 e 2 com Playwright.
6. O `POST /api/enviar-formulario` recebe um JSON, valida os campos e gera um codigo de reserva para a resposta.

### Estado atual da integracao

O formulario HTML e a API ainda nao estao conectados por uma chamada `fetch`. Por isso, enviar o formulario pela pagina nao chama automaticamente `POST /api/enviar-formulario`.

Existem diferencas entre os campos da interface e os campos exigidos pela API:

- A interface possui `sobrenome`, `jogo`, `setor`, `pagamento`, `observacoes` e `concorda`.
- A API exige `nomeCompleto`, `confirmarEmail`, `quantidadeIngressos`, `dataEvento` e `aceitoTermos`.
- A API valida apenas `nomeCompleto`, `email`, `confirmarEmail`, `telefone`, `quantidadeIngressos`, `dataEvento` e `aceitoTermos`; os demais campos da interface nao fazem parte da resposta.

Essa separacao e intencional para os exercicios atuais: a pagina demonstra a interface e a API demonstra uma validacao de backend independente.

## Requisitos

- Node.js 18 ou superior
- npm

## Instalacao e execucao

1. Instale as dependencias:

	```bash
	npm install
	```

2. Instale o navegador usado pelo Playwright:

	```bash
	npx playwright install chromium
	```

3. Inicie a API:

	```bash
	node servidor.js
	```

Por padrao, a API fica disponivel em `http://localhost:3000`. A porta pode ser alterada pela variavel de ambiente `PORT`:

```bash
PORT=4000 node servidor.js
```

No Windows PowerShell:

```powershell
$env:PORT=4000; node servidor.js
```

## Endpoints

### `GET /api/acessar-formulario`

Abre a pagina inicial publicada no GitHub Pages usando Playwright, clica em **Acessar Formulario** e retorna a URL resultante.

Exemplo:

```bash
curl http://localhost:3000/api/acessar-formulario
```

Resposta de sucesso (`200`):

```json
{
	"sucesso": true,
	"mensagem": "Formulário acessado com sucesso",
	"urlOrigem": "https://everaldo-barros.github.io/formulario-reserva-de-ingressos/",
	"urlDestino": "https://everaldo-barros.github.io/formulario-reserva-de-ingressos/formulario.html",
	"camposEsperados": [
		"nomeCompleto",
		"email",
		"confirmarEmail",
		"telefone",
		"quantidadeIngressos",
		"dataEvento",
		"aceitoTermos"
	],
	"timestamp": "2026-09-15T12:00:00.000Z"
}
```

Se a pagina nao puder ser acessada ou o botao nao for encontrado, o endpoint retorna `500` com `sucesso: false`, `erro` e `tipo`.

### `POST /api/enviar-formulario`

Valida os dados de uma reserva. Envie um corpo JSON com o cabecalho `Content-Type: application/json`.

Exemplo:

```bash
curl -X POST http://localhost:3000/api/enviar-formulario \
	-H "Content-Type: application/json" \
	-d '{
		"nomeCompleto": "Maria da Silva",
		"email": "maria@example.com",
		"confirmarEmail": "maria@example.com",
		"telefone": "49999991234",
		"quantidadeIngressos": 2,
		"dataEvento": "2026-12-20",
		"aceitoTermos": true
	}'
```

Campos validados:

| Campo | Regra |
| --- | --- |
| `nomeCompleto` | Obrigatorio, com pelo menos 3 caracteres |
| `email` | Obrigatorio e deve ter formato de e-mail valido |
| `confirmarEmail` | Obrigatorio e igual a `email` |
| `telefone` | Obrigatorio, com 10 ou 11 digitos; formatacao e aceita |
| `quantidadeIngressos` | Numero inteiro entre 1 e 10 |
| `dataEvento` | Obrigatoria e deve ser uma data futura |
| `aceitoTermos` | Deve ser `true` |

Resposta de sucesso (`200`):

```json
{
	"sucesso": true,
	"mensagem": "✅ Reserva realizada com sucesso!",
	"dadosConfirmados": {
		"nomeCompleto": "Maria da Silva",
		"email": "maria@example.com",
		"telefone": "49999991234",
		"quantidadeIngressos": 2,
		"dataEvento": "2026-12-20"
	},
	"reserva": {
		"codigo": "RES-1757937600000",
		"dataHora": "2026-09-15T12:00:00.000Z",
		"mensagem": "Seus ingressos foram reservados. Em breve você receberá a confirmação por e-mail."
	}
}
```

Quando faltam campos obrigatorios, a API retorna `400` e tambem informa `camposEsperados`:

```json
{
	"sucesso": false,
	"mensagem": "Campos obrigatórios não enviados",
	"totalErros": 2,
	"erros": [
		{
			"campo": "nomeCompleto",
			"mensagem": "O campo \"nomeCompleto\" é obrigatório"
		},
		{
			"campo": "quantidadeIngressos",
			"mensagem": "O campo \"quantidadeIngressos\" é obrigatório"
		}
	],
	"camposEsperados": ["nomeCompleto", "email", "confirmarEmail", "telefone", "quantidadeIngressos", "dataEvento", "aceitoTermos"]
}
```

Quando os campos existem, mas algum valor e invalido, a API retorna `400` com a lista de erros:

```json
{
	"sucesso": false,
	"mensagem": "Validação falhou. Verifique os campos abaixo.",
	"totalErros": 1,
	"erros": [
		{
			"campo": "email",
			"mensagem": "E-mail inválido"
		}
	]
}
```

## Observacoes

- A API nao armazena reservas; o codigo de reserva e gerado apenas para a resposta atual.
- O endpoint `GET /api/acessar-formulario` depende de acesso a internet e do site publicado no GitHub Pages.
- O endpoint `POST /api/enviar-formulario` exige exatamente `nomeCompleto`, `email`, `confirmarEmail`, `telefone`, `quantidadeIngressos`, `dataEvento` e `aceitoTermos`.
- O formulario HTML atual ainda nao chama a API com `fetch` e possui nomes de campos diferentes, portanto a interface e a API continuam sendo executadas separadamente.
