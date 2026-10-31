"""Tiny JSON-over-HTTP helper on the standard library, so the package has no dependencies."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional


class HTTPError(Exception):
    def __init__(self, status: int, body: Any, url: str):
        self.status, self.body, self.url = status, body, url
        msg = body.get("error") if isinstance(body, dict) and body.get("error") else body
        super().__init__(f"HTTP {status} from {url}: {msg}")


def request(method: str, url: str, body: Any = None, params: Optional[dict] = None,
            headers: Optional[dict] = None, timeout: float = 30) -> Any:
    if params:
        clean = {k: v for k, v in params.items() if v is not None}
        if clean:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(clean)
    data = None
    h = {"accept": "application/json", **(headers or {})}
    if body is not None:
        data = json.dumps(body).encode()
        h["content-type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode() or "null"
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except ValueError:
            parsed = raw
        raise HTTPError(e.code, parsed, url) from None
