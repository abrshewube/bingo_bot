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

function checkBingo(card, markedNumbers) {
  const marked = new Set(markedNumbers);
  marked.add(0); 
  // FREE space is always marked

  // Check rows
  for (let row = 0; row < 5; row++) {
    let count = 0;
    for (let col = 0; col < 5; col++) {
      if (marked.has(card[col][row])) count++;
    }
    if (count === 5) return true;
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    let count = 0;
    for (let row = 0; row < 5; row++) {
      if (marked.has(card[col][row])) count++;
    }
    if (count === 5) return true;
  }

  // Check diagonals
  let diagonal1 = 0, diagonal2 = 0;
  for (let i = 0; i < 5; i++) {
    if (marked.has(card[i][i])) diagonal1++;
    if (marked.has(card[i][4-i])) diagonal2++;
  }
  
  return diagonal1 === 5 || diagonal2 === 5;
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 15);
}

export { generateBingoCard, checkBingo, generateRoomId };

// import SomeUtil from './SomeUtil.js';