# fake-terraria-clone-thing

Texture-driven Terraria-inspired sandbox game made with only HTML/CSS/JS.

## Run

```bash
python -m http.server 4173
```

Open:
- `http://localhost:4173/` for the game
- `http://localhost:4173/texture-maker.html` for the texture creator

## Important texture setup

Put your PNG textures into `/textures` with these exact names:

- `dirt.png`
- `stone.png`
- `deep-stone.png`
- `grass-top.png`
- `tree.png`
- `player.png`
- `pickaxe.png`

The game now expects external textures and reports missing ones in the HUD.

## Game controls

- `A` / `D`: move
- `Space`: jump
- Left click: mine block + pickaxe swing
- Right click: place dirt block

## Texture maker features

- Any texture size (width/height)
- Transparent background canvas
- Draw tool
- Fill (bucket) tool
- Erase tool
- Clear canvas
- Export to PNG
