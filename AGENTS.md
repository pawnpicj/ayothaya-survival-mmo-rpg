# Gameplay notes

When working on an item in `GAMEPLAY-NOTES.md`, record the date, changes and verified test results in that file. Mark the item complete once its checks pass.

# Sprite standard for new game objects

Apply this standard by default whenever creating a new character, NPC, monster, boss, prop, pickup, inventory icon, or skill effect. A request naming just the object is enough. Use its gameplay role and the closest shipped asset to fill in the art and animation details.

## Art direction

- Inspect the actual in-game reference at gameplay size before generating art. Use `assets/player-anchor.png` for human scale, `assets/village-npcs.png` for clothing, outlines and lighting, and the closest shipped object of the same kind for relative size. Supply those images as visual references when generating the sheet.
- Match the Ayothaya three-quarter top-down camera, upper-left light, crisp dark contours, grouped pixel shading and ancient Siam materials. Match human proportions to the player. Keep camera, pixel density, palette, costume, weapon hand and lighting consistent across all frames.

## Sheet and frame pattern

- Deliver a transparent PNG atlas with equal-sized cells. Read left to right, then top to bottom. A static object has one frame. Related static variants can share a row. For a moving object, keep each action and facing in a named strip with explicit frame order. Use the direction names and ordering expected by its renderer.
- Use 96 × 96 cells and a foot pivot at (48, 86) for human-sized world actors. For larger creatures, scenery, inventory items and effects, choose cell dimensions to fit their in-game scale. Anchor standing objects at ground contact, inventory icons at the center, and effects at their attachment or impact point. Lock the cell, pivot and scale across the whole sequence.
- Use transparent padding around the largest pose, including equipment. Align every frame to the pivot during export. Render with pixel smoothing disabled. Let the world renderer draw the ground shadow for standing objects.
- Animate what the player can actually do or see. A walking cycle returns cleanly to its first pose. An attack shows preparation, contact and recovery, with contact aligned to the damage event. A skill effect uses the same direction, position and timing as the skill in the game.
- Keep the grid, frame count, pivot, timing and loop behavior in the consuming renderer or its existing asset definition. Reuse that definition wherever the object appears, including Animation Preview when applicable.

## Acceptance before delivery

1. Check that the PNG dimensions match the declared grid and inspect the extracted cells over light and dark backgrounds. Look for clipped edges, neighboring-frame bleed and jitter at the anchor.
2. Open the object through its normal game entry point and compare it beside the player or a peer in its intended scene. For icons, inspect the actual inventory slot. For signs and other interactive props, check readability, grounding and the click target.
3. For animated objects, play the loop at normal speed and step through the poses. Check facing, weapon grip, contact timing and the transition back to idle. For effects, also check the impact on the actual map background.
4. Correct visible mismatches before delivery and show an in-game capture of the result. Use the checks below for actors that belong in Animation Preview.

# Animation Preview

Whenever you add a monster, boss, or playable warrior class to the game, add it to Animation Preview in the same change.

- Register the actor in `preview-data.js` under Monsters or Players. Reuse the in-game sprite and make its movement, attacks, and any signature skill or entrance animation selectable.
- Reuse in-game effect renderers and timing for the preview. Wire new asset or script paths into `preview.html` and `server.mjs` when needed.
- Open `/preview.html`, select the new actor, and verify that its animations load, play, and can be scrubbed or stepped before calling the actor complete.
