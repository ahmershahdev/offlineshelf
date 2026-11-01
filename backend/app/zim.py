import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from libzim.writer import Creator, Hint, Item, StringProvider  # type: ignore[import-untyped]

from app.bundle import BundleResult, write_pages

ILLUSTRATION = Path(__file__).parent / "assets" / "zim-icon-48.png"

# ZIM metadata wants ISO 639-3 codes; wiki hosts use Wikimedia's (mostly ISO 639-1) codes.
# Unlisted languages fall back to "und" (undetermined), which Kiwix accepts.
LANGUAGES = {
    "ar": "ara",
    "bn": "ben",
    "de": "deu",
    "en": "eng",
    "es": "spa",
    "fa": "fas",
    "fr": "fra",
    "ha": "hau",
    "hi": "hin",
    "id": "ind",
    "it": "ita",
    "ja": "jpn",
    "pa": "pan",
    "ps": "pus",
    "pt": "por",
    "ru": "rus",
    "simple": "eng",
    "sw": "swa",
    "tr": "tur",
    "ur": "urd",
    "yo": "yor",
    "zh": "zho",
}
# Kiwix library limits, from the ZIM metadata spec (openzim.org/wiki/Metadata).
TITLE_MAX = 30
DESCRIPTION_MAX = 80


def zim_language(wiki: str) -> str:
    return LANGUAGES.get(wiki.split(".", 1)[0], "und")


def zim_name(wiki: str, list_id: int) -> str:
    lang, _, rest = wiki.partition(".")
    project = rest.split(".", 1)[0]
    return re.sub(r"[^a-z0-9_-]", "", f"offlineshelf_{project}_{lang}_list{list_id}".lower())


class _Page(Item):  # type: ignore[misc]
    def __init__(self, path: str, title: str, html: str, front: bool) -> None:
        super().__init__()
        self._path, self._title, self._html, self._front = path, title, html, front

    def get_path(self) -> str:
        return self._path

    def get_title(self) -> str:
        return self._title

    def get_mimetype(self) -> str:
        return "text/html"

    def get_contentprovider(self) -> StringProvider:
        return StringProvider(self._html)

    def get_hints(self) -> dict[Any, bool]:
        return {Hint.FRONT_ARTICLE: self._front}


class ZimSink:
    def __init__(self, creator: Creator) -> None:
        self.creator = creator

    def add(self, path: str, title: str, html: str, *, article: bool) -> None:
        self.creator.add_item(_Page(path, title, html, article))


def write_zim(path: Path, *, list_id: int, **pages: Any) -> BundleResult:
    """Write the same pages as the HTML bundle into one ZIM file for the Kiwix apps.

    The paths match the bundle (index.html, articles/<page_id>.html), so the links that
    rewrite_html produces work unchanged inside the ZIM.
    """
    wiki: str = pages["wiki"]
    name: str = pages["name"]
    language = zim_language(wiki)
    built: datetime | None = pages.get("built")
    with Creator(str(path)).config_indexing(True, language) as creator:
        creator.set_mainpath("index.html")
        creator.add_illustration(48, ILLUSTRATION.read_bytes())
        for key, value in {
            "Name": zim_name(wiki, list_id),
            "Title": name[:TITLE_MAX],
            "Description": f"{name}: Wikipedia articles from {wiki}"[:DESCRIPTION_MAX],
            "Language": language,
            "Creator": f"{wiki} contributors",
            "Publisher": "OfflineShelf",
            "Date": (built or datetime.now(UTC)).strftime("%Y-%m-%d"),
            "Source": f"https://{wiki}/",
            "License": "CC BY-SA 4.0",
            "Tags": "wikipedia;_category:wikipedia;_pictures:no;_videos:no",
        }.items():
            creator.add_metadata(key, value)
        return write_pages(ZimSink(creator), **pages)
