"""Tests for the Galaxy Store, AppGallery and Xiaomi GetApps uploads (roadmap 35, 36, 42), against a mocked store API.

Run: python3 -m unittest discover build/tests
"""
import base64
import hashlib
import importlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))


class MockStore:
    """A local HTTP server that answers with canned JSON per (method, path) and records the requests."""

    def __init__(self, routes):
        self.routes = routes
        self.requests = []
        store = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def handle_any(self):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                path, _, query = self.path.partition("?")
                store.requests.append({"method": self.command, "path": path, "query": query, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
                answer = store.routes.get((self.command, path))
                if callable(answer):
                    answer = answer(store)
                status, payload = answer if isinstance(answer, tuple) else (200, answer)
                if answer is None:
                    status, payload = 404, {"error": {"code": "not_found"}}
                raw = b"" if payload is None else json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            do_GET = do_POST = do_PUT = do_DELETE = handle_any

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()

    def paths(self):
        return [(r["method"], r["path"]) for r in self.requests]

    def json(self, method, path):
        return json.loads(next(r["body"] for r in self.requests if (r["method"], r["path"]) == (method, path)))


def load(module, env):
    with mock.patch.dict(os.environ, env):
        if module in sys.modules:
            return importlib.reload(sys.modules[module])
        return importlib.import_module(module)


def apk(tmp):
    path = Path(tmp) / "app-release.apk"
    path.write_bytes(b"PK\x03\x04 a tiny apk")
    return str(path)


@unittest.skipUnless(shutil.which("openssl"), "openssl missing")
class GalaxyStoreTest(unittest.TestCase):
    SECRET_KEY_MARK = "PRIVATE KEY"

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        key = Path(cls.tmp) / "key.pem"
        subprocess.run(["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", str(key)], check=True, capture_output=True)
        cls.private_key = key.read_text()
        public = Path(cls.tmp) / "public.pem"
        subprocess.run(["openssl", "pkey", "-in", str(key), "-pubout", "-out", str(public)], check=True, capture_output=True)
        cls.public_key = public

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def credentials(self):
        return {"content_id": "000001234567", "service_account_id": "sa-123456", "private_key": self.private_key}

    def server(self, status="FOR_SALE", binary_code="0000"):
        store = MockStore({})
        store.routes.update({
            ("POST", "/auth/accessToken"): {"ok": True, "createdItem": {"accessToken": "access-abc", "scopes": ["publishing"]}},
            ("GET", "/seller/contentInfo"): [{"contentId": "000001234567", "contentStatus": status, "defaultLanguageCode": "ENG", "paid": "N", "usExportLaws": True}],
            ("POST", "/seller/createUploadSessionId"): lambda s: {"url": f"{s.url}/galaxyapi/fileUpload", "sessionId": "session-1"},
            ("POST", "/galaxyapi/fileUpload"): {"fileKey": "file-key-1", "fileName": "app-release.apk", "fileSize": "15"},
            ("POST", "/seller/contentUpdate"): {"ctntId": "000001234567", "contentStatus": "UPDATING"},
            ("POST", "/seller/v2/content/binary"): {"resultCode": binary_code, "resultMessage": "Ok"},
            ("POST", "/seller/contentSubmit"): (204, None),
        })
        self.addCleanup(store.close)
        return store

    def test_signs_in_uploads_adds_the_binary_and_submits(self):
        store = self.server()
        galaxy = load("galaxy_store", {"GALAXY_API_URL": store.url})
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual("000001234567", galaxy.publish(self.credentials(), apk(tmp), now=1_700_000_000))
        self.assertEqual(
            [
                ("POST", "/auth/accessToken"),
                ("GET", "/seller/contentInfo"),
                ("POST", "/seller/createUploadSessionId"),
                ("POST", "/galaxyapi/fileUpload"),
                ("POST", "/seller/contentUpdate"),
                ("POST", "/seller/v2/content/binary"),
                ("POST", "/seller/contentSubmit"),
            ],
            store.paths(),
        )
        # The JWT: RS256, the service account as issuer, the publishing scope, 20 minutes.
        jwt = store.requests[0]["headers"]["authorization"].removeprefix("Bearer ")
        header, claims, signature = jwt.split(".")
        pad = lambda s: base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))  # noqa: E731
        self.assertEqual({"alg": "RS256", "typ": "JWT"}, json.loads(pad(header)))
        self.assertEqual({"iss": "sa-123456", "scopes": ["publishing"], "iat": 1_700_000_000, "exp": 1_700_001_200}, json.loads(pad(claims)))
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "sig").write_bytes(pad(signature))
            (Path(tmp) / "msg").write_bytes(f"{header}.{claims}".encode())
            verified = subprocess.run(
                ["openssl", "dgst", "-sha256", "-verify", str(self.public_key), "-signature", str(Path(tmp) / "sig"), str(Path(tmp) / "msg")],
                capture_output=True,
            )
        self.assertEqual(0, verified.returncode, verified.stdout)
        # Every call after signing in carries the token and the service account.
        for req in store.requests[1:]:
            self.assertEqual("Bearer access-abc", req["headers"]["authorization"])
            self.assertEqual("sa-123456", req["headers"]["service-account-id"])
        upload = store.requests[3]
        self.assertIn(b'name="sessionId"\r\n\r\nsession-1', upload["body"])
        self.assertIn(b'filename="app-release.apk"', upload["body"])
        self.assertIn(b"a tiny apk", upload["body"])
        self.assertEqual({"contentId": "000001234567", "filekey": "file-key-1", "gms": "Y"}, store.json("POST", "/seller/v2/content/binary"))
        self.assertEqual({"contentId": "000001234567", "defaultLanguageCode": "ENG", "paid": "N", "usExportLaws": True}, store.json("POST", "/seller/contentUpdate"))
        self.assertEqual({"contentId": "000001234567"}, store.json("POST", "/seller/contentSubmit"))

    def test_an_app_not_on_sale_is_not_touched(self):
        store = self.server(status="REGISTERING")
        galaxy = load("galaxy_store", {"GALAXY_API_URL": store.url})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(galaxy.StoreError) as raised:
            galaxy.publish(self.credentials(), apk(tmp))
        self.assertIn("published by hand in Seller Portal", str(raised.exception))
        self.assertEqual([("POST", "/auth/accessToken"), ("GET", "/seller/contentInfo")], store.paths())

    def test_a_refused_binary_is_not_submitted(self):
        store = self.server(binary_code="9999")
        galaxy = load("galaxy_store", {"GALAXY_API_URL": store.url})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(galaxy.StoreError):
            galaxy.publish(self.credentials(), apk(tmp))
        self.assertNotIn(("POST", "/seller/contentSubmit"), store.paths())

    def test_failures_never_print_secrets(self):
        store = self.server()
        store.routes[("POST", "/auth/accessToken")] = (401, {"error": {"code": "AUTH_FAILED", "message": "bad key sa-123456"}})
        galaxy = load("galaxy_store", {"GALAXY_API_URL": store.url})
        with tempfile.TemporaryDirectory() as tmp:
            secrets = Path(tmp) / "secrets.json"
            secrets.write_text(json.dumps({"galaxy_store": self.credentials()}))
            err, out = io.StringIO(), io.StringIO()
            with mock.patch.object(sys, "argv", ["galaxy_store.py", str(secrets), apk(tmp)]), redirect_stderr(err), redirect_stdout(out), self.assertRaises(SystemExit) as code:
                galaxy.main()
        self.assertEqual(1, code.exception.code)
        self.assertIn("signing in failed (HTTP 401, code AUTH_FAILED)", err.getvalue())
        for text in (err.getvalue(), out.getvalue()):
            self.assertNotIn(self.SECRET_KEY_MARK, text)
            self.assertNotIn("sa-123456", text)


