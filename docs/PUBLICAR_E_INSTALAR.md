# CutSub — publicar no GitHub Pages e instalar (D3.3)

Objetivo: usares a CutSub com a tua conta Google **no PC e no telemóvel Android**, a partir de um
endereço **https://** gratuito, e instalá-la como app (ícone, janela própria).

Endereço final (exemplo): **`https://O-TEU-UTILIZADOR.github.io/cutsub/`**

> **Nada disto é feito automaticamente.** Tu crias o repositório, publicas e alteras a Google Cloud.
> A CutSub não publica nada nem mexe na tua conta Google sozinha.

---

## 0. Antes de começar — o que é público e o que não é

- O repositório do GitHub Pages gratuito é **público**: qualquer pessoa pode ver o código.
  (Pages a partir de repositório privado exige um plano pago do GitHub.)
- Isso **não é um problema de segurança**: a CutSub não tem segredos.
  - O **Client ID** da Google é público por natureza (aparece em qualquer site que usa login Google).
    Mesmo assim, não fica no código: fica numa *variável* do repositório.
  - **Não existe Client Secret** na CutSub. Nunca o coloques no GitHub.
  - O ficheiro **`.env.local` nunca deve ir para o GitHub** (o `.gitignore` já o exclui).
    O processo de publicação **recusa-se a publicar** se encontrar um `.env.local` ou algo parecido com um Client Secret.
- As tuas decisões (Manter/Talvez/Remover) **não vão para o GitHub**: ficam só no browser de cada dispositivo.

---

## 1. Criar o repositório (uma vez)

1. Em https://github.com → **New repository**.
   - *Repository name*: **`cutsub`** (o endereço fica `…github.io/cutsub/`).
   - **Public**. Não marques "Add a README".
   - **Create repository**.
2. Envia os ficheiros da pasta `cutsub-d3.3` **com o GitHub Desktop** (recomendado, como no LevaBota):
   - *File → Add local repository* → escolhe a pasta `cutsub-d3.3` (se perguntar, *create a repository* nessa pasta).
   - Confirma na lista de alterações que **não aparece** `.env.local` nem `node_modules`.
   - *Commit to main* → *Publish repository* → escolhe a conta e o nome `cutsub` → desmarca *Keep this code private*.

   > Pelo site também funciona (*uploading an existing file*), mas o upload pelo browser pode não incluir
   > a pasta **`.github`** (necessária para a publicação automática). Com o GitHub Desktop não há esse risco.

## 2. Configurar o repositório (uma vez)

1. **Settings → Pages** → *Build and deployment* → *Source*: **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → separador *Variables* → New repository variable**:

   | Name | Value |
   |---|---|
   | `VITE_GOOGLE_CLIENT_ID` | o teu Client ID (o mesmo do `.env.local`, termina em `.apps.googleusercontent.com`) |
   | `VITE_CUTSUB_CANCEL_MODE` | *(opcional)* não cries, ou deixa vazio → cancelamentos **simulados**. Só `real` quando quiseres cancelar a sério |

3. **Actions** → *Publicar CutSub* → **Run workflow** (ou faz um novo commit).
   Ao fim de 1–2 minutos aparece um visto verde e o endereço: `https://O-TEU-UTILIZADOR.github.io/cutsub/`.

O que a publicação faz sozinha: verifica que não há credenciais privadas, corre os testes do classificador,
compila com a pasta certa (`/cutsub/`) e publica.

## 3. Autorizar o endereço na Google Cloud (uma vez)

Sem isto o login falha com **`origin_mismatch`**.

1. https://console.cloud.google.com → projeto da CutSub → **Google Auth Platform → Clients** → o teu cliente *Web application*.
2. **Authorized JavaScript origins** → **Add URI** → escreve **só a origem, sem `/cutsub` e sem barra no fim**:

   ```
   https://O-TEU-UTILIZADOR.github.io
   ```

3. **Mantém** `http://localhost:5173` (para continuares a usar a versão local). **Save**.
4. **Audience** → continua em **Testing**, com o teu email em **Test users** (ver secção 8).
5. *(Só para cancelamento real)* **Data Access**: `youtube.force-ssl` deve estar na lista (ver `GOOGLE_CLOUD_SETUP.md`, secção D3.2).

As alterações podem demorar de 5 minutos a algumas horas.

## 4. Testar o login no endereço publicado

