# MTsN 32 Jakarta Selatan – Cambridge E-Learning

Video-based e-learning homepage for Cambridge Programme students and teachers of MTs Negeri 32 Jakarta Selatan.

## Features
- Fixed top navbar with a mobile hamburger menu
- Running text: welcome message, new video uploads, recently watched videos
- Hero section with a Student / Teacher role switch
- Continue watching and New videos sections
- Footer with school info and copyright

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5500
```

Video data is sample data in the `<script>` block of `index.html`, ready to be replaced with a backend.

## Deploy to Vercel
This is a static site with no build step, and `vercel.json` holds its config.

1. On [vercel.com/new](https://vercel.com/new), import `marshalleythekid/mtsn32-cambridge-elearning`.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
3. Click **Deploy**. After that, every push to the production branch redeploys the site automatically.

Or use the CLI: `npx vercel --prod`

## Design rules
The [Hallmark](https://github.com/Nutlope/hallmark) design skill (MIT) is kept in `.claude/skills/hallmark/`. The [three.js skills](https://github.com/CloudAI-X/threejs-skills) (MIT) used for the 3D owl are in `.claude/skills/threejs-*/`. The [genjutsu](https://github.com/AThevon/genjutsu) creative-coding skills (MIT) are in `.claude/skills/cast`, `paint`, `bunshin` and their shared modules in `.claude/skills/_jutsu`. Claude Code sessions in this repo load it on their own, so new pages follow its anti-AI-slop rules. `.vercelignore` keeps it off the deployed site.
