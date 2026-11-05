# Configurar a Google Cloud para a CutSub

Guia para a **Etapa B**. Demora cerca de 10 minutos.

No fim vais ter **um Client ID** num ficheiro `.env.local`.
**Não precisas** de API Key nem de Client Secret.

> Os nomes dos menus podem variar ligeiramente: a Google atualiza a consola com frequência.
> A área de OAuth chama-se agora **Google Auth Platform** (antes era *OAuth consent screen*).

---

## Passo 1 — Criar o projeto

1. Abre https://console.cloud.google.com e entra com a tua conta Google.
2. No seletor de projetos, no topo, escolhe **New project**.
3. Nome: `mytube-cleaner`. Carrega em **Create**.
4. Confirma que o projeto novo está selecionado no topo da página.

## Passo 2 — Ativar a YouTube Data API v3

1. Menu ☰ → **APIs & Services** → **Library**.
2. Pesquisa `YouTube Data API v3` e abre o resultado.
3. Carrega em **Enable**.

O login funciona sem este passo, mas a Etapa C precisa dele. Além disso, sem a API ativa, o scope do YouTube pode não aparecer no Passo 5.

## Passo 3 — Configurar a Google Auth Platform

1. Menu ☰ → **Google Auth Platform** (ou **APIs & Services → OAuth consent screen**).
2. Carrega em **Get started** e preenche o assistente:
   - **App Information**
     - *App name*: `MyTube Cleaner`
     - *User support email*: o teu email
   - **Audience**: escolhe **External**
   - **Contact Information**: o teu email
   - **Finish**: aceita a política de dados de utilizador e carrega em **Continue** e depois **Create**.

> **Se a consola recusar o nome** (a Google pode rejeitar nomes parecidos com marcas suas), usa provisoriamente `MTC Cleaner (dev)`. Este nome só aparece no ecrã de consentimento e não afeta a app.

## Passo 4 — Adicionar-te como utilizador de teste

1. Na Google Auth Platform, abre o separador **Audience**.
2. Confirma que o *Publishing status* está em **Testing**. **Não** carregues em *Publish app*.
3. Em **Test users**, carrega em **Add users**, escreve o teu email Gmail e guarda.

Só as contas desta lista (até 100) conseguem entrar enquanto a app estiver em teste.

## Passo 5 — Declarar o scope (só leitura)

1. Abre o separador **Data Access**.
2. Carrega em **Add or remove scopes**.
3. No filtro, pesquisa `youtube.readonly`.
4. Marca **`.../auth/youtube.readonly`**, com a descrição *View your YouTube account*.
5. Carrega em **Update** e depois em **Save**, no fundo da página.

⚠️ Escolhe **apenas** `youtube.readonly`. Não marques `.../auth/youtube` nem `youtube.force-ssl`, porque esses dão permissão de escrita.

## Passo 6 — Criar o Client ID

1. Abre o separador **Clients** e carrega em **Create client**.
2. *Application type*: **Web application**.
3. *Name*: `MyTube Cleaner – local`.
4. Em **Authorized JavaScript origins**, carrega em **Add URI** e escreve exatamente:

   ```
   http://localhost:5173
   ```

   Sem barra no fim, com `http` (não `https`) e `localhost` (não `127.0.0.1`).
5. Deixa **Authorized redirect URIs** vazio, porque o fluxo usa popup.
6. Carrega em **Create**.
7. Copia o **Client ID**. Termina em `.apps.googleusercontent.com`.

> Se a consola mostrar também um **Client Secret**, **ignora-o**. Não o copies para lado nenhum: esta app não o usa.

⏱️ As alterações podem demorar **de 5 minutos a algumas horas** a ficar ativas. Se o login falhar logo a seguir com `origin_mismatch`, espera um pouco e tenta outra vez.

## Passo 7 — Colocar o Client ID no projeto

Na pasta `mytube-cleaner`, cria um ficheiro chamado **`.env.local`** (ao lado do `.env.example`) com:

```
VITE_GOOGLE_CLIENT_ID=O_TEU_CLIENT_ID.apps.googleusercontent.com
```

Depois **reinicia** o servidor: para-o com `Ctrl+C` e corre `npm run dev` outra vez. O Vite só lê o `.env.local` ao arrancar.

O `.env.local` está no `.gitignore`, por isso nunca é enviado para o git.

---

## Testar a Etapa B

Abre **http://localhost:5173** (exatamente este endereço) e experimenta:

