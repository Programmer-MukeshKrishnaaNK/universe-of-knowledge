import type { Topic } from '../schema'

const m = String.raw

export const astronomy: Topic[] = [
  {
    id: 'orbits',
    title: 'Orbits',
    aliases: ['kepler', 'planetary motion', 'kepler’s laws', 'satellites'],
    domain: 'astronomy',
    level: 1,
    parent: 'astronomy',
    difficulty: 'beginner',
    short: 'Why planets, moons and satellites go round and round.',
    simple:
      'An orbit is the path of an object falling around another under [[gravity]] — moving sideways so fast that it keeps missing the ground.',
    intuition:
      'Throw a ball: it curves to the ground. Throw it harder: it lands further away. Throw it at about 8 km/s and Earth’s surface curves away as fast as the ball falls. It never lands. That’s an orbit.',
    analogy: 'An orbit is endless falling with perfect aim — always falling towards the planet, always missing.',
    math: m`Kepler’s third law — the period grows with the size of the orbit:
$$T^2 = \frac{4\pi^2}{GM}\,a^3$$`,
    why: 'Orbits let us launch satellites, visit other planets, weigh stars and discover planets around other suns.',
    applications: ['Satellites and GPS', 'Space missions', 'Detecting exoplanets'],
    prerequisites: ['gravity', 'newtons-laws'],
    related: ['classical-mechanics', 'chaos-theory'],
    research: [
      { paper: 'newton-1687', kind: 'foundational' },
      { paper: 'poincare-1890', kind: 'foundational' },
    ],
    tags: ['kepler', 'planets'],
  },
  {
    id: 'stars',
    title: 'Stars',
    aliases: ['sun', 'nuclear fusion', 'stellar evolution', 'fusion', 'supernova'],
    domain: 'astronomy',
    level: 1,
    parent: 'astronomy',
    difficulty: 'beginner',
    short: 'Giant balls of gas that shine by fusing atoms in their cores.',
    simple:
      'A star is a huge ball of hot gas held together by its own gravity. Deep in its core, atoms fuse together, releasing the energy that makes it shine.',
    intuition:
      'Gravity squeezes the star inward; the heat of fusion pushes outward. A star is a balancing act that can last billions of years. When the fuel runs out, the balance breaks — and the star becomes a white dwarf, a neutron star or a [[black-holes|black hole]].',
    analogy: 'Stars are the universe’s element factories: nearly every atom heavier than helium in your body was forged inside one.',
    howItWorks:
      'In the Sun’s core, protons fuse into helium. Classically they repel each other too strongly, but [[quantum-tunneling]] lets them get close enough. The small mass lost becomes energy via [[mass-energy|$E = mc^2$]].',
    why: 'Stars make the chemical elements and provide the energy that powers life on Earth.',
    prerequisites: ['gravity', 'mass-energy'],
    related: ['quantum-tunneling', 'atoms', 'periodic-table'],
    research: [{ paper: 'chandrasekhar-1931', kind: 'foundational' }],
    tags: ['fusion', 'sun'],
  },
  {
    id: 'black-holes',
    title: 'Black Holes',
    aliases: ['black hole', 'event horizon', 'singularity', 'hawking radiation'],
    domain: 'astronomy',
    level: 1,
    parent: 'astronomy',
    difficulty: 'intermediate',
    short: 'Regions where spacetime is so curved that nothing — not even light — escapes.',
    simple:
      'A black hole is a place where matter is squeezed so tightly that gravity becomes unbeatable. Inside its boundary — the event horizon — nothing can escape, not even light.',
    intuition:
      'Everything has an escape speed: about 11 km/s for Earth. Squeeze a mass smaller and smaller and its escape speed rises. Squeeze it enough and the escape speed passes the speed of light. Since nothing is faster than light, nothing gets out.',
    analogy: 'Picture spacetime as a river flowing into a drain, faster near the centre. At the event horizon the river flows inward faster than any fish — even light — can swim.',
    howItWorks:
      '[[general-relativity|General relativity]] predicts that a sufficiently compact mass curves [[spacetime]] so strongly that all future paths inside the horizon lead inward. Black holes form when massive stars collapse, and supermassive ones — millions to billions of Suns — sit at the centres of galaxies. We detect them via orbiting stars, glowing gas, [[gravitational-waves]] and direct images of their shadows.',
    technical:
      'The Schwarzschild radius is $r_s = 2GM/c^2$; rotating black holes are described by the Kerr solution. Penrose showed singularities are generic. Hawking showed black holes emit thermal radiation with $T = \hbar c^3/8\pi G M k_B$ and carry entropy proportional to horizon area (Bekenstein–Hawking), raising the information paradox — a key clue for quantum gravity.',
    math: m`$$r_s = \frac{2GM}{c^2} \qquad S_{BH} = \frac{k_B c^3 A}{4 G \hbar}$$`,
    why: 'Black holes are natural laboratories for the most extreme physics — where gravity, quantum theory and [[entropy|thermodynamics]] collide.',
    applications: ['Testing general relativity', 'Gravitational-wave astronomy', 'Understanding galaxy formation'],
    misconceptions: [
      {
        myth: 'Black holes are cosmic vacuum cleaners that suck everything in.',
        truth: 'From far away, a black hole’s gravity is just like any other object of the same mass. If the Sun became a black hole, Earth would keep orbiting as before.',
      },
      {
        myth: 'Black holes are holes.',
        truth: 'They are extremely compact regions of spacetime — more like very dense objects than openings.',
      },
    ],
    prerequisites: ['general-relativity', 'gravity', 'light'],
    related: ['gravitational-waves', 'entropy', 'stars', 'quantum-field-theory'],
    research: [
      { paper: 'oppenheimer-snyder-1939', kind: 'foundational' },
      { paper: 'kerr-1963', kind: 'foundational' },
      { paper: 'penrose-1965', kind: 'foundational' },
      { paper: 'hawking-1975', kind: 'foundational' },
      { paper: 'bekenstein-1973', kind: 'foundational' },
      { paper: 'ligo-2016', kind: 'experiment' },
      { paper: 'eht-2019', kind: 'experiment' },
      { paper: 'eht-2022', kind: 'recent' },
    ],
    openQuestions: ['The black-hole information paradox', 'What replaces the singularity in a quantum theory of gravity?'],
    tags: ['event horizon', 'hawking', 'spacetime'],
  },
  {
    id: 'cosmology',
    title: 'Cosmology',
    aliases: ['universe', 'expanding universe', 'hubble'],
    domain: 'astronomy',
    level: 1,
    parent: 'astronomy',
    difficulty: 'intermediate',
    short: 'The origin, evolution and fate of the universe as a whole.',
    simple:
      'Cosmology studies the entire universe: how it began, how it has changed over 13.8 billion years, what it’s made of, and how it might end.',
    intuition:
      'In the 1920s Edwin Hubble noticed that distant galaxies are rushing away from us — and the further they are, the faster they go. Run that film backwards and everything was once squeezed together. That’s the starting point of modern cosmology.',
    analogy: 'Galaxies are like raisins in rising dough: as the dough (space) expands, every raisin moves away from every other one.',
    howItWorks:
      'Cosmology applies [[general-relativity]] to the whole universe. Observations of the [[big-bang|cosmic microwave background]], galaxy distributions and distant supernovae give a surprising recipe: about 5% ordinary matter, 27% [[dark-matter]] and 68% dark energy.',
    math: m`The Hubble–Lemaître law:
$$v = H_0\,d, \qquad H_0 \approx 70\ \text{km/s/Mpc}$$`,
    why: 'It answers the biggest questions we can ask: where did everything come from, and where is it going?',
    prerequisites: ['general-relativity', 'light'],
    related: ['quantum-field-theory', 'gravity'],
    research: [
      { paper: 'friedmann-1922', kind: 'foundational' },
      { paper: 'hubble-1929', kind: 'foundational' },
      { paper: 'riess-1998', kind: 'experiment' },
      { paper: 'perlmutter-1999', kind: 'experiment' },
      { paper: 'planck-2018', kind: 'recent' },
    ],
    openQuestions: ['What is dark energy?', 'Why do different measurements of the expansion rate disagree (the Hubble tension)?'],
    tags: ['universe', 'expansion'],
  },
  {
    id: 'big-bang',
    title: 'The Big Bang',
    aliases: ['big bang', 'cosmic microwave background', 'cmb', 'origin of the universe'],
    domain: 'astronomy',
    level: 2,
    parent: 'cosmology',
    difficulty: 'beginner',
    short: 'The hot, dense beginning of our expanding universe, 13.8 billion years ago.',
    simple:
      'The Big Bang theory says the universe began extremely hot and dense about 13.8 billion years ago and has been expanding and cooling ever since.',
    intuition:
      'The afterglow of that early heat still fills the sky as faint microwaves in every direction — discovered by accident in 1965 by two radio engineers who first blamed it on pigeon droppings in their antenna.',
    misconceptions: [
      {
        myth: 'The Big Bang was an explosion at one point in space.',
        truth: 'It was an expansion of space itself, happening everywhere at once. There is no centre.',
      },
    ],
    why: 'It explains the cosmic microwave background, the amounts of hydrogen and helium in the universe, and the expansion of space.',
    prerequisites: ['cosmology'],
    related: ['quantum-field-theory', 'entropy'],
    research: [
      { paper: 'penzias-wilson-1965', kind: 'experiment' },
      { paper: 'planck-2018', kind: 'recent' },
    ],
    tags: ['origin', 'cmb'],
  },
  {
    id: 'dark-matter',
    title: 'Dark Matter & Dark Energy',
    aliases: ['dark matter', 'dark energy'],
    domain: 'astronomy',
    level: 2,
    parent: 'cosmology',
    difficulty: 'intermediate',
    short: 'The invisible 95% of the universe.',
    simple:
      'Dark matter is invisible material whose gravity holds galaxies together. Dark energy is whatever is making the universe’s expansion speed up. Together they make up about 95% of the universe — and we don’t know what either is.',
    intuition: 'Stars at the edges of galaxies orbit far too fast for the visible matter to hold them. Either there is extra unseen mass, or our understanding of gravity is incomplete.',
    why: 'Solving them is one of the biggest open problems in physics.',
    prerequisites: ['cosmology', 'gravity'],
    related: ['quantum-field-theory', 'general-relativity'],
    research: [
      { paper: 'riess-1998', kind: 'experiment' },
      { paper: 'perlmutter-1999', kind: 'experiment' },
    ],
    openQuestions: ['What particle (if any) is dark matter?', 'Is dark energy a cosmological constant?'],
    tags: ['mystery', 'galaxies'],
  },
]
