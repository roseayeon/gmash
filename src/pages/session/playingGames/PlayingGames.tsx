import { useCallback, useEffect, useState } from 'react';

import Game from '../../../data/game';
import Member from '../../../data/member';
import firebase from '../../../firebase';
import FinishDialog from '../finishDialog/FinishDialog';
import GameRow from '../gameRow/GameRow';

interface Props {
  members: Member[];
}

export default function PlayingGames({ members }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [finishingGame, setFinishingGame] = useState<Game | null>(null);

  const getMemberById = useCallback(
    (id: string) => {
      return members.find((member) => member.id === id)!;
    },
    [members]
  );

  useEffect(() => {
    const unsubscribe = firebase.listenToPlayingGames((playingGames) => {
      if (members.length === 0) return;

      const games: Game[] = playingGames.map((game) => ({
        team1: game.team1.map((id) => getMemberById(id)),
        team2: game.team2.map((id) => getMemberById(id)),
        ref: game.ref,
      }));
      setGames(games);
    });
    return () => unsubscribe();
  }, [members, getMemberById]);

  return (
    <>
      <GameRow
        games={games}
        dialog={{
          title: 'Update a playing game',
          actions: [
            {
              text: 'Finish',
              action: async (game) => {
                setFinishingGame(game);
              },
            },
          ],
        }}
      />
      {finishingGame && (
        <FinishDialog
          game={finishingGame}
          open={finishingGame != null}
          onClose={() => {
            setFinishingGame(null);
          }}
        />
      )}
    </>
  );
}
