import type { Topic } from '../schema'

const m = String.raw

export const physics: Topic[] = [
  // ─── Fields ──────────────────────────────────────────────────────────
  {
    id: 'classical-mechanics',
    title: 'Classical Mechanics',
    aliases: ['mechanics', 'newtonian physics'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'beginner',
    short: 'How objects move and why — from thrown balls to orbiting planets.',
    simple:
      'Classical mechanics explains how things move when forces push or pull on them: balls, cars, bridges, planets. It works brilliantly for everyday objects.',
    intuition:
      'Before Newton, people thought heavenly motion and earthly motion were different. Newton showed that the same rule that makes an apple fall keeps the Moon in orbit. One set of laws for everything you can see.',
    analogy: 'Classical mechanics is the physics engine of the everyday world — like the code inside a video game that decides how things bounce, fall and collide.',
    howItWorks:
      'Start with [[newtons-laws]]: forces change motion. Add conserved quantities like [[energy]] and [[momentum]], which make many problems easy. Advanced formulations (Lagrangian and Hamiltonian mechanics) rewrite the same physics in terms of energy — and that Hamiltonian language later became the foundation of [[quantum-mechanics]].',
    technical:
      'Lagrangian mechanics derives motion from the principle of stationary action, $\delta S = 0$ with $S = \int L\,dt$. Hamiltonian mechanics describes flows in phase space. Noether’s theorem links symmetries to conservation laws: time symmetry → energy, space symmetry → momentum.',
    math: m`$$\vec F = m\vec a \qquad\qquad L = T - V \qquad\qquad \frac{d}{dt}\frac{\partial L}{\partial \dot q} = \frac{\partial L}{\partial q}$$`,
    why: 'It is the foundation of engineering, space flight and most everyday technology, and the starting point for every other branch of physics.',
    applications: ['Engineering and construction', 'Spaceflight and satellites', 'Sports science', 'Video game physics'],
    misconceptions: [
      {
        myth: 'Moving objects need a force to keep moving.',
        truth: 'Objects keep moving on their own. Forces change motion; friction is what usually slows things down.',
      },
      {
        myth: 'Classical mechanics is "wrong" because of relativity and quantum physics.',
        truth: 'It is an extraordinarily accurate approximation for everyday speeds and sizes. NASA still navigates spacecraft with it (plus small corrections).',
      },
    ],
    prerequisites: ['calculus', 'vectors'],
    related: ['differential-equations', 'orbits'],
    research: [
      { paper: 'newton-1687', kind: 'foundational' },
      { paper: 'hamilton-1834', kind: 'foundational' },
    ],
    tags: ['motion', 'forces', 'newton'],
  },
  {
    id: 'electromagnetism',
    title: 'Electromagnetism',
    aliases: ['electricity', 'magnetism', 'em'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'intermediate',
    short: 'Electricity, magnetism and light — one force, many faces.',
    simple:
      'Electromagnetism is the force between electric charges. Electricity, magnetism and light turned out to be different sides of this one force.',
    intuition:
      'Rub a balloon on your hair and it sticks to the wall. Move a magnet near a wire and current flows. Wiggle electric charges fast enough and they send out light. These look unrelated, but they are all one thing.',
    analogy: 'Electric and magnetic fields are like the two partners in a dance — change one, and the other responds. Their dance travelling through space is light.',
    howItWorks:
      'Charges create electric fields; moving charges (currents) create magnetic fields. A changing magnetic field creates an electric field, and vice versa. James Clerk Maxwell wrote all of this in four [[maxwells-equations|equations]] and discovered they predict waves moving at the speed of [[light]].',
    technical:
      'Classical electrodynamics is a relativistic field theory; its gauge symmetry U(1) became the template for modern [[quantum-field-theory]]. Quantum electrodynamics (QED) is the most precisely tested theory in science.',
    why: 'Electromagnetism holds atoms together, drives all of chemistry and biology, and powers every electrical device, radio, and fibre-optic cable.',
    applications: ['Electric power and motors', 'Radio, Wi-Fi and phones', 'MRI scanners', 'Lasers and fibre optics'],
    prerequisites: ['vectors', 'calculus'],
    related: ['special-relativity', 'chemical-bonds'],
    research: [
      { paper: 'faraday-1832', kind: 'foundational' },
      { paper: 'maxwell-1865', kind: 'foundational' },
    ],
    tags: ['charge', 'fields', 'maxwell'],
  },
  {
    id: 'thermodynamics',
    title: 'Thermodynamics',
    aliases: ['heat', 'temperature'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'intermediate',
    short: 'Heat, energy, and why things tend to run down.',
    simple:
      'Thermodynamics is the physics of heat and energy: how engines work, why ice melts, and why you can never build a perfect machine.',
    intuition:
      'Heat always flows from hot to cold, never the other way on its own. A shattered glass never reassembles itself. Thermodynamics explains this one-way direction of everyday life.',
    analogy: 'Energy is money that can never be created or destroyed — but every transaction charges a fee, paid in [[entropy]].',
    howItWorks:
      'The First Law: energy is conserved. The Second Law: total [[entropy]] never decreases. The Third Law: absolute zero can’t be reached. [[statistical-mechanics|Statistical mechanics]] later explained these laws as the behaviour of vast numbers of atoms.',
    math: m`First law, and the maximum (Carnot) efficiency of a heat engine:
$$\Delta U = Q - W \qquad\qquad \eta_{\max} = 1 - \frac{T_\text{cold}}{T_\text{hot}}$$`,
    why: 'It governs engines, refrigerators, power stations, climate, chemistry, living cells — and even the ultimate fate of the universe.',
    applications: ['Engines and power plants', 'Refrigeration and heat pumps', 'Climate science', 'Chemistry'],
    prerequisites: ['energy'],
    related: ['chemistry', 'information-theory', 'earth-science'],
    research: [
      { paper: 'carnot-1824', kind: 'foundational' },
      { paper: 'joule-1850', kind: 'experiment' },
    ],
    tags: ['heat', 'energy', 'engines'],
  },
  {
    id: 'special-relativity',
    title: 'Special Relativity',
    aliases: ['relativity', 'einstein'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'intermediate',
    short: 'Space and time change depending on how fast you move.',
    simple:
      'Special relativity says the speed of light is the same for everyone. The surprising consequence is that time and space are not fixed: moving clocks run slow and moving objects shrink.',
    intuition:
      'If everyone must measure the same speed for light, no matter how fast they are moving, something else has to give. What gives is time and distance themselves. Einstein realised space and time blend into one thing: [[spacetime]].',
    analogy: 'Space and time are like the length and width of a shadow. Tilt the object (change your speed) and some "length" turns into "width" — but the object hasn’t changed.',
    howItWorks:
      'Two principles: the laws of physics are the same for all steadily moving observers, and light always travels at $c$. From these alone follow [[time-dilation]], length contraction, the relativity of simultaneity, and [[mass-energy|$E = mc^2$]].',
    technical:
      'Special relativity is the geometry of Minkowski spacetime with the invariant interval $ds^2 = -c^2dt^2 + dx^2 + dy^2 + dz^2$. Lorentz transformations preserve it. Combining it with quantum mechanics leads to [[quantum-field-theory]].',
    math: m`$$\gamma = \frac{1}{\sqrt{1 - v^2/c^2}} \qquad \Delta t' = \gamma\,\Delta t \qquad E = \gamma m c^2$$`,
    why: 'It is essential to particle accelerators and GPS, explains why nothing outruns light, and set the stage for general relativity.',
    applications: ['GPS satellites', 'Particle accelerators', 'Nuclear energy', 'PET scans'],
    misconceptions: [
      {
        myth: 'Relativity means "everything is relative".',
        truth: 'It is really about what is absolute: the speed of light and the spacetime interval are the same for everyone.',
      },
    ],
    prerequisites: ['classical-mechanics', 'algebra'],
    related: ['electromagnetism', 'light'],
    research: [
      { paper: 'michelson-morley-1887', kind: 'experiment' },
      { paper: 'einstein-1905-sr', kind: 'foundational' },
      { paper: 'hafele-keating-1972', kind: 'experiment' },
    ],
    tags: ['einstein', 'speed of light'],
  },
  {
    id: 'general-relativity',
    title: 'General Relativity',
    aliases: ['einstein gravity', 'GR'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'advanced',
    short: 'Gravity is the curvature of spacetime.',
    simple:
      'General relativity is Einstein’s theory of gravity. It says mass and energy bend space and time, and that bending is what we feel as gravity.',
    intuition:
      'Put a bowling ball on a trampoline and roll a marble nearby: it curves towards the ball, not because something pulls it, but because the surface is bent. Einstein said planets orbit the Sun in a similar way — they follow the straightest paths through curved [[spacetime]].',
    analogy: '"Spacetime tells matter how to move; matter tells spacetime how to curve." — a famous summary by physicist John Wheeler.',
    howItWorks:
      'Einstein’s key insight (the equivalence principle): falling freely feels exactly like floating in space. So gravity isn’t a force in the usual sense; it’s geometry. The field equations link the curvature of spacetime to the energy and momentum within it. They predict [[black-holes]], [[gravitational-waves]], the bending of light, and an expanding universe.',
    technical:
      'The Einstein field equations relate the Einstein tensor (built from the Ricci curvature of a Lorentzian metric) to the stress–energy tensor. They are ten coupled nonlinear [[partial-differential-equations|PDEs]]. Reconciling GR with quantum mechanics — quantum gravity — is the biggest open problem in theoretical physics.',
    math: m`$$G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4}\,T_{\mu\nu}$$`,
    why: 'Without it, GPS would drift by kilometres a day. It explains black holes, gravitational waves and the large-scale evolution of the entire universe.',
    applications: ['GPS', 'Gravitational-wave astronomy', 'Cosmology', 'Gravitational lensing'],
    misconceptions: [
      {
        myth: 'The trampoline picture is the whole story.',
        truth: 'It’s a helpful cartoon, but it uses gravity to explain gravity. In reality, time is curved too — and the warping of time does most of the work for everyday falling objects.',
      },
    ],
    prerequisites: ['special-relativity', 'non-euclidean-geometry'],
    related: ['cosmology', 'black-holes'],
    research: [
      { paper: 'einstein-1916-gr', kind: 'foundational' },
      { paper: 'dyson-eddington-1920', kind: 'experiment' },
      { paper: 'pound-rebka-1960', kind: 'experiment' },
      { paper: 'ashby-2003', kind: 'review' },
      { paper: 'everitt-2011', kind: 'experiment' },
    ],
    openQuestions: ['How does gravity work at the quantum level?', 'What happens at the centre of a black hole?'],
    tags: ['gravity', 'curvature', 'einstein'],
  },
  {
    id: 'quantum-physics',
    title: 'Quantum Physics',
    aliases: ['quantum', 'quantum theory'],
    domain: 'physics',
    level: 1,
    parent: 'physics',
    difficulty: 'intermediate',
    short: 'The physics of the very small, where energy comes in packets and certainty dissolves.',
    simple:
      'Quantum physics describes how atoms, electrons and light behave. At that tiny scale, energy comes in small packets (quanta), particles act like waves, and nature seems to deal in probabilities.',
    intuition:
      'Around 1900 physicists found that their perfectly good theories gave absurd answers for atoms and light. The fix was strange: energy isn’t smooth like water but grainy like sand. Pull on that thread and the whole picture changes — things can be in several states at once, and measuring them changes them.',
    analogy: 'Classical physics is like a ramp; quantum physics is like a staircase. From far away they look the same — up close, you can only stand on the steps.',
    howItWorks:
      'The story begins with Planck’s energy packets (1900), Einstein’s light quanta (1905), and Bohr’s atom (1913), then crystallises into full [[quantum-mechanics]] in 1925–26. Key ideas: [[wave-particle-duality]], the [[uncertainty-principle]], [[quantum-tunneling]], and eventually [[quantum-field-theory]].',
    why: 'Quantum physics explains why atoms are stable, why the Sun shines, how chemistry works, and underpins transistors, lasers, LEDs, MRI and the coming generation of [[quantum-computing|quantum computers]].',
    applications: ['Transistors and computer chips', 'Lasers and LEDs', 'Solar cells', 'MRI', 'Quantum computers'],
    misconceptions: [
      {
        myth: 'Quantum means "tiny amount".',
        truth: 'A quantum is a discrete packet — the smallest step something can change by. The effects can be huge: they make your phone’s chips work.',
      },
      {
        myth: 'Quantum physics says consciousness creates reality.',
        truth: 'No mainstream interpretation requires a conscious observer. "Measurement" means any interaction that records information, even by a detector or stray air molecule.',
      },
    ],
    prerequisites: ['classical-mechanics', 'probability', 'waves'],
    related: ['chemistry', 'atoms'],
    research: [
      { paper: 'planck-1901', kind: 'foundational' },
      { paper: 'einstein-1905-photoelectric', kind: 'foundational' },
      { paper: 'bohr-1913', kind: 'foundational' },
    ],
    tags: ['quanta', 'atoms', 'probability'],
  },

  // ─── Classical mechanics concepts ───────────────────────────────────
  {
    id: 'newtons-laws',
    title: 'Newton’s Laws',
    aliases: ['newton', 'force', 'f=ma', 'inertia'],
    domain: 'physics',
    level: 2,
    parent: 'classical-mechanics',
    difficulty: 'beginner',
    short: 'Three rules that describe how forces change motion.',
    simple:
      '1. Things keep doing what they’re doing unless a force acts. 2. Force causes acceleration: $F = ma$. 3. Every push has an equal push back.',
    intuition:
      'Slide a puck on ice and it glides a long way — nothing is stopping it. Push a shopping cart: the heavier it is, the harder you must push to speed it up. Push against a wall and the wall pushes back just as hard.',
    analogy: 'Newton’s laws are the grammar rules of motion: once you know them, you can "read" almost any everyday movement.',
    math: m`$$\vec F = m\vec a = m\frac{d^2\vec x}{dt^2}$$`,
    why: 'These three laws let us predict the motion of almost anything, from cars to comets, and launched modern science.',
    applications: ['Vehicle safety design', 'Rocketry', 'Structural engineering'],
    misconceptions: [
      {
        myth: 'Heavier objects fall faster.',
        truth: 'Without air resistance, all objects fall at the same rate. Galileo and, much later, an astronaut on the Moon (with a hammer and a feather) showed this.',
      },
    ],
    prerequisites: ['vectors', 'derivatives'],
    related: ['momentum', 'gravity'],
    research: [{ paper: 'newton-1687', kind: 'foundational' }],
    tags: ['force', 'motion'],
  },
  {
    id: 'energy',
    title: 'Energy',
    aliases: ['kinetic energy', 'potential energy', 'conservation of energy'],
    domain: 'physics',
    level: 2,
    parent: 'classical-mechanics',
    difficulty: 'beginner',
    short: 'The capacity to cause change — never created, never destroyed.',
    simple:
      'Energy is the ability to make things happen. It comes in many forms — motion, height, heat, chemical, electrical — and it can change form, but the total never changes.',
    intuition:
      'A roller coaster climbs slowly (storing energy in its height), then races down (turning height into speed). At every moment, height energy plus speed energy stays nearly the same; the rest leaks away as heat and sound.',
    analogy: 'Energy is like money moving between accounts: it can be transferred and converted, but the total in the universe stays the same.',
    math: m`$$E_\text{kinetic} = \tfrac12 m v^2 \qquad E_\text{potential} = mgh$$`,
    why: 'Conservation of energy is one of the deepest laws of nature. In quantum mechanics, the allowed energies of a system determine its entire behaviour.',
    prerequisites: ['newtons-laws'],
    related: ['thermodynamics', 'mass-energy', 'schrodinger-equation'],
    tags: ['conservation'],
  },
  {
    id: 'momentum',
    title: 'Momentum',
    aliases: ['conservation of momentum'],
    domain: 'physics',
    level: 2,
    parent: 'classical-mechanics',
    difficulty: 'beginner',
    short: 'Mass in motion — and always conserved in collisions.',
    simple:
      'Momentum is mass times velocity. In any collision or explosion, the total momentum before equals the total momentum after.',
    intuition: 'A bowling ball rolling slowly can knock down pins that a fast ping-pong ball can’t. Momentum measures how hard something is to stop.',
    math: m`$$\vec p = m\vec v \qquad \sum \vec p_\text{before} = \sum \vec p_\text{after}$$`,
    why: 'Momentum conservation explains rockets, recoil and collisions. In quantum mechanics, momentum and position cannot both be sharply known — the [[uncertainty-principle]].',
    prerequisites: ['newtons-laws'],
    related: ['uncertainty-principle'],
    tags: ['collisions', 'conservation'],
  },
  {
    id: 'harmonic-oscillator',
    title: 'Harmonic Oscillator',
    aliases: ['oscillation', 'spring', 'pendulum', 'simple harmonic motion'],
    domain: 'physics',
    level: 2,
    parent: 'classical-mechanics',
    difficulty: 'intermediate',
    short: 'Anything that swings back and forth around a resting point.',
    simple:
      'A harmonic oscillator is anything that wobbles back and forth around a resting point — a swing, a spring, a guitar string.',
    intuition:
      'Pull a spring and let go: the further you pulled, the harder it pulls back. That simple rule produces a perfectly regular rhythm.',
    analogy: 'It is physics’ favourite toy: almost anything slightly disturbed from rest behaves like one.',
    math: m`$$m\ddot x = -kx \quad\Rightarrow\quad x(t) = A\cos(\omega t + \phi), \;\; \omega = \sqrt{k/m}$$`,
    why: 'It models clocks, molecules, sound, light and circuits. In quantum mechanics it has evenly spaced energy levels and is the foundation of [[quantum-field-theory]].',
    prerequisites: ['newtons-laws', 'differential-equations', 'trigonometry'],
    related: ['waves', 'schrodinger-equation'],
    tags: ['spring', 'vibration'],
  },
  {
    id: 'waves',
    title: 'Waves',
    aliases: ['wave', 'interference', 'diffraction', 'wavelength', 'frequency'],
    domain: 'physics',
    level: 2,
    parent: 'classical-mechanics',
    difficulty: 'beginner',
    short: 'Travelling patterns of disturbance that carry energy, not matter.',
    simple:
      'A wave is a disturbance that travels, carrying energy from place to place without carrying the stuff itself. Ripples, sound and light are waves.',
    intuition:
      'At a stadium "wave", nobody runs around the stadium — each person just stands up and sits down. The pattern travels; the people stay put.',
    howItWorks:
      'Waves are described by wavelength, frequency and amplitude. When two waves meet they add together: crests plus crests make bigger crests (constructive interference), crests plus troughs cancel (destructive interference). Interference is the fingerprint of waviness — and electrons show it too ([[wave-particle-duality]]).',
    math: m`$$v = f\lambda \qquad y(x,t) = A\sin(kx - \omega t)$$`,
    why: 'Waves carry sound, light, radio and earthquakes. And in quantum mechanics, matter itself is described by a [[wave-function]].',
    applications: ['Music and acoustics', 'Radio and communication', 'Seismology', 'Noise-cancelling headphones'],
    prerequisites: ['trigonometry'],
    related: ['light', 'fourier-analysis', 'wave-particle-duality'],
    tags: ['interference', 'oscillation'],
  },

  // ─── Electromagnetism concepts ──────────────────────────────────────
  {
    id: 'maxwells-equations',
    title: 'Maxwell’s Equations',
    aliases: ['maxwell'],
    domain: 'physics',
    level: 2,
    parent: 'electromagnetism',
    difficulty: 'advanced',
    short: 'Four equations that contain all of electricity, magnetism and light.',
    simple:
      'Maxwell’s equations are four rules describing how electric charges and currents create electric and magnetic fields, and how those fields change and create each other.',
    intuition:
      'When Maxwell combined the rules, he found they predicted waves of electricity and magnetism travelling at about 300,000 km/s — the known speed of light. Light, he realised, is an electromagnetic wave.',
    math: m`$$\nabla\cdot\vec E = \frac{\rho}{\varepsilon_0} \quad \nabla\cdot\vec B = 0 \quad \nabla\times\vec E = -\frac{\partial \vec B}{\partial t} \quad \nabla\times\vec B = \mu_0\vec J + \mu_0\varepsilon_0\frac{\partial \vec E}{\partial t}$$`,
    why: 'Among the greatest unifications in science. They led to radio, and their speed of light — the same for everyone — pointed Einstein towards [[special-relativity]].',
    prerequisites: ['electromagnetism', 'partial-differential-equations'],
    related: ['light', 'special-relativity'],
    research: [{ paper: 'maxwell-1865', kind: 'foundational' }],
    tags: ['fields', 'unification'],
  },
  {
    id: 'light',
    title: 'Light',
    aliases: ['electromagnetic waves', 'photons', 'optics', 'speed of light'],
    domain: 'physics',
    level: 2,
    parent: 'electromagnetism',
    difficulty: 'beginner',
    short: 'An electromagnetic wave — and a stream of particles called photons.',
    simple:
      'Light is a wave of electric and magnetic fields travelling at about 300,000 km per second. Visible light is a tiny slice of a huge spectrum that includes radio, microwaves, X-rays and gamma rays.',
    intuition:
      'Radio, microwaves, the colours you see and X-rays are all the same thing — electromagnetic waves — just with different wavelengths. And, strangely, light also arrives in individual packets called photons.',
    why: 'Light is how we see and how astronomers study the universe. Its constant speed underlies relativity, and its packet-like nature launched [[quantum-physics]].',
    applications: ['Vision and cameras', 'Fibre-optic internet', 'Lasers', 'Astronomy'],
    prerequisites: ['waves'],
    related: ['wave-particle-duality', 'special-relativity', 'astronomy'],
    research: [
      { paper: 'maxwell-1865', kind: 'foundational' },
      { paper: 'einstein-1905-photoelectric', kind: 'foundational' },
    ],
    tags: ['photons', 'spectrum'],
  },

  // ─── Thermodynamics concepts ────────────────────────────────────────
  {
    id: 'entropy',
    title: 'Entropy',
    aliases: ['second law', 'disorder', 'arrow of time'],
    domain: 'physics',
    level: 2,
    parent: 'thermodynamics',
    difficulty: 'intermediate',
    short: 'A measure of how many ways a system can be arranged — and why time has a direction.',
    simple:
      'Entropy counts how many microscopic arrangements look the same from the outside. The Second Law says the total entropy of an isolated system never decreases — which is why things naturally mix, spread out and run down.',
    intuition:
      'Shuffle a new deck of cards. There is only one perfectly ordered arrangement, but trillions of messy ones. Shuffling almost always makes it messier — not because of a special force, but simply because messy arrangements vastly outnumber tidy ones.',
    analogy: 'Entropy is the reason your headphone cables tangle: there are far more tangled ways than untangled ones.',
    howItWorks:
      'Boltzmann defined entropy as $S = k\ln W$, where $W$ counts the microscopic arrangements (microstates) consistent with what we see. Systems wander randomly among microstates, so they end up in the kind of state with the most arrangements. This gives time its arrow.',
    technical:
      'Gibbs and Shannon entropies, $-\sum p_i\ln p_i$, connect thermodynamics to [[information-theory]]. Landauer’s principle states erasing one bit costs at least $kT\ln 2$ of heat. Black holes carry entropy proportional to their horizon area (Bekenstein–Hawking).',
    math: m`$$S = k_B \ln W \qquad\qquad \Delta S_\text{universe} \geq 0$$`,
    why: 'Entropy explains why engines can’t be 100% efficient, why time seems to flow one way, and deeply links physics with information.',
    misconceptions: [
      {
        myth: 'Entropy simply means disorder.',
        truth: '"Disorder" is a rough shorthand. Entropy precisely counts arrangements; sometimes higher-entropy states look more ordered, like crystals forming as a liquid releases heat.',
      },
      {
        myth: 'Life violates the Second Law.',
        truth: 'Living things lower their own entropy by increasing the entropy around them even more — mostly by releasing heat.',
      },
    ],
    prerequisites: ['thermodynamics', 'probability'],
    related: ['information-theory', 'statistical-mechanics', 'black-holes'],
    research: [
      { paper: 'clausius-1865', kind: 'foundational' },
      { paper: 'landauer-1961', kind: 'foundational' },
      { paper: 'bekenstein-1973', kind: 'foundational' },
    ],
    tags: ['disorder', 'time', 'information'],
  },
  {
    id: 'statistical-mechanics',
    title: 'Statistical Mechanics',
    aliases: ['statistical physics', 'boltzmann'],
    domain: 'physics',
    level: 2,
    parent: 'thermodynamics',
    difficulty: 'advanced',
    short: 'Explaining heat and temperature from the random motion of atoms.',
    simple:
      'Statistical mechanics explains everyday things like temperature and pressure using the probabilities of what trillions of atoms are doing.',
    intuition:
      'You can’t track every molecule in a balloon, but you don’t need to. Averaged over countless collisions, their random jiggling produces a steady, predictable pressure. Randomness at the small scale gives reliability at the large scale.',
    math: m`The Boltzmann distribution:
$$P(E_i) = \frac{e^{-E_i/k_BT}}{Z}, \qquad Z = \sum_i e^{-E_i/k_BT}$$`,
    why: 'It connects atoms to the everyday world, and is the basis for understanding magnets, phase transitions, and even how some machine-learning models work.',
    prerequisites: ['probability-distributions', 'thermodynamics'],
    related: ['entropy', 'quantum-mechanics', 'central-limit-theorem'],
    research: [
      { paper: 'jaynes-1957', kind: 'foundational' },
      { paper: 'metropolis-1953', kind: 'foundational' },
    ],
    tags: ['temperature', 'atoms'],
  },

  // ─── Relativity concepts ────────────────────────────────────────────
  {
    id: 'spacetime',
    title: 'Spacetime',
    aliases: ['space-time', 'minkowski'],
    domain: 'physics',
    level: 2,
    parent: 'special-relativity',
    difficulty: 'intermediate',
    short: 'Space and time woven into a single four-dimensional fabric.',
    simple:
      'Spacetime is the idea that space and time are not separate. Every event happens at a place and a time, and together those form a four-dimensional stage.',
    intuition:
      'To meet a friend you need to agree on where (three directions) and when (one more). Einstein showed that different observers split "where" and "when" differently — only the combined spacetime is the same for everyone.',
    math: m`$$s^2 = (ct)^2 - x^2 - y^2 - z^2 \quad \text{is the same for every observer}$$`,
    why: 'Spacetime is the stage of all modern physics. In [[general-relativity]], it becomes a dynamic, curving thing itself.',
    prerequisites: ['special-relativity', 'geometry'],
    related: ['general-relativity', 'non-euclidean-geometry'],
    tags: ['4D', 'minkowski'],
  },
  {
    id: 'time-dilation',
    title: 'Time Dilation',
    aliases: ['twin paradox', 'slow clocks'],
    domain: 'physics',
    level: 2,
    parent: 'special-relativity',
    difficulty: 'intermediate',
    short: 'Moving clocks — and clocks deep in gravity — tick slower.',
    simple:
      'Time dilation means time passes at different rates for different observers. A fast-moving clock ticks slower, and so does a clock closer to a heavy mass.',
    intuition:
      'Cosmic rays create particles called muons high in the atmosphere. They should decay long before reaching the ground — yet we detect them at sea level. Because they move near light speed, their clocks run slow from our point of view.',
    analogy: 'Your journey through spacetime has a fixed "speed". Spend more of it moving through space, and less is left for moving through time.',
    math: m`$$\Delta t_\text{moving} = \frac{\Delta t}{\gamma} = \Delta t\,\sqrt{1 - v^2/c^2}$$`,
    why: 'GPS satellites must correct for both kinds of time dilation — about 38 microseconds per day — or navigation errors would grow by kilometres daily.',
    prerequisites: ['special-relativity'],
    related: ['gravity', 'general-relativity'],
    research: [
      { paper: 'rossi-hall-1941', kind: 'experiment' },
      { paper: 'hafele-keating-1972', kind: 'experiment' },
      { paper: 'ashby-2003', kind: 'review' },
    ],
    tags: ['clocks', 'GPS'],
  },
  {
    id: 'mass-energy',
    title: 'E = mc²',
    aliases: ['mass-energy equivalence', 'emc2', 'e=mc2', 'mass energy'],
    domain: 'physics',
    level: 2,
    parent: 'special-relativity',
    difficulty: 'beginner',
    short: 'Mass is a form of energy — a tremendously concentrated one.',
    simple:
      '$E = mc^2$ says mass and energy are two forms of the same thing. Because $c^2$ is enormous, a tiny amount of mass holds a huge amount of energy.',
    intuition:
      'One gram of mass, fully converted, releases about as much energy as a large power station produces in a day. The Sun turns about four million tonnes of mass into light every second.',
    math: m`$$E = mc^2 \qquad E^2 = (pc)^2 + (mc^2)^2$$`,
    why: 'It explains how stars shine, how nuclear power works, and why particle collisions can create new particles.',
    misconceptions: [
      {
        myth: 'Mass turns into energy only in nuclear reactions.',
        truth: 'Every energy change changes mass — a hot cup of tea weighs a tiny bit more than a cold one. The effect is just too small to notice in daily life.',
      },
    ],
    prerequisites: ['special-relativity', 'energy'],
    related: ['stars', 'quantum-field-theory'],
    research: [{ paper: 'einstein-1905-emc2', kind: 'foundational' }],
    tags: ['nuclear', 'einstein'],
  },

  // ─── General relativity concepts ────────────────────────────────────
  {
    id: 'gravity',
    title: 'Gravity',
    aliases: ['gravitation', 'curved spacetime'],
    domain: 'physics',
    level: 2,
    parent: 'general-relativity',
    difficulty: 'beginner',
    short: 'The attraction between masses — or, as Einstein saw it, the shape of spacetime.',
    simple:
      'Gravity is what makes things fall and keeps planets in orbit. Newton described it as a pull between masses; Einstein showed it is the bending of space and time.',
    intuition:
      'Why do astronauts on the space station float? Not because there is no gravity there — it’s about 90% as strong as on the ground — but because they are falling around Earth together with the station.',
    math: m`Newton’s law of gravitation:
$$F = G\frac{m_1 m_2}{r^2}$$`,
    why: 'Gravity shapes everything large: planets, stars, galaxies and the universe itself.',
    misconceptions: [
      {
        myth: 'There is no gravity in space.',
        truth: 'Gravity reaches everywhere. Orbiting astronauts are weightless because they are in continuous free fall.',
      },
    ],
    prerequisites: ['newtons-laws'],
    related: ['orbits', 'black-holes', 'time-dilation'],
    research: [
      { paper: 'newton-1687', kind: 'foundational' },
      { paper: 'cavendish-1798', kind: 'experiment' },
    ],
    tags: ['attraction', 'orbits'],
  },
  {
    id: 'gravitational-waves',
    title: 'Gravitational Waves',
    aliases: ['ligo', 'ripples in spacetime'],
    domain: 'physics',
    level: 2,
    parent: 'general-relativity',
    difficulty: 'intermediate',
    short: 'Ripples in spacetime itself, made by accelerating masses.',
    simple:
      'Gravitational waves are ripples in the fabric of spacetime, created when huge masses — like two black holes — spiral together and collide.',
    intuition:
      'When two black holes merge a billion light-years away, the ripple stretches and squeezes Earth by less than the width of a proton. In 2015, the LIGO detectors measured exactly that.',
    analogy: 'Drop a stone in a pond and ripples spread across the water. Crash two black holes together and ripples spread across spacetime.',
    why: 'They opened a new way to observe the universe — "hearing" events no telescope can see — and earned the 2017 Nobel Prize in Physics.',
    prerequisites: ['general-relativity', 'waves'],
    related: ['black-holes'],
    research: [{ paper: 'ligo-2016', kind: 'experiment' }],
    tags: ['ligo', 'black holes'],
  },
]
