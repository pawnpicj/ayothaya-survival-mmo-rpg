# Animation Preview

Whenever you add a monster, boss, or playable warrior class to the game, add it to Animation Preview in the same change.

- Register the actor in `preview-data.js` under Monsters or Players. Reuse the in-game sprite and make its movement, attacks, and any signature skill or entrance animation selectable.
- Reuse in-game effect renderers and timing for the preview. Wire new asset or script paths into `preview.html` and `server.mjs` when needed.
- Open `/preview.html`, select the new actor, and verify that its animations load, play, and can be scrubbed or stepped before calling the actor complete.
