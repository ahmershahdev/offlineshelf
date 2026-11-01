import json
import zipfile
from datetime import datetime

from app.bundle import BundleArticle, rewrite_html, wiki_url, write_bundle
from tests.wiki.recorded import RECORDINGS

WIKI = "en.wikipedia.org"
KIWIX = BundleArticle(page_id=31427769, title="Kiwix", revision_id=1375425456)


def kiwix_html() -> str:
    exchanges = json.loads((RECORDINGS / "page_html.json").read_text("utf-8"))
    return str(exchanges[0]["response"]["text"])


def test_rewrites_recorded_parsoid_html_for_offline_use() -> None:
    out = rewrite_html(kiwix_html(), WIKI, {"Kiwix": 1, "Windows 11": 5}, KIWIX)
    assert "<base" not in out
    assert 'href="./' not in out
    assert '="//' not in out
    assert ", //" not in out
    assert 'href="/w/' not in out
    assert 'href="5.html"' in out
    assert 'href="https://en.wikipedia.org/w/load.php' in out
    assert 'src="https://thumb.wikimedia.org/' in out
    assert "https://en.wikipedia.org/w/index.php?oldid=1375425456" in out
    assert "CC BY-SA 4.0" in out
    assert out.index("<style>") < out.index("</head>")
    assert out.rstrip().endswith("</html>")


def test_links_keep_fragments_and_unknown_pages_go_to_the_wiki() -> None:
    html = (
        '<html><head><base href="//en.wikipedia.org/wiki/"/></head><body>'
        '<a rel="mw:WikiLink" href="./Polio_vaccine#History">a</a>'
        '<a rel="mw:WikiLink" href="./A%3FB">b</a>'
        '<a href="./Not_bundled#Top">c</a>'
        '<img srcset="//x.org/a.png 1.5x, //x.org/b.png 2x" src="//x.org/c.png"/>'
        "<script>alert(1)</script></body></html>"
    )
    out = rewrite_html(html, WIKI, {"Polio vaccine": 7, "A?B": 8}, KIWIX)
    assert 'href="7.html#History"' in out
    assert 'href="8.html"' in out
    assert 'href="https://en.wikipedia.org/wiki/Not_bundled#Top"' in out
    assert 'srcset="https://x.org/a.png 1.5x, https://x.org/b.png 2x"' in out
    assert "<script" not in out


def test_scripts_are_removed_in_every_spelling() -> None:
    html = (
        "<p>a</p><script>x()</script\t\n bar><p>b</p>"
        '<SCRIPT type="module">y()</SCRIPT ><p>c</p><script>never closed'
    )
    out = rewrite_html(html, WIKI, {}, KIWIX)
    assert "script" not in out.lower()
    assert "<p>a</p><p>b</p><p>c</p>" in out


def test_footer_without_body_tag_and_without_revision() -> None:
    out = rewrite_html("<p>x</p>", WIKI, {}, BundleArticle(1, "AC/DC", None))
    assert out.endswith("</footer>")
    assert 'href="https://en.wikipedia.org/wiki/AC/DC"' in out


def test_wiki_url() -> None:
    assert wiki_url("de.wikipedia.org", "Köln Hbf") == "https://de.wikipedia.org/wiki/K%C3%B6ln_Hbf"


def test_writes_a_zip_with_index_and_attribution(tmp_path) -> None:
    articles = [KIWIX, BundleArticle(2, "Gone page", 9), BundleArticle(3, "Zim <format>", None)]
    progress: list[int] = []

    def fetch(a: BundleArticle) -> str | None:
        return None if a.title == "Gone page" else f"<html><body><p>{a.title}</p></body></html>"

    path = tmp_path / "bundle.zip"
    result = write_bundle(
        path,
        name="Offline <tools>",
        wiki=WIKI,
        built=datetime(2026, 11, 1, 12, 0),
        site_url="https://offlineshelf.ahmershah.dev",
        articles=articles,
        fetch=fetch,
        on_progress=progress.append,
    )
    assert result.written == 2
    assert result.missing == ["Gone page"]
    assert progress == [1, 2, 3]
    with zipfile.ZipFile(path) as zf:
        assert sorted(zf.namelist()) == [
            "ATTRIBUTION.html",
            "articles/3.html",
            "articles/31427769.html",
            "index.html",
        ]
        index = zf.read("index.html").decode()
        attribution = zf.read("ATTRIBUTION.html").decode()
    assert "<h1>Offline &lt;tools&gt;</h1>" in index
    assert "2 articles from en.wikipedia.org, as of 2026-11-01 12:00 UTC" in index
    assert 'href="articles/31427769.html"' in index
    assert "Not available" in index
    assert "Gone page" in index
    assert "Zim &lt;format&gt;" in attribution
    assert "action=history" in attribution
    assert attribution.index("Gone page") < attribution.index("Kiwix")
