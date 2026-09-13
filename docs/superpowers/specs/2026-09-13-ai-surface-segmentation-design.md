# Real AI floor/wall segmentation and texture replacement

## Context

The visualizer currently fakes floor/wall tile replacement with hardcoded CSS
`clip-path` polygons drawn over one static room photo (`app/globals.css`,
`.floor-surface`/`.wall-surface`). This breaks under any viewport-size crop
change and can never look like a real product photo, because it isn't aware
of the room's actual geometry — it's a guessed shape on top of a photo.

The client's reference product, Nabina Ceramic
(`https://www.nabinaceramic.com/en`), embeds the actual commercial Roomvo
visualizer (`roomvo.startStandaloneVisualizer()`), which uses real computer
vision: it segments the floor/wall from the photo pixel-by-pixel (including
around furniture), then perspective-warps the new tile texture onto that
exact shape. CSS polygons can't replicate this. This spec replaces the CSS
overlay approach with a real segmentation + perspective-warp pipeline.

## Non-goals

- Not attempting full 3D scene reconstruction, depth estimation, or
  vanishing-point math — research confirms real tile visualizers use a
  simpler mask → quadrilateral → homography warp, not 3D reconstruction.
- Not calling a paid hosted inference API (Replicate, HF Inference,
  Segmind) — this must be free to run, so segmentation runs locally via a
  self-hosted Python service.
- Not deploying the Python service to production hosting in this pass —
  local dev only for now (confirmed with the user); a hosting decision
  (Render/Railway/Fly.io) is deferred to when a live client demo is needed.
- Not fine-tuning or training any model — using an off-the-shelf pretrained
  checkpoint as-is.
- Not replacing furniture, ceiling, or any surface other than floor and
  wall.

## Critical constraint: model licensing

This is a sellable commercial product, so the segmentation model's license
must permit commercial use of its pretrained weights — not just its code.
Two popular options were investigated and **disqualified**:

- **NVIDIA SegFormer** (`nvidia/segformer-*-ade-*` on Hugging Face): the
  underlying `NVlabs/SegFormer` LICENSE restricts the weights to
  "non-commercial... research or evaluation purposes only," with commercial
  rights reserved exclusively to NVIDIA. Verified by reading the license
  file directly, not the HF tag (which is misleadingly generic).
- **Meta Mask2Former** (`facebook/mask2former-*-ade-*`): the code is MIT,
  but `MODEL_ZOO.md` in the source repo states the pretrained checkpoints
  are licensed **CC-BY-NC 4.0** (non-commercial) — a nearly identical trap
  to SegFormer's, hidden a level deeper than the top-level license file.

**Chosen model: SHI-Labs OneFormer**, ADE20K-trained checkpoints
(`shi-labs/oneformer_ade20k_swin_tiny` for speed, or `_swin_large` for
accuracy). Verified MIT license on both the code repository
(`SHI-Labs/OneFormer/LICENSE`, plain MIT text) and no separate/contradicting
license statement found for the model zoo's pretrained checkpoints (checked
directly, not inferred from a tag). ADE20K's 150 classes include `floor`
(index 3) and `wall` (index 0), which is what this pipeline needs.

Any future change to the model checkpoint must re-verify commercial
licensing the same way — by reading the actual license file governing the
specific weights, not the top-level repo tag — before use.

## Architecture

```
Next.js (app/page.tsx)
  |  user selects a floor/wall product, or uploads a room photo
  |  POST { roomImage, floorTexture, wallTexture } (base64)
  v
app/api/visualize-room/route.ts   (thin proxy, same pattern as existing routes)
  |  forwards to the Python service
  v
ai-service/main.py  (FastAPI, POST /visualize)
  |
  |-- segmentation.py: OneFormer inference -> floor mask, wall mask
  |     (model loaded once at process startup, not per-request)
  |
  |-- warp.py: for each surface mask:
  |     1. find largest contour in the mask
  |     2. approximate it to a quadrilateral (cv2.approxPolyDP /
  |        minAreaRect fallback if approxPolyDP doesn't yield 4 points)
  |     3. cv2.getPerspectiveTransform + warpPerspective to project the
  |        tile texture (tiled/repeated to cover the quad's bounding box)
  |        onto that quadrilateral
  |     4. blend: multiply the warped texture by the room photo's
  |        grayscale luminance in that region, so existing shadows/
  |        highlights show through the new tile
  |     5. composite the warped+shaded region back into the original
  |        photo using the mask (so furniture pixels, sitting in front
  |        of the floor/wall in the photo, are never overwritten)
  |
  v
returns { "image": "<base64 composited JPEG/PNG>" }
  v
app/page.tsx displays the returned image in place of the current CSS
overlay layers
```

