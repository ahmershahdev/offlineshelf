import pytest

from app.contract import Limits, TopArticle
from app.core import builders
from app.core.builders import REGISTRY, category, pageviews, pasted, wikidata
from tests.core.fakes import FakeWiki, article, page

LIMITS = Limits(max_articles=100_000, max_category_depth=5)


def titles(result) -> list[str]:
    return [p.title for p in result.articles]


def test_registry_has_every_builder() -> None:
    assert set(REGISTRY) == {"pasted", "category", "wikidata", "pageviews"}


class TestPasted:
    def wiki(self) -> FakeWiki:
        return FakeWiki(
            pages={
                "Physics": article(1, "Physics"),
                "Albert Einstein": article(2, "Albert Einstein"),
                "United Kingdom": article(3, "United Kingdom"),
                "Portal:Physics": page(4, "Portal:Physics", 100, 40),
            },
            normalized={"Uk": "UK"},
            redirects={
                "UK": "United Kingdom",
                "Britain": "United Kingdom",
                "Albert einstein": "Albert Einstein",
            },
            invalid={"Talk:"},
            special={"Special:Search"},
        )

    def test_builds_in_order_and_reports_every_outcome(self) -> None:
        params = {
            "titles": [
                "physics",
                "Physics",
                "albert_einstein",
                "Albert Einstein",
                "UK",
                "Britain",
                "Gone page",
                "Talk:",
                "Portal:Physics",
                "Special:Search",
                " _ ",
            ]
        }
        result = pasted(self.wiki(), params, LIMITS)
        assert titles(result) == ["Physics", "Albert Einstein", "United Kingdom"]
        assert result.report == {
            "input": 11,
            "found": 3,
            "redirected": 3,
            "duplicates": 1,
            "invalid": [" _ ", "Talk:"],
            "missing": ["Gone page"],
            "not_articles": ["Special:Search", "Portal:Physics"],
        }

    def test_normalised_spellings_are_followed_before_redirects(self) -> None:
        result = pasted(self.wiki(), {"titles": ["uk"]}, LIMITS)
        assert titles(result) == ["United Kingdom"]
        assert result.report["redirected"] == 1

    def test_wiktionary_keeps_lowercase_titles(self) -> None:
        wiki = FakeWiki(wiki="en.wiktionary.org", pages={"apple": article(9, "apple")})
        assert titles(pasted(wiki, {"titles": ["apple"]}, LIMITS)) == ["apple"]

    def test_stops_one_past_the_limit(self) -> None:
        wiki = FakeWiki(pages={f"T{i}": article(i, f"T{i}") for i in range(1, 11)})
        result = pasted(wiki, {"titles": [f"T{i}" for i in range(1, 11)]}, Limits(3, 5))
        assert len(list(result.articles)) == 4

    def test_long_reports_keep_a_sample_and_a_total(self, monkeypatch) -> None:
        monkeypatch.setattr(builders, "REPORT_SAMPLE", 2)
        result = pasted(FakeWiki(), {"titles": ["A", "B", "C", "D"]}, LIMITS)
        list(result.articles)
        assert result.report["missing"] == ["A", "B"]
        assert result.report["missing_total"] == 4

    def test_titles_are_looked_up_in_groups(self, monkeypatch) -> None:
        monkeypatch.setattr(builders, "LOOKUP_GROUP", 120)
        wiki = FakeWiki(pages={f"T{i}": article(i, f"T{i}") for i in range(1, 301)})
        result = pasted(wiki, {"titles": [f"T{i}" for i in range(1, 301)]}, LIMITS)
        assert len(list(result.articles)) == 300
        group = ["query_pages:50", "query_pages:50", "query_pages:20"]
        assert wiki.calls == [*group, *group, "query_pages:50", "query_pages:10"]

    def test_bad_params_are_refused(self) -> None:
        with pytest.raises(TypeError, match="titles"):
            pasted(FakeWiki(), {"titles": "Physics"}, LIMITS)
        with pytest.raises(TypeError, match="titles"):
            pasted(FakeWiki(), {"titles": [1]}, LIMITS)


