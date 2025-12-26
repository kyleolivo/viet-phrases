"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function Diacritics() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.backBtn}>
            ← Back
          </Link>
          <h1 className={styles.title}>Diacritics Reference</h1>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tone Marks</h2>
          <p className={styles.intro}>
            Vietnamese uses six tones to distinguish meaning. Five of them are marked with diacritics:
          </p>

          <div className={styles.toneGrid}>
            <div className={styles.toneCard}>
              <div className={styles.toneName}>Level (Ngang)</div>
              <div className={styles.toneExample}>ma</div>
              <div className={styles.toneDescription}>
                No mark • Mid level pitch
              </div>
              <div className={styles.toneMeaning}>ghost</div>
            </div>

            <div className={styles.toneCard}>
              <div className={styles.toneName}>Rising (Sắc)</div>
              <div className={styles.toneExample}>má</div>
              <div className={styles.toneDescription}>
                Acute accent (´) • Sharp rising pitch
              </div>
              <div className={styles.toneMeaning}>cheek</div>
            </div>

            <div className={styles.toneCard}>
              <div className={styles.toneName}>Falling (Huyền)</div>
              <div className={styles.toneExample}>mà</div>
              <div className={styles.toneDescription}>
                Grave accent (`) • Low falling pitch
              </div>
              <div className={styles.toneMeaning}>but</div>
            </div>

            <div className={styles.toneCard}>
              <div className={styles.toneName}>Question (Hỏi)</div>
              <div className={styles.toneExample}>mả</div>
              <div className={styles.toneDescription}>
                Hook above (?) • Dipping pitch
              </div>
              <div className={styles.toneMeaning}>tomb</div>
            </div>

            <div className={styles.toneCard}>
              <div className={styles.toneName}>Tumbling (Ngã)</div>
              <div className={styles.toneExample}>mã</div>
              <div className={styles.toneDescription}>
                Tilde (~) • Rising broken pitch
              </div>
              <div className={styles.toneMeaning}>horse</div>
            </div>

            <div className={styles.toneCard}>
              <div className={styles.toneName}>Drop (Nặng)</div>
              <div className={styles.toneExample}>mạ</div>
              <div className={styles.toneDescription}>
                Dot below (.) • Short low pitch
              </div>
              <div className={styles.toneMeaning}>rice seedling</div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Vowel Modifications</h2>
          <p className={styles.intro}>
            Vietnamese also uses diacritics to modify vowel sounds:
          </p>

          <div className={styles.vowelGrid}>
            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>ă</div>
              <div className={styles.vowelName}>Breve (˘)</div>
              <div className={styles.vowelDescription}>
                Short "a" sound, like "ah"
              </div>
              <div className={styles.vowelExample}>ăn (eat)</div>
            </div>

            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>â</div>
              <div className={styles.vowelName}>Circumflex (^)</div>
              <div className={styles.vowelDescription}>
                On a: like "uh" in "but"
              </div>
              <div className={styles.vowelExample}>ân (grace)</div>
            </div>

            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>ê</div>
              <div className={styles.vowelName}>Circumflex (^)</div>
              <div className={styles.vowelDescription}>
                On e: like "ay" in "bay"
              </div>
              <div className={styles.vowelExample}>êm (soft)</div>
            </div>

            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>ô</div>
              <div className={styles.vowelName}>Circumflex (^)</div>
              <div className={styles.vowelDescription}>
                On o: like "oh" in "oh"
              </div>
              <div className={styles.vowelExample}>ôm (hug)</div>
            </div>

            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>ơ</div>
              <div className={styles.vowelName}>Horn (ơ)</div>
              <div className={styles.vowelDescription}>
                Like "uh" in "fur"
              </div>
              <div className={styles.vowelExample}>ơi (hello)</div>
            </div>

            <div className={styles.vowelCard}>
              <div className={styles.vowelLetter}>ư</div>
              <div className={styles.vowelName}>Horn (ư)</div>
              <div className={styles.vowelDescription}>
                Like "oo" with lips spread
              </div>
              <div className={styles.vowelExample}>ưa (like)</div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Combining Marks</h2>
          <p className={styles.intro}>
            Tone marks can be combined with vowel modifications:
          </p>

          <div className={styles.exampleGrid}>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ắ</div>
              <div className={styles.exampleDesc}>ă + sắc (rising)</div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ầ</div>
              <div className={styles.exampleDesc}>â + huyền (falling)</div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ể</div>
              <div className={styles.exampleDesc}>ê + hỏi (question)</div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ỗ</div>
              <div className={styles.exampleDesc}>ô + ngã (tumbling)</div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ợ</div>
              <div className={styles.exampleDesc}>ơ + nặng (drop)</div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.exampleText}>ứ</div>
              <div className={styles.exampleDesc}>ư + sắc (rising)</div>
            </div>
          </div>
        </section>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Remember: The same word with different tones has completely different meanings!
          </p>
        </div>
      </div>
    </main>
  );
}
