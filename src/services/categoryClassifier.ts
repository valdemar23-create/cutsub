/**
 * Classificador LOCAL de categorias (sem IA, sem serviços externos).
 *
 * Princípio: CONSERVADOR. É preferível "Por classificar" a uma categoria errada.
 *
 * 1. Preparação do texto
 *    Minúsculas, sem acentos. Removemos URLs, e-mails, @handles e frases-feitas
 *    ("política de privacidade", "privacy policy"…), que dariam falsos sinais.
 *
 * 2. Força dos termos (cada termo conta uma vez por canal)
 *    forte = 3 · médio = 2 · fraco = 1
 *    ambíguo = 1, mas SÓ conta se a mesma categoria tiver outro sinal não ambíguo
 *    (ex.: "câmara" sozinha não faz nada; "câmara" + "lente" reforça Fotografia).
 *
 * 3. Nome vs descrição
 *    Um termo no NOME vale o dobro. A descrição conta no máximo 8 pontos por categoria,
 *    para que uma descrição longa ou incoerente não se sobreponha a um nome claro
 *    (ex.: "Louvor e Adoração" no nome).
 *
 * 4. Decisão
 *    - Uma categoria só é candidata com pelo menos 3 pontos (4 nas genéricas).
 *    - TEMA > FORMATO: "Notícias & Atualidade" e "Entretenimento" são genéricas;
 *      se houver uma categoria temática candidata, a temática ganha
 *      ("notícias sobre drones" → Fotografia; "canal oficial Dacia" → Automóveis).
 *    - Margem: o vencedor tem de ter pelo menos +2 pontos ou o dobro do segundo.
 *      Evidência semelhante entre duas categorias → "Por classificar".
 *
 * Formatos como "podcast", "vlog", "curiosidades" ou "canal oficial" não são temas
 * e não dão pontos a nenhuma categoria.
 * "Outros" nunca é atribuído automaticamente.
 *
 * Este ficheiro não importa valores de outros módulos, para poder ser testado
 * diretamente com Node (ver tests/classifier.test.ts).
 */
import type { CategoryId } from '../domain/review';

type AutoCategory = Exclude<CategoryId, 'other' | 'unclassified'>;

interface TermGroups {
  strong?: string[];
  medium?: string[];
  weak?: string[];
  /** Só contam se a categoria tiver outro sinal não ambíguo. */
  ambiguous?: string[];
}

/** Notícias, Entretenimento e Vlogs descrevem mais o formato do que o tema. */
const GENERIC = new Set<AutoCategory>(['news', 'entertainment', 'vlogs']);

