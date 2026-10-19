#!/usr/bin/env python3
"""Prints the SHA-256 fingerprint of a DER certificate read from stdin (46).

  keytool -exportcert -keystore upload.jks -alias upload -storepass … | fingerprint.py

Prints it as the link files want it, 32 uppercase hex pairs with colons
(14:6D:…:C3), or nothing (and exits 1) when stdin holds no certificate.
"""
import hashlib
import sys


def fingerprint(der):
    digest = hashlib.sha256(der).hexdigest().upper()
    return ":".join(digest[i:i + 2] for i in range(0, 64, 2))


def main():
    der = sys.stdin.buffer.read()
    # A DER certificate starts with a SEQUENCE (0x30) and is never this small.
    if len(der) < 64 or der[0] != 0x30:
        sys.exit(1)
    print(fingerprint(der))


if __name__ == "__main__":
    main()
