import pytest
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import ShelfList, User

CATEGORY_LIST = {
    "name": "Physics",
    "wiki": "en.wikipedia.org",
    "params": {"kind": "category", "category": "Physics", "depth": 2},
}


def test_lists_need_sign_in(api) -> None:
    assert api.get("/api/v1/lists").status_code == 401


def test_create_show_delete(signed_in) -> None:
    resp = signed_in.send("POST", "/api/v1/lists", CATEGORY_LIST)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["builder"] == "category"
    assert body["params"] == {"category": "Physics", "depth": 2}
    assert body["latest_status"] is None
    assert resp.headers["Location"] == f"/api/v1/lists/{body['id']}"

    assert signed_in.get(f"/api/v1/lists/{body['id']}").get_json()["name"] == "Physics"
    assert signed_in.send("DELETE", f"/api/v1/lists/{body['id']}").status_code == 204
    assert signed_in.get(f"/api/v1/lists/{body['id']}").status_code == 404


@pytest.mark.parametrize(
    "wiki",
    [
        "evil.example.com",
        "en.wikipedia.org.evil.com",
        "www.wikidata.org",
        "en..wikipedia.org",
        "en.wikipedia.org/",
        "commons.wikimedia.org",
        "-en.wikipedia.org",
    ],
)
def test_wiki_host_must_be_on_allow_list(signed_in, wiki: str) -> None:
    resp = signed_in.send("POST", "/api/v1/lists", {**CATEGORY_LIST, "wiki": wiki})
    assert resp.status_code == 422


@pytest.mark.parametrize("wiki", ["ur.wikipedia.org", "zh-yue.wikipedia.org", "EN.Wikivoyage.org"])
def test_allowed_wikis(signed_in, wiki: str) -> None:
    resp = signed_in.send("POST", "/api/v1/lists", {**CATEGORY_LIST, "wiki": wiki})
    assert resp.status_code == 201
    assert resp.get_json()["wiki"] == wiki.lower()


@pytest.mark.parametrize(
    "params",
    [
        {"kind": "category", "category": "Physics", "depth": 99},
        {"kind": "category", "category": "A|B"},
        {"kind": "category", "category": "x" * 256},
        {"kind": "wikidata", "sparql": "x" * 10_001},
        {"kind": "pasted", "titles": []},
        {"kind": "pasted", "titles": ["ok", "bad<title>"]},
        {"kind": "pageviews", "year": 2020, "month": 13, "limit": 10},
        {"kind": "pageviews", "year": 2020, "month": 1, "limit": 100_000},
        {"kind": "nope"},
    ],
)
def test_limits_and_bad_params(signed_in, params: dict[str, object]) -> None:
    resp = signed_in.send("POST", "/api/v1/lists", {**CATEGORY_LIST, "params": params})
    assert resp.status_code == 422
    assert resp.mimetype == "application/problem+json"


def test_sql_metacharacters_are_stored_as_data(signed_in) -> None:
    name = "Robert'); DROP TABLE shelf_list;--"
    resp = signed_in.send("POST", "/api/v1/lists", {**CATEGORY_LIST, "name": name})
    assert resp.status_code == 201
    assert signed_in.get("/api/v1/lists").get_json()["items"][0]["name"] == name


def test_someone_elses_list_is_404(app, signed_in) -> None:
    list_id = signed_in.send("POST", "/api/v1/lists", CATEGORY_LIST).get_json()["id"]
    other = type(signed_in)(app.test_client())
    other.send(
        "POST",
        "/api/v1/auth/register",
        {"email": "other@example.org", "password": "another long password"},
    )
    assert other.get(f"/api/v1/lists/{list_id}").status_code == 404
    assert other.send("DELETE", f"/api/v1/lists/{list_id}").status_code == 404


def test_cursor_pagination(signed_in) -> None:
    for i in range(5):
        signed_in.send("POST", "/api/v1/lists", {**CATEGORY_LIST, "name": f"L{i}"})
    first = signed_in.get("/api/v1/lists?limit=2").get_json()
    assert [i["name"] for i in first["items"]] == ["L4", "L3"]
    second = signed_in.get(f"/api/v1/lists?limit=2&cursor={first['next_cursor']}").get_json()
    assert [i["name"] for i in second["items"]] == ["L2", "L1"]


def test_list_cap(app, signed_in, monkeypatch) -> None:
    monkeypatch.setattr(app.extensions["settings"], "max_lists_per_user", 1)
    assert signed_in.send("POST", "/api/v1/lists", CATEGORY_LIST).status_code == 201
    assert signed_in.send("POST", "/api/v1/lists", CATEGORY_LIST).status_code == 422


def test_non_json_body_rejected(signed_in) -> None:
    resp = signed_in.send(
        "POST", "/api/v1/lists", data="name=x", content_type="application/x-www-form-urlencoded"
    )
    assert resp.status_code == 415


def test_oversized_body_rejected(signed_in) -> None:
    resp = signed_in.send(
        "POST", "/api/v1/lists", data="x" * 1_100_000, content_type="application/json"
    )
    assert resp.status_code == 413


def test_deleting_a_user_deletes_their_lists(signed_in) -> None:
    signed_in.send("POST", "/api/v1/lists", CATEGORY_LIST)
    user = SessionLocal.scalars(select(User)).one()
    SessionLocal.delete(user)
    SessionLocal.commit()
    assert SessionLocal.scalar(select(func.count()).select_from(ShelfList)) == 0
