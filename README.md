# CutSub

(anteriormente MyTube Cleaner)

Take back control of your YouTube.

**Estado atual: Etapa D3.3**: subscrições reais + organização local (pesquisa, filtros,
categorias, decisões Manter / Talvez / Remover e Limpeza Guiada).
A única alteração possível no YouTube é cancelar UMA subscrição de cada vez, com confirmação explícita
(e só em modo `real`; por defeito os cancelamentos são simulados).

## D3.3 — PWA (instalar como app) e GitHub Pages

* Instalável no PC (Windows) e no Android: manifesto, ícones 192/512 + maskable, service worker.
* O service worker guarda só os ficheiros da própria app. **Não** guarda nada da Google / YouTube:
sem internet, a app abre e diz que precisa de ligação.
* Versões novas: aviso «Há uma nova versão» → «Atualizar agora». As decisões não se perdem.
* Funciona em `/` (local) e em subpastas (`https://utilizador.github.io/cutsub/`).
* Publicação no **GitHub Pages** com `.github/workflows/deploy.yml` (verifica credenciais, testa, compila, publica).
* Guia passo a passo: [**docs/PUBLICAR\_E\_INSTALAR.md**](docs/PUBLICAR_E_INSTALAR.md).
* Faixa verde: «acesso de leitura» + «cancelamentos simulados» / «cancelamento real ativo».

## D3.2.1 — correção do carregamento incompleto

* Todas as páginas pedidas com `order=alphabetical` (ordem estável entre páginas).
* Cada página tem até 3 novas tentativas para erros temporários (rede, 5xx, limite de pedidos),
com espera progressiva (≈0,6 s → 1,2 s → 2,4 s). A quota diária esgotada não é repetida.
* Respostas incompletas, `nextPageToken` repetido e duplicados deixam de produzir listas parciais.
* Com sinais de instabilidade é feita uma leitura de confirmação (até 3 leituras no total).
* "Atualizar lista" mantém a lista atual até a nova estar completa; se falhar, a lista anterior fica.
* Um só carregamento de cada vez; resultados antigos nunca substituem os mais recentes.
* Consola do browser: `\[youtube] Leitura N: X subscrições em Y página(s)…` ajuda a diagnosticar.

### Instalar ao lado da D3.2

Igual à D3.2: descompacta para uma pasta nova (`cutsub-d3.2.1`), copia o `.env.local`,
`npm install`, `npm run test:classifier`, `npm run build`, `npm run dev`. Os dados guardados são os mesmos.

## D3.2 — novidades

* **Cancelar subscrição no YouTube** (botão próprio, só em canais já marcados "Remover"),
sempre com confirmação e um canal de cada vez. "Remover" continua a ser só uma decisão local.
* **Modo de cancelamento**: `simulated` por defeito (nada muda no YouTube). Para cancelamentos reais,
`VITE\_CUTSUB\_CANCEL\_MODE=real` no `.env.local` e o scope `youtube.force-ssl` na Google Cloud
(ver [docs/GOOGLE\_CLOUD\_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md), secção D3.2).
* **Exportar / Importar backup** das decisões (no fundo do Início). Sem tokens.
* Página Canais: as categorias clicáveis são o único seletor de categoria.
* Correções do classificador (ver `tests/classifier.test.ts`, secção D3.2).

## Instalar ao lado da D3.1 (sem a substituir)

1. Descompacta o zip para uma pasta **nova**, por exemplo `Documents\\cutsub-d3.2`.
Não descompactes por cima da pasta da D3.1.
2. Copia o `.env.local` da pasta da D3.1 para a pasta nova.
3. Na pasta nova: `npm install`, `npm run test:classifier`, `npm run build`, `npm run dev`.
4. As duas versões usam o mesmo endereço (`http://localhost:5173`) e por isso **partilham as mesmas
decisões guardadas** no browser (chave `mytube-cleaner-review-v1`, formato inalterado).
Não corras as duas ao mesmo tempo (a porta é a mesma). Para voltar à D3.1, para a D3.2
(`Ctrl+C`) e corre `npm run dev` na pasta da D3.1.
5. **Antes de testar o cancelamento real**, usa **Exportar backup** e guarda o ficheiro.

## Como correr

Requisitos: **Node.js 20.19 ou superior** (`node -v` para confirmar).

```bash
npm install
npm run dev
```

Abre http://localhost:5173

### Configurar o login Google (Etapa B)

Segue o guia [**docs/GOOGLE\_CLOUD\_SETUP.md**](docs/GOOGLE_CLOUD_SETUP.md), que inclui a lista de testes.
Em resumo: cria um Client ID OAuth (Web application, origem `http://localhost:5173`) e coloca-o em `.env.local`:

