function generateBingoCard() {
  const card = [];
  const ranges = [
    [1, 15],   // B column
    [16, 30],  // I column
    [31, 45],  // N column
    [46, 60],  // G column
    [61, 75]   // O column
  ];

  for (let col = 0; col < 5; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const usedNumbers = new Set();
    
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        // Center is FREE space
        column.push(0);
      } else {
        let num;
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        column.push(num);
      }
    }
    card.push(column);
  }

  return card;
}

// Generate a unique cartela (card) based on cartela number
function generateCartela(cartelaNumber) {
  // Use cartela number as seed for consistent generation
  const seed = cartelaNumber * 12345 + 67890;
  const card = [];
  const ranges = [
    [1, 15],   // B column
    [16, 30],  // I column
    [31, 45],  // N column
    [46, 60],  // G column
    [61, 75]   // O column
  ];

  // Simple seeded random function
  const seededRandom = (min, max) => {
    const x = Math.sin(seed + card.length) * 10000;
    const random = x - Math.floor(x);
    return Math.floor(random * (max - min + 1)) + min;
  };

  for (let col = 0; col < 5; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const usedNumbers = new Set();
    
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        // Center is FREE space
        column.push(0);
      } else {
        let num;
        do {
          num = seededRandom(min, max);
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        column.push(num);
      }
    }
    card.push(column);
  }

  return card;
}

function checkBingo(card, markedNumbers) {
  const marked = new Set(markedNumbers);
  marked.add(0); // FREE space is always marked

  // Check rows
  for (let row = 0; row < 5; row++) {
    let count = 0;
    for (let col = 0; col < 5; col++) {
      if (marked.has(card[col][row])) count++;
    }
    if (count === 5) return { type: 'row', line: row };
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    let count = 0;
    for (let row = 0; row < 5; row++) {
      if (marked.has(card[col][row])) count++;
    }
    if (count === 5) return { type: 'column', line: col };
  }

  // Check diagonals
  let diagonal1 = 0, diagonal2 = 0;
  for (let i = 0; i < 5; i++) {
    if (marked.has(card[i][i])) diagonal1++;
    if (marked.has(card[i][4-i])) diagonal2++;
  }
  
  if (diagonal1 === 5) return { type: 'diagonal', line: 0 };
  if (diagonal2 === 5) return { type: 'diagonal', line: 1 };

  // Check four corners
  const corners = [
    card[0][0], card[0][4], card[4][0], card[4][4]
  ];
  if (corners.every(corner => marked.has(corner))) {
    return { type: 'corners', line: -1 };
  }

  return null;
}

// Check if a specific win pattern is completed
function checkWinPattern(card, markedNumbers, pattern) {
  const marked = new Set(markedNumbers);
  marked.add(0); // FREE space is always marked

  switch (pattern) {
    case 'row':
      for (let row = 0; row < 5; row++) {
        let count = 0;
        for (let col = 0; col < 5; col++) {
          if (marked.has(card[col][row])) count++;
        }
        if (count === 5) return true;
      }
      return false;

    case 'column':
      for (let col = 0; col < 5; col++) {
        let count = 0;
        for (let row = 0; row < 5; row++) {
          if (marked.has(card[col][row])) count++;
        }
        if (count === 5) return true;
      }
      return false;

    case 'diagonal':
      let diagonal1 = 0, diagonal2 = 0;
      for (let i = 0; i < 5; i++) {
        if (marked.has(card[i][i])) diagonal1++;
        if (marked.has(card[i][4-i])) diagonal2++;
      }
      return diagonal1 === 5 || diagonal2 === 5;

    case 'corners':
      const corners = [
        card[0][0], card[0][4], card[4][0], card[4][4]
      ];
      return corners.every(corner => marked.has(corner));

    default:
      return false;
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 15);
}

// Calculate game duration based on player count
function calculateGameDuration(playerCount) {
  // Base duration: 25-40 numbers, 1.5-2s per number
  const minNumbers = 25;
  const maxNumbers = 40;
  const minDelay = 1500;
  const maxDelay = 2000;
  
  const numbersToCall = Math.floor(Math.random() * (maxNumbers - minNumbers + 1)) + minNumbers;
  const delayPerNumber = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  
  return {
    numbersToCall,
    delayPerNumber,
    estimatedDuration: numbersToCall * delayPerNumber
  };
}

export { 
  generateBingoCard, 
  generateCartela,
  checkBingo, 
  checkWinPattern,
  generateRoomId,
  calculateGameDuration
};