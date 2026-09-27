import type { Topic } from '../schema'

const m = String.raw

export const quantum: Topic[] = [
  {
    id: 'quantum-mechanics',
    title: 'Quantum Mechanics',
    aliases: ['qm'],
    domain: 'physics',
    level: 2,
    parent: 'quantum-physics',
    difficulty: 'advanced',
    short: 'The precise mathematical theory of how quantum systems behave.',
    simple:
      'Quantum mechanics is the rulebook for the microscopic world. It describes a system with a [[quantum-states|quantum state]], says how that state changes over time, and tells you the probabilities of what you will see when you measure it.',
    intuition:
      'In everyday physics, a ball has one position and one speed. In quantum mechanics, an electron has a list of possibilities, each with a "weight" that can be positive, negative or even complex. Those weights can add up or cancel out like waves. When you finally look, you see one outcome — with a probability set by the weights.',
    analogy:
      'Think of a quantum state as a musical chord rather than a single note. Measuring it is like asking the chord "which note are you?" — you get one note, with odds set by how loudly each note was playing.',
    howItWorks:
      'Quantum mechanics has three moving parts. (1) States: a system is described by a [[wave-function]] or state vector, which can be a [[superposition]] of possibilities. (2) Evolution: when nobody is looking, the state changes smoothly according to the [[schrodinger-equation]]. (3) [[quantum-measurement|Measurement]]: when you measure, you get one of the allowed outcomes, with probability given by the Born rule — the square of the amplitude.',
    technical:
      'States are unit vectors in a complex [[hilbert-space]]; observables are self-adjoint operators whose [[eigenvalues]] are possible measurement results; time evolution is unitary, $U(t) = e^{-iHt/\hbar}$; probabilities follow the Born rule $p = |\langle a|\psi\rangle|^2$. Composite systems use tensor products — the source of [[entanglement]]. Non-commuting observables obey uncertainty relations.',
    math: m`The postulates in one breath:
$$i\hbar\,\frac{d}{dt}|\psi\rangle = \hat H|\psi\rangle \qquad P(a) = |\langle a|\psi\rangle|^2 \qquad [\hat x, \hat p] = i\hbar$$`,
    why: 'Quantum mechanics is the most precisely tested theory in history. It explains atoms, chemistry, materials and light, and it powers lasers, transistors, MRI and quantum technologies.',
    applications: ['Semiconductors and chips', 'Chemistry and drug design', 'Lasers', 'Quantum computing', 'Medical imaging'],
    misconceptions: [
      {
        myth: 'Nobody understands quantum mechanics, so it’s not really science.',
        truth: 'Its predictions are understood and tested to extraordinary precision. What remains debated is the interpretation — what the mathematics says reality is "really like".',
      },
      {
        myth: 'Quantum weirdness only matters in labs.',
        truth: 'It explains why solids are solid, why chemistry works and why the Sun shines. It just hides at everyday scales because of [[decoherence]].',
      },
    ],
    prerequisites: ['linear-algebra', 'probability', 'complex-numbers', 'waves'],
    related: ['statistical-mechanics', 'chemistry', 'quantum-chemistry'],
    research: [
      { paper: 'heisenberg-1927', kind: 'foundational' },
      { paper: 'born-1926', kind: 'foundational' },
      { paper: 'schrodinger-1926', kind: 'foundational' },
      { paper: 'dirac-1928', kind: 'foundational' },
    ],
    openQuestions: ['The measurement problem: why do we see single outcomes?', 'How does quantum mechanics combine with gravity?'],
    tags: ['quantum', 'hilbert space', 'operators'],
  },
  {
    id: 'wave-particle-duality',
    title: 'Wave–Particle Duality',
    aliases: ['double slit', 'double-slit experiment', 'de broglie', 'matter waves'],
    domain: 'physics',
    level: 2,
    parent: 'quantum-physics',
    difficulty: 'beginner',
    short: 'Light and matter behave like waves and like particles.',
    simple:
      'Quantum objects — light, electrons, even whole molecules — sometimes behave like spread-out waves and sometimes like tiny particles, depending on how you look.',
    intuition:
      'Fire electrons one at a time at a wall with two slits. Each one lands as a single dot, like a particle. But after thousands, the dots form stripes — an interference pattern, which only waves make. Each electron somehow "explored" both slits.',
    analogy: 'It’s not that an electron is secretly a wave or a particle. It is a third kind of thing that our everyday words don’t fit — like a platypus that confused the first biologists.',
    howItWorks:
      'De Broglie proposed that every particle has a wavelength $\lambda = h/p$. The wave tells you where the particle is likely to be found (via the [[wave-function]]); the particle is what you actually detect. Try to find out which slit it went through and the stripes vanish — the information destroys the interference.',
    math: m`$$\lambda = \frac{h}{p} \qquad E = hf$$`,
    why: 'It is the doorway into quantum mechanics and the basis of electron microscopes, which can see atoms.',
    applications: ['Electron microscopes', 'Neutron scattering', 'Atom interferometers'],
    prerequisites: ['waves', 'light'],
    related: ['wave-function', 'superposition', 'quantum-measurement'],
    research: [
      { paper: 'davisson-germer-1927', kind: 'experiment' },
      { paper: 'tonomura-1989', kind: 'experiment' },
      { paper: 'arndt-1999', kind: 'experiment' },
    ],
    tags: ['double slit', 'interference'],
  },
  {
    id: 'uncertainty-principle',
    title: 'Uncertainty Principle',
    aliases: ['heisenberg', 'heisenberg uncertainty'],
    domain: 'physics',
    level: 2,
    parent: 'quantum-physics',
    difficulty: 'intermediate',
    short: 'Some pairs of properties can’t both be sharply defined at once.',
    simple:
      'The uncertainty principle says you cannot know both the exact position and the exact momentum of a particle at the same time. The more precisely one is defined, the fuzzier the other becomes.',
    intuition:
      'A short, sharp clap has a precise moment in time but no clear pitch. A long, pure note has a clear pitch but no single moment. You can’t have both — and quantum particles are waves, so the same trade-off applies to position and momentum.',
    analogy: 'It’s like squeezing a balloon: squash it in one direction and it bulges in another.',
    howItWorks:
      'A sharply located particle needs a wave-function made of many wavelengths — and wavelength is momentum. A single clean wavelength stretches out forever. This is a property of waves ([[fourier-analysis]]), not a flaw in our instruments.',
    math: m`$$\Delta x\,\Delta p \;\geq\; \frac{\hbar}{2}$$`,
    why: 'It explains why atoms don’t collapse (electrons can’t be squeezed onto the nucleus) and sets fundamental limits on measurement.',
    misconceptions: [
      {
        myth: 'Uncertainty happens because measuring disturbs the particle.',
        truth: 'Disturbance exists, but the principle is deeper: the particle doesn’t have a sharp position and momentum at the same time to begin with.',
      },
    ],
    prerequisites: ['wave-particle-duality', 'momentum'],
    related: ['fourier-analysis', 'quantum-measurement', 'quantum-states'],
    research: [{ paper: 'heisenberg-1927', kind: 'foundational' }],
    tags: ['heisenberg', 'limits'],
  },
  {
    id: 'quantum-tunneling',
    title: 'Quantum Tunnelling',
    aliases: ['tunneling', 'tunnelling'],
    domain: 'physics',
    level: 2,
    parent: 'quantum-physics',
    difficulty: 'intermediate',
    short: 'Particles can pass through barriers they classically shouldn’t cross.',
    simple:
      'Quantum tunnelling lets a particle get through a barrier even when it doesn’t have enough energy to climb over it.',
    intuition:
      'Roll a ball at a hill too slowly and it rolls back — always. But a quantum particle’s [[wave-function]] leaks a little into the hill, and if the hill is thin, some of it comes out the other side. Sometimes, the particle is found there.',
    analogy: 'Like a ghost walking through a wall — not always, but with a small, calculable probability.',
    why: 'Tunnelling lets the Sun shine (protons tunnel close enough to fuse), powers flash memory and scanning tunnelling microscopes, and limits how small transistors can be.',
    applications: ['Nuclear fusion in stars', 'Flash memory', 'Scanning tunnelling microscopes', 'Radioactive decay'],
    prerequisites: ['wave-function', 'energy'],
    related: ['stars', 'schrodinger-equation'],
    tags: ['barrier'],
  },
  {
    id: 'quantum-field-theory',
    title: 'Quantum Field Theory',
    aliases: ['qft', 'standard model', 'particle physics', 'qed'],
    domain: 'physics',
    level: 2,
    parent: 'quantum-physics',
    difficulty: 'research',
    short: 'Particles as ripples in fields that fill all of space.',
    simple:
      'Quantum field theory says the universe is filled with invisible fields, and particles are tiny ripples in them. An electron is a ripple in the electron field; a photon is a ripple in the electromagnetic field.',
    intuition:
      'Why is every electron in the universe exactly identical? Because they aren’t separate little balls — they are all excitations of the same single field, like identical waves on one ocean.',
    analogy: 'Fields are like the surface of a pond that covers the whole universe. Particles are the ripples you can count.',
    howItWorks:
      'Combine [[quantum-mechanics]] with [[special-relativity]] and particle number is no longer fixed — particles can be created and destroyed (thanks to $E = mc^2$). Treating fields as collections of quantum [[harmonic-oscillator|oscillators]] handles this naturally. The Standard Model of particle physics is a quantum field theory.',
    technical:
      'QFT quantises fields on Minkowski spacetime; interactions are computed perturbatively via Feynman diagrams and renormalisation. The Standard Model is an SU(3)×SU(2)×U(1) gauge theory with the Higgs mechanism. QED predicts the electron’s magnetic moment to about one part in a trillion.',
    why: 'It is the most precise description of nature ever made, and explains the particles and three of the four forces — everything except gravity.',
    prerequisites: ['quantum-mechanics', 'special-relativity', 'harmonic-oscillator'],
    related: ['mass-energy', 'cosmology'],
    research: [
      { paper: 'dirac-1928', kind: 'foundational' },
      { paper: 'feynman-1949', kind: 'foundational' },
      { paper: 'yang-mills-1954', kind: 'foundational' },
      { paper: 'higgs-1964', kind: 'foundational' },
      { paper: 'atlas-2012', kind: 'experiment' },
    ],
    openQuestions: ['What is dark matter?', 'Why are there three generations of particles?', 'How does gravity fit in?'],
    tags: ['particles', 'fields', 'standard model'],
  },

  // ─── Deep concepts in quantum mechanics ─────────────────────────────
  {
    id: 'quantum-states',
    title: 'Quantum States',
    aliases: ['state vector', 'ket', 'quantum state', 'bra-ket'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'intermediate',
    short: 'The complete description of a quantum system — everything that can be known.',
    simple:
      'A quantum state is the complete description of a quantum system. It doesn’t say what you will see for certain; it says the chances of every possible result of every possible measurement.',
    intuition:
      'For a coin in flight you might say "50/50". But a quantum state holds more than odds: each possibility carries an amplitude — a number with a size and a direction (phase). Two paths can have amplitudes that point in opposite directions and cancel. That is something ordinary odds can’t do.',
    analogy: 'A quantum state is like an arrow in a space of possibilities. Its shadow on each "outcome axis" tells you how likely that outcome is.',
    howItWorks:
      'We write a state as $|\psi\rangle$ ("ket psi"). It is a vector in a [[vector-spaces|vector space]]; the possible outcomes of a measurement form a set of perpendicular directions. The squared length of the state’s shadow along each direction is that outcome’s probability. A state pointing between directions is a [[superposition]].',
    technical:
      'Pure states are rays in a complex [[hilbert-space]]; mixed states are density operators $\rho \succeq 0$, $\mathrm{tr}\,\rho = 1$. For a qubit, pure states map to the surface of the Bloch sphere. States of composite systems live in tensor-product spaces, and most of them are [[entanglement|entangled]].',
    math: m`A two-level state, and the Born rule:
$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle, \qquad |\alpha|^2 + |\beta|^2 = 1, \qquad P(0) = |\alpha|^2$$`,
    why: 'Everything in quantum physics — superposition, entanglement, measurement, computation — is a statement about quantum states.',
    misconceptions: [
      {
        myth: 'The quantum state is just our ignorance about a hidden true value.',
        truth: 'Experiments testing [[bells-theorem]] rule out a large class of such "hidden value" pictures. Amplitudes interfere in ways plain ignorance can’t.',
      },
    ],
    prerequisites: ['vectors', 'complex-numbers', 'probability'],
    related: ['qubits', 'hilbert-space'],
    tags: ['state', 'amplitude'],
  },
  {
    id: 'wave-function',
    title: 'Wave Function',
    aliases: ['wavefunction', 'psi', 'ψ'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'intermediate',
    short: 'A quantum state written as a wave spread over space.',
    simple:
      'The wave function, written $\psi$ (psi), describes a quantum particle as a wave spread across space. Where the wave is large, you are likely to find the particle; where it is small, you are unlikely to.',
    intuition:
      'Imagine a fog spread across a room, thicker in some places. If the "particle" is somewhere in the fog, you’re most likely to find it where the fog is thickest. But unlike fog, this wave can interfere with itself — its peaks and troughs can cancel.',
    analogy: 'The wave function is like a heat map of where a particle might turn up — except the map can interfere with itself like ripples on water.',
    howItWorks:
      'The wave function assigns a [[complex-numbers|complex number]] (an amplitude) to each position. The probability of finding the particle near $x$ is $|\psi(x)|^2$ — Max Born’s rule. The [[schrodinger-equation]] tells you how $\psi$ ripples and spreads over time.',
    technical:
      'The position-space wave function is $\psi(x) = \langle x|\psi\rangle$, square-integrable with $\int|\psi|^2dx = 1$. Its [[fourier-analysis|Fourier transform]] is the momentum-space wave function — a direct route to the [[uncertainty-principle]].',
    math: m`$$P(a \le x \le b) = \int_a^b |\psi(x)|^2\,dx, \qquad \int_{-\infty}^{\infty}|\psi(x)|^2\,dx = 1$$`,
    why: 'It’s how physicists compute the shapes of atomic orbitals, chemical bonds, and the behaviour of electrons in every material.',
    misconceptions: [
      {
        myth: 'The wave function is a physical wave, like water.',
        truth: 'It is a wave of amplitudes, not of stuff. For many particles it lives in an abstract high-dimensional space, not ordinary space.',
      },
    ],
    prerequisites: ['quantum-states', 'waves', 'complex-numbers'],
    related: ['schrodinger-equation', 'probability-distributions', 'wave-particle-duality'],
    research: [
      { paper: 'schrodinger-1926', kind: 'foundational' },
      { paper: 'born-1926', kind: 'foundational' },
    ],
    tags: ['psi', 'amplitude', 'born rule'],
  },
  {
    id: 'superposition',
    title: 'Superposition',
    aliases: ['quantum superposition', 'schrodingers cat', 'schrödinger’s cat'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'beginner',
    short: 'A quantum system can be in a combination of several states at once.',
    simple:
      'Superposition means a quantum system can be in a combination of different states at the same time — until it is measured, when only one result appears.',
    intuition:
      'A classical coin lying on the table is heads or tails. A quantum "coin" can be in a blend of heads and tails — not secretly one of them, but genuinely both, with a weight on each. The proof is interference: the two possibilities can reinforce or cancel each other, which a hidden "just one" couldn’t do.',
    analogy: 'Think of a musical chord. A chord isn’t "really" one of its notes that we don’t know yet; it’s all of them sounding together. A superposition is a chord of possibilities.',
    howItWorks:
      'Quantum states live in a [[vector-spaces|vector space]], so any two allowed states can be added to give another allowed state: $\alpha|0\rangle + \beta|1\rangle$. The numbers $\alpha$ and $\beta$ are amplitudes. When you [[quantum-measurement|measure]], you get $0$ with probability $|\alpha|^2$ or $1$ with probability $|\beta|^2$. Between measurements the amplitudes evolve and interfere.',
    technical:
      'Superposition is basis-dependent: $|+\rangle = (|0\rangle + |1\rangle)/\sqrt2$ is a superposition in the $Z$ basis but a definite state in the $X$ basis. Coherence — the stable phase relationship between components — is what enables interference, and it is destroyed by [[decoherence]].',
    math: m`$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle \qquad |+\rangle = \tfrac{1}{\sqrt2}\big(|0\rangle + |1\rangle\big)$$`,
    why: 'Superposition is the resource behind [[quantum-computing]], quantum sensing and the double-slit experiment. It’s the first genuinely non-classical idea in quantum mechanics.',
    applications: ['Quantum computers', 'Atomic clocks', 'Quantum sensors', 'MRI (nuclear spin superpositions)'],
    misconceptions: [
      {
        myth: 'Superposition means the particle is secretly in one state and we just don’t know which.',
        truth: 'If that were true, there would be no interference. Experiments show both possibilities contribute.',
      },
      {
        myth: 'Superposition means "doing everything at once", so quantum computers try every answer in parallel.',
        truth: 'Measuring gives only one answer. Quantum algorithms work by arranging interference so wrong answers cancel and right ones reinforce.',
      },
    ],
    prerequisites: ['quantum-states', 'vector-spaces', 'probability'],
    related: ['wave-particle-duality', 'qubits', 'decoherence'],
    deeper: ['entanglement', 'quantum-measurement', 'decoherence'],
    research: [
      { paper: 'schrodinger-1935', kind: 'foundational' },
      { paper: 'monroe-1996', kind: 'experiment' },
      { paper: 'friedman-2000', kind: 'experiment' },
      { paper: 'arndt-1999', kind: 'experiment' },
    ],
    tags: ['superposition', 'amplitude', 'interference'],
  },
  {
    id: 'quantum-measurement',
    title: 'Quantum Measurement',
    aliases: ['measurement problem', 'wave function collapse', 'collapse', 'born rule', 'observer effect'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'intermediate',
    short: 'What happens when a quantum possibility becomes a definite result.',
    simple:
      'When you measure a quantum system, you always get one definite result, even if it was in a superposition. The probabilities of each result are fixed by the quantum state. After measuring, the system is in the state you found.',
    intuition:
      'Before you look, the quantum state is a spread of possibilities. The moment a detector clicks, you have one fact. Why one? Why that one? The rules tell us exactly how likely each result is — but what "really" happens at that moment is still debated. This puzzle is called the measurement problem.',
    analogy: 'Measurement is like asking a question that forces a yes-or-no answer. The state determines the odds, but the question you ask decides which answers are possible.',
    howItWorks:
      'Each measurement corresponds to a set of possible outcomes (the [[eigenvalues]] of an operator). The Born rule gives the probability of each: the squared size of the state’s amplitude for it. After the measurement, the state is updated ("collapses") to match the result. Measuring in a different basis asks a different question — and can erase information about the previous one.',
    technical:
      'Projective measurement: $P(a) = \langle\psi|\Pi_a|\psi\rangle$ and $|\psi\rangle \mapsto \Pi_a|\psi\rangle/\sqrt{P(a)}$. General measurements are POVMs. Interpretations differ on collapse: Copenhagen treats it as fundamental, many-worlds (Everett) replaces it with branching, and objective-collapse and pilot-wave theories modify or supplement the dynamics. [[decoherence]] explains why outcomes look classical but not, on its own, why one occurs.',
    math: m`$$P(a) = |\langle a|\psi\rangle|^2 \qquad |\psi\rangle \;\xrightarrow{\text{result } a}\; |a\rangle$$`,
    why: 'Measurement is where quantum possibilities meet the classical world — central to quantum computing, [[quantum-cryptography]] and the foundations of physics.',
    misconceptions: [
      {
        myth: 'Measurement requires a conscious observer.',
        truth: 'Any interaction that records information — a detector, a stray photon, an air molecule — counts. No consciousness required.',
      },
      {
        myth: 'Measurement just reveals a value that was already there.',
        truth: '[[bells-theorem|Bell tests]] show that, under reasonable assumptions, many properties don’t have pre-existing values waiting to be revealed.',
      },
    ],
    prerequisites: ['superposition', 'probability', 'eigenvalues'],
    related: ['decoherence', 'uncertainty-principle'],
    deeper: ['decoherence', 'bells-theorem'],
    research: [
      { paper: 'born-1926', kind: 'foundational' },
      { paper: 'everett-1957', kind: 'foundational' },
      { paper: 'schlosshauer-2005', kind: 'review' },
    ],
    openQuestions: ['The measurement problem — why and how is a single outcome realised?'],
    tags: ['collapse', 'born rule', 'observer'],
  },
  {
    id: 'schrodinger-equation',
    title: 'Schrödinger Equation',
    aliases: ['schrodinger equation', 'schroedinger', 'schrödinger'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'advanced',
    short: 'The equation that tells a quantum state how to change over time.',
    simple:
      'The Schrödinger equation is the quantum version of Newton’s laws: it tells you how a [[wave-function]] changes over time, given the forces acting on the particle.',
    intuition:
      'Newton’s law tells a ball where to go next. The Schrödinger equation tells a wave of possibilities how to flow, spread and ripple. It is completely smooth and predictable — the randomness only appears when you [[quantum-measurement|measure]].',
    analogy: 'If the wave function is the shape of a ripple on a pond, the Schrödinger equation is the physics of water that decides how the ripple moves.',
    howItWorks:
      'The equation links the rate of change of $\psi$ to its energy, described by the Hamiltonian $\hat H$ (kinetic plus potential [[energy]]). Solutions with a fixed energy are standing waves — and for electrons bound to a nucleus, only certain energies allow a stable standing wave. That is why atoms have discrete energy levels and give off light only at specific colours.',
    technical:
      'The time-dependent equation generates unitary evolution. Separation of variables yields the time-independent eigenvalue problem $\hat H\psi = E\psi$ — an [[eigenvalues|eigenvalue]] equation whose spectrum gives the energy levels. For hydrogen it reproduces the Bohr levels $E_n = -13.6\,\text{eV}/n^2$ exactly. The relativistic generalisation for electrons is the Dirac equation.',
    math: m`$$i\hbar\,\frac{\partial \psi}{\partial t} = -\frac{\hbar^2}{2m}\nabla^2\psi + V\psi \qquad\qquad \hat H\psi = E\psi$$`,
    why: 'Solving it explains the periodic table, chemical bonds, semiconductors and lasers. Most of chemistry and materials science is, at heart, solving this equation.',
    applications: ['Computational chemistry', 'Semiconductor design', 'Laser physics', 'Materials science'],
    misconceptions: [
      {
        myth: 'The Schrödinger equation is random.',
        truth: 'It is completely deterministic. Randomness enters only through measurement.',
      },
    ],
    prerequisites: ['wave-function', 'partial-differential-equations', 'complex-numbers'],
    related: ['harmonic-oscillator', 'quantum-chemistry', 'eigenvalues'],
    research: [
      { paper: 'schrodinger-1926', kind: 'foundational' },
      { paper: 'dirac-1928', kind: 'foundational' },
    ],
    tags: ['dynamics', 'hamiltonian'],
  },
  {
    id: 'entanglement',
    title: 'Quantum Entanglement',
    aliases: ['entanglement', 'spooky action at a distance', 'entangled'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'intermediate',
    short: 'Two particles sharing a single quantum state, however far apart.',
    simple:
      'Entangled particles share one combined quantum state. Measure one, and you instantly know something about the other — even if it is on the other side of the universe. Yet this cannot be used to send messages faster than light.',
    intuition:
      'Imagine two coins that always land opposite each other, no matter how far apart they are flipped. Maybe they were just pre-arranged? That’s the obvious guess. The astonishing part — proven by [[bells-theorem]] — is that no pre-arrangement can reproduce what entangled particles actually do when measured in different ways.',
    analogy:
      'Think of a pair of gloves shipped in two boxes: open one, see "left", and you know the other is "right". That explains part of entanglement — the correlation. But quantum pairs go further: they stay correlated for every question you could ask, in a way the gloves can’t.',
    howItWorks:
      'When two particles interact, their combined state may no longer split into "a state for A" and "a state for B". A typical example is the Bell state $(|00\rangle + |11\rangle)/\sqrt{2}$: each particle alone is completely random, yet the two results always match. Measure in a rotated basis and they still correlate — by an amount that depends on the angle between the two measurements. Those correlations are stronger than any classical, pre-arranged explanation allows.',
    technical:
      'A pure bipartite state is entangled iff it is not a product state; its entanglement is quantified by the entropy of either reduced density matrix. Entanglement cannot be created by local operations and classical communication (LOCC), making it a resource. The no-signalling theorem guarantees reduced states are unaffected by distant measurements, so no information travels faster than light. Entanglement enables [[quantum-teleportation]], superdense coding, and entanglement-based [[quantum-cryptography]].',
    math: m`A maximally entangled Bell state, and a product state for contrast:
$$|\Phi^+\rangle = \frac{1}{\sqrt2}\big(|00\rangle + |11\rangle\big) \qquad \text{vs.}\qquad |0\rangle\otimes|+\rangle$$`,
    why: 'Entanglement is the key resource of quantum technology: it powers quantum computers, unbreakable cryptographic keys and ultra-precise sensors — and it has reshaped our understanding of reality.',
    applications: ['Quantum computing', 'Quantum key distribution', 'Quantum teleportation', 'Quantum sensing and clocks'],
    misconceptions: [
      {
        myth: 'Entanglement lets you send messages faster than light.',
        truth: 'Each side alone sees pure randomness. The correlation only appears when results are compared — which needs ordinary, light-speed communication.',
      },
      {
        myth: 'Measuring one particle physically "pushes" the other.',
        truth: 'No signal or force travels between them. The correlation is built into their shared state.',
      },
      {
        myth: 'Entanglement is rare and fragile, only in exotic labs.',
        truth: 'Interacting particles become entangled all the time. It’s keeping entanglement controlled and isolated that is hard — see [[decoherence]].',
      },
    ],
    prerequisites: ['superposition', 'quantum-states', 'probability', 'linear-algebra'],
    related: ['epr-paradox', 'bells-theorem', 'quantum-information', 'decoherence'],
    deeper: ['bells-theorem', 'quantum-teleportation', 'quantum-computing', 'quantum-cryptography'],
    research: [
      { paper: 'epr-1935', kind: 'foundational' },
      { paper: 'schrodinger-1935', kind: 'foundational' },
      { paper: 'bell-1964', kind: 'foundational' },
      { paper: 'aspect-1982', kind: 'experiment' },
      { paper: 'hensen-2015', kind: 'experiment' },
      { paper: 'yin-2017', kind: 'experiment' },
      { paper: 'horodecki-2009', kind: 'review' },
    ],
    openQuestions: ['How does entanglement relate to the structure of spacetime?', 'How can entanglement be distributed reliably over a global quantum internet?'],
    tags: ['nonlocality', 'correlation', 'bell'],
  },
  {
    id: 'epr-paradox',
    title: 'EPR Paradox',
    aliases: ['epr', 'einstein podolsky rosen', 'hidden variables'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'intermediate',
    short: 'Einstein’s argument that quantum mechanics must be incomplete.',
    simple:
      'In 1935, Einstein, Podolsky and Rosen argued that entanglement showed quantum mechanics was incomplete: particles must carry hidden instructions that decide measurement results in advance.',
    intuition:
      'Einstein reasoned: if measuring particle A instantly tells me the result for far-away particle B, and nothing travelled between them, then B must have had that value all along. Quantum mechanics doesn’t list that value — so it must be missing something.',
    analogy: 'Einstein thought entangled particles were like sealed envelopes with matching letters inside — the result was decided at the post office.',
    howItWorks:
      'The argument rests on two assumptions: locality (no influence faster than light) and realism (properties exist before measurement). For decades it seemed a matter of philosophy — until [[bells-theorem|Bell]] showed the two views make different, testable predictions.',
    why: 'EPR turned a philosophical worry into one of the most productive questions in physics, eventually leading to quantum information science.',
    prerequisites: ['entanglement', 'quantum-measurement'],
    related: ['bells-theorem'],
    deeper: ['bells-theorem'],
    research: [
      { paper: 'epr-1935', kind: 'foundational' },
      { paper: 'schrodinger-1935', kind: 'foundational' },
    ],
    tags: ['einstein', 'locality', 'realism'],
  },
  {
    id: 'bells-theorem',
    title: 'Bell’s Theorem',
    aliases: ['bell inequality', 'bell test', 'chsh', 'nonlocality', 'bells theorem'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'advanced',
    short: 'Proof that no local "hidden instructions" can explain quantum correlations.',
    simple:
      'Bell’s theorem shows that if particles carried pre-set hidden instructions and no influence travelled faster than light, their correlations could only be so strong. Quantum mechanics predicts — and experiments confirm — correlations stronger than that limit.',
    intuition:
      'Two players are separated and each asked a random question. They may agree a strategy beforehand but can’t talk afterwards. Bell showed there is a maximum score any such strategy can achieve. Entangled particles beat that maximum. So either something non-local is going on, or the particles didn’t have definite answers before being asked.',
    analogy: 'It’s like proving no pair of sealed envelopes — however cleverly prepared — could match a magic trick. Then performing the trick.',
    howItWorks:
      'Alice and Bob each choose between two measurement settings and record ±1 outcomes. The CHSH combination of their correlations, $S$, is at most 2 for any local hidden-variable theory. Quantum mechanics predicts up to $2\sqrt2 \approx 2.83$. Aspect’s 1982 experiments and the "loophole-free" tests of 2015 found violations, as quantum theory predicts.',
    technical:
      'Assumptions: local causality, measurement independence (free choice of settings), and single outcomes. Loopholes (locality, detection, freedom-of-choice) have been closed individually and jointly (Hensen et al., Giustina et al., Shalm et al., 2015). The Tsirelson bound $2\sqrt2$ is the quantum maximum. Device-independent cryptography uses Bell violations to certify security. The 2022 Nobel Prize in Physics honoured Aspect, Clauser and Zeilinger for this work.',
    math: m`$$S = E(a,b) - E(a,b') + E(a',b) + E(a',b')$$
$$|S|_\text{local} \le 2 \qquad\qquad |S|_\text{quantum} \le 2\sqrt2$$`,
    why: 'Bell’s theorem is one of the most profound results in science: it shows experimentally that the world is not locally realistic, and it made entanglement a testable, useful resource.',
    applications: ['Device-independent quantum cryptography', 'Certified random numbers', 'Tests of quantum foundations'],
    misconceptions: [
      {
        myth: 'Bell’s theorem proves faster-than-light signals exist.',
        truth: 'It rules out local hidden variables, but quantum mechanics still forbids sending signals faster than light.',
      },
    ],
    prerequisites: ['entanglement', 'epr-paradox', 'probability'],
    related: ['quantum-cryptography', 'quantum-measurement'],
    research: [
      { paper: 'bell-1964', kind: 'foundational' },
      { paper: 'chsh-1969', kind: 'foundational' },
      { paper: 'freedman-clauser-1972', kind: 'experiment' },
      { paper: 'aspect-1982', kind: 'experiment' },
      { paper: 'hensen-2015', kind: 'experiment' },
      { paper: 'giustina-2015', kind: 'experiment' },
      { paper: 'shalm-2015', kind: 'experiment' },
    ],
    tags: ['nonlocality', 'chsh', 'nobel 2022'],
  },
  {
    id: 'decoherence',
    title: 'Decoherence',
    aliases: ['quantum decoherence', 'quantum to classical'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'advanced',
    short: 'Why the everyday world doesn’t look quantum.',
    simple:
      'Decoherence is what happens when a quantum system leaks information into its surroundings. Its superpositions effectively fade into ordinary, classical-looking alternatives.',
    intuition:
      'A dust grain is bumped by air molecules and light billions of times a second. Each bump "records" where it is. Once its position is written into the environment, the delicate interference between "here" and "there" is hopelessly scrambled — so it behaves classically.',
    analogy: 'A superposition is like a whispered secret. Decoherence is the secret spreading around a crowded room — no single person changed it, but it’s no longer private and can’t be "un-told".',
    howItWorks:
      'The system becomes [[entanglement|entangled]] with its environment. Looking at the system alone, the phase relationships between its possibilities are lost, so interference disappears. This happens astonishingly fast for large objects — which is why cats are never seen in superposition — and is the main enemy of [[quantum-computing|quantum computers]].',
    technical:
      'The reduced density matrix loses its off-diagonal terms in a preferred "pointer" basis selected by the system–environment interaction (einselection). Decoherence explains the appearance of classicality and suppresses interference, but it doesn’t by itself select a single outcome, so it does not fully solve the measurement problem.',
    why: 'Decoherence bridges the quantum and classical worlds, and fighting it is the central engineering challenge of quantum technology.',
    applications: ['Quantum error correction', 'Quantum hardware design'],
    misconceptions: [
      {
        myth: 'Decoherence solves the measurement problem.',
        truth: 'It explains why we don’t see interference between macroscopic alternatives, but not why one particular outcome occurs.',
      },
    ],
    prerequisites: ['superposition', 'entanglement'],
    related: ['quantum-measurement', 'quantum-error-correction'],
    research: [
      { paper: 'joos-zeh-1985', kind: 'foundational' },
      { paper: 'zurek-2003', kind: 'review' },
      { paper: 'brune-1996', kind: 'experiment' },
      { paper: 'schlosshauer-2005', kind: 'review' },
    ],
    tags: ['classical limit', 'environment'],
  },
  {
    id: 'quantum-teleportation',
    title: 'Quantum Teleportation',
    aliases: ['teleportation'],
    domain: 'physics',
    level: 3,
    parent: 'quantum-mechanics',
    difficulty: 'advanced',
    short: 'Transferring a quantum state using entanglement plus a classical message.',
    simple:
      'Quantum teleportation moves the quantum state of one particle onto another, far away, using a shared entangled pair and an ordinary message. No matter travels, and nothing goes faster than light.',
    intuition:
      'You can’t copy an unknown quantum state (the no-cloning theorem), and measuring it would destroy it. Teleportation is a loophole: with a pre-shared entangled pair, Alice can do a joint measurement, phone Bob two ordinary bits, and Bob can rebuild the exact state. Alice’s original is destroyed in the process.',
    analogy: 'It’s less like a Star Trek transporter and more like sending a fax that shreds the original — where the fax machine needs a pre-shared entangled pair to work.',
    math: m`Two classical bits + one shared Bell pair → one qubit state transferred:
$$1\,\text{ebit} + 2\,\text{bits} \;\ge\; 1\,\text{qubit}$$`,
    why: 'It is a core building block for quantum networks and a future quantum internet, and has been demonstrated from the ground to a satellite.',
    misconceptions: [
      {
        myth: 'Teleportation moves objects instantly.',
        truth: 'It transfers a quantum state, not matter, and needs a classical message — so it’s never faster than light.',
      },
    ],
    prerequisites: ['entanglement', 'quantum-measurement', 'qubits'],
    related: ['quantum-information', 'quantum-cryptography'],
    research: [
      { paper: 'bennett-1993', kind: 'foundational' },
      { paper: 'wootters-zurek-1982', kind: 'foundational' },
      { paper: 'bouwmeester-1997', kind: 'experiment' },
      { paper: 'ren-2017', kind: 'experiment' },
    ],
    tags: ['quantum network', 'no-cloning'],
  },
]