const TERMS: Record<AutoCategory, TermGroups> = {
  photo: {
    strong: [
      'fotograf*', 'photograph*', 'lightroom', 'photoshop', 'dslr', 'mirrorless', 'drone*', 'dji', 'fpv',
      'sony alpha', 'street photography', 'full frame', 'full-frame', 'aps-c', 'apsc',
      // distâncias focais: "35mm", "35 mm", "35 milímetros"
      're:[0-9]{2,3} ?mm', 're:[0-9]{2,3} milimetros',
    ],
    medium: [
      'camera', 'cameras', 'lente', 'lentes', 'lens', 'lenses', 'canon', 'nikon', 'fujifilm', 'leica', 'gopro',
      'filmmaking', 'filmmaker', 'videography', 'cinematografia', 'color grading',
    ],
    weak: ['foto', 'fotos', 'photo', 'photos', 'cinematic'],
    ambiguous: ['camara', 'camaras', 'sony'],
  },
  travel: {
    strong: [
      'travel*', 'viagem', 'viagens', 'viajar', 'viajante*', 'viajes', 'roadtrip', 'roadtrips', 'road trip',
      'road trips', 'vanlife', 'van life', 'mochileiro*', 'backpacking', 'volta ao mundo', 'around the world',
      'pelo mundo', 'world trip',
    ],
    // camper / autocaravana / overland: tratados à parte (viagem vs veículo), ver CAMPER_RE.
    medium: ['turismo', 'tourism', 'nomad*', 'expedition', 'expedicao', 'destinos', 'destinations', 'cruise'],
    weak: ['hotel', 'hotels', 'wanderlust'],
  },
  outdoors: {
    strong: [
      'hiking', 'caminhada', 'caminhadas', 'trilho', 'trilhos', 'trekking', 'bushcraft', 'montanhismo', 'alpinismo',
      'thru-hike', 'backcountry', 'vida selvagem', 'wildlife',
      // D3.2: "aventura offroad" = aventura na natureza (o veículo é o meio, não o tema)
      'aventura offroad', 'aventuras offroad', 'aventura off-road', 'aventura off road', 'aventura 4x4',
      'offroad adventure*', 'off-road adventure*',
    ],
    medium: [
      'trail', 'trails', 'hike', 'hikes', 'natureza', 'nature', 'montanha', 'montanhas', 'mountain*', 'camping',
      'acampar', 'escalada', 'climbing', 'birdwatching', 'national park', 'parque natural', 'outdoor*',
      'aventura outdoor', 'aventuras outdoor', 'outdoor adventure*', 'exploracao da natureza',
    ],
    weak: ['floresta', 'forest', 'survival', 'aves'],
  },
  finance: {
    strong: [
      'financas', 'personal finance', 'financas pessoais', 'investimento*', 'investing', 'etf', 'etfs', 'dividend*',
      'dividendo*', 'bolsa de valores', 'stock market', 'mercado financeiro', 'trading',
    ],
    medium: [
      'financ*', 'investir', 'investidor*', 'investor*', 'stocks', 'crypto*', 'cripto*', 'bitcoin', 'economia',
      'economy', 'economics', 'poupanca', 'real estate', 'imobiliario',
      // D3.2: fiscalidade
      'impostos', 'tributacao', 'tributario', 'tributaria', 'contabilidade', 'fiscalidade', 'irs',
    ],
    weak: ['money', 'dinheiro', 'bolsa', 'acoes', 'wealth', 'mercados'],
  },
  tech: {
    strong: [
      'tecnologia', 'technology', 'programacao', 'programming', 'inteligencia artificial', 'artificial intelligence',
      'machine learning', 'web development', 'informatica', 'ciberseguranca', 'cybersecurity', 'linux',
    ],
    medium: [
      'tech', 'software', 'hardware', 'developer', 'developers', 'programador*', 'coding', 'smartphone*', 'iphone',
      'android', 'gadget*', 'computador*', 'computer*', 'arduino', 'raspberry pi', 'python', 'javascript',
      'electronics', 'eletronica', 'unboxing', 'macbook', 'pc build*',
    ],
    weak: ['apple', 'windows', 'code', 'dev'],
  },
  music: {
    strong: [
      'musica', 'music', 'musico', 'musician', 'official artist channel', 'vevo', 'guitarra', 'guitar*', 'piano',
      'fado', 'concerto*', 'concert*', 'cancao', 'cancoes', 'lyric video', 'orquestra', 'orchestra', 'songwriter',
      'cantor*', 'singer',
    ],
    medium: ['song', 'songs', 'band', 'banda', 'drum*', 'album', 'dj', 'beats', 'jazz', 'rap', 'hip hop', 'acoustic', 'lyrics', 'records'],
    weak: ['rock', 'cover', 'covers', 'bass', 'bateria', 'producer'],
  },
  news: {
    strong: [
      'telejornal', 'jornalismo', 'journalism', 'jornal', 'canal de noticias', 'news channel', 'sic noticias',
      'cnn', 'bbc', 'reuters', 'euronews', 'sky news', 'al jazeera', 'agencia lusa', 'cmtv', 'rtp', 'tvi',
      'globonews', 'globo news', 'jovem pan', 'record news', 'band jornalismo',
    ],
    medium: ['ultima hora', 'breaking news', 'atualidade', 'actualidade', 'current affairs', 'world news', 'reportagem', 'reportagens'],
    weak: ['noticias', 'noticia', 'news', 'diario', 'daily', 'informacao', 'documentario*'],
  },
  politics: {
    strong: [
      'politica', 'politicas', 'politico', 'politicos', 'politics', 'political', 'deputado', 'deputada', 'deputados',
      'deputadas', 'parlamento', 'parliament', 'parlamentar', 'senado', 'senate', 'senador', 'senadora',
      'senadores', 'senator', 'congressista', 'congresso nacional', 'congressman', 'congresswoman', 'vereador',
      'vereadora', 'prefeito', 'prefeita', 'camara dos deputados', 'camara municipal', 'assembleia da republica',
      'assembleia legislativa', 'assembleia municipal', 'autarquicas', 'legislativas', 'presidenciais',
      'campanha eleitoral', 'partido politico', 'autarca', 'autarcas',
      // Sem base de dados de políticos: só apelidos inequivocamente políticos.
      'bolsonaro', 'bolsonarista', 'petista',
      // D3.2: "chega" sozinho é uma palavra comum ("chega de…"); só conta como partido nestas expressões.
      'partido chega', 'chega tv', 'chega uk',
    ],
    medium: [
      'eleicao', 'eleicoes', 'election', 'elections', 'eleitoral', 'candidato', 'candidata', 'candidatura',
      'governo', 'government', 'presidencia', 'presidency', 'autarquia', 'congresso', 'congress', 'ministro',
      'ministra', 'democracia', 'democracy',
    ],
    weak: ['partido', 'presidente', 'president', 'opiniao', 'opinion', 'commentary', 'debate', 'direita', 'esquerda'],
  },
  sports: {
    strong: [
      'futebol', 'football', 'soccer', 'desporto', 'desportivo', 'motogp', 'nba', 'nfl', 'ciclismo', 'cycling', 'ufc',
      'tenis', 'tennis', 'maratona', 'marathon', 'triathlon', 'basquetebol', 'basketball', 'liga portugal',
      'formula 1', 'formula one',
    ],
    medium: [
      'sport', 'sports', 'f1', 'golf', 'golfe', 'surf', 'surfing', 'olympic*', 'olimpic*', 'running', 'btt', 'mtb',
      'skate*', 'boxing', 'boxe', 'mma', 'benfica', 'fc porto', 'sporting cp',
    ],
    weak: ['highlights', 'corrida', 'bike', 'bicicleta', 'ski'],
  },
  education: {
    strong: ['tutorial*', 'tutoriais', 'educacao', 'education*', 'educativo', 'aulas', 'curso online', 'aprender ingles'],
    medium: [
      'aula', 'curso', 'cursos', 'course', 'courses', 'lesson*', 'learn', 'learning', 'aprender', 'ciencia',
      'ciencias', 'science', 'matematica', 'math*', 'fisica', 'physics', 'quimica', 'chemistry', 'universidade',
      'university', 'professor', 'idiomas', 'ted', 'tedx', 'khan',
    ],
    weak: ['explained', 'explica*', 'historia', 'history', 'escola', 'school', 'how to', 'como fazer'],
  },
  entertainment: {
    strong: ['entretenimento', 'entertainment', 'comedia', 'comedy', 'humor', 'humour', 'stand-up', 'standup', 'stand up', 'talk show', 'late night'],
    medium: ['sketch*', 'prank*', 'movie*', 'filme', 'filmes', 'cinema', 'trailer*', 'netflix', 'reaction*', 'anime', 'animacao', 'cartoon*', 'magic', 'magia'],
    weak: ['series', 'react', 'celebrity', 'funny'],
  },
  gaming: {
    strong: [
      'gaming', 'gamer', 'gamers', 'gameplay', 'videojogo*', 'lets play', "let's play", 'walkthrough', 'playthrough',
      'speedrun*', 'esports', 'e-sports', 'minecraft', 'fortnite', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo',
      'retro gaming', 'call of duty', 'league of legends', 'pokemon', 'zelda',
    ],
    medium: ['game', 'games', 'jogos', 'twitch', 'gta', 'fifa'],
    weak: ['jogo', 'steam', 'mario'],
  },
  cars: {
    strong: [
      'carro', 'carros', 'automovel', 'automoveis', 'automotive', 'automobile', 'supercar*', 'test drive',
      'motorsport*', 'mota', 'motas', 'motorcycle*', 'motorbike*', 'top gear', 'dacia', 'renault', 'peugeot',
      'citroen', 'toyota', 'volkswagen', 'bmw', 'audi', 'porsche', 'ferrari', 'lamborghini', 'land rover', 'fiat',
      'skoda', 'hyundai', 'volvo', 'nissan', 'opel',
    ],
    medium: [
      'car', 'cars', 'moto', 'motos', 'mecanica', 'mecanico', 'mechanic', 'garagem', 'garage', 'tuning', 'drift*',
      'offroad', 'off-road', '4x4', 'mercedes', 'tesla', 'honda', 'ford', 'kia',
    ],
    weak: ['motor', 'motores', 'ev', 'evs'],
  },
  cooking: {
    strong: [
      'culinaria', 'cozinha', 'cozinhar', 'receita', 'receitas', 'recipe', 'recipes', 'cooking', 'chef',
      'gastronomia', 'gastronomy', 'pastelaria', 'pastry', 'baking', 'churrasco', 'bbq', 'barbecue', 'street food',
      'comida de rua',
    ],
    medium: ['food', 'comida', 'kitchen', 'vegan*', 'vegetarian*', 'restaurante*', 'restaurant*', 'vinho', 'vinhos', 'wine', 'barista', 'padaria', 'bolos'],
    weak: ['cafe', 'coffee', 'pizza', 'sushi', 'cook', 'bake', 'grill'],
  },
  health: {
    strong: [
      'saude', 'health', 'bem-estar', 'bem estar', 'wellness', 'fitness', 'workout*', 'yoga', 'pilates', 'meditacao',
      'meditation', 'mindfulness', 'nutricao', 'nutrition', 'nutricionista', 'saude mental', 'mental health',
      'fisioterap*', 'physiotherap*', 'psicolog*', 'psycholog*',
    ],
    medium: ['treino', 'treinos', 'gym', 'ginasio', 'dieta', 'diet', 'medic*', 'doctor', 'longevity', 'longevidade', 'sono', 'sleep'],
    weak: ['healthy', 'saudavel', 'wellbeing'],
  },
  home: {
    strong: [
      'diy', 'do it yourself', 'faca voce mesmo', 'bricolage', 'bricolagem', 'woodworking', 'carpintaria',
      'marcenaria', 'home improvement', 'remodelacao', 'renovation', 'jardinagem', 'gardening', 'horta',
      'interior design', 'decoracao de interiores', '3d print*', 'impressao 3d', 'homestead*', 'tiny house', 'off grid',
      // D3.2: lojas de bricolage (marca no nome = tema inequívoco)
      'leroy merlin', 'bricomarche', 'maxmat', 'ikea',
    ],
    medium: ['decoracao', 'decor', 'jardim', 'garden', 'ferramentas', 'tools', 'workshop', 'maker', 'makers', 'restauro', 'restoration', 'plantas', 'plants'],
    weak: ['oficina', 'limpeza', 'cleaning', 'organizacao', 'casa', 'house'],
  },
  religion: {
    strong: [
      'espiritismo', 'espirita', 'espiritas', 'espiritualidade', 'spirituality', 'louvor', 'louvores', 'adoracao',
      'worship', 'igreja', 'church', 'evangelho', 'gospel', 'catolico', 'catolica', 'catolicismo', 'evangelico',
      'evangelica', 'cristao', 'crista', 'cristaos', 'cristianismo', 'christian', 'christianity', 'biblia', 'bible',
      'biblico', 'biblica', 'religiao', 'religion', 'religioso', 'religiosa', 'jesus cristo', 'palavra de deus',
      'kardec', 'umbanda', 'candomble', 'santo terco', 'terco', 'missa', 'oracao', 'oracoes', 'prayer', 'sermao',
      'sermon', 'pregacao', 'devocional', 'teologia', 'theology', 'nossa senhora', 'catequese', 'budismo',
      'buddhism',
    ],
    medium: ['jesus', 'cristo', 'pastor', 'padre', 'espiritual', 'spiritual', 'mediunidade', 'fe crista'],
    weak: ['deus', 'god', 'ministerio', 'santo', 'santa'],
  },
  vlogs: {
    strong: [
      'daily vlog*', 'vlog diario', 'vlogs diarios', 'personal vlog', 'vlog pessoal', 'family vlog*', 'vlog de familia',
      'dia a dia', 'day in my life', 'day in the life', 'rotina', 'rotinas', 'routine', 'lifestyle', 'estilo de vida',
      'vida pessoal', 'vida em familia', 'quotidiano', 'cotidiano',
    ],
    medium: ['minha vida', 'my life'],
    // D3.2: "vlog" no nome chegava sozinho ao limiar (ex.: "VLOG - O GIRO DE NOTÍCIAS" → Vlogs).
    // É um formato, não um tema: passa a fraco. "Família X" no nome também não chega.
    weak: ['vlog', 'vlogs', 'vlogger', 'youtuber', 'familia', 'family'],
  },
  immigration: {
    strong: [
      'imigracao', 'imigrante*', 'imigrar', 'emigrar', 'emigrante*', 'emigracao', 'mudar de pais', 'mudanca de pais',
      'vida no exterior', 'morar fora', 'morar no exterior', 'viver no exterior', 'living abroad', 'live abroad',
      'move abroad', 'moving abroad', 'expat', 'expats', 'expatriado*', 'autorizacao de residencia',
      'visto de residencia', 'cidadania portuguesa', 'nacionalidade portuguesa',
    ],
    medium: ['custo de vida', 'cost of living', 'visto', 'vistos', 'cidadania', 'residencia', 'aima'],
  },
};

