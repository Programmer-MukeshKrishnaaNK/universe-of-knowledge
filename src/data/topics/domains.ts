import type { Topic } from '../schema'

export const domains: Topic[] = [
  {
    id: 'mathematics',
    title: 'Mathematics',
    aliases: ['math', 'maths'],
    domain: 'mathematics',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of patterns, quantity, structure and change.',
    simple:
      'Mathematics is the study of patterns. It gives us precise ways to talk about amounts, shapes, change and chance — and to be completely sure when something is true.',
    intuition:
      'Every time you notice "this always happens", mathematics asks: why, exactly? Then it writes the answer down so carefully that nobody can argue with it. Counting sheep, measuring a field, predicting a coin toss — these small questions grew into a gigantic, connected structure.',
    analogy:
      'Think of mathematics as the grammar of the universe. Physics, chemistry and computer science are stories; mathematics is the language they are written in.',
    why:
      'Almost every idea in science eventually becomes an equation. Mathematics is what lets us predict eclipses, build bridges, encrypt messages and describe the quantum world.',
    related: ['physics', 'computer-science'],
    tags: ['foundations'],
  },
  {
    id: 'physics',
    title: 'Physics',
    domain: 'physics',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of matter, energy, space, time — and how they interact.',
    simple:
      'Physics tries to find the simplest rules that explain how everything behaves — from falling apples to light, heat, atoms and the whole universe.',
    intuition:
      'Physicists are rule-hunters. They watch the world, guess a rule, turn the rule into mathematics, and then test whether it predicts something new. When it does, we have learned something about reality.',
    analogy:
      'If the universe is a game, physics is the attempt to work out the rulebook just by watching people play.',
    why:
      'Physics underlies all technology — electricity, engines, lasers, GPS, computers, medical scanners. It also answers the deepest questions we can ask: what is matter, what is time, how did everything begin?',
    prerequisites: ['mathematics'],
    related: ['astronomy', 'chemistry', 'engineering'],
  },
  {
    id: 'astronomy',
    title: 'Astronomy',
    aliases: ['astrophysics', 'space'],
    domain: 'astronomy',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of everything beyond Earth: planets, stars, galaxies, the universe.',
    simple:
      'Astronomy studies the sky — planets, stars, galaxies, black holes and the universe as a whole — mostly by carefully collecting the light that reaches us from far away.',
    intuition:
      'We can never visit most of what astronomers study. Instead, every photon arriving at a telescope is a message that may have travelled for billions of years. Astronomy is the art of reading those messages.',
    why:
      'Astronomy tells us where we came from: how the elements in our bodies were made in stars, how Earth formed, and how the universe began and evolves.',
    prerequisites: ['physics'],
    related: ['physics'],
  },
  {
    id: 'computer-science',
    title: 'Computer Science',
    aliases: ['cs', 'computing'],
    domain: 'computer-science',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of information, computation, and what can be computed.',
    simple:
      'Computer science is about information and step-by-step procedures (algorithms): how to store information, how to process it, and what problems can be solved at all.',
    intuition:
      'Long before electronic computers, people followed recipes and procedures. Computer science asks: what is a procedure, how fast can it go, and are there questions no procedure can ever answer?',
    why:
      'Software now runs almost everything — science, medicine, finance, communication. And new ideas like quantum computing are rewriting what "computation" can mean.',
    prerequisites: ['mathematics'],
    related: ['mathematics', 'physics', 'engineering'],
  },
  {
    id: 'chemistry',
    title: 'Chemistry',
    domain: 'chemistry',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of substances, how they are built from atoms, and how they change.',
    simple:
      'Chemistry studies what things are made of and how substances turn into other substances — cooking, rusting, burning, digestion and medicines are all chemistry.',
    intuition:
      'Everything around you is built from about a hundred kinds of atoms. Chemistry is the study of how those atoms hold hands, let go, and swap partners.',
    why:
      'Materials, medicines, batteries, fertilisers and the chemistry of life itself all depend on understanding how atoms bond and react.',
    prerequisites: ['physics'],
    related: ['physics', 'biology'],
  },
  {
    id: 'biology',
    title: 'Biology',
    domain: 'biology',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of living things.',
    simple:
      'Biology studies life — cells, genes, organisms, ecosystems — and how living things grow, reproduce and change over time.',
    why: 'Medicine, agriculture, ecology and our understanding of ourselves all rest on biology.',
    prerequisites: ['chemistry'],
    related: ['chemistry', 'neuroscience'],
    mapped: false,
  },
  {
    id: 'earth-science',
    title: 'Earth Science',
    aliases: ['geology'],
    domain: 'earth-science',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of our planet: rock, ocean, atmosphere and climate.',
    simple:
      'Earth science studies the planet we live on — earthquakes, volcanoes, oceans, weather and climate — and how they all interact.',
    why: 'Understanding Earth is essential for predicting weather, finding resources, and responding to climate change.',
    prerequisites: ['physics', 'chemistry'],
    related: ['physics', 'astronomy'],
    mapped: false,
  },
  {
    id: 'neuroscience',
    title: 'Neuroscience',
    domain: 'neuroscience',
    level: 0,
    difficulty: 'beginner',
    short: 'The study of the nervous system and the brain.',
    simple:
      'Neuroscience studies how the brain and nerves work — how billions of cells, sending tiny electrical signals, produce movement, memory and thought.',
    why: 'It helps treat diseases like Alzheimer’s and epilepsy, and it inspired the artificial neural networks behind modern AI.',
    prerequisites: ['biology'],
    related: ['biology', 'computer-science'],
    mapped: false,
  },
  {
    id: 'engineering',
    title: 'Engineering',
    domain: 'engineering',
    level: 0,
    difficulty: 'beginner',
    short: 'Using science and mathematics to design things that work.',
    simple:
      'Engineering takes what science knows and uses it to build useful things — bridges, circuits, engines, aircraft, software and medical devices.',
    why: 'Engineering is where knowledge becomes the world we live in.',
    prerequisites: ['physics', 'mathematics'],
    related: ['physics', 'computer-science'],
    mapped: false,
  },
]
