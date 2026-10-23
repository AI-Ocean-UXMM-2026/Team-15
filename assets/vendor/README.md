# QR encoder

Vendored from `qrcode-generator@1.4.4` (Kazuhiko Arase), obtained through npm with registry integrity verification. `qrcode.js` is the original browser encoder; `qrcode_UTF8.js` enables its UTF-8 input adapter. These files are unmodified. Loaded locally, with no external runtime requests or package-install requirement.

Upstream: https://github.com/kazuhikoarase/qrcode-generator
License: MIT; see LICENSE-qrcode.txt and the copyright notices retained in each source file.

The app encodes the actual product barcode, falling back to its SKU. SVG labels include a four-module quiet zone. No inventory forecast or remote API behavior is supplied by this library.