/* ------------------------------------------------------------------ */
/* D3 — Evidência explícita (declarações diretas do tema)              */
/* ------------------------------------------------------------------ */

/**
 * Substantivos que nomeiam o tema ("canal de FOTOGRAFIA", "vídeos sobre TECNOLOGIA").
 * Só contam dentro das construções abaixo, nunca sozinhos.
 */
const THEME_NOUNS: Partial<Record<AutoCategory, string[]>> = {
  tech: ['tecnologia', 'technology', 'tech', 'informatica', 'programacao', 'programming'],
  photo: ['fotografia', 'photography', 'drones', 'cinematografia'],
  travel: ['viagens', 'viagem', 'travel', 'viajes', 'turismo'],
  outdoors: ['caminhadas', 'hiking', 'natureza', 'trilhos', 'montanhismo', 'aventura outdoor'],
  finance: ['financas', 'finance', 'investimentos', 'investimento', 'investing', 'educacao financeira', 'financas pessoais'],
  music: ['musica', 'music'],
  news: ['noticias', 'news', 'atualidade', 'actualidade', 'informacao'],
  politics: ['politica', 'politics'],
  sports: ['desporto', 'esportes', 'deportes', 'futebol', 'football', 'sports'],
  education: ['educacao', 'education', 'ciencia', 'science', 'matematica', 'historia'],
  entertainment: ['humor', 'comedia', 'comedy', 'entretenimento', 'entertainment'],
  gaming: ['jogos', 'games', 'gaming', 'videojogos'],
  cars: ['carros', 'automoveis', 'automovel', 'automobilismo', 'cars', 'motos'],
  cooking: ['culinaria', 'receitas', 'cozinha', 'gastronomia', 'cooking', 'recipes'],
  health: ['fitness', 'saude', 'bem-estar', 'yoga', 'nutricao', 'treino', 'treinos'],
  home: ['diy', 'bricolage', 'bricolagem', 'jardinagem', 'decoracao', 'carpintaria', 'woodworking'],
  religion: ['espiritismo', 'religiao', 'espiritualidade', 'evangelho', 'cristianismo', 'catolicismo', 'louvor'],
  vlogs: ['lifestyle', 'dia a dia', 'vida pessoal', 'quotidiano', 'cotidiano'],
  immigration: ['imigracao', 'emigracao', 'vida no exterior'],
};