class AppGalleryTest(unittest.TestCase):
    def credentials(self):
        return {"app_id": "104123456", "client_id": "client-777", "client_secret": "secret-xyz-0123456789"}

    def server(self, submit_codes=(0,)):
        codes = list(submit_codes)
        store = MockStore({})
        store.routes.update({
            ("POST", "/api/oauth2/v1/token"): {"access_token": "token-abc", "expires_in": 172799},
            ("GET", "/api/publish/v2/upload-url/for-obs"): lambda s: {
                "ret": {"code": 0, "msg": "success"},
                "urlInfo": {"objectId": "cn/104123456/app-release.apk", "url": f"{s.url}/obs/upload", "method": "PUT", "headers": {"x-amz-date": "20261015T000000Z", "Content-Type": "application/octet-stream"}},
            },
            ("PUT", "/obs/upload"): (200, None),
            ("PUT", "/api/publish/v2/app-file-info"): {"ret": {"code": 0, "msg": "success"}, "pkgVersion": ["1.0.1"]},
            ("POST", "/api/publish/v2/app-submit"): lambda s: {"ret": {"code": codes.pop(0) if len(codes) > 1 else codes[0], "msg": "x"}},
        })
        self.addCleanup(store.close)
        return store

    def test_gets_a_token_uploads_updates_the_file_and_submits(self):
        store = self.server()
        gallery = load("appgallery", {"APPGALLERY_API_URL": f"{self.server_url(store)}/api", "APPGALLERY_SUBMIT_WAIT": "0"})
        with tempfile.TemporaryDirectory() as tmp:
            path = apk(tmp)
            self.assertEqual("104123456", gallery.publish(self.credentials(), path))
        self.assertEqual(
            [
                ("POST", "/api/oauth2/v1/token"),
                ("GET", "/api/publish/v2/upload-url/for-obs"),
                ("PUT", "/obs/upload"),
                ("PUT", "/api/publish/v2/app-file-info"),
                ("POST", "/api/publish/v2/app-submit"),
            ],
            store.paths(),
        )
        self.assertEqual({"grant_type": "client_credentials", "client_id": "client-777", "client_secret": "secret-xyz-0123456789"}, store.json("POST", "/api/oauth2/v1/token"))
        url_request = store.requests[1]
        self.assertIn("appId=104123456", url_request["query"])
        self.assertIn("fileName=app-release.apk", url_request["query"])
        self.assertIn("contentLength=15", url_request["query"])
        self.assertEqual("Bearer token-abc", url_request["headers"]["authorization"])
        self.assertEqual("client-777", url_request["headers"]["client_id"])
        upload = store.requests[2]
        self.assertEqual(b"PK\x03\x04 a tiny apk", upload["body"])
        self.assertEqual("20261015T000000Z", upload["headers"]["x-amz-date"])
        self.assertNotIn("authorization", upload["headers"])
        self.assertEqual(
            {"fileType": 5, "files": [{"fileName": "app-release.apk", "fileDestUrl": "cn/104123456/app-release.apk"}]},
            store.json("PUT", "/api/publish/v2/app-file-info"),
        )
        self.assertIn("appId=104123456", store.requests[4]["query"])

    def test_submission_waits_while_huawei_parses_the_package(self):
        store = self.server(submit_codes=(204144660, 204144660, 0))
        gallery = load("appgallery", {"APPGALLERY_API_URL": f"{self.server_url(store)}/api"})
        waits = []
        with tempfile.TemporaryDirectory() as tmp:
            gallery.publish(self.credentials(), apk(tmp), sleep=waits.append)
        self.assertEqual(3, store.paths().count(("POST", "/api/publish/v2/app-submit")))
        self.assertEqual(2, len(waits))

    def test_gives_up_with_a_plain_message(self):
        store = self.server(submit_codes=(204144660,))
        gallery = load("appgallery", {"APPGALLERY_API_URL": f"{self.server_url(store)}/api", "APPGALLERY_SUBMIT_TRIES": "3"})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(gallery.StoreError) as raised:
            gallery.publish(self.credentials(), apk(tmp), sleep=lambda _: None)
        self.assertIn("submit it in AppGallery Connect", str(raised.exception))
        self.assertEqual(3, store.paths().count(("POST", "/api/publish/v2/app-submit")))

    def test_failures_never_print_secrets(self):
        store = self.server()
        store.routes[("PUT", "/api/publish/v2/app-file-info")] = {"ret": {"code": 204144647, "msg": "secret-xyz-0123456789 is wrong"}}
        gallery = load("appgallery", {"APPGALLERY_API_URL": f"{self.server_url(store)}/api"})
        with tempfile.TemporaryDirectory() as tmp:
            secrets = Path(tmp) / "secrets.json"
            secrets.write_text(json.dumps({"huawei_appgallery": self.credentials()}))
            err, out = io.StringIO(), io.StringIO()
            with mock.patch.object(sys, "argv", ["appgallery.py", str(secrets), apk(tmp)]), redirect_stderr(err), redirect_stdout(out), self.assertRaises(SystemExit) as code:
                gallery.main()
        self.assertEqual(1, code.exception.code)
        self.assertIn("adding the APK to the app failed (code 204144647)", err.getvalue())
        for text in (err.getvalue(), out.getvalue()):
            self.assertNotIn("secret-xyz", text)
            self.assertNotIn("token-abc", text)
        self.assertNotIn(("POST", "/api/publish/v2/app-submit"), store.paths())

    @staticmethod
    def server_url(store):
        return store.url


