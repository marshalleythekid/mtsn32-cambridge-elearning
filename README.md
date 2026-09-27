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