/** Adjetivos de tema depois de um formato/papel ("comentarista POLÍTICO", "canal CATÓLICO"). */
const THEME_ADJECTIVES: Partial<Record<AutoCategory, string[]>> = {
  politics: ['politico', 'politica', 'politicos', 'politicas', 'political'],
  religion: ['espirita', 'catolico', 'catolica', 'cristao', 'crista', 'evangelico', 'evangelica', 'gospel', 'christian', 'religioso', 'religiosa'],
  tech: ['tecnologico', 'tecnologica'],
  finance: ['financeiro', 'financeira', 'financial'],
  music: ['musical'],
  sports: ['desportivo', 'esportivo'],
  cars: ['automovel', 'automotivo'],
  travel: ['de viagens'],
};

/** Formatos ou papéis que, sozinhos, NÃO são tema (canal, vídeos, podcast, comentarista…). */
const FORMATS = [
  'canal', 'canais', 'channel', 'videos', 'video', 'conteudo', 'conteudos', 'content', 'podcast', 'podcasts', 'vlog',
  'vlogs', 'blog', 'analises', 'analise', 'analysis', 'comentarios', 'comentario', 'commentary', 'comentarista',
  'comentador', 'commentator', 'analista', 'noticias', 'news', 'dicas', 'tips', 'tutoriais', 'tutorial', 'tutorials',
  'aulas', 'aula', 'curso', 'cursos', 'programa', 'show', 'reviews', 'review', 'entrevistas', 'debates', 'humor',
  'entretenimento', 'receitas', 'treinos', 'documentarios', 'informacao', 'jornalista',
];
/** Formatos que podem vir DEPOIS do tema, em inglês ("tech videos", "travel vlog"). */
const TRAILING_FORMATS = ['channel', 'vlog', 'vlogs', 'videos', 'podcast', 'tutorials', 'reviews', 'content', 'blog', 'news'];