| # | Teste | Resultado esperado |
|---|---|---|
| 1 | Carregar em **Ligar ao YouTube** | Abre o popup da Google com escolha de conta |
| 2 | Escolher a conta (e o canal, se tiveres vários) | Aviso "A Google não validou esta app": carrega em **Continuar**. É normal em modo de teste |
| 3 | Aceitar a permissão "Ver a sua conta do YouTube" | A app abre com a faixa verde **"Ligado à Google (só leitura)"** e a hora de validade. Os canais continuam DEMO |
| 4 | **Terminar sessão** | Volta ao ecrã inicial com "Sessão terminada". O acesso foi revogado |
| 5 | Ligar outra vez e, no ecrã da Google, **Cancelar** | Mensagem "Autorização recusada" |
| 6 | Ligar e **fechar o popup** a meio | Mensagem "A janela da Google foi fechada" |
| 7 | Já ligado, carregar em **Simular sessão expirada** (fundo do Início) | Ecrã "A tua sessão expirou". Em **Voltar a ligar** regressas à app |
| 8 | (Opcional) Esperar cerca de 1 hora com a app aberta | O mesmo ecrã de sessão expirada aparece sozinho |
| 9 | Fechar o separador e voltar a abrir | Estás fora da sessão. Nada ficou guardado |

Para confirmar a revogação: abre https://myaccount.google.com/connections depois do teste 4. A CutSub não deve aparecer na lista, ou desaparece ao fim de alguns instantes.

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| "A ligação à Google ainda não está configurada" | Falta o `.env.local`, ou não reiniciaste o `npm run dev` |
| Erro 400 **origin_mismatch** no popup | Estás a abrir a app por outro endereço (`127.0.0.1`, IP da rede…), ou a origem `http://localhost:5173` ainda não propagou. Usa exatamente `http://localhost:5173` e, se for preciso, espera alguns minutos |
| Erro 403 **access_denied**, "não concluiu o processo de verificação" | O teu email não está em **Test users** (Passo 4) |
| "Não foi possível contactar a Google" | Bloqueador de anúncios ou de scripts. Permite `accounts.google.com` |
| "O browser bloqueou a janela" | Permite pop-ups para `localhost:5173` |
| O popup abre e fecha sem fazer nada | Extensões de privacidade ou cookies de terceiros bloqueados. Experimenta numa janela normal sem extensões |

## Notas

- **Telemóvel:** o login Google só funciona em `localhost`. Para testar o login noutro dispositivo vamos precisar de um endereço HTTPS. Tratamos disso mais tarde, quando quiseres.
- **Contas com vários canais:** na Etapa C, as subscrições mostradas serão as do canal que escolheres no popup.
- **Fase 3:** a remoção de subscrições vai precisar de um scope de escrita. Será pedido só nessa altura, depois de confirmares.


---

## D3.2 — Cancelamento real de subscrições

Só é preciso se quiseres usar `VITE_CUTSUB_CANCEL_MODE=real`. Em modo simulado (por defeito) nada disto é necessário.

1. **Google Auth Platform → Data Access → Add or remove scopes.**
   Acrescenta **`.../auth/youtube.force-ssl`** (*See, edit, and permanently delete your YouTube videos, ratings, comments and captions*)
   e carrega em **Update** e **Save**. Mantém o `youtube.readonly` que já lá está.
   - É o menor privilégio que a Google aceita para `subscriptions.delete` (as alternativas, `youtube` e `youtubepartner`, não são mais restritas).
   - O login normal da CutSub continua a pedir **só** `youtube.readonly`. O `youtube.force-ssl` só é pedido
     na primeira vez que confirmas um cancelamento, numa janela da Google à parte.
2. **Audience**: mantém **Testing** e o teu email em **Test users**. Não é preciso publicar.
3. **Clients**: nada muda (mesmo Client ID, mesma origem `http://localhost:5173`).
4. **Quota**: cada cancelamento gasta **50 unidades** (o limite por defeito é 10 000/dia por projeto, ou seja, cerca de 200 cancelamentos por dia, somando tudo).
5. **Publicação futura** (fora do modo Testing): `youtube.force-ssl` é um scope sensível e exige verificação da app pela Google.

Depois de mudares o Data Access, as alterações podem demorar alguns minutos a ficar ativas.


---

## D3.3 — Endereço publicado (GitHub Pages)

Em **Clients → Authorized JavaScript origins** acrescenta `https://O-TEU-UTILIZADOR.github.io`
(só a origem: sem `/cutsub` e sem barra no fim), mantendo `http://localhost:5173`.
Detalhes e limitações do modo Testing: [PUBLICAR_E_INSTALAR.md](PUBLICAR_E_INSTALAR.md).
