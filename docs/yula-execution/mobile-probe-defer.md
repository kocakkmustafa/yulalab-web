# Mobil WebGL sonda erteleme (WEB-P0-03a4)

## Değişiklik

`SceneHost` mount'ta WebGL yetenek sondasını (`detectExperienceCapabilities`) yalnız masaüstünde çalıştırır. `(max-width: 767px)` eşleşen cihazda sonda ilk kullanıcı jestine (`pointerdown`, `keydown`, `touchstart`, `wheel`, `scroll`; pasif, tek sefer, temizlikli) ertelenir. Karar `shouldDeferProbe` (`scene-route.ts`) içindedir; viewport effect içinde `window.matchMedia` ile okunur.

Jestten önce `capabilities` `null` kalır: arka plan effect'i `!capabilities?.usable` ile çıkar, `ownTier` varsayılanı `low`, ana sayfa yolculuğu kendi sondasını yapıp `journey.tier` verir. Sondayı tetikleyen jest arka plan beklemesini de karşılar (ikinci jest gerekmez).

## TBT ölçümü

UNKNOWN: makine yükü. Ölçüm anında `uptime` yük ortalaması 129.94 (1 dk), eşik 20; Lighthouse sonuçları kıyaslanamaz olacağından koşulmadı. Yöntem sakin makinede: `pnpm build` + `pnpm start` (port 3187), mobil Lighthouse, main ve bu dal için 3'er koşu medyanı.

## Doğrulama

`tests/scene-probe-defer.test.tsx`: masaüstünde mount'ta 1 çağrı; mobilde mount'ta 0, ilk jestte 1, sonraki jestlerde artış yok; unmount sonrası dinleyici kalmaz.