def form_parts(request):
    """The multipart fields of a recorded request: {name: (filename or None, bytes)}."""
    boundary = request["headers"]["content-type"].split("boundary=", 1)[1].encode()
    parts = {}
    for chunk in request["body"].split(b"--" + boundary):
        if not chunk.startswith(b"\r\n"):
            continue
        head, _, content = chunk[2:].partition(b"\r\n\r\n")
        disposition = head.split(b"\r\n")[0].decode()
        name = disposition.split('name="', 1)[1].split('"', 1)[0]
        filename = disposition.split('filename="', 1)[1].split('"', 1)[0] if 'filename="' in disposition else None
        parts[name] = (filename, content[:-2])
    return parts


@unittest.skipUnless(shutil.which("openssl"), "openssl missing")
class XiaomiGetAppsTest(unittest.TestCase):
    """42 Xiaomi GetApps' automatic publishing API, with a certificate of our own in place of Xiaomi's."""

    PASSWORD = "xiaomi-api-private-key-0123456789"

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.key = Path(cls.tmp) / "key.pem"
        cert = Path(cls.tmp) / "cert.pem"
        # Xiaomi's certificate is a 1024-bit RSA key: 117-byte blocks.
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:1024", "-nodes", "-keyout", str(cls.key), "-out", str(cert), "-days", "2", "-subj", "/CN=dev.xiaomi.test"],
            check=True,
            capture_output=True,
        )
        cls.certificate = cert.read_text()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def credentials(self):
        return {"user_name": "owner@academy.test", "password": self.PASSWORD, "public_certificate": self.certificate, "release_notes": "New courses and faster lessons."}

    def config(self, version_code=7):
        return {"app_name": "Academy", "android_package": "com.academy.app", "version_code": version_code}

    def server(self, query=None, push=None):
        store = MockStore({})
        store.routes.update({
            ("POST", "/devupload/dev/query"): query or {"result": 0, "packageInfo": {"appName": "Academy Online", "packageName": "com.academy.app", "versionCode": 6, "versionName": "1.0.5"}, "updateVersion": True},
            ("POST", "/devupload/dev/push"): push or {"result": 0, "message": "ok"},
        })
        self.addCleanup(store.close)
        return store

    def decrypt(self, sig_hex):
        """The SIG back to its JSON, block by block with the certificate's private key."""
        data = bytes.fromhex(sig_hex)
        self.assertEqual(0, len(data) % 128)
        plain = b""
        for start in range(0, len(data), 128):
            out = subprocess.run(
                ["openssl", "pkeyutl", "-decrypt", "-inkey", str(self.key), "-pkeyopt", "rsa_padding_mode:pkcs1"],
                input=data[start : start + 128],
                capture_output=True,
                check=True,
            )
            plain += out.stdout
        return json.loads(plain)

    def files(self, tmp):
        icon = Path(tmp) / "icon-512.png"
        icon.write_bytes(b"\x89PNG\r\n\x1a\n an icon")
        return apk(tmp), str(icon)

    def test_checks_the_app_then_uploads_and_submits(self):
        store = self.server()
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp:
            package, icon = self.files(tmp)
            listing = {"privacy_url": "https://academy.test/privacy"}
            self.assertEqual("com.academy.app", xiaomi.publish(self.credentials(), package, self.config(), icon, listing))
            apk_md5 = hashlib.md5(Path(package).read_bytes()).hexdigest()
            icon_md5 = hashlib.md5(Path(icon).read_bytes()).hexdigest()
        self.assertEqual([("POST", "/devupload/dev/query"), ("POST", "/devupload/dev/push")], store.paths())

        query = form_parts(store.requests[0])
        self.assertEqual({"RequestData", "SIG"}, set(query))
        self.assertEqual({"packageName": "com.academy.app", "userName": "owner@academy.test"}, json.loads(query["RequestData"][1]))
        sig = self.decrypt(query["SIG"][1].decode())
        self.assertEqual({"sig": [{"name": "RequestData", "hash": hashlib.md5(query["RequestData"][1]).hexdigest()}], "password": self.PASSWORD}, sig)

        push = form_parts(store.requests[1])
        self.assertEqual({"RequestData", "SIG", "apk", "icon"}, set(push))
        data = json.loads(push["RequestData"][1])
        self.assertEqual({"userName": "owner@academy.test", "synchroType": 1, "appInfo": data["appInfo"]}, data)
        # appInfo is a JSON string; the name already on the store is kept.
        self.assertEqual(
            {"appName": "Academy Online", "packageName": "com.academy.app", "updateDesc": "New courses and faster lessons.", "privacyUrl": "https://academy.test/privacy"},
            json.loads(data["appInfo"]),
        )
        self.assertEqual(("app-release.apk", b"PK\x03\x04 a tiny apk"), push["apk"])
        self.assertEqual("icon-512.png", push["icon"][0])
        # The signature covers RequestData and both files, longer than one RSA block.
        sig = self.decrypt(push["SIG"][1].decode())
        self.assertEqual(
            [
                {"name": "RequestData", "hash": hashlib.md5(push["RequestData"][1]).hexdigest()},
                {"name": "apk", "hash": apk_md5},
                {"name": "icon", "hash": icon_md5},
            ],
            sig["sig"],
        )
        self.assertEqual(self.PASSWORD, sig["password"])
        self.assertGreater(len(bytes.fromhex(push["SIG"][1].decode())), 128)

    def test_an_app_not_on_the_store_is_not_uploaded(self):
        store = self.server(query={"result": 0, "packageInfo": None})
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
            package, icon = self.files(tmp)
            xiaomi.publish(self.credentials(), package, self.config(), icon)
        self.assertIn("Submit the first version by hand", str(raised.exception))
        self.assertEqual([("POST", "/devupload/dev/query")], store.paths())

    def test_no_update_while_xiaomi_refuses_one_or_has_a_newer_version(self):
        for query, words in (
            ({"result": 0, "packageInfo": {"packageName": "com.academy.app", "versionCode": 6}, "updateVersion": False}, "doesn't take a new version"),
            ({"result": 0, "packageInfo": {"packageName": "com.academy.app", "versionCode": 7}, "updateVersion": True}, "already has version code 7"),
            ({"result": -7, "message": "owner@academy.test"}, "another Xiaomi developer account"),
        ):
            store = self.server(query=query)
            xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
            with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
                package, icon = self.files(tmp)
                xiaomi.publish(self.credentials(), package, self.config(), icon)
            self.assertIn(words, str(raised.exception))
            self.assertNotIn(("POST", "/devupload/dev/push"), store.paths())

    def test_the_query_waits_while_xiaomi_is_asked_too_often(self):
        answers = [{"result": -20035}, {"result": -20035}]

        def query(_):
            return answers.pop(0) if answers else {"result": 0, "packageInfo": {"packageName": "com.academy.app", "versionCode": 1}, "updateVersion": True}

        store = self.server(query=query)
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload", "XIAOMI_QUERY_WAITS": "1,2"})
        waits = []
        with tempfile.TemporaryDirectory() as tmp:
            package, icon = self.files(tmp)
            xiaomi.publish(self.credentials(), package, self.config(), icon, sleep=waits.append)
        self.assertEqual([1.0, 2.0], waits)
        self.assertEqual(3, store.paths().count(("POST", "/devupload/dev/query")))
        # The push itself is never sent twice.
        self.assertEqual(1, store.paths().count(("POST", "/devupload/dev/push")))

    def test_without_an_icon_nothing_is_sent(self):
        store = self.server()
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
            xiaomi.publish(self.credentials(), apk(tmp), self.config(), str(Path(tmp) / "missing.png"))
        self.assertIn("needs the app's icon", str(raised.exception))
        self.assertEqual([], store.paths())

    def test_failures_never_print_secrets(self):
        store = self.server(push={"result": -20014, "message": f"wrong password {self.PASSWORD} for owner@academy.test"})
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp:
            package, icon = self.files(tmp)
            secrets_path = Path(tmp) / "secrets.json"
            secrets_path.write_text(json.dumps({"xiaomi_getapps": self.credentials()}))
            config_path = Path(tmp) / "config.json"
            config_path.write_text(json.dumps(self.config()))
            err, out = io.StringIO(), io.StringIO()
            argv = ["xiaomi_getapps.py", str(secrets_path), package, str(config_path), icon, str(Path(tmp) / "no-store.json")]
            with mock.patch.object(sys, "argv", argv), redirect_stderr(err), redirect_stdout(out), self.assertRaises(SystemExit) as code:
                xiaomi.main()
        self.assertEqual(1, code.exception.code)
        self.assertIn("uploading the APK failed (result -20014). Xiaomi refused the API private key.", err.getvalue())
        for text in (err.getvalue(), out.getvalue()):
            self.assertNotIn(self.PASSWORD, text)
            self.assertNotIn("owner@academy.test", text)
            self.assertNotIn("BEGIN CERTIFICATE", text)

    def test_a_lost_answer_to_the_push_says_to_check_the_console(self):
        store = self.server()
        store.routes[("POST", "/devupload/dev/push")] = (502, None)
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
            package, icon = self.files(tmp)
            xiaomi.publish(self.credentials(), package, self.config(), icon)
        self.assertIn("uploading the APK failed (HTTP 502)", str(raised.exception))
        self.assertEqual(1, store.paths().count(("POST", "/devupload/dev/push")))
        store.close()
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
            package, icon = self.files(tmp)
            xiaomi.publish(self.credentials(), package, self.config(), icon)
        self.assertIn("reading the app failed", str(raised.exception))

    def test_an_unreadable_certificate_is_a_plain_message(self):
        store = self.server()
        xiaomi = load("xiaomi_getapps", {"XIAOMI_API_URL": f"{store.url}/devupload"})
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(xiaomi.StoreError) as raised:
            package, icon = self.files(tmp)
            xiaomi.publish({**self.credentials(), "public_certificate": "not a certificate"}, package, self.config(), icon)
        self.assertIn("public certificate saved in the dashboard can't be read", str(raised.exception))
        self.assertEqual([], store.paths())


if __name__ == "__main__":
    unittest.main()
