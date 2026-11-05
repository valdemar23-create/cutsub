import type { Channel } from '../domain/channel';
import type { LoadOptions, SubscriptionSource } from './SubscriptionSource';

/**
 * DADOS DEMO — totalmente fictícios.
 * Nomes, descrições e datas foram inventados para testar o aspeto visual.
 * Não correspondem a canais reais e não têm link para o YouTube.
 */
const DEMO_CHANNELS: ReadonlyArray<Omit<Channel, 'id'>> = [
  { title: 'Atlas de Bolso', description: 'Geografia contada em 10 minutos: fronteiras estranhas, ilhas esquecidas e mapas que mentem.', subscribedAt: '2019-03-12T10:00:00Z' },
  { title: 'Bancada do Zé', description: 'Carpintaria para principiantes. Ferramentas baratas, projetos de fim de semana.', subscribedAt: '2021-07-02T10:00:00Z' },
  { title: 'Bits & Bolachas', description: 'Programação explicada com café e bolachas. Python, JavaScript e algum caos.', subscribedAt: '2020-01-18T10:00:00Z' },
  { title: 'Cozinha em 15', description: 'Receitas rápidas para dias sem tempo. Ingredientes simples, zero dramas.', subscribedAt: '2018-11-05T10:00:00Z' },
  { title: 'Crónicas do Pixel', description: 'Análises de jogos indie e histórias por trás do desenvolvimento.', subscribedAt: '2017-09-21T10:00:00Z' },
  { title: 'Dois Pedais', description: 'Cicloturismo pela Península Ibérica. Rotas, equipamento e muitas subidas.', subscribedAt: '2022-04-14T10:00:00Z' },
  { title: 'Estúdio Nebulosa', subscribedAt: '2016-06-30T10:00:00Z' },
  { title: 'Física Sem Medo', description: 'Experiências caseiras que explicam o universo. Sem fórmulas assustadoras.', subscribedAt: '2019-10-09T10:00:00Z' },
  { title: 'Guitarra Lenta', description: 'Aulas de guitarra a metade da velocidade. Para quem está a começar.', subscribedAt: '2020-05-27T10:00:00Z' },
  { title: 'Horta na Varanda', description: 'Cultivar comida em espaços pequenos. Vasos, sementes e muita paciência.', subscribedAt: '2021-02-11T10:00:00Z' },
  { title: 'Ilha dos Podcasts', description: 'Conversas longas sobre ciência, cultura e tudo o que fica pelo meio.', subscribedAt: '2023-08-03T10:00:00Z' },
  { title: 'Jardim Digital', description: 'Produtividade, notas e sistemas pessoais de organização.', subscribedAt: '2022-12-19T10:00:00Z' },
  { title: 'Kilómetro Zero', description: 'Viagens de comboio pela Europa com orçamento apertado.', subscribedAt: '2018-03-08T10:00:00Z' },
  { title: 'Luz de Inverno', description: 'Fotografia de paisagem: técnicas, edição e saídas de campo.', subscribedAt: '2017-01-25T10:00:00Z' },
  { title: 'Máquinas Antigas', description: 'Restauro de rádios, relógios e outras máquinas com história.', subscribedAt: '2015-10-14T10:00:00Z' },
  { title: 'Noite de Estrelas', description: 'Astronomia amadora: o que ver no céu este mês e como fotografar.', subscribedAt: '2020-09-02T10:00:00Z' },
  { title: 'Oficina Sonora', subscribedAt: '2019-06-17T10:00:00Z' },
  { title: 'Papel & Tinta', description: 'Caligrafia, aguarela e cadernos de desenho.', subscribedAt: '2021-11-29T10:00:00Z' },
  { title: 'Quinta do Retro', description: 'Consolas antigas, cartuchos e reparações a ferro de soldar.', subscribedAt: '2016-02-22T10:00:00Z' },
  { title: 'Rota do Sabor', description: 'Comida de rua pelo mundo, uma tasca de cada vez.', subscribedAt: '2018-07-31T10:00:00Z' },
  { title: 'Sala de Xadrez', description: 'Aberturas, finais e partidas comentadas para todos os níveis.', subscribedAt: '2022-01-06T10:00:00Z' },
  { title: 'Treino em Casa', description: 'Rotinas de 20 minutos sem equipamento.', subscribedAt: '2020-03-16T10:00:00Z' },
  { title: 'Ultramar Docs', description: 'Documentários curtos sobre história marítima.', subscribedAt: '2014-12-01T10:00:00Z' },
  { title: 'Vinil de Domingo', description: 'Discos esquecidos, lados B e histórias da música portuguesa.', subscribedAt: '2023-03-20T10:00:00Z' },
];

const PAGE_SIZE = 10; // simula a paginação da API (a real usa 50)
const PAGE_DELAY_MS = 350;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Carregamento cancelado', 'AbortError'));
      },
      { once: true },
    );
  });
}

export const demoSource: SubscriptionSource = {
  kind: 'demo',

  async load({ signal, onProgress }: LoadOptions = {}) {
    const channels: Channel[] = [];
    for (let i = 0; i < DEMO_CHANNELS.length; i += PAGE_SIZE) {
      await wait(PAGE_DELAY_MS, signal);
      DEMO_CHANNELS.slice(i, i + PAGE_SIZE).forEach((c, j) => {
        channels.push({ ...c, id: `demo-${i + j + 1}` });
      });
      onProgress?.({ loaded: channels.length });
    }
    return channels;
  },
};
