import { useState } from "react";
import CatchTheWatts from "@/components/CatchTheKilowatts";

const NotFound = () => {
  const [showGame, setShowGame] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 text-center">
      <h1 className="text-5xl font-bold text-rose-600 mb-4">404</h1>
      <p className="text-lg text-gray-700 max-w-md">
        This page doesn’t exist — but you can still save the grid.
      </p>
      <img
        src="https://illustrations.popsy.co/gray/error-404.svg"/*Change to an image */
        alt="404 astronaut"
        className="w-64 mt-6 mb-4"
      />

      {!showGame && (
        <button
          onClick={() => setShowGame(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Play Catch the Watts
        </button>
      )}

      {showGame && !gameEnded && (
        <CatchTheWatts
          onGameEnd={(score) => {
            setFinalScore(score);
            setGameEnded(true);
          }}
        />
      )}

      {gameEnded && (
        <div className="mt-6 space-y-2">
          <p className="text-green-700 font-semibold">
            You caught {finalScore} ⚡ — grid restored!
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Dashboard
          </a>
        </div>
      )}
    </div>
  );
};

export default NotFound;