Both floor and wall are processed in the same request/response (per the
user's decision to build both together, not floor-only first).

## Components

### `ai-service/` (new directory)

- `requirements.txt`: `fastapi`, `uvicorn`, `transformers`, `torch` (CPU
  build), `opencv-python`, `pillow`, `numpy`.
- `main.py`: FastAPI app. One route, `POST /visualize`, accepting a JSON
  body `{ room_image: string (base64), floor_texture: string (base64) |
  null, wall_texture: string (base64) | null }`. Loads the OneFormer model
  once at module import time (a global, not per-request) since model
  loading takes several seconds but inference on a loaded model is fast.
  Calls `segmentation.segment_surfaces` then `warp.apply_textures`, returns
  `{ "image": "<base64>" }`. Catches any exception and returns HTTP 500
  with a generic `{ "error": "segmentation_failed" }` body (no stack
  traces) — the Next.js side treats this as "fall back to the original
  photo," per the spec's error-handling section below.
- `segmentation.py`: `segment_surfaces(image: PIL.Image) -> dict[str,
  np.ndarray]` — runs the OneFormer processor + model, maps ADE20K class
  indices 3 (floor) and 0 (wall) to two boolean numpy masks the same size
  as the input image, returns `{"floor": floor_mask, "wall": wall_mask}`.
- `warp.py`: `apply_textures(room_image: PIL.Image, masks: dict[str,
  np.ndarray], textures: dict[str, PIL.Image | None]) -> PIL.Image` —
  implements the contour → quad → homography → luminance-blend →
  composite pipeline described above, once per surface present in
  `textures` with a non-null value. Returns the final composited image.
  If a mask is empty (surface not detected in this photo) or its texture
  is `None`, that surface is left unmodified — no error, just a no-op for
  that surface.

### `public/textures/` (new directory) — generated seamless tile textures

The catalog's products (`lib/catalog.ts`) currently only have CSS gradient
parameters (`color`, `accent`, `pattern`), no real texture image files —
needed now because the warp step projects an actual image, not a CSS
gradient. A small Python script (`ai-service/scripts/generate_textures.py`,
run once, not part of the request path) procedurally generates a seamless
tile texture PNG per product (using PIL, matching each product's existing
`pattern`/`color`/`accent` fields — e.g., a stone-grain noise texture for
`pattern: 'stone'`, plank stripes for `'wood'`, veined marble for
`'marble'`) and saves them to `public/textures/<product-id>.png`. This
keeps the existing catalog data as the single source of truth for what a
product looks like, just adding a real image alongside the existing CSS
parameters (the CSS parameters stay — they're still used for the catalog
swatches in the product list, which don't need the real texture).

### `app/api/visualize-room/route.ts` (new file)

Thin proxy matching this repo's existing API route pattern (see
`app/api/visualizer/route.ts` for the pattern to follow): reads the
request body, forwards it via `fetch` to
`process.env.AI_SERVICE_URL` (default `http://localhost:8000`) at
`/visualize`, returns the JSON response as-is. If the fetch fails
(connection refused, timeout) or the service returns a non-2xx, catches
the error and returns `{ "image": null, "fallback": true }` so the client
can show the unmodified photo instead of crashing.

### `app/page.tsx` (modified)

- New state: `renderedImage: string | null` (the base64 image returned by
  the service), `isRendering: boolean`.
- New effect/handler: whenever `floorProductId`, `wallProductId`, or
  `roomImage` changes, call `/api/visualize-room` with the current room
  photo (converted to base64 if it's a local upload, or fetched as base64
  if it's the bundled demo photo) and the corresponding texture files from
  `public/textures/`. Sets `isRendering = true` while in flight.
- While `isRendering` is true, show a loading state ("Analyzing your
  room...") over the room stage — per the user's confirmed UX decision.
  This reuses the existing `.scene-status` badge area or a similar overlay,
  styled consistently with the current design language.
- Once resolved, if `fallback` is true or the request failed, keep showing
  the plain room photo (no floor/wall changes) — do not crash or show a
  broken image.
- Replace the current `.wall-surface`/`.floor-surface`/`.room-foreground`
  CSS-layered rendering with a single `<img>` (or background-image div)
  showing `renderedImage` when present, falling back to the existing
  `.room-photo` layer when not. The aspect-ratio lock on `.room-stage`
  added in the prior CSS fix stays — it's still correct for whichever
  photo is active (demo photo's own ratio, or the uploaded photo's ratio,
  computed at upload time).
- **Compare mode**: calls `/api/visualize-room` twice — once with the
  current product as `floor_texture`/`wall_texture`, once with the compare
  product — and the existing slider crossfades between the two returned
  images (replacing the current CSS-clip-path crossfade with an image
  crossfade at the same slider position). Per the user's decision, this
  doubles processing time for compare mode specifically; that's accepted.

## Error handling

- Python service unreachable or times out: Next.js route returns
  `{ image: null, fallback: true }`; frontend shows the plain photo, no
  error dialog (matches the low-friction feel of the rest of this app —
  errors elsewhere already degrade to a plain message rather than a modal).
- Segmentation finds no floor or wall in the photo (e.g., a photo that
  isn't a room, or an unusual angle): that surface is silently left
  unmodified (per `warp.py`'s no-op behavior above) — the other surface
  still renders if detected.
- Malformed/corrupt uploaded image: FastAPI/Pillow raises on decode; caught
  in `main.py`, returns the generic 500 described above.
- Model fails to load at service startup (missing dependency, bad
  checkpoint download): the service should fail to start entirely with a
  clear log message — this is a deploy/setup error, not a per-request path
  to design around, consistent with how the LLM agent spec treats a
  missing `GROQ_API_KEY`.

## Testing

No test framework in this repo (confirmed in the LLM-agent plan's Global
Constraints); verification is manual, run from the repo root with both
servers running (`npm run dev` and `uvicorn ai-service.main:app --reload`):

1. Start the Python service, confirm it logs successful model load before
   accepting requests.
2. `curl -X POST localhost:8000/visualize` with the bundled demo photo and
   one product's generated texture (as base64) — confirm the response
   image visibly shows the new floor pattern correctly warped onto the
   photo's actual floor area, furniture unaffected.
3. In the browser: select different floor and wall products, confirm the
   loading state appears and clears, confirm the final image shows both
   surfaces replaced with correct perspective and the furniture from the
   original photo still visible on top.
4. Upload a different room photo (any interior photo) and repeat step 3 —
   confirm the pipeline works on a photo it wasn't tuned for, proving this
   approach generalizes where the old CSS-polygon approach could not.
5. Stop the Python service and repeat step 3 — confirm the frontend falls
   back to showing the plain photo without crashing.
6. Enable compare mode with two different products — confirm both render
   and the slider crossfades between them.
