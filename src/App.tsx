import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, RefreshCw, Home, Sparkles } from 'lucide-react';

type Player = 'X' | 'O';
type GameMode = 'pvp' | 'pvc-easy' | 'pvc-medium';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

const checkWin = (board: (Player | null)[]) => {
  for (let line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return null;
};

const isWinningMove = (player: Player, index: number, currentBoard: (Player | null)[], playerMoves: number[]) => {
  const newBoard = [...currentBoard];
  newBoard[index] = player;
  if (playerMoves.length === 3) {
    newBoard[playerMoves[0]] = null;
  }
  const win = checkWin(newBoard);
  return win?.winner === player;
};

const playSound = (type: 'click' | 'win' | 'vanish') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'vanish') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [board, setBoard] = useState<(Player | null)[]>(Array(9).fill(null));
  const [movesX, setMovesX] = useState<number[]>([]);
  const [movesO, setMovesO] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setMovesX([]);
    setMovesO([]);
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine(null);
  };

  const handleHome = () => {
    setGameMode(null);
    resetGame();
  };

  const handleCellClick = (index: number) => {
    if (winner || board[index] !== null) return;
    if (gameMode?.startsWith('pvc') && currentPlayer === 'O') return; // Prevent clicking during AI turn

    makeMove(index);
  };

  const makeMove = (index: number) => {
    playSound('click');
    
    setBoard(prev => {
      const newBoard = [...prev];
      newBoard[index] = currentPlayer;
      
      const currentMoves = currentPlayer === 'X' ? movesX : movesO;
      if (currentMoves.length === 3) {
        newBoard[currentMoves[0]] = null;
        playSound('vanish');
      }
      return newBoard;
    });

    if (currentPlayer === 'X') {
      setMovesX(prev => {
        const newMoves = [...prev, index];
        if (newMoves.length > 3) newMoves.shift();
        return newMoves;
      });
    } else {
      setMovesO(prev => {
        const newMoves = [...prev, index];
        if (newMoves.length > 3) newMoves.shift();
        return newMoves;
      });
    }

    setCurrentPlayer(prev => prev === 'X' ? 'O' : 'X');
  };

  useEffect(() => {
    const winInfo = checkWin(board);
    if (winInfo) {
      setWinner(winInfo.winner);
      setWinningLine(winInfo.line);
      playSound('win');
    }
  }, [board]);

  useEffect(() => {
    if (winner) return;
    if (gameMode?.startsWith('pvc') && currentPlayer === 'O') {
      const timer = setTimeout(() => {
        const emptyIndices = board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (emptyIndices.length === 0) return;

        let moveIndex = -1;

        if (gameMode === 'pvc-medium') {
          // 1. Check if AI can win
          for (let i of emptyIndices) {
            if (isWinningMove('O', i, board, movesO)) {
              moveIndex = i;
              break;
            }
          }
          // 2. Check if Player can win and block
          if (moveIndex === -1) {
            for (let i of emptyIndices) {
              if (isWinningMove('X', i, board, movesX)) {
                moveIndex = i;
                break;
              }
            }
          }
        }

        // 3. Random move
        if (moveIndex === -1) {
          moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }

        makeMove(moveIndex);
      }, 600); // slight delay for AI
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, board, movesX, movesO]);

  if (!gameMode) {
    return (
      <div className="home-container">
        <div className="home-title">
          <h1>SHIFT<br/>TAC TOE</h1>
          <p>The 3-Move Limit Game</p>
        </div>

        <div className="home-menu">
          <button className="btn" onClick={() => setGameMode('pvp')}>Play vs Player</button>
          <button className="btn" onClick={() => setGameMode('pvc-easy')}>Play vs Computer (Easy)</button>
          <button className="btn" onClick={() => setGameMode('pvc-medium')}>Play vs Computer (Medium)</button>
        </div>
      </div>
    );
  }

  const getVanishingIndex = () => {
    if (winner) return -1;
    if (currentPlayer === 'X' && movesX.length === 3) return movesX[0];
    if (currentPlayer === 'O' && movesO.length === 3) return movesO[0];
    return -1;
  };

  const vanishingIndex = getVanishingIndex();

  return (
    <>
      <header className="header">
        <div className="title-group">
          <h1>SHIFT<br/>TAC TOE</h1>
          <p>The 3-Move Limit Game</p>
        </div>
        {vanishingIndex !== -1 && (
          <div className="vanishing-alert">
            <div className="dot-pulse"></div>
            Oldest move disappears next
          </div>
        )}
      </header>

      <div className="game-container">
        <div className="side-panel">
          <div className="stat-box">
            <div className="label">Current Turn</div>
            <div className={`turn-indicator ${currentPlayer.toLowerCase()}`}>PLAYER {currentPlayer}</div>
          </div>

          <div className="ai-selector">
            <div className="label">Game Mode</div>
            <div className="difficulty-tabs">
              <div className={`tab ${gameMode === 'pvp' ? 'active' : ''}`} onClick={() => { setGameMode('pvp'); resetGame(); }}>PVP</div>
              <div className={`tab ${gameMode === 'pvc-easy' ? 'active' : ''}`} onClick={() => { setGameMode('pvc-easy'); resetGame(); }}>AI (EASY)</div>
              <div className={`tab ${gameMode === 'pvc-medium' ? 'active' : ''}`} onClick={() => { setGameMode('pvc-medium'); resetGame(); }}>AI (MED)</div>
            </div>
          </div>
        </div>

        <div className="board">
          {board.map((cell, i) => {
            const isVanishing = i === vanishingIndex;
            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!!winner || cell !== null || (gameMode.startsWith('pvc') && currentPlayer === 'O')}
                className={`cell ${cell ? cell.toLowerCase() : ''} ${isVanishing ? 'expiring' : ''}`}
              >
                {cell}
                {isVanishing && <div className="cell-hint">Next to vanish</div>}
              </button>
            );
          })}
        </div>

        <div className="side-panel">
          <div className="label">Move History (X)</div>
          <div className="queue-viz">
            {[0, 1, 2].map((i) => {
              const move = movesX[i];
              const isFirst = movesX.length === 3 && i === 0;
              return (
                <div key={i} className={`queue-dot ${isFirst ? 'first' : ''}`}>
                  {move !== undefined ? i + 1 : '-'}
                </div>
              );
            })}
          </div>
          
          <div className="label" style={{ marginTop: '24px' }}>Move History (O)</div>
          <div className="queue-viz">
            {[0, 1, 2].map((i) => {
              const move = movesO[i];
              const isFirst = movesO.length === 3 && i === 0;
              return (
                <div key={i} className={`queue-dot ${isFirst ? 'first' : ''}`}>
                  {move !== undefined ? i + 1 : '-'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="footer-bar">
        <div className="controls">
          <button className="btn" onClick={resetGame}>Reset Match</button>
          <button className="btn btn-outline" onClick={handleHome}>Exit to Menu</button>
        </div>
        <div className="label">
          {winner ? `WINNER: PLAYER ${winner}` : `Pieces: X [0${movesX.length}] — O [0${movesO.length}]`}
        </div>
      </footer>
    </>
  );
}
