# Cubic Equation Mini Web

A lightweight static website to:

- Solve equations of the form `a*x^3 + b*x^2 + c*x + d = 0`
- Show real or complex roots
- Draw the cubic function graph on a canvas
- Highlight real roots on the graph

## Run locally

1. Open `index.html` directly in a browser, or
2. Serve with Python:

```bash
python -m http.server 8080
```

Then open: `http://localhost:8080`

## Deploy to GitHub Pages (quick setup)

This project is pre-configured with a workflow at `.github/workflows/deploy-pages.yml`.

1. Create a GitHub repository and push this project.
2. In your repository, open **Settings** -> **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` or `master` branch.
5. Wait for the `Deploy to GitHub Pages` workflow to finish.

After the workflow succeeds, your public URL will look like:

`https://<your-username>.github.io/<your-repo>/`

## Share with others

You can share this tool in 2 simple ways:

1. Zip and send these files:
   - `index.html`
   - `styles.css`
   - `app.js`
2. Upload to a static host (GitHub Pages, Netlify, Vercel static, or any web server).

No backend is required.
