/**
 * Testes do classificador local de categorias.
 * Correr com:  npm run test:classifier   (Node 22.18+ ou 24, sem dependências extra)
 *
 * D2: casos A–L dos testes reais com as 514 subscrições.
 * D3: evidência explícita, contexto, Vlogs & Lifestyle, Imigração & Vida no Exterior,
 *     e casos negativos que DEVEM continuar "Por classificar".
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyChannel } from '../src/services/categoryClassifier.ts';

type Case = [label: string, title: string, description: string, expected: string];

const CASES: Case[] = [
  // A–N (pedidos na correção da Etapa D; M e N são testados na interface)
  ['A Câmara dos Deputados → Política (não Fotografia)', 'Câmara dos Deputados', 'Canal oficial da Câmara dos Deputados. Acompanhe as sessões do plenário.', 'politics'],
  ['B Eduardo Bolsonaro + Deputado Federal', 'EDUARDO BOLSONARO', 'Deputado Federal por São Paulo.', 'politics'],
  ['C Senador que entrou na política', 'Cleitinho Oficial', 'Sou o Senador Cleitinho. Entrei na política para mudar as coisas.', 'politics'],
  ['D Candidata ao Senado', 'Cristina Graeml', 'Jornalista. Candidata ao Senado pelo Paraná.', 'politics'],
  ['D2 Candidato à Presidência da Câmara de Cascais', 'António Pinto Pereira', 'Candidato Independente à Presidência da Câmara de Cascais 2025.', 'politics'],
  ['E Espiritismo Raiz', 'Espiritismo Raiz - Eduardo Sabbag', 'Espiritismo. 100% doutrina, estudo e prática.', 'religion'],
  ['F Louvor e Adoração com descrição incoerente', 'Gabriela Cruz: Louvor e Adoração', 'Receitas, viagens e dicas de maquilhagem. Novos vídeos todas as semanas!', 'religion'],
  ['G DroneMood: notícias sobre drones → Fotografia', 'DroneMood Brasil', 'DroneMood é o maior canal de notícias e curiosidades sobre drones do Brasil.', 'photo'],
  ['H Dacia Portugal → Automóveis', 'Dacia Portugal', 'Bem-vindos ao canal oficial da Dacia Portugal. Fique a par de todas as novidades e notícias.', 'cars'],
  ['I Jornal generalista → Notícias', 'Jornal de Notícias', 'O canal do Jornal de Notícias. Atualidade, última hora e reportagens de Portugal e do mundo.', 'news'],
  ['I2 Televisão noticiosa → Notícias', 'SIC Notícias', 'Canal de notícias 24 horas. Informação e atualidade.', 'news'],
  ['J "câmara" sozinha não é Fotografia', 'Câmara Lenta', 'Vídeos novos todas as semanas.', 'unclassified'],
  ['J2 câmara + lente → Fotografia', 'Câmara Escura', 'Testes de lentes e câmaras para fotógrafos.', 'photo'],
  ['K Podcast de finanças → Finanças', 'Dinheiro Vivo Podcast', 'O podcast sobre investimento, ETF e finanças pessoais.', 'finance'],
  ['L Podcast generalista → Por classificar', 'Inteligência Ltda', 'O podcast Inteligência Ltda. é um bate-papo livre com convidados.', 'unclassified'],

  // Outros casos reais / regressão
  ['Alexandre Sousa (comentário político)', 'Alexandre Sousa | INTERNACIONAL', 'Análise política internacional e eleições.', 'politics'],
  ['Opinião sem contexto político → Por classificar', 'APENAS A MINHA OPINIÃO', 'Vídeos com a minha opinião sobre tudo.', 'unclassified'],
  ['Opinião com contexto político', 'APENAS A MINHA OPINIÃO', 'A minha opinião sobre a política portuguesa, o governo e o parlamento.', 'politics'],
  ['Figura pública sem contexto não é Política', 'Cristiano Ronaldo', '', 'unclassified'],
  ['"Política de privacidade" não conta', 'Bolos da Ana', 'Receitas de bolos caseiros. Política de privacidade: www.exemplo.pt/privacidade', 'cooking'],
  ['Adobe Photoshop → Fotografia', 'Adobe Photoshop', 'Official channel for Photoshop tutorials and creative inspiration.', 'photo'],
  ['Notícias de tecnologia → Tecnologia', 'Tech Hoje', 'Notícias de tecnologia, smartphones e software.', 'tech'],
  ['Notícias de automóveis → Automóveis', 'Auto Notícias', 'As últimas notícias sobre carros e automóveis.', 'cars'],
  ['Igreja / louvor', 'Igreja Batista Central', 'Cultos, pregação e louvor todos os domingos.', 'religion'],
  ['Câmara Municipal → Política', 'Câmara Municipal de Lisboa', 'Canal oficial do município.', 'politics'],
  ['Fotografia', 'Luz & Lente', 'Photography tips, camera reviews and Lightroom editing.', 'photo'],
  ['Caminhadas', 'Trilhos do Norte', 'Caminhadas e natureza no Gerês.', 'outdoors'],
  ['Viagens', 'Eamon & Bec', 'Vanlife and travel around the world.', 'travel'],
  ['Culinária', 'Joshua Weissman', 'Recipes and cooking.', 'cooking'],
  ['Saúde', 'Yoga with Adriene', 'Free yoga videos.', 'health'],
  ['Casa & DIY', 'April Wilkerson', 'DIY woodworking and home renovation projects.', 'home'],
  ['Educação', 'Khan Academy', 'Free education for everyone. Math and science lessons.', 'education'],
  ['Música', 'Fado ao Vivo', '', 'music'],
  ['Desporto', 'Canal 11', 'Futebol português, highlights e debates.', 'sports'],
  ['Sem pistas → Por classificar', 'Mr Beast', 'I want to make the world a better place before I die', 'unclassified'],
  ['Empate fraco → Por classificar', 'Canal do João', 'Vídeos sobre fotos e jogos.', 'unclassified'],

  // ---------- D3: Fotografia ----------
  ['D3-1 "35 milímetros" + Equipment Review → Fotografia', '35 milímetros', 'Equipment Review', 'photo'],
  ['D3-1b "35mm" no nome → Fotografia', 'Street 35mm', '', 'photo'],
  ['D3-1c full frame / APS-C → Fotografia', 'Gear Talk', 'Comparação full frame vs APS-C.', 'photo'],
  ['D3-2 "O Canal de Fotografia com Didática…"', 'Andrey Lanhi - Back to Basics', 'O Canal de Fotografia com Didática Simples e Direto ao Ponto.', 'photo'],
  ['D3-3 "Fotografia de viagens e paisagens" → Fotografia (não Viagens)', 'Bruno Nonogaki', 'Fotografia de viagens e paisagens. Da composição e captura ao pós-processamento.', 'photo'],
  ['D3-4 notícias sobre drones → Fotografia', 'Drone Hoje', 'Notícias sobre drones e filmagens aéreas.', 'photo'],
  ['D3 tutorial de fotografia → Fotografia', 'Ana Silva', 'Tutorial de fotografia para iniciantes.', 'photo'],

  // ---------- D3: Política ----------
  ['D3-5 "Análises diárias sobre política e economia" → Política', 'Alexandre Garcia', 'Análises diárias sobre política e economia no Brasil.', 'politics'],
  ['D3-6 "Comentarista Político" → Política', 'BERNARDI TV', 'Cristão, Jornalista e Comentarista Político.', 'politics'],
  ['D3-7 Autarcas do CHEGA → Política', 'Autarcas CHEGA VFX', 'Bem-vindo ao canal oficial dos Autarcas do CHEGA em Vila Franca de Xira.', 'politics'],
  ['D3-8 Bolsonaro TV → Política', 'Bolsonaro TV', 'Apoie Bolsonaro se inscrevendo e ativando o sino de notificações do canal.', 'politics'],
  ['D3 entretenimento político → Política', 'Rir é Política', 'Entretenimento político com humor.', 'politics'],

  // ---------- D3: Tecnologia ----------
  ['D3-9 "Vídeos sobre Tecnologia" → Tecnologia', 'Bernardo Almeida', 'Vídeos sobre Tecnologia com Qualidade | Análises | Unboxings | Tutoriais', 'tech'],
  ['D3 "Quality Tech Videos" → Tecnologia', 'Marques Brownlee', 'Quality Tech Videos', 'tech'],

  // ---------- D3: Viagens / Caminhadas / Automóveis ----------
  ['D3-10 Portugal + "de um jeito que nunca viu" → Viagens', '2 em Portugal', 'Aqui você verá Portugal (e agora Espanha) de um jeito que nunca viu.', 'travel'],
  ['D3-11 "adventures" sem mais sinais → Por classificar', 'Bernardo Gouveia', 'A random guy who likes to go on adventures', 'unclassified'],
  ['D3-11b adventures + sinais de viagem → Viagens', 'Bernardo Gouveia', 'A random guy who likes to go on adventures, travelling around the world on a motorbike.', 'travel'],
  ['D3-12 road trips de campervan → Viagens', 'BeyondRoadPT', 'Road trips de campervan por Portugal e Espanha. Descobrir lugares escondidos.', 'travel'],
  ['D3-12b BeyondRoadPT sem texto → Por classificar', 'BeyondRoadPT', '', 'unclassified'],
  ['D3-13 tendas de tejadilho → Automóveis', 'Autohome - Official', 'Rooftop tents for your car since 1958. The original roof tent for 4x4 and overland vehicles.', 'cars'],
  ['D3-13b review de equipamento camper → Automóveis', 'Camper Gear', 'Reviews de acessórios e equipamento para autocaravanas.', 'cars'],
  ['D3-14 aventura outdoor / trilhos → Caminhadas & Natureza', 'Mochila às Costas', 'Aventura outdoor, trilhos e montanha. Exploração da natureza em Portugal.', 'outdoors'],

  // ---------- D3: Vlogs & Lifestyle ----------
  ['D3 vlog pessoal / dia a dia → Vlogs & Lifestyle', 'Rita e Família', 'O nosso dia a dia, rotina e vida em família.', 'vlogs'],
  ['D3 vlog de viagens → Viagens (não Vlogs)', 'Pedro Vlogs', 'Vlog de viagens pela Ásia.', 'travel'],
  ['D3 vlog de gaming → Gaming', 'Zé Joga', 'Vlog de gaming e gameplay.', 'gaming'],
  ['D3 "vlog" sozinho → Por classificar', 'Tiago', 'Vlog.', 'unclassified'],
  ['D3 "YouTuber" sozinho → Por classificar', 'Ardelino MZ', 'YouTuber', 'unclassified'],

  // ---------- D3: Imigração & Vida no Exterior ----------
  ['D3 Brasileiro na Europa / viver em Portugal → Imigração', 'Brasileiro na Europa com André Oliveira', 'Venha viver em Portugal com todo o conforto e segurança que o país nos dá.', 'immigration'],
  ['D3 Imigração prática → Imigração (não Política)', 'Família dos Reis na Europa | Imigração prática', 'Documentos, vistos e a nossa vida em Portugal.', 'immigration'],
  ['D3 morar em Portugal → Imigração', 'Vida Nova', 'Tudo sobre morar em Portugal: custo de vida, casas e escolas.', 'immigration'],
  ['D3 imigração + investimentos → Finanças', 'Investir em Portugal', 'Investimentos, ETF, impostos e finanças pessoais para quem vive em Portugal.', 'finance'],
  ['D3 roteiros em Portugal → Viagens', 'Portugal a Dois', 'Roteiros para conhecer Portugal: o que fazer e onde ficar.', 'travel'],

  // ---------- D3: Religião ----------
  ['D3 canal católico → Religião', 'Paróquia Online', 'Canal católico com reflexões semanais.', 'religion'],
  ['D3 canal espírita → Religião', 'Luz do Caminho', 'Canal espírita de estudos.', 'religion'],

  // ---------- D3: Outros explícitos ----------
  ['D3 educação financeira → Finanças', 'Me Poupe', 'Educação financeira para todos.', 'finance'],
  ['D3 canal de música → Música', 'Sons do Sul', 'Canal de música independente.', 'music'],
  ['D3 receitas de culinária → Culinária', 'Avó Rosa', 'Receitas de culinária tradicional.', 'cooking'],
  ['D3 treinos de fitness → Saúde', 'Forte em Casa', 'Treinos de fitness em 20 minutos.', 'health'],
  ['D3 canal de viagens → Viagens', 'João pelo Mundo', 'Canal de viagens low cost.', 'travel'],

  ['D3 jornal generalista que menciona política → Notícias', 'Notícias ao Minuto', 'Notícias de última hora, atualidade e política nacional e internacional.', 'news'],
  ['D3 canal de notícias sobre carros → Automóveis', 'AutoNews PT', 'Canal de notícias sobre carros, lançamentos e ensaios automóvel.', 'cars'],

  // ---------- D3: Negativos (devem continuar "Por classificar" ou não mudar) ----------
  ['NEG câmara isolada', 'Câmara 4', '', 'unclassified'],
  ['NEG política de privacidade não é Política', 'Loja da Maria', 'Vídeos novos. Política de privacidade e termos e condições no site.', 'unclassified'],
  ['NEG presidente sozinho', 'O Presidente', '', 'unclassified'],
  ['NEG notícias sozinho', 'Canal X', 'Notícias.', 'unclassified'],
  ['NEG podcast sozinho', 'Conversa Fiada', 'Um podcast.', 'unclassified'],
  ['NEG canal oficial sozinho', 'Marca XPTO', 'Canal oficial.', 'unclassified'],
  ['NEG país isolado (nome) → não Viagens/Imigração', 'Portugal', '', 'unclassified'],
  ['NEG país isolado (descrição)', 'Ricardo', 'Sou de Portugal.', 'unclassified'],
  ['NEG adventure isolado', 'Adventure Time Fan', '', 'unclassified'],
  ['NEG sem descrição, nome pessoal (António C.A. Sousa Lara)', 'António C.A. Sousa Lara', '', 'unclassified'],
  ['NEG sem descrição (Bruno Valle)', 'Bruno Valle', '', 'unclassified'],
  ['NEG BODA', 'BODA', 'Mas afinal, quem é esse tal de BODA?', 'unclassified'],
  ['NEG AuriVerde Brasil sem descrição', 'AuriVerde Brasil', '', 'unclassified'],
  ['NEG Abraço da verdade sem descrição', 'Abraço da verdade', '', 'unclassified'],
  ['NEG Ardelino MZ com só um e-mail', 'Ardelino MZ', 'contacto: ardelino.mz@gmail.com', 'unclassified'],
  ['NEG "Família X" sem descrição → Por classificar', 'Família Martins', '', 'unclassified'],
  // ---------- D3.2: casos reais revistos ----------
  // Com pistas gerais no nome ou na descrição → corrigidos por regras gerais:
  ['D3.2 CHEGA UK TV → Política', 'CHEGA UK TV', '', 'politics'],
  ['D3.2 "chega" comum não é Política', 'Chega de Saudade', 'Bossa nova ao vivo.', 'unclassified'],
  ['D3.2 Leroy Merlin Portugal → Casa & DIY', 'Leroy Merlin Portugal', '', 'home'],
  ['D3.2 Embarra2 Aventura Offroad → Outdoor & Natureza', 'Embarra2 Aventura Offroad', '', 'outdoors'],
  ['D3.2 offroad sem aventura continua Automóveis', 'Offroad Garage', 'Preparação de jipes, mecânica e reviews 4x4.', 'cars'],
  ['D3.2 canal de impostos → Finanças', 'Contas Certas', 'Impostos, IRS e contabilidade explicados.', 'finance'],
  // "vlog" no nome deixou de chegar sozinho a Vlogs & Lifestyle:
  ['D3.2 VLOG - O GIRO DE NOTÍCIAS sem descrição → não Vlogs', 'VLOG - O GIRO DE NOTÍCIAS', '', 'unclassified'],
  ['D3.2 VLOG - O GIRO DE NOTÍCIAS com contexto político → Política', 'VLOG - O GIRO DE NOTÍCIAS', 'Análises sobre política e o governo.', 'politics'],
  ['D3.2 Vlog do Lisboa sem descrição → não Vlogs', 'Vlog do Lisboa', '', 'unclassified'],
  // Sem metadados suficientes → "Por classificar" (a solução é a classificação manual):
  ['D3.2 Alberto Silva (só nome) → Por classificar', 'Alberto Silva', '', 'unclassified'],
  ['D3.2 Louis, O Explorador (só nome) → Por classificar', 'Louis, O Explorador', '', 'unclassified'],
  ['D3.2 Guga Robo / Tributo Devido (só nome) → Por classificar', 'Guga Robo / Tributo Devido', '', 'unclassified'],
  ['D3.2 Dr. Hannah Straight (só nome) → Por classificar', 'Dr. Hannah Straight', '', 'unclassified'],
  ['D3.2 mMETA POSSÍVEL (só nome) → Por classificar', 'mMETA POSSÍVEL', '', 'unclassified'],
  ['D3.2 Angelino Fernando (só nome) → Por classificar', 'Angelino Fernando', '', 'unclassified'],
  ['D3.2 Joselino MZ (só nome) → Por classificar', 'Joselino MZ', '', 'unclassified'],
  ['D3.2 Projeto Joselino (só nome) → Por classificar', 'Projeto Joselino', '', 'unclassified'],
  ['NEG lista "Receitas, viagens e dicas" não é declaração', 'Canal da Inês', 'Receitas, viagens e dicas.', 'unclassified'],
];

for (const [label, title, description, expected] of CASES) {
  test(label, () => {
    assert.equal(classifyChannel(title, description), expected);
  });
}