```
VITE\_GOOGLE\_CLIENT\_ID=....apps.googleusercontent.com
```

### Testar no telemóvel (mesma rede Wi-Fi)

```bash
npm run dev -- --host
```

O terminal mostra um endereço `Network: http://192.168.x.x:5173`. Abre-o no telemóvel.
Nesse endereço o login Google não funciona (a Google só aceita `localhost`), mas podes usar
**"Ver demonstração com dados fictícios"** para testar a interface.

### Testes do classificador de categorias

```bash
npm run test:classifier
```

Corre os casos reais (Câmara dos Deputados, DroneMood, Dacia, 35 milímetros, Alexandre Garcia…) e os casos negativos com o test runner do Node
(Node 22.18+ ou 24). Não precisa de dependências extra.

### Só em desenvolvimento (`npm run dev`)

* **Ver demonstração com dados fictícios**: entra na app sem conta Google.
* **Simular sessão expirada**: botão no fundo do Início, para testar a expiração sem esperar 1 hora.

Nenhum dos dois aparece no build de produção (`npm run build`).

## Estrutura

```
src/
├── App.tsx                 # escolhe o ecrã: inicial, app ou sessão expirada
├── auth/
│   ├── googleAuth.ts       # wrapper da Google Identity Services (login, revogação)
│   ├── loadGis.ts          # carrega o script oficial da Google
│   ├── gis.d.ts            # tipos mínimos da GIS
│   └── AuthContext.tsx     # estado da sessão; token só em memória
├── api/
│   ├── youtubeClient.ts    # GET autenticado à YouTube Data API + tradução de erros HTTP
│   └── subscriptions.ts    # subscriptions.list: paginação completa + normalização
├── config/env.ts           # leitura e validação do Client ID
├── components/             # Logo, ícones, navegação, avatar, loader, DEMO
├── data/
│   ├── SubscriptionSource.ts  # interface comum (DEMO ou YouTube)
│   ├── demoSource.ts          # dados fictícios (só em desenvolvimento)
│   ├── youtubeSource.ts       # dados reais (YouTube Data API)
│   └── useSubscriptions.ts    # carregamento com cancelamento
├── domain/
│   ├── channel.ts          # modelo normalizado de canal
│   └── errors.ts           # erros de autenticação e mensagens amigáveis
├── features/
│   ├── landing/            # ecrã inicial + estados do botão de login
│   ├── session/            # ecrã "A tua sessão expirou"
│   ├── home/               # estrutura da app (topbar, navegação, separadores)
│   ├── dashboard/          # cartão de total + "Em breve"
│   ├── channels/           # cartão, lista progressiva, pesquisa, filtros, estados
│   └── cleanup/            # Limpeza Guiada, sessão, decisões e categorias
├── domain/review.ts        # decisões, categorias, filtros e contadores
├── services/
│   ├── categoryClassifier.ts  # classificador local (pesos, evidência explícita, contexto, tema > formato)
│   └── reviewStorage.ts       # decisões em localStorage (mytube-cleaner-review-v1)
├── styles/tokens.css       # design tokens (cores, espaçamentos, raios)
└── utils/format.ts         # datas, números, iniciais
```

## Privacidade

Sem base de dados, sem servidor, sem analytics, sem IA externa.

* **Guardado no browser (localStorage, chave `mytube-cleaner-review-v1`)**: apenas, por channelId,
a decisão (Manter/Talvez/Remover) e a categoria escolhida manualmente. Nada mais: nem nomes,
nem descrições, nem tokens. Fica guardado mesmo depois de terminar sessão, para continuares depois.
Para apagar: ferramentas do programador → Application → Local Storage → localhost:5173.
* O modo DEMO usa uma chave separada (`mytube-cleaner-review-demo-v1`).
* O login pede só `youtube.readonly`. `youtube.force-ssl` só é pedido no primeiro cancelamento real,
num token separado, só em memória, revogado ao terminar sessão.
* O access token fica só em memória (não vai para localStorage, cookies ou consola).
* Fechar o separador termina a sessão; "Terminar sessão" revoga o acesso junto da Google.
* Não existe Client Secret neste projeto.
* As subscrições ficam só na memória da página: terminar sessão ou recarregar apaga-as.
* Quota: ler as subscrições custa 1 unidade por página de 50 (ex.: 600 canais = 12 unidades).
A lista é carregada uma vez por login; "Atualizar lista" só pede de novo quando carregas no botão.
* CutSub D3.3 — Ativação dos cancelamentos reais.

