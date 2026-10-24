# SycaMore volunteer preview

An isolated, dependency-free desktop and phone prototype. Requires Node.js 20 or newer. No npm install, API keys, database migrations, or framework configuration changes are required.

```sh
npm run check
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173/#/discover. Set PORT to use another local port. The server binds only to your computer. Stop with Ctrl+C.

`dist/` is the complete static app and can be hosted at a directory URL ending with `/`. Its hash routes and relative assets work in a subdirectory. Do not copy its index.html over the main application's index.html. No production routing or hosting settings are changed by this package.

## What is included

- Volunteer dashboard, check-in simulation, records, badges, and journey.
- Discover with causes, skills, learning goals, logistics, and saved opportunities.
- Reviewed role-to-skill provenance and deterministic weighted fit scoring.
- Organization banner and concise opportunity details, with a donut only inside the opened opportunity.
- Desktop and phone layouts in the existing green and cream palette.
- 22 matching tests, syntax/asset checks, original design and matching notes.

## Boundaries

All opportunities, service records, badge signatures, and logistics are fictional demonstrations. No real registration, check-in, credential issuance, or applications occur. Claude and LinkedIn import are not connected. Resume/role review uses keyword rules. Fit is a rule-based score, not a probability or validated hiring model. Profile text stays in page memory; browser storage holds demo settings and saved listing IDs. Do not use real personal data in a public demo.

## Integrating into the live application

Keep this prototype isolated until the team reviews the host framework, authentication, APIs, route ownership, and deployment configuration. Serve as its own static route/origin, or port components deliberately. Its global functions, CSS, browser storage, and hash router are not a drop-in component system. An iframe or separate origin provides stronger isolation than injecting its scripts into the main page. Real API adapters and server-side authorization must be designed before replacing fixture data. Do not connect prototype check-in or badge actions directly to production records.

See `docs/DISCOVER.md` for matching details. Older sections describe earlier iterations; the final override notes and current code are authoritative.
