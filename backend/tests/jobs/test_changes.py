from app.contract import BuildResult, Page
from tests.jobs.test_build import create_list, work


def pages(*ids: int) -> list[Page]:
    return [Page(page_id=i, title=f"Article {i}", namespace=0, revision_id=i * 10) for i in ids]


def build(client, redis, builder, list_id: int, result) -> dict:
    builder.result = result
    assert client.send("POST", f"/api/v1/lists/{list_id}/build").status_code == 202
    work(redis)
    return client.get(f"/api/v1/lists/{list_id}/versions?limit=1").get_json()["items"][0]


def changes(client, list_id: int, version_id: int, query: str = ""):
    return client.get(f"/api/v1/lists/{list_id}/versions/{version_id}/changes{query}")


def test_each_version_counts_what_changed_since_the_last_good_one(
    signed_in, redis, builder
) -> None:
    list_id = create_list(signed_in)
    first = build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(1, 2, 3)))
    assert (first["previous_version_id"], first["added_count"], first["removed_count"]) == (
        None,
        None,
        None,
    )
    failed = build(signed_in, redis, builder, list_id, lambda: RuntimeError("boom"))
    assert failed["status"] == "failed"
    third = build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(2, 3, 4, 5)))
    assert third["previous_version_id"] == first["id"]
    assert (third["added_count"], third["removed_count"]) == (2, 1)

    added = changes(signed_in, list_id, third["id"]).get_json()
    assert [a["title"] for a in added["items"]] == ["Article 4", "Article 5"]
    removed = changes(signed_in, list_id, third["id"], "?kind=removed").get_json()
    assert [a["page_id"] for a in removed["items"]] == [1]


def test_changes_page_through(signed_in, redis, builder) -> None:
    list_id = create_list(signed_in)
    build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(1)))
    latest = build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(1, 2, 3, 4)))
    one = changes(signed_in, list_id, latest["id"], "?limit=2").get_json()
    assert [a["page_id"] for a in one["items"]] == [2, 3]
    two = changes(signed_in, list_id, latest["id"], f"?limit=2&cursor={one['next_cursor']}")
    assert [a["page_id"] for a in two.get_json()["items"]] == [4]
    assert two.get_json()["next_cursor"] is None


def test_changes_need_an_earlier_version_and_a_known_kind(app, signed_in, redis, builder) -> None:
    list_id = create_list(signed_in)
    first = build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(1)))
    resp = changes(signed_in, list_id, first["id"])
    assert resp.status_code == 404
    assert "earlier version" in resp.get_json()["detail"]
    second = build(signed_in, redis, builder, list_id, lambda: BuildResult(pages(2)))
    assert changes(signed_in, list_id, second["id"], "?kind=moved").status_code == 422

    other = type(signed_in)(app.test_client())
    other.send(
        "POST",
        "/api/v1/auth/register",
        {"email": "other@example.org", "password": "another long password"},
    )
    assert changes(other, list_id, second["id"]).status_code == 404
