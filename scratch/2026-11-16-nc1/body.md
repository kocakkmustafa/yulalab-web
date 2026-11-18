WEB-QA-NC1: `test-netlify-contract.py` mutasyon kapsami (yalniz test; `netlify-contract.py` degismedi, diff bos).

- Saglayici-cikti testi: mutasyon listesi artik `[mutated_handler, *scheduled]`; handler path/runtimeVersion/generator mutasyonlari fonksiyon-sayisina degil HEDEF kontrole takiliyor, mesaj `assertRaisesRegex` ile dogrulaniyor.
- `rejected(message)` yardimcisi: beklenen kontrol metni dogrulanabilir.
- 7 yeni test (32 -> 39): zamanlayici zip eksik .cjs, yinelenen uye, guvensiz uye adi (../, mutlak, ters bolu), CRC bozulmasi (testzip), bos/kesik zip, manifest alanlari (schedule/runtime/generator/runtimeVersion/mainFile/path, her biri kendi mesajiyla), eksik kaynak .ts.
- Kirmizi/yesil: her kontrol `if False:` ile gecici devre disi birakildi -> ilgili test KIRMIZI, `git checkout` sonrasi YESIL (14 kontrol, hepsi exit 1 -> 0).
- `python3 -B -O .github/ci/test-netlify-contract.py`: 39 test OK. repin verify-exit=0.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
