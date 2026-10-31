import re

# Only content wikis whose articles live in namespace 0 and can be exported. Wikidata is queried
# for item lists but is never itself the target wiki of a list.
_PROJECTS = (
    "wikipedia",
    "wiktionary",
    "wikibooks",
    "wikinews",
    "wikiquote",
    "wikisource",
    "wikiversity",
    "wikivoyage",
)
# Language subdomains are lowercase letters, digits and hyphens (for example "en", "zh-yue",
# "be-tarask", "simple"). The length cap keeps it far below DNS limits.
_HOST = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.(?:" + "|".join(_PROJECTS) + r")\.org$")


def is_allowed_wiki(host: str) -> bool:
    return len(host) <= 64 and _HOST.fullmatch(host) is not None
