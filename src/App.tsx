import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, RefreshCw, Home, Sparkles } from 'lucide-react';

type Player = 'X' | 'O';
type GameMode = 'pvp' | 'pvc-easy' | 'pvc-medium' | 'pvc-hard';
type GameVariant = 'normal' | 'dynamic';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
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

const isWinningMove = (player: Player, index: number, currentBoard: (Player | null)[], playerMoves: number[], variant: GameVariant) => {
  const newBoard = [...currentBoard];
  newBoard[index] = player;
  if (variant === 'dynamic' && playerMoves.length === 3) {
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
  } catch (e) {}
};

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [showPvcOptions, setShowPvcOptions] = useState(false);
  const [gameVariant, setGameVariant] = useState<GameVariant>('dynamic');
  const [board, setBoard] = useState<(Player | null)[]>(Array(9).fill(null));
  const [movesX, setMovesX] = useState<number[]>([]);
  const [movesO, setMovesO] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isDraw, setIsDraw] = useState(false);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setMovesX([]);
    setMovesO([]);
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine(null);
    setIsDraw(false);
  };

  const handleHome = () => {
    setGameMode(null);
    setShowPvcOptions(false);
    resetGame();
  };

  const handleCellClick = (index: number) => {
    if (winner || isDraw || board[index] !== null) return;
    if (gameMode?.startsWith('pvc') && currentPlayer === 'O') return;
    makeMove(index);
  };

  const makeMove = (index: number) => {
    playSound('click');
    
    setBoard(prev => {
      const newBoard = [...prev];
      newBoard[index] = currentPlayer;
      
      const currentMoves = currentPlayer === 'X' ? movesX : movesO;
      if (gameVariant === 'dynamic' && currentMoves.length === 3) {
        newBoard[currentMoves[0]] = null;
        playSound('vanish');
      }
      return newBoard;
    });

    if (currentPlayer === 'X') {
      setMovesX(prev => {
        const newMoves = [...prev, index];
        if (gameVariant === 'dynamic' && newMoves.length > 3) newMoves.shift();
        return newMoves;
      });
    } else {
      setMovesO(prev => {
        const newMoves = [...prev, index];
        if (gameVariant === 'dynamic' && newMoves.length > 3) newMoves.shift();
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
    } else if (!board.includes(null) && gameVariant === 'normal') {
      setIsDraw(true);
    }
  }, [board, gameVariant]);

  useEffect(() => {
    if (winner || isDraw) return;
    if (gameMode?.startsWith('pvc') && currentPlayer === 'O') {
      const timer = setTimeout(() => {
        const emptyIndices = board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (emptyIndices.length === 0) return;

        let moveIndex = -1;

        if (gameMode === 'pvc-medium' || gameMode === 'pvc-hard') {
          for (let i of emptyIndices) {
            if (isWinningMove('O', i, board, movesO, gameVariant)) {
              moveIndex = i;
              break;
            }
          }
          if (moveIndex === -1) {
            for (let i of emptyIndices) {
              if (isWinningMove('X', i, board, movesX, gameVariant)) {
                moveIndex = i;
                break;
              }
            }
          }
        }

        if (gameMode === 'pvc-hard' && moveIndex === -1) {
          if (board[4] === null) {
            moveIndex = 4;
          } else {
            const corners = [0, 2, 6, 8].filter(i => board[i] === null);
            if (corners.length > 0) {
              moveIndex = corners[Math.floor(Math.random() * corners.length)];
            } else {
              const sides = [1, 3, 5, 7].filter(i => board[i] === null);
              if (sides.length > 0) {
                moveIndex = sides[Math.floor(Math.random() * sides.length)];
              }
            }
          }
        }

        if (moveIndex === -1) {
          moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }

        makeMove(moveIndex);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, isDraw, board, movesX, movesO, gameVariant]);

  if (!gameMode) {
    return (
      <div className="home-container">
        <div className="home-title">
          <h1>{gameVariant === 'dynamic' ? 'SHIFT' : 'CLASSIC'}<br/>TAC TOE</h1>
          <p>{gameVariant === 'dynamic' ? 'The 3-Move Limit Game' : 'The Classic 3-in-a-Row Game'}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <button className={`btn ${gameVariant === 'normal' ? '' : 'btn-outline'}`} onClick={() => setGameVariant('normal')}>Normal</button>
          <button className={`btn ${gameVariant === 'dynamic' ? '' : 'btn-outline'}`} onClick={() => setGameVariant('dynamic')}>Dynamic</button>
        </div>

        <div className="home-menu">
          {!showPvcOptions ? (
            <>
              <button className="btn" onClick={() => setGameMode('pvp')}>Player vs Player</button>
              <button className="btn" onClick={() => setShowPvcOptions(true)}>Player vs Computer</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setGameMode('pvc-easy')}>Easy</button>
              <button className="btn" onClick={() => setGameMode('pvc-medium')}>Medium</button>
              <button className="btn" onClick={() => setGameMode('pvc-hard')}>Hard</button>
              <button className="btn btn-outline" onClick={() => setShowPvcOptions(false)}>Back</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const getVanishingIndex = () => {
    if (gameVariant === 'normal' || winner || isDraw) return -1;
    if (currentPlayer === 'X' && movesX.length === 3) return movesX[0];
    if (currentPlayer === 'O' && movesO.length === 3) return movesO[0];
    return -1;
  };

  const vanishingIndex = getVanishingIndex();

  return (
    <>
      <header className="header">
        <div className="title-group">
          <h1>{gameVariant === 'dynamic' ? 'SHIFT' : 'CLASSIC'}<br/>TAC TOE</h1>
          <p>{gameVariant === 'dynamic' ? 'The 3-Move Limit Game' : 'The Classic 3-in-a-Row Game'}</p>
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
            <div className="difficulty-tabs" style={{flexWrap: 'wrap', gap: '4px'}}>
              <div className={`tab ${gameMode === 'pvp' ? 'active' : ''}`} onClick={() => { setGameMode('pvp'); resetGame(); }}>PVP</div>
              <div className={`tab ${gameMode === 'pvc-easy' ? 'active' : ''}`} onClick={() => { setGameMode('pvc-easy'); resetGame(); }}>EASY</div>
              <div className={`tab ${gameMode === 'pvc-medium' ? 'active' : ''}`} onClick={() => { setGameMode('pvc-medium'); resetGame(); }}>MED</div>
              <div className={`tab ${gameMode === 'pvc-hard' ? 'active' : ''}`} onClick={() => { setGameMode('pvc-hard'); resetGame(); }}>HARD</div>
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
                disabled={!!winner || !!isDraw || cell !== null || (gameMode.startsWith('pvc') && currentPlayer === 'O')}
                className={`cell ${cell ? cell.toLowerCase() : ''} ${isVanishing ? 'expiring' : ''}`}
              >
                {cell}
                {isVanishing && <div className="cell-hint">Next to vanish</div>}
              </button>
            );
          })}
        </div>

        <div className="side-panel">
          {gameVariant === 'dynamic' && (
            <>
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
            </>
          )}
        </div>
      </div>

      <footer className="footer-bar">
        <div className="controls">
          <button className="btn" onClick={resetGame}>Reset Match</button>
          <button className="btn btn-outline" onClick={handleHome}>Exit to Menu</button>
        </div>
        <div className="label">
          {winner ? `WINNER: PLAYER ${winner}` : isDraw ? 'DRAW!' : `Pieces: X [0${movesX.length}] — O [0${movesO.length}]`}
        </div>
      </footer>
    </>
  );
}