const alt = (words: string[]) => words.map((w) => normalize(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const B = '(?:^|[^a-z0-9])';
const E = '(?=$|[^a-z0-9])';
const PREP = '(?:de|da|do|das|dos|sobre|acerca de|about|on|of|em|para)';

interface ExplicitRule {
  category: AutoCategory;
  /** Teste rápido: só vale a pena procurar construções se o tema aparecer no texto. */
  gate: RegExp | null;
  patterns: RegExp[];
  /** Tema no início da descrição: "Fotografia de viagens…", "Espiritismo. 100%…" */
  lead: RegExp | null;
}

const EXPLICIT: ExplicitRule[] = (Object.keys(TERMS) as AutoCategory[]).map((category) => {
  const nouns = THEME_NOUNS[category] ?? [];
  const adjectives = THEME_ADJECTIVES[category] ?? [];
  const patterns: RegExp[] = [];
  if (nouns.length) {
    // FORMATO [até 2 palavras] PREPOSIÇÃO [artigo] TEMA  → "vídeos sobre tecnologia", "análises diárias sobre política"
    patterns.push(
      new RegExp(`${B}(?:${alt(FORMATS)})(?:\\s+[a-z0-9-]+){0,2}?\\s+${PREP}\\s+(?:(?:a|o|as|os|the)\\s+)?(?:${alt(nouns)})${E}`),
    );
    // TEMA FORMATO (inglês) → "tech videos", "travel vlog"
    patterns.push(new RegExp(`${B}(?:${alt(nouns)})\\s+(?:${alt(TRAILING_FORMATS)})${E}`));
  }
  if (adjectives.length) {
    // FORMATO ADJETIVO → "comentarista político", "canal católico", "entretenimento político"
    patterns.push(new RegExp(`${B}(?:${alt(FORMATS)})\\s+(?:${alt(adjectives)})${E}`));
  }
  const lead = nouns.length
    ? // Só se o tema abrir a descrição e for seguido de pontuação ou "de/e" (uma lista "Receitas, viagens…" não conta).
      new RegExp(`^\\s*(?:${alt(nouns)})(?:\\s*[.!:|–-]|\\s+(?:de|da|do|e|and|&|for|para)\\s)`)
    : null;
  const gateWords = [...nouns, ...adjectives.map((a) => a.replace(/^de /, ''))];
  const gate = gateWords.length ? new RegExp(`${B}(?:${alt(gateWords)})${E}`) : null;
  return { category, gate, patterns, lead };
});

/* ------------------------------------------------------------------ */
/* D3 — Contexto                                                       */
/* ------------------------------------------------------------------ */

const PLACES = [
  'portugal', 'espanha', 'spain', 'brasil', 'brazil', 'europa', 'europe', 'italia', 'italy', 'franca', 'france',
  'alemanha', 'germany', 'reino unido', 'inglaterra', 'irlanda', 'holanda', 'suica', 'grecia', 'croacia',
  'islandia', 'iceland', 'noruega', 'norway', 'escocia', 'scotland', 'marrocos', 'morocco', 'turquia', 'egito',
  'egipto', 'japao', 'japan', 'tailandia', 'thailand', 'vietname', 'vietnam', 'indonesia', 'bali', 'india', 'china',
  'australia', 'nova zelandia', 'new zealand', 'canada', 'eua', 'estados unidos', 'usa', 'mexico', 'peru', 'chile',
  'argentina', 'colombia', 'acores', 'azores', 'algarve', 'alentejo', 'lisboa', 'lisbon', 'asia', 'africa',
];
const PLACE_RE = new RegExp(`${B}(?:${alt(PLACES)})${E}`);

/** Linguagem de descoberta: só reforça Viagens quando aparece junto de um lugar. */
const DISCOVERY_RE = new RegExp(
  `${B}(?:conhecer|descobrir|explorar|explore|exploring|discover|visitar|visit|roteiros?|itinerarios?|lugares|places|` +
    `cidades|destinos?|nunca viu|nunca viste|never seen|o que fazer|what to do|onde ficar|percorrer|viajamos|viajando)${E}`,
);

/** "morar em Portugal", "viver na Europa", "mudar para o exterior", "brasileiro em Portugal"… */
const RELOCATION_RE = new RegExp(
  `${B}(?:(?:morar|viver|vida|mudar-se|mudar|mudei|mudamos|mudanca|imigrar|emigrar|emigrei)\\s+(?:para\\s+(?:o\\s+|a\\s+)?|pra\\s+|em\\s+|na\\s+|no\\s+|nos\\s+|nas\\s+)` +
    `|(?:brasileir[oa]s?|portugues(?:es|a|as)?|angolan[oa]s?)\\s+(?:em|na|no|nos|nas)\\s+)(?:${alt(PLACES)}|exterior|fora|estrangeiro)${E}`,
);

/** Camper / autocaravana / overland: viagem ou veículo, conforme o contexto. */
const CAMPER_RE = new RegExp(
  `${B}(?:camper\\w*|campervan\\w*|autocaravana\\w*|motorhome\\w*|caravan\\w*|caravana\\w*|overland\\w*|rooftop tents?|roof tents?|tenda de tejadilho|tendas de tejadilho)${E}`,
);
const CAMPER_TRAVEL_RE = new RegExp(
  `${B}(?:viajar|viagem|viagens|viajamos|viajando|road ?trips?|roteiros?|destinos?|descobrir|explorar|explore|exploring|travel\\w*|trip|trips|journey|aventura|adventures?)${E}`,
);
const CAMPER_VEHICLE_RE = new RegExp(
  `${B}(?:review|reviews|analise|equipamento|equipment|acessorios|accessories|gear|produto|produtos|product|products|montagem|instalacao|installation|mecanica|loja|shop|store|fabricante|manufacturer|rooftop tents?|roof tents?|tejadilho|tenda|tendas|tent|tents|since \\d{4}|desde \\d{4})${E}`,
);

/* ------------------------------------------------------------------ */

const WEIGHT = { strong: 3, medium: 2, weak: 1, ambiguous: 1 } as const;
type Strength = keyof typeof WEIGHT;

const NAME_FACTOR = 2;
const DESCRIPTION_CAP = 8;
const MIN_SCORE = 3;
const MIN_SCORE_GENERIC = 4;
const CONTEXT_POINTS = 4;

/** Frases-feitas que não dizem nada sobre o tema do canal. */
const BOILERPLATE = [
  'politica de privacidade',
  'politicas de privacidade',
  'privacy policy',
  'politica de cookies',
  'termos de utilizacao',
  'termos e condicoes',
  'terms of service',
  'business inquiries',
  'para parcerias',
];

/** Minúsculas, sem acentos (igual a domain/review normalizeText, duplicado para manter este módulo autónomo). */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function prepare(text: string): string {
  let t = normalize(text)
    .replace(/https?:\/\/\S+|www\.\S+/g, ' ')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ')
    .replace(/@\w+/g, ' ');
  for (const phrase of BOILERPLATE) t = t.split(phrase).join(' ');
  return t;
}

function compile(term: string): RegExp {
  if (term.startsWith('re:')) return new RegExp(`${B}${term.slice(3)}${E}`);
  const prefix = term.endsWith('*');
  const word = normalize(prefix ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${B}${word}${prefix ? '' : E}`);
}

interface CompiledTerm {
  re: RegExp;
  strength: Strength;
}

const RULES: Array<{ category: AutoCategory; terms: CompiledTerm[] }> = (Object.keys(TERMS) as AutoCategory[]).map(
  (category) => ({
    category,
    terms: (Object.keys(WEIGHT) as Strength[]).flatMap((strength) =>
      (TERMS[category][strength] ?? []).map((term) => ({ re: compile(term), strength })),
    ),
  }),
);

export interface CategoryScore {
  category: AutoCategory;
  score: number;
  /** Pontos vindos do nome do canal. */
  nameScore: number;
  /** O nome ou a descrição declaram este tema diretamente. */
  explicit: boolean;
}

/** Pontuação de cada categoria (útil para testes e diagnóstico). */
export function scoreCategories(title: string, description = ''): CategoryScore[] {
  const name = prepare(title);
  // Descrições muito longas: os primeiros 1500 caracteres chegam e mantêm a classificação rápida.
  const desc = prepare(description.slice(0, 1500));
  const all = `${name} \n ${desc}`;

  const scores = new Map<AutoCategory, CategoryScore>();

  for (const { category, terms } of RULES) {
    let nameScore = 0;
    let descScore = 0;
    let ambiguousScore = 0;
    let hasClearSignal = false;

    for (const { re, strength } of terms) {
      const inName = re.test(name);
      const inDesc = !inName && desc !== '' && re.test(desc);
      if (!inName && !inDesc) continue;
      const points = WEIGHT[strength] * (inName ? NAME_FACTOR : 1);
      if (strength === 'ambiguous') ambiguousScore += points;
      else {
        hasClearSignal = true;
        if (inName) nameScore += points;
        else descScore += points;
      }
    }

    const score = nameScore + Math.min(descScore, DESCRIPTION_CAP) + (hasClearSignal ? ambiguousScore : 0);
    scores.set(category, { category, score, nameScore, explicit: false });
  }

  // Evidência explícita
  for (const { category, gate, patterns, lead } of EXPLICIT) {
    if (!gate || !gate.test(all)) continue;
    const entry = scores.get(category)!;
    if (patterns.some((re) => re.test(name) || re.test(desc)) || (lead !== null && lead.test(desc))) {
      entry.explicit = true;
    }
  }

  // Contexto: lugar + descoberta → Viagens; mudança de país → Imigração
  if (PLACE_RE.test(all) && DISCOVERY_RE.test(all)) scores.get('travel')!.score += CONTEXT_POINTS;
  if (RELOCATION_RE.test(all)) scores.get('immigration')!.score += CONTEXT_POINTS;

  // Camper: viagem vs veículo/equipamento
  if (CAMPER_RE.test(all)) {
    const vehicle = CAMPER_VEHICLE_RE.test(all);
    const travel = CAMPER_TRAVEL_RE.test(all);
    if (vehicle && !travel) scores.get('cars')!.score += CONTEXT_POINTS;
    else if (travel && !vehicle) scores.get('travel')!.score += CONTEXT_POINTS;
    else if (vehicle && travel && /(?:rooftop|roof) tents?|tejadilho/.test(all)) scores.get('cars')!.score += CONTEXT_POINTS;
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

function pickWithMargin(candidates: CategoryScore[], rivals: CategoryScore[]): AutoCategory | null {
  const [best] = candidates;
  if (!best) return null;
  const second = rivals.find((r) => r.category !== best.category)?.score ?? 0;
  const clearLead = best.score - second >= 2 || best.score >= second * 2;
  return clearLead ? best.category : null;
}

/** Declarações explícitas de tema. Devolve null se não houver uma resposta clara. */
function pickExplicit(scores: CategoryScore[]): AutoCategory | null {
  const explicit = scores.filter((s) => s.explicit);
  if (explicit.length === 0) return null;

  const specificExplicit = explicit.filter((s) => !GENERIC.has(s.category));
  if (specificExplicit.length === 0) return null; // genéricas seguem o caminho normal (tema > formato)

  // Várias declarações temáticas: só decide se uma tiver clara vantagem.
  const chosen = specificExplicit.length === 1 ? specificExplicit[0] : null;
  const best =
    chosen ?? (pickWithMargin(specificExplicit, specificExplicit) ? specificExplicit[0] : null);
  if (!best) return null;

  // Um nome com sinais fortes de OUTRO tema (ex.: "Louvor e Adoração") prevalece
  // sobre uma declaração na descrição, se o nome não apoiar o tema declarado.
  const strongNameRival = scores.find(
    (s) => s.category !== best.category && !GENERIC.has(s.category) && s.nameScore >= 6,
  );
  if (strongNameRival && best.nameScore === 0) return null;

  return best.category;
}

/** Sugere uma categoria a partir do nome e da descrição. */
export function classifyChannel(title: string, description = ''): CategoryId {
  const scores = scoreCategories(title, description);

  // 1. Declaração explícita do tema ("canal de fotografia", "comentarista político"…)
  const explicit = pickExplicit(scores);
  if (explicit) return explicit;

  // 2. Pontuação normal (D2): tema específico > genérico, com margem obrigatória.
  const specific = scores.filter((s) => !GENERIC.has(s.category));
  const generic = scores.filter((s) => GENERIC.has(s.category));
  const specificCandidates = specific.filter((s) => s.score >= MIN_SCORE);

  // Exceção: um jornal/TV generalista que menciona de passagem um tema
  // ("notícias de última hora, atualidade e política") continua em Notícias.
  const topGeneric = generic[0];
  const topSpecific = specificCandidates[0];
  const genericDominates =
    topGeneric !== undefined &&
    topSpecific !== undefined &&
    topGeneric.score >= Math.max(6, topSpecific.score * 2) &&
    topSpecific.nameScore === 0;
  if (genericDominates) return pickWithMargin([topGeneric], scores) ?? 'unclassified';

  if (specificCandidates.length > 0) {
    return pickWithMargin(specificCandidates, specific) ?? 'unclassified';
  }

  // Nas genéricas, uma "declaração" não basta ("Notícias." não define Notícias & Atualidade).
  const genericCandidates = generic.filter((s) => s.score >= MIN_SCORE_GENERIC);
  return pickWithMargin(genericCandidates, scores) ?? 'unclassified';
}
