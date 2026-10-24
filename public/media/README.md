# /media: AI-generated images

Every image in this folder (`photo/` and `illo/`) is an **AI-generated illustration**. None of them is a photograph of a real SycaMore event, volunteer, organization or school. They show what the product is for, not things that happened.

- Generator: ElevenLabs (creative flows), model `gpt-image-2.5-sunburst`
- Generated: 2026-10-24
- Art direction: "botanical field journal": documentary 35mm look, warm natural light, Northern California / Bay Area settings, muted greens and parchment tones. No identifiable faces, logos or readable text.
- Illustration backgrounds are about `#f6f5f0` (within 1-2 RGB levels). Use `mix-blend-mode: multiply` if the page color needs an exact match.
- QR codes in `audience-*` photos are made-up patterns, not real codes. Don't present them as scannable.

`manifest.json` maps each logical name to `src`, `sm` (small variant), `width`, `height`, `alt`, `kind` and `credit`. Keep the "AI-generated illustrative image" credit wherever an image is captioned or credited.

Processing: Sharp WebP output at q78 with metadata stripped. Photos are 1600 px on the long edge (hero 2400 px) with an 800 px `-sm` variant. Illustrations are 1200 px square with a 480 px `-sm` variant.
