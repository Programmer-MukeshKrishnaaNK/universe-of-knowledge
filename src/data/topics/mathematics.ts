import type { Topic } from '../schema'

const m = String.raw

export const mathematics: Topic[] = [
  // ─── Fields ──────────────────────────────────────────────────────────
  {
    id: 'algebra',
    title: 'Algebra',
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'beginner',
    short: 'Using symbols to stand for unknown or changing quantities.',
    simple:
      'Algebra is arithmetic with a twist: instead of only using numbers, you use letters like $x$ to stand for numbers you don’t know yet. Then you use rules to find them.',
    intuition:
      'Imagine a friend says "I’m thinking of a number; double it and add 3 and you get 11." You can solve that in your head. Algebra is just a tidy way of writing that puzzle down — $2x + 3 = 11$ — and a set of moves that always work to solve it.',
    analogy:
      'An equation is a balance scale. Whatever you do to one side, you must do to the other, and it stays balanced. Algebra is the art of moving weights around until $x$ sits alone on one side.',
    howItWorks:
      'Algebra works because the rules of arithmetic (like $a + b = b + a$ or $a(b + c) = ab + ac$) hold for every number. So a statement about a letter is a statement about all numbers at once. Beyond solving equations, algebra studies [[functions]], polynomials, and eventually abstract structures — groups, rings, fields — which capture the "shape" of arithmetic itself.',
    technical:
      'Modern (abstract) algebra studies sets equipped with operations satisfying axioms: groups (symmetry), rings and fields (arithmetic), modules and vector spaces ([[linear-algebra]]). Symmetry groups are central in physics, from crystal structure to the gauge symmetries of the [[quantum-field-theory|Standard Model]].',
    math: m`Solving a linear equation is a sequence of balanced moves:
$$2x + 3 = 11 \;\Rightarrow\; 2x = 8 \;\Rightarrow\; x = 4$$
The quadratic formula solves every equation of the form $ax^2 + bx + c = 0$:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$`,
    why:
      'Algebra is the gateway to nearly all higher mathematics and science. Every formula in physics, every spreadsheet, every line of code that computes something is algebra.',
    applications: ['Budgeting and finance', 'Programming and spreadsheets', 'Engineering formulas', 'Cryptography'],
    misconceptions: [
      {
        myth: 'Algebra is a different subject from arithmetic.',
        truth: 'It is arithmetic generalised. Every rule of algebra is a rule you already use with numbers.',
      },
      {
        myth: 'The letter $x$ is mysterious.',
        truth: 'It is just a placeholder — a box for a number you haven’t found yet.',
      },
    ],
    related: ['number-theory', 'linear-algebra'],
    tags: ['equations', 'symbols'],
  },
  {
    id: 'geometry',
    title: 'Geometry',
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'beginner',
    short: 'The mathematics of shape, size, distance and space.',
    simple:
      'Geometry studies shapes and space: lengths, angles, areas, and how things fit together. It began with measuring land and grew into the study of space itself.',
    intuition:
      'Draw a triangle on paper. Its three angles always add up to 180°. Why always? Geometry answers "why always" questions about shapes, starting from a handful of obvious-looking assumptions.',
    analogy:
      'Euclid built geometry like a house of cards made of steel: start with a few simple rules (axioms), and every other fact is carefully stacked on top of them.',
    howItWorks:
      'Classical (Euclidean) geometry starts from axioms such as "through two points there is exactly one straight line" and derives theorems by logical proof. Coordinates (invented by Descartes) turned geometry into [[algebra]]: a circle becomes $x^2 + y^2 = r^2$. Modern geometry asks what happens when space is curved — the idea behind [[non-euclidean-geometry]] and Einstein’s [[general-relativity]].',
    math: m`Pythagoras’ theorem, the most famous result in geometry:
$$a^2 + b^2 = c^2$$
In coordinates, the distance between two points follows directly:
$$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$`,
    why:
      'Geometry is how we describe space — from architecture and maps to computer graphics, robotics and the shape of the universe.',
    applications: ['Architecture and engineering', 'Computer graphics and games', 'GPS and navigation', 'Robotics'],
    related: ['trigonometry', 'vectors', 'algebra'],
    tags: ['shapes', 'space'],
  },
  {
    id: 'calculus',
    title: 'Calculus',
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'intermediate',
    short: 'The mathematics of change and accumulation.',
    simple:
      'Calculus is the mathematics of change. It answers two questions: how fast is something changing right now? And how much has built up over time?',
    intuition:
      'Your car’s speedometer shows how fast you are going at this instant — that is one half of calculus ([[derivatives]]). Your odometer adds up all the little distances into a total — that is the other half ([[integrals]]). The miracle of calculus is that these two ideas are opposites of each other.',
    analogy:
      'Think of a movie. A derivative is like pausing on one frame and asking "which way is everything moving?" An integral is like watching the whole film and asking "where did everyone end up?"',
    howItWorks:
      'Calculus handles "instantaneous" change by zooming in. Over a tiny stretch, any smooth curve looks like a straight line, and a straight line’s steepness is easy to measure. [[limits|Limits]] make "zooming in infinitely" precise. Integration chops an area into thin strips and adds them. The Fundamental Theorem of Calculus says integration undoes differentiation.',
    technical:
      'Rigorous calculus (real analysis) rests on the completeness of the real numbers and the ε–δ definition of limits. Multivariable calculus extends derivatives to gradients, divergence and curl — the language of [[maxwells-equations]] and fluid flow — and leads directly to [[differential-equations]].',
    math: m`The derivative is the limit of average rates of change:
$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$
The Fundamental Theorem of Calculus:
$$\int_a^b f'(x)\,dx = f(b) - f(a)$$`,
    why:
      'Nearly every law of physics is written in calculus. It is how we model motion, growth, heat, electricity, populations, economies and machine learning.',
    applications: ['Physics and engineering', 'Machine learning (gradient descent)', 'Economics (marginal cost)', 'Medicine (drug dosage models)'],
    misconceptions: [
      {
        myth: 'Calculus is just harder algebra.',
        truth: 'It adds one genuinely new idea — the limit — which lets us reason about the infinitely small.',
      },
    ],
    prerequisites: ['algebra', 'functions'],
    related: ['differential-equations', 'classical-mechanics'],
    research: [{ paper: 'fourier-1822', kind: 'foundational' }],
    tags: ['change', 'rates', 'newton', 'leibniz'],
  },
  {
    id: 'probability',
    title: 'Probability',
    aliases: ['chance', 'likelihood'],
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'beginner',
    short: 'The mathematics of chance and uncertainty.',
    simple:
      'Probability measures how likely something is, on a scale from 0 (impossible) to 1 (certain). A fair coin landing heads has probability ½.',
    intuition:
      'You cannot predict a single coin flip, but you can predict that out of 10,000 flips, roughly half will be heads. Probability is the surprising discovery that randomness has rules.',
    analogy:
      'Probability is like weather forecasting for any situation: it can’t tell you exactly what will happen, but it tells you how to bet wisely.',
    howItWorks:
      'You list all possible outcomes (the sample space) and assign each a weight so that everything adds up to 1. The probability of an event is the total weight of the outcomes where it happens. Rules like "multiply for independent events" and [[bayes-theorem]] let you combine and update probabilities.',
    technical:
      'Kolmogorov’s axioms (1933) define probability as a measure on a σ-algebra of events with total measure 1. Random variables are measurable functions; expectations are integrals. This measure-theoretic foundation underlies stochastic processes, statistical mechanics and quantum probability.',
    math: m`For equally likely outcomes:
$$P(A) = \frac{\text{outcomes where } A \text{ happens}}{\text{all outcomes}}$$
Independent events multiply:
$$P(A \text{ and } B) = P(A)\,P(B)$$`,
    why:
      'Probability is the foundation of statistics, insurance, weather forecasting, machine learning — and, remarkably, of [[quantum-mechanics]], where nature itself seems to deal in probabilities.',
    applications: ['Insurance and risk', 'Weather forecasting', 'Machine learning', 'Quantum physics', 'Games and gambling'],
    misconceptions: [
      {
        myth: 'After five heads in a row, tails is "due".',
        truth: 'A fair coin has no memory. The next flip is still 50/50. (This is the gambler’s fallacy.)',
      },
      {
        myth: 'A 90% chance of rain that doesn’t rain means the forecast was wrong.',
        truth: 'It should stay dry on about 1 in 10 such days. A single outcome cannot prove a probability wrong.',
      },
    ],
    related: ['statistics', 'quantum-measurement', 'statistical-mechanics'],
    research: [
      { paper: 'kolmogorov-1933', kind: 'foundational' },
      { paper: 'bayes-1763', kind: 'foundational' },
    ],
    tags: ['chance', 'randomness', 'uncertainty'],
  },
  {
    id: 'statistics',
    title: 'Statistics',
    aliases: ['data analysis'],
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'beginner',
    short: 'Learning about the world from data — and knowing how sure to be.',
    simple:
      'Statistics is the science of learning from data: summarising it, finding patterns, and — crucially — measuring how confident we should be in what we conclude.',
    intuition:
      '[[probability|Probability]] goes from a known coin to predictions about flips. Statistics goes backwards: from a pile of flips to a guess about the coin. Is it fair? How sure are we?',
    analogy:
      'Statistics is like tasting a spoonful of soup to judge the whole pot. The trick is knowing how big a spoonful you need, and stirring well first.',
    howItWorks:
      'Statisticians summarise data (averages, spread), model it with [[probability-distributions]], estimate unknown quantities, and test ideas against chance ([[hypothesis-testing]]). The [[central-limit-theorem]] explains why averages of many measurements behave so predictably.',
    why:
      'Every clinical trial, election poll, scientific experiment and A/B test depends on statistics to separate real effects from lucky coincidences.',
    applications: ['Medical trials', 'Polling and social science', 'Quality control', 'Data science and AI'],
    misconceptions: [
      {
        myth: 'Correlation proves causation.',
        truth: 'Two things can rise together because a third thing drives both. Establishing cause needs careful design, such as randomised experiments.',
      },
    ],
    prerequisites: ['probability'],
    related: ['bayes-theorem'],
    research: [
      { paper: 'fisher-1922', kind: 'foundational' },
      { paper: 'ioannidis-2005', kind: 'review' },
    ],
    tags: ['data', 'inference'],
  },
  {
    id: 'linear-algebra',
    title: 'Linear Algebra',
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'intermediate',
    short: 'The mathematics of vectors, matrices and flat (linear) transformations.',
    simple:
      'Linear algebra is the mathematics of arrows (vectors) and the grids of numbers (matrices) that stretch, rotate and combine them.',
    intuition:
      'Picture a sheet of graph paper. Now stretch it, rotate it or shear it — but keep the grid lines straight, parallel and evenly spaced. Every such "straight-line-preserving" transformation is described by a small table of numbers called a matrix. Linear algebra is the study of those transformations.',
    analogy:
      'If a vector is a recipe ("2 parts flour, 1 part sugar"), a matrix is a machine that turns one recipe into another. Linear algebra is the manual for those machines.',
    howItWorks:
      'The key idea is linearity: doubling the input doubles the output, and adding inputs adds outputs. Because of this, you only need to know what a transformation does to a few basis arrows to know what it does to everything. [[eigenvalues|Eigenvectors]] reveal the directions a transformation merely stretches, which exposes its true nature.',
    technical:
      'Linear algebra studies vector spaces over a field and the linear maps between them. Core results: rank–nullity, spectral theorem for self-adjoint operators, singular value decomposition. Infinite-dimensional generalisations ([[hilbert-space|Hilbert spaces]]) are the mathematical home of [[quantum-mechanics]].',
    math: m`A matrix acts on a vector by combining its columns:
$$\begin{pmatrix} a & b \\ c & d \end{pmatrix}\begin{pmatrix} x \\ y \end{pmatrix} = x\begin{pmatrix} a \\ c \end{pmatrix} + y\begin{pmatrix} b \\ d \end{pmatrix}$$`,
    why:
      'Linear algebra is arguably the most useful mathematics ever invented. It powers computer graphics, search engines, machine learning, engineering simulations and the entire mathematical framework of quantum physics.',
    applications: ['3D graphics and games', 'Machine learning and neural networks', 'Google’s PageRank', 'Quantum mechanics', 'Data compression'],
    misconceptions: [
      {
        myth: 'Linear algebra is just calculating with grids of numbers.',
        truth: 'The numbers are only a description. The real subject is geometry: arrows, directions and transformations of space.',
      },
    ],
    prerequisites: ['algebra', 'vectors'],
    related: ['quantum-mechanics', 'quantum-states', 'machine-learning'],
    research: [
      { paper: 'cayley-1858', kind: 'foundational' },
      { paper: 'page-brin-1998', kind: 'foundational' },
    ],
    tags: ['matrices', 'vectors'],
  },
  {
    id: 'differential-equations',
    title: 'Differential Equations',
    aliases: ['ODE', 'differential equation'],
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'intermediate',
    short: 'Equations that describe how things change — the language of physical law.',
    simple:
      'A differential equation is a rule that says how something changes, rather than what it is. Solving it tells you what happens over time.',
    intuition:
      'You might not know where a ball will be in 3 seconds. But you do know a rule: gravity changes its speed by the same amount every second. A differential equation is that kind of rule. Solve it, and you can predict the whole flight.',
    analogy:
      'A differential equation is like turn-by-turn directions ("at every moment, head this way this fast"). Solving it is like following the directions to find the whole route.',
    howItWorks:
      'The equation relates a quantity to its [[derivatives]]. Given a starting condition, the rule determines the future step by step. Some equations have neat formula solutions (exponential growth, [[harmonic-oscillator|oscillations]]); most are solved numerically by computers taking many tiny steps.',
    technical:
      'Ordinary differential equations (ODEs) involve one independent variable; [[partial-differential-equations|PDEs]] involve several. Existence and uniqueness (Picard–Lindelöf), stability analysis, phase-space methods and numerical integrators (Runge–Kutta, symplectic methods) are core tools. Nonlinear systems can exhibit [[chaos-theory|chaos]].',
    math: m`Exponential growth — the rate of change is proportional to the amount:
$$\frac{dN}{dt} = kN \quad\Longrightarrow\quad N(t) = N_0 e^{kt}$$
Newton’s second law is a differential equation for position:
$$m\frac{d^2x}{dt^2} = F(x)$$`,
    why:
      'Almost every law of nature is a differential equation: Newton’s laws, [[maxwells-equations]], the [[schrodinger-equation]], the equations of [[general-relativity]], population models, epidemics and circuits.',
    applications: ['Physics and engineering', 'Epidemic modelling', 'Climate models', 'Finance', 'Neuroscience'],
    prerequisites: ['calculus', 'derivatives'],
    related: ['classical-mechanics', 'schrodinger-equation', 'electromagnetism'],
    research: [
      { paper: 'kermack-mckendrick-1927', kind: 'foundational' },
      { paper: 'lorenz-1963', kind: 'foundational' },
    ],
    tags: ['change', 'dynamics'],
  },
  {
    id: 'number-theory',
    title: 'Number Theory',
    domain: 'mathematics',
    level: 1,
    parent: 'mathematics',
    difficulty: 'intermediate',
    short: 'The study of whole numbers and their hidden patterns.',
    simple:
      'Number theory studies whole numbers — 1, 2, 3, … — and the surprising patterns inside them, especially the [[prime-numbers]].',
    intuition:
      'Whole numbers look simple, yet they hide questions that took centuries to answer — and some still haven’t been. Is every even number the sum of two primes? Nobody knows for sure.',
    analogy:
      'Number theory is like studying the atoms of arithmetic: every whole number is built from primes in exactly one way.',
    howItWorks:
      'Key tools include divisibility, [[modular-arithmetic]] ("clock arithmetic") and the unique factorisation of numbers into primes. Modern number theory borrows deep tools from [[complex-numbers|complex analysis]] and geometry.',
    why:
      'Once called the "purest" and most useless mathematics, number theory now secures the internet: modern [[cryptography]] rests on it.',
    applications: ['Internet security (RSA)', 'Error-correcting codes', 'Random number generation'],
    prerequisites: ['algebra'],
    related: ['cryptography', 'quantum-algorithms'],
    research: [{ paper: 'wiles-1995', kind: 'foundational' }],
    openQuestions: ['The Riemann Hypothesis', 'The Goldbach conjecture', 'The twin prime conjecture'],
    tags: ['integers', 'primes'],
  },

  // ─── Concepts ────────────────────────────────────────────────────────
  {
    id: 'functions',
    title: 'Functions',
    domain: 'mathematics',
    level: 2,
    parent: 'algebra',
    difficulty: 'beginner',
    short: 'A rule that turns each input into exactly one output.',
    simple:
      'A function is a rule that takes an input and gives back exactly one output. "Double it" is a function: 3 goes in, 6 comes out.',
    intuition:
      'A vending machine is a function: press B4, get the same snack every time. Functions let us describe relationships — how temperature depends on time, how price depends on quantity.',
    analogy: 'A function is a machine with an input slot and an output tray. Same input, same output, every time.',
    howItWorks:
      'We write $f(x)$ for "the output of $f$ when the input is $x$". Plotting inputs against outputs gives a graph, which turns the rule into a picture. Calculus studies how outputs change as inputs change.',
    math: m`$$f(x) = x^2 \qquad f(3) = 9 \qquad f(-3) = 9$$`,
    why: 'Functions are the basic building blocks of all quantitative science — every model, formula and program is a function.',
    applications: ['Programming', 'Modelling in every science', 'Spreadsheets'],
    related: ['calculus'],
    tags: ['mapping'],
  },
  {
    id: 'complex-numbers',
    title: 'Complex Numbers',
    aliases: ['imaginary numbers', 'i'],
    domain: 'mathematics',
    level: 2,
    parent: 'algebra',
    difficulty: 'intermediate',
    short: 'Numbers with a second dimension — built on $i$, where $i^2 = -1$.',
    simple:
      'Complex numbers extend ordinary numbers by adding $i$, a number whose square is $-1$. Every complex number has two parts, so they live on a plane rather than a line.',
    intuition:
      'Think of ordinary numbers as positions on a line. Multiplying by $-1$ flips you to the other side — a half-turn. What would give you a quarter-turn? Something that, done twice, equals a half-turn. That is $i$. Complex numbers are really numbers that know how to rotate.',
    analogy:
      'If real numbers are a road, complex numbers are the whole map. $i$ is the instruction "turn left 90°".',
    howItWorks:
      'A complex number $z = a + bi$ is a point on a plane. Adding them adds arrows; multiplying them multiplies their lengths and adds their angles. This makes them perfect for anything that rotates or oscillates — waves, alternating current, and quantum [[wave-function|wave functions]].',
    technical:
      'The complex numbers form an algebraically closed field: every polynomial has a root (Fundamental Theorem of Algebra). Complex analysis — the calculus of complex functions — is astonishingly rigid and powerful (Cauchy’s theorem, residues), with applications from fluid flow to number theory.',
    math: m`Euler’s formula ties rotation to exponentials:
$$e^{i\theta} = \cos\theta + i\sin\theta \qquad\Rightarrow\qquad e^{i\pi} + 1 = 0$$`,
    why:
      'Quantum mechanics is written in complex numbers — amplitudes have both size and phase, and interference comes from adding them. They also run electrical engineering and signal processing.',
    applications: ['Quantum mechanics', 'Electrical engineering (AC circuits)', 'Signal processing', 'Fluid dynamics'],
    misconceptions: [
      {
        myth: 'Imaginary numbers are made up and not "real".',
        truth: 'They are as legitimate as negative numbers once were considered suspicious. The name is a historical accident; they describe real, measurable things like wave phases.',
      },
    ],
    prerequisites: ['algebra', 'trigonometry'],
    related: ['wave-function', 'fourier-analysis', 'quantum-states'],
    tags: ['imaginary', 'phase', 'rotation'],
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    aliases: ['sine', 'cosine', 'trig'],
    domain: 'mathematics',
    level: 2,
    parent: 'geometry',
    difficulty: 'beginner',
    short: 'The mathematics of angles, triangles and cycles.',
    simple:
      'Trigonometry links angles to lengths. Sine and cosine tell you how far "across" and "up" you go when you walk along a line at a given angle.',
    intuition:
      'Watch a point on a spinning wheel. Its height goes up and down in a smooth wave — that wave is the sine function. Trigonometry is the maths of anything that goes round or repeats.',
    analogy: 'Sine and cosine are the shadow of a spinning wheel on the wall and on the floor.',
    math: m`$$\sin^2\theta + \cos^2\theta = 1$$`,
    why: 'Every wave — sound, light, radio, ocean swells, quantum [[wave-function|wave functions]] — is described with trigonometry.',
    applications: ['Navigation and surveying', 'Sound and music', 'Engineering', 'Computer graphics'],
    prerequisites: ['geometry'],
    related: ['waves', 'fourier-analysis', 'complex-numbers'],
    tags: ['angles', 'sine', 'waves'],
  },
  {
    id: 'non-euclidean-geometry',
    title: 'Curved Geometry',
    aliases: ['non-euclidean geometry', 'differential geometry', 'riemannian geometry', 'curvature'],
    domain: 'mathematics',
    level: 2,
    parent: 'geometry',
    difficulty: 'advanced',
    short: 'Geometry where space itself can bend — the maths behind Einstein’s gravity.',
    simple:
      'In curved geometry, the familiar rules of flat paper don’t hold. On a globe, for example, a triangle’s angles add up to more than 180°.',
    intuition:
      'Draw a triangle on a beach ball: start at the North Pole, walk down to the equator, turn, walk a quarter of the way round, turn again, and walk back up. You made three right-angle turns — 270° in total! The surface is curved, so the old rules bend too.',
    analogy: 'Flat geometry is a sheet of paper. Curved geometry is the skin of a fruit — and you’re an ant who can’t see off the surface.',
    howItWorks:
      'Differential geometry measures curvature using only measurements made within the space — you don’t need to see it from "outside". Gauss showed this is possible for surfaces; Riemann generalised it to any number of dimensions. The central object is the metric, a rule for measuring distances at every point.',
    technical:
      'A Riemannian manifold is equipped with a metric tensor $g_{\mu\nu}$; curvature is encoded in the Riemann tensor built from the Levi-Civita connection. Pseudo-Riemannian (Lorentzian) manifolds, with an indefinite metric, model [[spacetime]] in [[general-relativity]].',
    math: m`On a sphere of radius $R$, a triangle of area $A$ has angle sum
$$\alpha + \beta + \gamma = \pi + \frac{A}{R^2}$$`,
    why: 'Einstein used Riemann’s curved geometry to describe gravity: mass curves spacetime, and objects follow the straightest possible paths through it.',
    applications: ['General relativity', 'GPS corrections', 'Map projections', 'Computer vision'],
    prerequisites: ['geometry', 'calculus'],
    related: ['general-relativity', 'spacetime', 'gravity'],
    research: [{ paper: 'riemann-1854', kind: 'foundational' }],
    tags: ['curvature', 'manifolds'],
  },
  {
    id: 'limits',
    title: 'Limits',
    domain: 'mathematics',
    level: 2,
    parent: 'calculus',
    difficulty: 'intermediate',
    short: 'What a value approaches as you get closer and closer to something.',
    simple:
      'A limit is the value something gets closer and closer to, even if it never quite arrives. It is the idea that makes calculus precise.',
    intuition:
      'Walk halfway to a wall, then halfway again, and again. You never touch it, but you are clearly heading to one place: the wall. That destination is the limit.',
    analogy: 'A limit is like zooming in on a map forever — you are asking what the picture settles down to.',
    math: m`$$\lim_{n \to \infty}\left(1 + \frac{1}{n}\right)^n = e \approx 2.718$$`,
    why: 'Limits let mathematicians handle the infinitely small and infinitely large without contradictions. Derivatives and integrals are both defined as limits.',
    prerequisites: ['functions'],
    related: ['derivatives', 'integrals'],
    tags: ['infinity', 'convergence'],
  },
  {
    id: 'derivatives',
    title: 'Derivatives',
    aliases: ['derivative', 'differentiation', 'rate of change', 'slope'],
    domain: 'mathematics',
    level: 2,
    parent: 'calculus',
    difficulty: 'intermediate',
    short: 'How fast something is changing at a single instant.',
    simple:
      'A derivative tells you how fast something is changing right now. Speed is the derivative of position; acceleration is the derivative of speed.',
    intuition:
      'Zoom in on any smooth curve and it starts to look like a straight line. The steepness of that tiny straight line is the derivative — the instantaneous rate of change.',
    analogy: 'The derivative is the speedometer of a function.',
    howItWorks:
      'Measure the change over a small interval and divide by the interval’s length — that’s an average rate. Now shrink the interval towards zero. The [[limits|limit]] of those averages is the derivative.',
    math: m`$$\frac{d}{dx}x^n = n x^{n-1} \qquad \frac{d}{dx}e^x = e^x \qquad \frac{d}{dx}\sin x = \cos x$$`,
    why: 'Derivatives describe velocity, acceleration, growth rates, marginal costs, and — through gradients — how machine-learning models learn.',
    applications: ['Physics (velocity, force)', 'Optimisation and machine learning', 'Economics'],
    prerequisites: ['limits', 'functions'],
    related: ['integrals', 'differential-equations', 'newtons-laws'],
    tags: ['slope', 'rate'],
  },
  {
    id: 'integrals',
    title: 'Integrals',
    aliases: ['integral', 'integration', 'area under curve'],
    domain: 'mathematics',
    level: 2,
    parent: 'calculus',
    difficulty: 'intermediate',
    short: 'Adding up infinitely many infinitely small pieces.',
    simple:
      'An integral adds up lots of tiny pieces to get a total — like adding up tiny distances to find how far you have travelled.',
    intuition:
      'To find the area of a curvy shape, slice it into thin strips that are nearly rectangles, add their areas, then make the strips thinner and thinner. The total you approach is the integral.',
    analogy: 'If the derivative is the speedometer, the integral is the odometer.',
    math: m`$$\int_0^1 x^2\,dx = \frac{1}{3}$$`,
    why: 'Integrals compute areas, volumes, total energy, probability, work done and much more. In quantum mechanics, probabilities are integrals of $|\psi|^2$.',
    applications: ['Engineering (volumes, loads)', 'Probability', 'Physics (work, energy)'],
    prerequisites: ['limits', 'derivatives'],
    related: ['probability-distributions', 'fourier-analysis'],
    tags: ['area', 'accumulation'],
  },
  {
    id: 'fourier-analysis',
    title: 'Fourier Analysis',
    aliases: ['fourier transform', 'spectrum'],
    domain: 'mathematics',
    level: 2,
    parent: 'calculus',
    difficulty: 'advanced',
    short: 'Breaking any signal into a sum of simple waves.',
    simple:
      'Fourier analysis says that almost any signal — a sound, an image, a vibration — can be built by adding together simple waves of different frequencies.',
    intuition:
      'When you hear a chord, your ear separates it into individual notes. Fourier analysis does the same thing mathematically for any wiggly signal: it tells you which pure tones are hidden inside, and how loud each one is.',
    analogy: 'A Fourier transform is a prism for signals: white light in, a rainbow of frequencies out.',
    howItWorks:
      'Each frequency is tested against the signal by multiplying and integrating; the result tells you how much of that frequency is present. Complex numbers make this elegant by tracking each wave’s size and phase together.',
    technical:
      'The Fourier transform is a unitary operator on $L^2(\mathbb{R})$. Position and momentum wave functions in quantum mechanics are Fourier transforms of each other — which is exactly why the [[uncertainty-principle]] holds. The Fast Fourier Transform (Cooley–Tukey, 1965) computes it in $O(n\log n)$.',
    math: m`$$\hat f(k) = \int_{-\infty}^{\infty} f(x)\,e^{-2\pi i k x}\,dx$$`,
    why: 'It powers MP3s, JPEGs, MRI scanners, Wi-Fi, and is at the heart of quantum mechanics and signal processing.',
    applications: ['Audio and image compression', 'MRI and medical imaging', 'Wireless communication', 'Quantum mechanics'],
    prerequisites: ['integrals', 'complex-numbers', 'trigonometry'],
    related: ['waves', 'uncertainty-principle', 'signal-processing'],
    research: [
      { paper: 'fourier-1822', kind: 'foundational' },
      { paper: 'cooley-tukey-1965', kind: 'foundational' },
    ],
    tags: ['frequency', 'waves', 'signals'],
  },
  {
    id: 'vectors',
    title: 'Vectors',
    aliases: ['vector', 'arrow'],
    domain: 'mathematics',
    level: 2,
    parent: 'linear-algebra',
    difficulty: 'beginner',
    short: 'Quantities with both size and direction.',
    simple:
      'A vector is an arrow: it has a length (how much) and a direction (which way). Wind, force and velocity are vectors.',
    intuition:
      '"The wind is 20 km/h" isn’t the whole story — which way is it blowing? A vector packs both pieces of information together, and you can add vectors by placing arrows tip to tail.',
    analogy: 'A vector is a treasure-map instruction: "walk 3 steps east and 4 steps north".',
    math: m`$$\vec v = (3, 4) \qquad |\vec v| = \sqrt{3^2 + 4^2} = 5$$`,
    why: 'Vectors are how physics describes motion and forces, how graphics describes 3D space, and — generalised — how quantum mechanics describes [[quantum-states]].',
    applications: ['Physics', 'Computer graphics', 'Navigation', 'Machine learning (embeddings)'],
    prerequisites: ['geometry'],
    related: ['newtons-laws', 'matrices'],
    tags: ['arrow', 'direction'],
  },
  {
    id: 'matrices',
    title: 'Matrices',
    aliases: ['matrix'],
    domain: 'mathematics',
    level: 2,
    parent: 'linear-algebra',
    difficulty: 'intermediate',
    short: 'Grids of numbers that transform vectors.',
    simple:
      'A matrix is a rectangular grid of numbers. It acts like a machine that transforms vectors — rotating, stretching or mixing them.',
    intuition:
      'Every rotation or stretch of a picture on your phone is a matrix at work. Combining two transformations is just multiplying their matrices.',
    analogy: 'A matrix is a recipe converter: feed in one list of ingredients, get out another.',
    math: m`A 90° rotation:
$$R = \begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix}, \quad R\begin{pmatrix}1\\0\end{pmatrix} = \begin{pmatrix}0\\1\end{pmatrix}$$`,
    why: 'Matrices are the working tool of linear algebra. In quantum mechanics, measurable quantities are represented by matrices (operators).',
    applications: ['Graphics', 'Neural networks', 'Quantum gates', 'Simulations'],
    prerequisites: ['vectors'],
    related: ['eigenvalues', 'qubits'],
    research: [{ paper: 'cayley-1858', kind: 'foundational' }],
    tags: ['grid', 'transformation'],
  },
  {
    id: 'eigenvalues',
    title: 'Eigenvalues & Eigenvectors',
    aliases: ['eigenvector', 'eigenvalue', 'eigen'],
    domain: 'mathematics',
    level: 2,
    parent: 'linear-algebra',
    difficulty: 'advanced',
    short: 'The special directions a transformation only stretches.',
    simple:
      'When a matrix transforms space, most arrows get knocked off course. Eigenvectors are the special arrows that stay on their own line — they only get longer or shorter. The eigenvalue is by how much.',
    intuition:
      'Spin a globe. Every point moves — except the points on the axis. The axis is an eigenvector of the rotation. Eigenvectors reveal the hidden "skeleton" of a transformation.',
    analogy: 'Eigenvectors are the grain of the wood: push along the grain and it moves cleanly; push across it and it twists.',
    howItWorks:
      'You look for vectors $v$ where applying the matrix gives the same vector scaled: $Av = \lambda v$. Once you know them, a complicated transformation becomes simple stretches along those directions.',
    technical:
      'For a self-adjoint (Hermitian) operator the spectral theorem guarantees real eigenvalues and an orthonormal eigenbasis. In quantum mechanics, the possible results of a measurement are exactly the eigenvalues of the corresponding operator, and after measurement the system is in the matching eigenstate — see [[quantum-measurement]].',
    math: m`$$A\,\vec v = \lambda\,\vec v \qquad \det(A - \lambda I) = 0$$`,
    why: 'Eigenvalues give vibration frequencies of bridges, energy levels of atoms, Google’s PageRank, and principal components in data science.',
    applications: ['Quantum energy levels', 'Structural vibration analysis', 'PageRank', 'Principal component analysis'],
    prerequisites: ['matrices'],
    related: ['quantum-measurement', 'schrodinger-equation'],
    research: [{ paper: 'page-brin-1998', kind: 'foundational' }],
    tags: ['spectrum', 'operators'],
  },
  {
    id: 'vector-spaces',
    title: 'Vector Spaces',
    aliases: ['vector space', 'basis', 'linear combination'],
    domain: 'mathematics',
    level: 2,
    parent: 'linear-algebra',
    difficulty: 'intermediate',
    short: 'Any collection of things you can add together and scale.',
    simple:
      'A vector space is any collection of objects you can add together and multiply by numbers — arrows, lists of numbers, even functions or sound waves.',
    intuition:
      'Arrows are just one example. Mix two sound waves and you get another sound wave; double a sound wave and it’s louder. Sound waves behave like vectors — so all the tools of linear algebra apply to them too.',
    analogy: 'A vector space is like a paint mixing system: any mix of the base colours is another valid colour.',
    howItWorks:
      'Every vector space has a basis — a minimal set of building blocks from which everything can be made by adding and scaling. The number of building blocks is the dimension. A quantum [[superposition]] is exactly a linear combination in a vector space.',
    math: m`$$\vec v = c_1\,\vec e_1 + c_2\,\vec e_2 + \dots + c_n\,\vec e_n$$`,
    why: 'This single abstraction unifies geometry, signal processing and quantum theory.',
    prerequisites: ['vectors'],
    related: ['superposition', 'quantum-states'],
    tags: ['basis', 'dimension'],
  },
  {
    id: 'hilbert-space',
    title: 'Hilbert Space',
    domain: 'mathematics',
    level: 3,
    parent: 'vector-spaces',
    difficulty: 'advanced',
    short: 'A vector space with angles and lengths — the arena of quantum states.',
    simple:
      'A Hilbert space is a vector space where you can also measure lengths and angles — even if it has infinitely many dimensions. Every quantum state lives in one.',
    intuition:
      'In ordinary space you can ask "how much does this arrow point along that one?" A Hilbert space lets you ask the same question about far stranger objects, like quantum states. The answer becomes a probability.',
    analogy: 'It is ordinary geometry, stretched to infinitely many directions but keeping its ruler and protractor.',
    technical:
      'A Hilbert space is a complete inner-product space. Quantum states are unit vectors (rays) in a complex Hilbert space, observables are self-adjoint operators on it, and the Born rule gives probabilities as squared inner products $|\langle\phi|\psi\rangle|^2$.',
    math: m`The inner product measures overlap:
$$\langle \phi | \psi \rangle = \int \phi^*(x)\,\psi(x)\,dx$$`,
    why: 'It is the mathematical home of quantum mechanics — von Neumann’s formulation made quantum theory rigorous using it.',
    prerequisites: ['vector-spaces', 'complex-numbers'],
    related: ['quantum-states', 'wave-function'],
    tags: ['inner product', 'quantum'],
  },
  {
    id: 'probability-distributions',
    title: 'Probability Distributions',
    aliases: ['distribution', 'random variable'],
    domain: 'mathematics',
    level: 2,
    parent: 'probability',
    difficulty: 'intermediate',
    short: 'A complete description of how likely every possible outcome is.',
    simple:
      'A probability distribution lists every possible outcome and how likely each is. Rolling a die gives a flat distribution: each face has probability 1/6.',
    intuition:
      'Measure the heights of a thousand people and stack them in a bar chart. The shape you see — lots in the middle, few at the extremes — is a distribution.',
    analogy: 'A distribution is a map of where the randomness is likely to land.',
    math: m`The expected (average) value:
$$\mathbb{E}[X] = \sum_x x\,P(X = x)$$`,
    why: 'Distributions are how science models uncertainty. In quantum mechanics, $|\psi(x)|^2$ is a probability distribution for where a particle will be found.',
    prerequisites: ['probability'],
    related: ['normal-distribution', 'wave-function', 'statistical-mechanics'],
    tags: ['random', 'expected value'],
  },
  {
    id: 'bayes-theorem',
    title: 'Bayes’ Theorem',
    aliases: ['bayes', 'bayesian', 'conditional probability'],
    domain: 'mathematics',
    level: 2,
    parent: 'probability',
    difficulty: 'intermediate',
    short: 'How to update what you believe when new evidence arrives.',
    simple:
      'Bayes’ theorem tells you how to update a belief when you get new evidence. It combines what you believed before with how well the evidence fits.',
    intuition:
      'A test for a rare disease is 99% accurate, and you test positive. Are you 99% likely to be ill? Surprisingly, often not — because the disease is so rare, most positives come from the many healthy people. Bayes’ theorem does this bookkeeping for you.',
    analogy: 'Bayes is a detective’s rule: weigh each new clue against how likely the suspect was to begin with.',
    math: m`$$P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}$$`,
    why: 'It underpins medical diagnosis, spam filters, scientific reasoning and much of machine learning.',
    applications: ['Medical testing', 'Spam filters', 'Machine learning', 'Search and rescue'],
    misconceptions: [
      {
        myth: 'A 99% accurate test means a positive result is 99% reliable.',
        truth: 'It depends on how common the condition is. For rare conditions, most positives can be false.',
      },
    ],
    prerequisites: ['probability'],
    related: ['statistics', 'machine-learning'],
    research: [{ paper: 'bayes-1763', kind: 'foundational' }],
    tags: ['evidence', 'inference'],
  },
  {
    id: 'normal-distribution',
    title: 'Normal Distribution',
    aliases: ['bell curve', 'gaussian'],
    domain: 'mathematics',
    level: 2,
    parent: 'statistics',
    difficulty: 'beginner',
    short: 'The bell curve — the shape randomness takes when many small effects add up.',
    simple:
      'The normal distribution is the famous bell curve: most values cluster near the average, and extreme values are rare.',
    intuition:
      'Heights, measurement errors, exam scores — each is the sum of many small, independent influences. Whenever many small random things add up, the bell curve appears.',
    analogy: 'Pour sand through a funnel onto a table. The pile it makes is a bell curve.',
    math: m`$$f(x) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{(x-\mu)^2}{2\sigma^2}}$$`,
    why: 'It is the default model for noise and error in almost every science, thanks to the [[central-limit-theorem]].',
    prerequisites: ['probability-distributions'],
    related: ['central-limit-theorem'],
    tags: ['gaussian', 'bell curve'],
  },
  {
    id: 'central-limit-theorem',
    title: 'Central Limit Theorem',
    aliases: ['CLT'],
    domain: 'mathematics',
    level: 2,
    parent: 'statistics',
    difficulty: 'intermediate',
    short: 'Why averages of many random things become bell-shaped.',
    simple:
      'The central limit theorem says that if you add up (or average) many independent random things, the result follows a bell curve — no matter what the individual things looked like.',
    intuition:
      'Roll one die: every number is equally likely, a flat shape. Roll ten dice and add them: totals near 35 are far more common than 10 or 60, and the shape becomes a bell. Add more dice and it gets ever closer to a perfect bell.',
    math: m`$$\frac{\bar X_n - \mu}{\sigma/\sqrt n} \;\xrightarrow{\;d\;}\; \mathcal N(0,1)$$`,
    why: 'It explains why the [[normal-distribution]] is everywhere, and why statistics works at all: averages are predictable even when individuals are not.',
    prerequisites: ['normal-distribution', 'probability-distributions'],
    related: ['statistical-mechanics', 'hypothesis-testing'],
    tags: ['averages', 'sampling'],
  },
  {
    id: 'hypothesis-testing',
    title: 'Hypothesis Testing',
    aliases: ['p-value', 'significance', 'statistical significance'],
    domain: 'mathematics',
    level: 2,
    parent: 'statistics',
    difficulty: 'intermediate',
    short: 'Asking: could this result just be luck?',
    simple:
      'Hypothesis testing checks whether a result could plausibly be due to random chance. If chance is a poor explanation, the effect is probably real.',
    intuition:
      'A friend flips a coin and gets 9 heads out of 10. Suspicious? You ask: if the coin were fair, how often would something this extreme happen? About 1% of the time. That number is a p-value.',
    misconceptions: [
      {
        myth: 'A p-value is the probability the hypothesis is true.',
        truth: 'It is the probability of seeing data this extreme if the "nothing is happening" hypothesis were true — a different thing.',
      },
    ],
    why: 'It is how medicine decides whether a drug works and how science separates signal from noise — though it is often misused.',
    prerequisites: ['probability-distributions', 'statistics'],
    related: ['bayes-theorem'],
    research: [
      { paper: 'neyman-pearson-1933', kind: 'foundational' },
      { paper: 'wasserstein-lazar-2016', kind: 'review' },
    ],
    tags: ['p-value', 'evidence'],
  },
  {
    id: 'partial-differential-equations',
    title: 'Partial Differential Equations',
    aliases: ['PDE', 'PDEs', 'heat equation', 'wave equation'],
    domain: 'mathematics',
    level: 2,
    parent: 'differential-equations',
    difficulty: 'advanced',
    short: 'Equations for things that change across both space and time.',
    simple:
      'A partial differential equation describes something that changes at every point in space and over time — like heat spreading through metal or a wave rippling across a pond.',
    intuition:
      'The temperature in a room depends on where you stand and when you measure. A PDE is a rule linking how it changes in time to how it varies from place to place.',
    math: m`The heat equation and the wave equation:
$$\frac{\partial u}{\partial t} = \alpha\,\nabla^2 u \qquad\qquad \frac{\partial^2 u}{\partial t^2} = c^2\,\nabla^2 u$$`,
    why: 'The fundamental equations of physics — [[maxwells-equations]], the [[schrodinger-equation]], Einstein’s field equations, fluid flow — are all PDEs.',
    applications: ['Weather and climate', 'Aircraft design', 'Medical imaging', 'Quantum mechanics'],
    prerequisites: ['differential-equations', 'derivatives'],
    related: ['schrodinger-equation', 'maxwells-equations', 'waves'],
    research: [{ paper: 'courant-friedrichs-lewy-1928', kind: 'foundational' }],
    tags: ['fields', 'waves', 'heat'],
  },
  {
    id: 'chaos-theory',
    title: 'Chaos Theory',
    aliases: ['chaos', 'butterfly effect'],
    domain: 'mathematics',
    level: 2,
    parent: 'differential-equations',
    difficulty: 'intermediate',
    short: 'How simple deterministic rules can produce unpredictable behaviour.',
    simple:
      'Chaos theory studies systems that follow exact rules but are still unpredictable in practice, because tiny differences at the start grow into enormous differences later.',
    intuition:
      'Two leaves dropped side by side into a stream end up in completely different places. Nothing random happened — the water follows the laws of physics — but the tiniest difference in where they started got amplified.',
    analogy: 'The butterfly effect: a butterfly flapping its wings could, in principle, change whether a storm forms weeks later.',
    why: 'It explains why weather can’t be forecast beyond about two weeks, and shapes our understanding of turbulence, ecosystems and orbits.',
    misconceptions: [
      {
        myth: 'Chaotic means random.',
        truth: 'Chaotic systems are completely deterministic. They are unpredictable only because we can never know the starting conditions perfectly.',
      },
    ],
    prerequisites: ['differential-equations'],
    related: ['classical-mechanics', 'orbits'],
    research: [
      { paper: 'lorenz-1963', kind: 'foundational' },
      { paper: 'poincare-1890', kind: 'foundational' },
    ],
    tags: ['butterfly effect', 'nonlinear'],
  },
  {
    id: 'prime-numbers',
    title: 'Prime Numbers',
    aliases: ['primes', 'prime'],
    domain: 'mathematics',
    level: 2,
    parent: 'number-theory',
    difficulty: 'beginner',
    short: 'Whole numbers divisible only by 1 and themselves — the atoms of arithmetic.',
    simple:
      'A prime number can only be divided evenly by 1 and itself: 2, 3, 5, 7, 11, 13… Every whole number is made by multiplying primes together in exactly one way.',
    intuition:
      '12 = 2 × 2 × 3. You can break 12 apart, but 2 and 3 can’t be broken further. Primes are the unbreakable building blocks.',
    howItWorks:
      'Euclid proved over 2,000 years ago that there are infinitely many primes. They thin out as numbers grow, following a pattern described by the Prime Number Theorem — but exactly where each one appears remains mysterious.',
    math: m`The Prime Number Theorem — the number of primes below $x$:
$$\pi(x) \sim \frac{x}{\ln x}$$`,
    why: 'Multiplying two huge primes is easy; un-multiplying the result is extremely hard. That asymmetry protects your bank details online — unless a large enough [[quantum-computing|quantum computer]] runs [[quantum-algorithms|Shor’s algorithm]].',
    applications: ['Encryption (RSA)', 'Hashing', 'Random number generators'],
    prerequisites: ['number-theory'],
    related: ['cryptography', 'quantum-algorithms'],
    openQuestions: ['The Riemann Hypothesis', 'Are there infinitely many twin primes?'],
    tags: ['factorisation'],
  },
  {
    id: 'modular-arithmetic',
    title: 'Modular Arithmetic',
    aliases: ['clock arithmetic', 'mod'],
    domain: 'mathematics',
    level: 2,
    parent: 'number-theory',
    difficulty: 'beginner',
    short: 'Arithmetic that wraps around, like a clock.',
    simple:
      'Modular arithmetic is arithmetic that wraps around. On a 12-hour clock, 9 o’clock plus 5 hours is 2 o’clock — so in "mod 12", $9 + 5 = 2$.',
    intuition: 'You already use it: days of the week, hours on a clock, and degrees around a circle all wrap around.',
    math: m`$$17 \equiv 5 \pmod{12}$$`,
    why: 'It is the arithmetic of [[cryptography]], checksums, hashing and computer integers.',
    prerequisites: ['number-theory'],
    related: ['cryptography', 'prime-numbers'],
    tags: ['clock', 'remainder'],
  },
]
