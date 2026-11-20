import Image from "next/image";
import { Link } from "@/i18n/navigation";
import styles from "./Experience.module.css";
import type { ExperienceProduct } from "./types";

/**
 * W6 K6: the full-screen product section that follows the values (the reference's `stellla` section, rebuilt
 * with our own picture and our own LifeOS copy). DOM only, not 3D: a cover picture, a 35 % black veil with a
 * bottom fade for legibility, a 1 px frame with plus marks and a giant product name. The copy is the product's
 * existing catalogue text; nothing new is written here.
 */
export function StellaContent({ product, headingId }: { product: ExperienceProduct; headingId: string }) {
  return (
    <>
      <div className={styles.stellaImage} aria-hidden="true">
        <Image src="/experience/stella-bg.webp" alt="" fill sizes="100vw" loading="lazy" />
      </div>
      <div className={styles.stellaVeil} aria-hidden="true" />
      <div className={styles.stellaFrame} aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className={styles.stellaCopy}>
        <h2 id={headingId} className={styles.stellaTitle}>
          <Link href={product.href} className={styles.stellaLink}>
            <span>{product.name}</span>
            <span className={styles.stellaArrow} aria-hidden="true"><span>↗</span></span>
            <span className={styles.stellaCta}>{product.ctaLabel}</span>
          </Link>
        </h2>
        <p className={styles.stellaBody}>{product.short}</p>
        {product.storeLinks && product.storeLinks.length > 0 ? (
          <ul className={styles.stellaStores}>
            {product.storeLinks.map((store) => (
              <li key={store.kind}>
                <a href={store.href} target="_blank" rel="noopener noreferrer" className={styles.stellaStore}>
                  <span aria-hidden="true">{store.kind === "appstore" ? "" : "▶"}</span>
                  <span>{store.name}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className={styles.stellaNote}>{product.tagline}</p>
    </>
  );
}
