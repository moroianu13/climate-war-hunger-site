"""Idempotently inject mobile assets into the published Quarto HTML.

The report contains embedded resources (~35 MB). Patching in CI avoids
re-rendering scientific results or touching the private research repository.
"""
from pathlib import Path

HTML = Path("index.html")
CSS_TAG = '<link rel="stylesheet" href="mobile-layout.css" data-cwh-mobile="v1">'
JS_TAG = '<script src="mobile-layout.js" defer data-cwh-mobile="v1"></script>'


def main():
    html = HTML.read_text(encoding="utf-8")
    # A freshly rendered HTML from the private Quarto project already embeds
    # the same behavior, and must not be enhanced a second time.
    if "window.__cwhMobileInitialized = true" in html:
        print("The responsive Quarto build already embeds the mobile fix.")
        return
    changed = False
    if CSS_TAG not in html:
        if "</head>" not in html:
            raise RuntimeError("Cannot find </head> in generated HTML.")
        html = html.replace("</head>", f"  {CSS_TAG}\n</head>", 1)
        changed = True
    if JS_TAG not in html:
        if "</body>" not in html:
            raise RuntimeError("Cannot find </body> in generated HTML.")
        html = html.replace("</body>", f"  {JS_TAG}\n</body>", 1)
        changed = True
    if changed:
        HTML.write_text(html, encoding="utf-8")
        print("Inserted responsive CSS and JS references into index.html.")
    else:
        print("Published index.html already includes the mobile assets.")


if __name__ == "__main__":
    main()
