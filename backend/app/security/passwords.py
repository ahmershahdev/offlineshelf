from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# argon2-cffi defaults follow RFC 9106's second recommended profile (argon2id, 64 MiB, t=3, p=4).
# 64 MiB per hash means login and register must stay rate limited, or they become a memory DoS.
_hasher = PasswordHasher()

# Verifying against this when the email is unknown keeps the response time the same, so timing
# does not reveal which addresses have accounts.
_DUMMY_HASH = _hasher.hash("offlineshelf-dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)
