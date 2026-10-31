from app.security.passwords import hash_password, needs_rehash, verify_password


def test_hash_and_verify() -> None:
    h = hash_password("a long passphrase")
    assert verify_password(h, "a long passphrase")
    assert not verify_password(h, "a long passphrasE")
    assert not needs_rehash(h)


def test_missing_or_broken_hash_never_verifies() -> None:
    assert not verify_password(None, "offlineshelf-dummy-password")
    assert not verify_password("not-a-hash", "anything")
