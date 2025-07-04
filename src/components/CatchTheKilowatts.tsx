import React, { useRef, useEffect, useState } from "react";

const WIDTH = 320;
const HEIGHT = 400;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 10;
const TARGET_SIZE = 20;

const CatchTheWatts = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const [playerX, setPlayerX] = useState(WIDTH / 2 - PLAYER_WIDTH / 2);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const targetsRef = useRef([]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    let frame = 0;
    let animationId;
    let playing = true;

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw spaceship
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(playerX, HEIGHT - 30, PLAYER_WIDTH, PLAYER_HEIGHT);

      // Update targets
      if (frame % 30 === 0) {
        const isBomb = Math.random() < 0.2;
        targetsRef.current.push({
          x: Math.random() * (WIDTH - TARGET_SIZE),
          y: 0,
          type: isBomb ? "💣" : "⚡",
        });
      }

      const nextTargets = [];

      targetsRef.current.forEach((t) => {
        t.y += 4;
        ctx.font = "20px sans-serif";
        ctx.fillText(t.type, t.x, t.y);

        const hit =
          t.y + TARGET_SIZE >= HEIGHT - 30 &&
          t.x + TARGET_SIZE >= playerX &&
          t.x <= playerX + PLAYER_WIDTH;

        if (hit) {
          if (t.type === "⚡") {
            setScore((s) => s + 1);
          } else {
            setGameOver(true);
            onGameEnd(score);
            playing = false;
            return;
          }
        } else if (t.y < HEIGHT) {
          nextTargets.push(t);
        }
      });

      targetsRef.current = nextTargets;

      if (playing) {
        frame++;
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [playerX, score, onGameEnd]);

  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key === "ArrowLeft") {
        setPlayerX((x) => Math.max(0, x - 20));
      } else if (e.key === "ArrowRight") {
        setPlayerX((x) => Math.min(WIDTH - PLAYER_WIDTH, x + 20));
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  return (
    <div className="mt-4">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="border bg-white rounded shadow"
      />
      <p className="mt-2 text-sm font-medium text-gray-700">Score: {score}</p>
    </div>
  );
};

export default CatchTheWatts;