1. No PC, abre `https://O-TEU-UTILIZADOR.github.io/cutsub/` no Chrome ou Edge.
2. **Ligar ao YouTube** → escolhe a conta → aceita (aparece o aviso «A Google não validou esta app»: é normal em Testing → *Continuar*).
3. Deve aparecer a faixa verde e o total das tuas subscrições. Faz **Atualizar lista** e confirma o total.
4. Problemas:
   - `origin_mismatch` → confirma a origem do passo 3 (https, sem `/cutsub`, sem barra) e espera uns minutos.
   - «A ligação à Google ainda não está configurada» → falta a variável `VITE_GOOGLE_CLIENT_ID` (passo 2) → volta a correr o workflow.

## 5. Instalar

### PC com Windows (Chrome ou Edge)
1. Abre o endereço da CutSub.
2. Clica em **Instalar** (ícone de ecrã com seta na barra de endereço) ou no cartão **Instalar a CutSub** no Início.
3. A CutSub fica no menu Iniciar; podes afixá-la na barra de tarefas.

### Telemóvel ou tablet Android (Chrome)
1. Abre o endereço da CutSub no Chrome.
2. Toca em **Instalar** (cartão da CutSub) ou **⋮ → Instalar app** / **Adicionar ao ecrã principal**.
3. O ícone aparece no ecrã principal.

## 6. Atualizar para uma versão nova (sem perder dados)

1. Substitui os ficheiros na pasta do repositório pelos da versão nova (mantém a pasta `.git`; não copies `.env.local`).
2. GitHub Desktop → *Commit to main* → **Push origin**.
3. O GitHub publica sozinho (1–2 min). O GitHub Pages guarda ficheiros em cache até ~10 minutos.
4. Na app aparece **«Há uma nova versão da CutSub» → Atualizar agora**.
   As decisões ficam guardadas (estão no browser, não nos ficheiros da app).
   O botão espera se estiver a decorrer um cancelamento ou uma atualização da lista.

## 7. Dados em vários dispositivos

- Cada dispositivo (e cada endereço) guarda as **suas** decisões. **Não há sincronização automática.**
- `http://localhost:5173` e `https://…github.io/cutsub/` também têm dados **separados**.
- Para passar decisões: **Início → Exportar backup** no dispositivo de origem → envia o ficheiro
  (email, Google Drive…) → **Início → Importar backup** no outro.
- Para começar a usar a versão publicada com as decisões que já tens no PC: exporta em `localhost:5173`
  e importa no endereço publicado.
- Desinstalar a app ou «limpar dados do site» **apaga** as decisões desse dispositivo: faz backup antes.

## 8. Login Google: limitações do modo Testing (importante)

Para uso pessoal, o modo **Testing** da Google Cloud é o caminho prático, mas **não foi pensado para uso permanente sem limitações**:

- **Só entram os emails em *Test users*** (máximo 100). Qualquer outra conta é recusada.
- Aparece sempre o aviso **«A Google não validou esta app»** ao autorizar.
- Em Testing, a Google faz expirar ao fim de **7 dias** os acessos de longa duração (*refresh tokens*).
  A CutSub não os usa (só tokens de 1 hora, em memória), mas conta com a possibilidade de a Google voltar a
  mostrar o ecrã de consentimento de tempos a tempos.
- **Sessão de ~1 hora**, só em memória: depois disso, ou ao fechar a janela da app, voltas a carregar em
  «Ligar ao YouTube». É intencional (nenhum token fica guardado no dispositivo).
- **Quota da API**: 10 000 unidades/dia por projeto. Ler 500 subscrições ≈ 11–22 unidades; cada cancelamento real = 50.
- Para sair do modo Testing ("In production") com scopes do YouTube, a Google exige **verificação da app**:
  política de privacidade, página inicial num domínio verificado (normalmente um domínio próprio), justificação
  dos scopes e, para o YouTube, um vídeo demonstrativo. O processo pode demorar semanas. Não é necessário para uso pessoal.
- O logótipo atual (quadrado vermelho com triângulo "play") é parecido com o do YouTube; numa verificação
  futura isso pode ser questionado (ver relatório da D3.3).

### Login dentro da app instalada — a validar por ti
- **Windows (Chrome/Edge)**: a janela de login da Google abre por cima da app — esperado que funcione.
- **Android**: a janela de login pode abrir como separador do Chrome por cima da app. Se aparecer
  «A janela da Google foi fechada» sem teres fechado nada, usa a CutSub no Chrome normal (o endereço) e
  diz-me para eu analisar.
- **iPhone/iPad**: não é o foco desta versão e o login em app instalada não foi validado.

## 9. Continuar a usar localmente

Nada muda: `npm run dev` → http://localhost:5173 (sem service worker, como antes).
Para experimentar a versão de produção no PC: `npm run build` e depois `npm run preview` → http://localhost:5173.