class TestCategory:
    def wiki(self) -> FakeWiki:
        return FakeWiki(
            pages={t: article(i, t) for i, t in enumerate(["V1", "V2", "P1", "P2", "Deep"], 1)},
            members={
                "Vaccines": [page(1, "V1"), page(2, "V2")],
                "Polio vaccines": [page(3, "P1"), page(2, "V2"), page(4, "P2")],
                "Deeper": [page(5, "Deep")],
            },
            subcats={
                "Vaccines": [page(10, "Category:Polio vaccines", 14)],
                "Polio vaccines": [
                    page(11, "Kategorie:Deeper", 14),
                    page(12, "Category:Vaccines", 14),
                ],
                "Deeper": [page(10, "Category:Polio vaccines", 14)],
            },
        )

    def test_walks_breadth_first_once_per_category_and_article(self) -> None:
        wiki = self.wiki()
        result = category(wiki, {"category": "category:vaccines", "depth": 5}, LIMITS)
        built = list(result.articles)
        assert [p.title for p in built] == ["V1", "V2", "P1", "P2", "Deep"]
        assert all(p.revision_id for p in built)
        assert result.report == {
            "categories_visited": 3,
            "depth_reached": 2,
            "loops_skipped": 2,
            "found": 5,
        }
        assert "page:Deeper" in wiki.calls

    def test_depth_zero_takes_only_direct_members(self) -> None:
        wiki = self.wiki()
        result = category(wiki, {"category": "Vaccines", "depth": 0}, LIMITS)
        assert titles(result) == ["V1", "V2"]
        assert "subcat:Vaccines" not in wiki.calls

    def test_depth_is_capped_by_the_limit(self) -> None:
        result = category(self.wiki(), {"category": "Vaccines", "depth": 5}, Limits(100, 1))
        assert titles(result) == ["V1", "V2", "P1", "P2"]
        assert result.report["depth_reached"] == 1

    def test_stops_walking_once_past_the_article_limit(self) -> None:
        wiki = self.wiki()
        result = category(wiki, {"category": "Vaccines", "depth": 5}, Limits(1, 5))
        assert len(list(result.articles)) == 2
        assert "page:Polio vaccines" not in wiki.calls

    def test_members_deleted_since_listing_are_reported(self) -> None:
        wiki = self.wiki()
        wiki.pages = {"V1": article(1, "V1")}
        result = category(wiki, {"category": "Vaccines"}, LIMITS)
        assert titles(result) == ["V1"]
        assert result.report["missing"] == ["V2"]

    def test_wiktionary_category_names_keep_their_case(self) -> None:
        wiki = FakeWiki(
            wiki="en.wiktionary.org",
            members={"nouns": [page(1, "cat")]},
            pages={"cat": article(1, "cat")},
        )
        assert titles(category(wiki, {"category": "nouns", "depth": 0}, LIMITS)) == ["cat"]

    def test_bad_depth_is_refused(self) -> None:
        with pytest.raises(TypeError, match="depth"):
            category(self.wiki(), {"category": "Vaccines", "depth": "2"}, LIMITS)


def test_wikidata_maps_items_to_articles_and_reports_gaps() -> None:
    entity = "http://www.wikidata.org/entity/"
    wiki = FakeWiki(
        rows=[
            {"item": f"{entity}Q1", "label": "Indus"},
            {"river": f"{entity}Q2"},
            {"item": f"{entity}Q1"},
            {"item": "Indus", "other": f"{entity}Q3"},
            {"label": "no entity here"},
            {"item": f"{entity}P31"},
        ],
        links={"Q1": "Indus River", "Q2": "Ravi River"},
        pages={"Indus River": article(1, "Indus River"), "Ravi River": article(2, "Ravi River")},
    )
    result = wikidata(wiki, {"sparql": "SELECT ?item WHERE {}"}, LIMITS)
    assert titles(result) == ["Indus River", "Ravi River"]
    assert result.report == {
        "rows": 6,
        "items": 3,
        "with_article": 2,
        "without_article": 1,
        "items_without_article": ["Q3"],
        "found": 2,
    }


class TestPageviews:
    def test_drops_the_main_page_and_non_articles_and_takes_the_top_n(self) -> None:
        wiki = FakeWiki(
            top=[
                TopArticle("Main Page", 9000, 1),
                TopArticle("Special:Search", 8000, 2),
                TopArticle("Wikipedia:Featured pictures", 7000, 3),
                TopArticle("Taylor Swift", 6000, 4),
                TopArticle("Cricket", 5000, 5),
                TopArticle("Chess", 4000, 6),
            ],
            special={"Special:Search"},
            pages={
                "Wikipedia:Featured pictures": page(7, "Wikipedia:Featured pictures", 4, 70),
                "Taylor Swift": article(1, "Taylor Swift"),
                "Cricket": article(2, "Cricket"),
                "Chess": article(3, "Chess"),
            },
        )
        result = pageviews(wiki, {"year": 2026, "month": 8, "limit": 2}, LIMITS)
        assert titles(result) == ["Taylor Swift", "Cricket"]
        assert result.report == {
            "month": "2026-08",
            "found": 2,
            "skipped": ["Main Page"],
            "not_articles": ["Special:Search", "Wikipedia:Featured pictures"],
        }
        assert wiki.calls[0] == "top:2026-8"

    def test_bad_params_are_refused(self) -> None:
        with pytest.raises(TypeError, match="limit"):
            pageviews(FakeWiki(), {"year": 2026, "month": 8}, LIMITS)
