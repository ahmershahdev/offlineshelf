from datetime import datetime

from libzim.reader import Archive  # type: ignore[import-untyped]

from app.bundle import BundleArticle
from app.zim import write_zim, zim_language, zim_name

WIKI = "en.wikipedia.org"


def test_language_and_name() -> None:
    assert zim_language("ur.wikipedia.org") == "urd"
    assert zim_language("simple.wikipedia.org") == "eng"
    assert zim_language("xx.wikipedia.org") == "und"
    assert zim_name("be-tarask.wikivoyage.org", 7) == "offlineshelf_wikivoyage_be-tarask_list7"


def test_writes_a_zim_that_kiwix_can_open(tmp_path) -> None:
    articles = [
        BundleArticle(1, "Polio vaccine", 10),
        BundleArticle(2, "Gone page", None),
        BundleArticle(3, "Vaccine", 30),
    ]

    def fetch(a: BundleArticle) -> str | None:
        if a.title == "Gone page":
            return None
        return f'<html><head></head><body><p>{a.title}</p><a href="./Vaccine">v</a></body></html>'

    path = tmp_path / "list.zim"
    result = write_zim(
        path,
        list_id=12,
        name="A rather long list name for vaccines in rural clinics",
        wiki=WIKI,
        built=datetime(2026, 11, 1, 12),
        site_url="https://offlineshelf.ahmershah.dev",
        articles=articles,
        fetch=fetch,
    )
    assert result.written == 2
    assert result.missing == ["Gone page"]

    zim = Archive(str(path))
    assert zim.main_entry.get_item().path == "index.html"
    assert zim.get_metadata("Language").decode() == "eng"
    assert zim.get_metadata("Name").decode() == "offlineshelf_wikipedia_en_list12"
    assert len(zim.get_metadata("Title").decode()) <= 30
    assert zim.get_metadata("Date").decode() == "2026-11-01"
    assert zim.get_metadata("License").decode() == "CC BY-SA 4.0"
    assert zim.has_illustration(48)

    page = bytes(zim.get_entry_by_path("articles/1.html").get_item().content).decode()
    assert 'href="3.html"' in page
    assert "CC BY-SA 4.0" in page
    assert zim.get_entry_by_path("articles/1.html").title == "Polio vaccine"
    assert zim.has_entry_by_path("ATTRIBUTION.html")
    assert not zim.has_entry_by_path("articles/2.html")
    assert zim.has_fulltext_index
