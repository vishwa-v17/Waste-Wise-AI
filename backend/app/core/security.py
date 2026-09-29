import re
import xml.sax.saxutils
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt
import bcrypt
from app.core.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        return None

# --- Sanitization & Security Helpers ---

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

def sanitize_csv_cell(value: Any) -> str:
    """
    Prevents CSV Formula Injection (DDE / Spreadsheet command injection).
    If a text cell starts with dangerous formula operators (=, +, -, @),
    it is prepended with a single quote (') to render as literal text.
    """
    if value is None:
        return ""
    str_val = str(value).strip()
    if str_val.startswith(FORMULA_PREFIXES):
        return "'" + str_val
    return str_val

def escape_xml_text(value: Any) -> str:
    """
    Escapes special XML characters (<, >, &, \", ') for safe inclusion
    in ReportLab Paragraph markup.
    """
    if value is None:
        return ""
    return xml.sax.saxutils.escape(str(value))

BARCODE_REGEX = re.compile(r"^[0-9A-Za-z_-]{3,32}$")

def is_valid_barcode(code: str) -> bool:
    """Validates barcode format to prevent path traversal or SSRF manipulation."""
    if not code:
        return False
    return bool(BARCODE_REGEX.match(code.strip()))
