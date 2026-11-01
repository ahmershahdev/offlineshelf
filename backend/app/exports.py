from collections.abc import Iterable, Iterator
from datetime import UTC, datetime

LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
TSV_COLUMNS = ("title", "page_id", "revision_id")


def tsv_header(name: str, wiki: str, built: datetime | None, site_url: str) -> str:
    # MediaWiki titles can never start with "#", so comment lines can't be mistaken for rows.
    stamp = built.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z") if built else "unknown"
    lines = [
        f"# {' '.join(name.split())}",
        f"# Titles and IDs from https://{wiki}/ as of {stamp}",
        f"# Content by {wiki} contributors, licensed CC BY-SA 4.0: {LICENSE_URL}",
        f"# Made with OfflineShelf: {site_url}",
        "\t".join(TSV_COLUMNS),
    ]
    return "\n".join(lines) + "\n"


def tsv_rows(rows: Iterable[tuple[str, int, int | None]]) -> Iterator[str]:
    for title, page_id, revision_id in rows:
        yield f"{title}\t{page_id}\t{'' if revision_id is None else revision_id}\n"
