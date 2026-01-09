#!/usr/bin/env node
const readline = require('readline');

const EASY_WORDS = [
  'cat','dog','book','tree','sun','moon','apple','ball','car','hat','pen','cup','desk','home','fish'
];

const NORMAL_WORDS = [
  'apple','banana','cherry','dragon','elephant','flower','guitar','horizon','island','jungle',
  'keyboard','lemon','mountain','notebook','ocean','python','quartz','rocket','sunset','tiger',
  'umbrella','violet','window','xylophone','yacht','zigzag','coffee','library','algorithm','function'
];

const HARD_WORDS = [
  'xylophone','quartz','algorithm','synchronous','conscientious','onomatopoeia','hippopotamus',
  'antidisestablishment','circumference','electroencephalograph','sesquipedalian','implementation'
];

const DIFFICULTY_CONFIGS = {
  easy: { startTime: 10.0, timeDecay: 0.1, words: EASY_WORDS, rounds: 5 },
  normal: { startTime: 5.0, timeDecay: 0.2, words: NORMAL_WORDS, rounds: 10 },
  hard: { startTime: 30.0, timeDecay: 0.1, words: HARD_WORDS, rounds: 20 }
};

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m'
};

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

async function ask(question, rl) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

async function runGame({ rounds = 10, startTime, timeDecay, words, difficulty = 'normal' }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let currentDifficulty = difficulty || 'normal';

  let currentCfg;
  if (startTime !== undefined && timeDecay !== undefined && words !== undefined) {
    currentCfg = { startTime, timeDecay, words };
  } else {
    currentCfg = DIFFICULTY_CONFIGS[currentDifficulty];
  }

  console.log('Typing Minigame — type the shown word and press Enter.');
  console.log('Perfect match = 5 pts, close spelling = 1 pt, miss = 0 pts.');
  console.log('Choose difficulty (easy/normal/hard) or press Enter to keep [' + currentDifficulty + ']:');
  const initialChoice = await ask('> ', rl);
  if (initialChoice && initialChoice.trim().length > 0) {
    const chosen = initialChoice.trim().toLowerCase();
    if (DIFFICULTY_CONFIGS[chosen]) {
      currentDifficulty = chosen;
      currentCfg = DIFFICULTY_CONFIGS[chosen];
      if (!rounds) rounds = currentCfg.rounds;
      console.log(`Difficulty set to ${currentDifficulty} — rounds: ${rounds}\n`);
    } else {
      console.log(`Invalid difficulty "${initialChoice}", using ${currentDifficulty}\n`);
    }
  }

  let score = 0;
  for (let roundIndex = 1; roundIndex <= rounds; roundIndex++) {
    const timeAllowed = Math.max(1.0, (currentCfg.startTime - (roundIndex - 1) * currentCfg.timeDecay));
    const word = currentCfg.words[Math.floor(Math.random() * currentCfg.words.length)];

    console.log(`Round ${roundIndex}/${rounds} — ${timeAllowed.toFixed(1)}s to type:`);
    console.log('  ', word);

    const userInput = await new Promise(resolve => {
      let answered = false;
      const timer = setTimeout(() => {
        if (answered) return;
        answered = true;
        process.stdout.write('\n');
        resolve(null); // timeout
      }, Math.round(timeAllowed * 1000));

      rl.once('line', line => {
        if (answered) return;
        answered = true;
        clearTimeout(timer);
        resolve(line.trim());
      });

      rl.prompt();
    });

    if (userInput === null || userInput.length === 0) {
      console.log(`  -> ${COLORS.red}Time! No points this round.${COLORS.reset}\n`);
      continue;
    }

    if (userInput === word) {
      score += 5;
      console.log(`  -> ${COLORS.green}Perfect! +5${COLORS.reset}\n`);
      continue;
    }

    const dist = levenshtein(userInput, word);
    const closeThreshold = Math.max(1, Math.floor(word.length * 0.3));
    if (dist <= closeThreshold) {
      score += 1;
      console.log(`${COLORS.yellow}  -> Close (distance ${dist}) +1${COLORS.reset}\n`);
    } else {
      console.log(`${COLORS.red}  -> Miss (distance ${dist}) +0${COLORS.reset}\n`);
    }
  }

  const maxScore = rounds * 5;
  const winThreshold = Math.ceil(maxScore * 0.6);
  if (score >= winThreshold) {
    console.log(`${COLORS.purple}Game Over — You win! Total score: ${score}${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}Game Over — total score: ${score}${COLORS.reset}`);
  }
  rl.close();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const roundsArg = args.find(a => a.startsWith('--rounds='));
  const startArg = args.find(a => a.startsWith('--start='));
  const diffArg = args.find(a => a.startsWith('--difficulty=')) || args.find(a => a === '-d');
  let roundsProvided = false;
  let rounds = 0;
  if (roundsArg) {
    rounds = Number(roundsArg.split('=')[1]);
    roundsProvided = true;
  }
  let difficulty = 'normal';
  if (diffArg) {
    if (diffArg === '-d') {
      const idx = args.indexOf('-d');
      const next = args[idx + 1];
      if (next && !next.startsWith('--')) difficulty = next;
    } else {
      difficulty = diffArg.split('=')[1];
    }
  }
  if (!DIFFICULTY_CONFIGS[difficulty]) difficulty = 'normal';
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const startTime = startArg ? Number(startArg.split('=')[1]) : cfg.startTime;
  const timeDecay = cfg.timeDecay;
  const words = cfg.words;
  if (!roundsProvided) rounds = cfg.rounds;

  runGame({ rounds, startTime, timeDecay, words, difficulty }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
