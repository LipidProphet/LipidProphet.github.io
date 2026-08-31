# LipidProphet website

Static GitHub Pages site for [LipidProphet](https://github.com/HartlerLab/LipidProphet).

## Local preview

Serve the repository root with any static HTTP server. For example, with Python:

```text
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. Do not preview the pages directly with `file://`; shared navigation and browser security behavior are most reliable over HTTP.

## Structure

- `index.html`: homepage
- `downloads.html`: installers, manual, and requirements
- `publications.html`: scientific rationale and publication status
- `contact.html`: support and issue-reporting paths
- `tutorials/`: tutorial hub and individual workflows
- `css/site.css`: responsive design system
- `js/site.js`: shared header/footer, mobile menu, table-of-contents highlighting, and copy buttons
- `img/LP_logo.svg`: primary LipidProphet mascot artwork

## Publishing checklist

1. Test at 390 px, 768 px, and desktop widths.
2. Confirm there is no horizontal overflow.
3. Run an internal-link check.
4. Verify every University of Graz download link.
5. Update the publication record when the final DOI and data repository are available.
6. Add current, high-resolution application screenshots where they improve a tutorial.
