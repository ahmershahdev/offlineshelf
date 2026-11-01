import re
import zipfile
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime
from html import escape
from pathlib import Path
from urllib.parse import quote, unquote

from app.exports import LICENSE_URL

# Parsoid HTML is machine-generated and regular, so attribute rewriting with patterns is safe
# here; it would not be for arbitrary HTML.
BASE_TAG = re.compile(r"<base\b[^>]*>", re.IGNORECASE)
SCRIPT = re.compile(r"<script\b.*?</script\s*>", re.IGNORECASE | re.DOTALL)
URL_ATTR = re.compile(r'(\s(?:href|src|resource|about))="([^"]*)"')
SRCSET = re.compile(r'(\ssrcset)="([^"]*)"')
BODY_END = re.compile(r"</body\s*>", re.IGNORECASE)
HEAD_END = re.compile(r"</head\s*>", re.IGNORECASE)

# The wiki's own stylesheets are not bundled; this keeps pages readable offline.
READER_CSS = (
    "<style>body{max-width:46rem;margin:2rem auto;padding:0 1rem;font:17px/1.6 Georgia,serif}"
    "img{max-width:100%;height:auto}table{border-collapse:collapse}"
    "td,th{border:1px solid #ccc;padding:.2rem .4rem}"
    ".offlineshelf-attribution{margin-top:3rem;border-top:1px solid #ccc;font-size:.85rem}"
    "</style>"
)


@dataclass(frozen=True, slots=True)
class BundleArticle:
    page_id: int
    title: str
    revision_id: int | None


@dataclass(frozen=True, slots=True)
class BundleResult:
    written: int
    missing: list[str]


def wiki_url(wiki: str, title: str) -> str:
    return f"https://{wiki}/wiki/{quote(title.replace(' ', '_'), safe='/:')}"


def article_file(page_id: int) -> str:
    # Page IDs, not titles: titles can hold characters that are unsafe or ambiguous in file names
    # on some systems (":" on Windows, case folding on macOS).
    return f"{page_id}.html"


def _absolute(wiki: str, url: str) -> str:
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("/"):
        return f"https://{wiki}{url}"
    return url


def rewrite_html(html: str, wiki: str, local: dict[str, int], article: BundleArticle) -> str:
    def attr(match: re.Match[str]) -> str:
        name, url = match.group(1), match.group(2)
        if url.startswith("./"):
            path, _, fragment = url[2:].partition("#")
            suffix = f"#{fragment}" if fragment else ""
            target = local.get(unquote(path).replace("_", " "))
            if target is not None:
                return f'{name}="{article_file(target)}{suffix}"'
            return f'{name}="https://{wiki}/wiki/{path}{suffix}"'
        return f'{name}="{_absolute(wiki, url)}"'

    def srcset(match: re.Match[str]) -> str:
        parts = [p.strip() for p in match.group(2).split(",")]
        return f'{match.group(1)}="{", ".join(_absolute(wiki, p) for p in parts)}"'

    html = SCRIPT.sub("", BASE_TAG.sub("", html))
    html = SRCSET.sub(srcset, URL_ATTR.sub(attr, html))
    html = HEAD_END.sub(lambda _: READER_CSS + "</head>", html, count=1)
    source = wiki_url(wiki, article.title)
    if article.revision_id is not None:
        source = f"https://{wiki}/w/index.php?oldid={article.revision_id}"
    history = (
        f"https://{wiki}/w/index.php?title={quote(article.title.replace(' ', '_'))}&action=history"
    )
    footer = (
        '<footer class="offlineshelf-attribution"><p>'
        f'From <a href="{escape(source)}">{escape(article.title)}</a> on {escape(wiki)}. '
        f'Text is available under <a href="{LICENSE_URL}">CC BY-SA 4.0</a>; the authors are '
        f'listed in the <a href="{escape(history)}">page history</a>. '
        '<a href="../index.html">All articles</a></p></footer>'
    )
    replaced, count = BODY_END.subn(lambda _: footer + "</body>", html, count=1)
    return replaced if count else html + footer


def _page(title: str, body: str) -> str:
    return (
        '<!doctype html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{escape(title)}</title>{READER_CSS}</head><body>{body}</body></html>"
    )


def index_html(
    name: str, wiki: str, built: datetime | None, articles: list[BundleArticle], missing: set[str]
) -> str:
    items = "".join(
        f'<li><a href="articles/{article_file(a.page_id)}">{escape(a.title)}</a></li>'
        for a in articles
        if a.title not in missing
    )
    gone = "".join(f"<li>{escape(t)}</li>" for t in sorted(missing))
    stamp = built.strftime("%Y-%m-%d %H:%M UTC") if built else "an unknown time"
    body = (
        f"<h1>{escape(name)}</h1>"
        f"<p>{len(articles) - len(missing)} articles from {escape(wiki)}, as of {stamp}. "
        'See <a href="ATTRIBUTION.html">attribution and licence</a>.</p>'
        f"<ol>{items}</ol>"
    )
    if gone:
        body += f"<h2>Not available</h2><p>These pages were deleted or moved.</p><ul>{gone}</ul>"
    return _page(name, body)


def attribution_html(name: str, wiki: str, articles: list[BundleArticle], site_url: str) -> str:
    rows = "".join(
        f'<li><a href="{escape(wiki_url(wiki, a.title))}">{escape(a.title)}</a> '
        f'(<a href="https://{wiki}/w/index.php?title={quote(a.title.replace(" ", "_"))}'
        '&amp;action=history">authors</a>)</li>'
        for a in articles
    )
    body = (
        "<h1>Attribution</h1>"
        f"<p>The articles in this bundle are copied from {escape(wiki)}. Their text is "
        f'available under the <a href="{LICENSE_URL}">Creative Commons Attribution-ShareAlike '
        "4.0</a> licence; the authors of each article are listed in its history. Images are "
        "linked, not included, and carry their own licences on Wikimedia Commons.</p>"
        f'<p>Bundle "{escape(name)}" made with <a href="{escape(site_url)}">OfflineShelf</a>.</p>'
        f"<ul>{rows}</ul>"
    )
    return _page(f"Attribution: {name}", body)


def write_bundle(
    path: Path,
    *,
    name: str,
    wiki: str,
    built: datetime | None,
    site_url: str,
    articles: list[BundleArticle],
    fetch: Callable[[BundleArticle], str | None],
    on_progress: Callable[[int], None] | None = None,
) -> BundleResult:
    """Write a zip with one HTML file per article, an index and an attribution page.

    `fetch` returns None for a page that no longer exists; it is listed as not available.
    Articles are fetched and written one at a time, so memory stays flat.
    """
    local = {a.title: a.page_id for a in articles}
    missing: set[str] = set()
    written = 0
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for i, article in enumerate(articles, start=1):
            html = fetch(article)
            if html is None:
                missing.add(article.title)
            else:
                zf.writestr(
                    f"articles/{article_file(article.page_id)}",
                    rewrite_html(html, wiki, local, article),
                )
                written += 1
            if on_progress is not None:
                on_progress(i)
        zf.writestr("index.html", index_html(name, wiki, built, articles, missing))
        zf.writestr("ATTRIBUTION.html", attribution_html(name, wiki, _sorted(articles), site_url))
    return BundleResult(written=written, missing=sorted(missing))


def _sorted(articles: Iterable[BundleArticle]) -> list[BundleArticle]:
    return sorted(articles, key=lambda a: a.title)
