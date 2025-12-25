"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

interface Phrase {
  id: string;
  english: string;
  vietnamese: string;
  phonetic: string;
  category: string;
  createdAt: number;
  reviewCount: number;
  lastReviewed: number | null;
}

interface TranslationResponse {
  vietnamese: string;
  phonetic: string;
  category: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showLarge, setShowLarge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load phrases from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("viet-phrases");
    if (saved) {
      setPhrases(JSON.parse(saved));
    }
  }, []);

  // Save phrases to localStorage when they change
  useEffect(() => {
    if (phrases.length > 0) {
      localStorage.setItem("viet-phrases", JSON.stringify(phrases));
    }
  }, [phrases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if we already have this phrase
    const existing = phrases.find(
      (p) => p.english.toLowerCase() === input.trim().toLowerCase()
    );
    if (existing) {
      setCurrentPhrase(existing);
      setInput("");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });

      if (!response.ok) throw new Error("Translation failed");

      const data: TranslationResponse = await response.json();

      const newPhrase: Phrase = {
        id: crypto.randomUUID(),
        english: input.trim(),
        vietnamese: data.vietnamese,
        phonetic: data.phonetic,
        category: data.category,
        createdAt: Date.now(),
        reviewCount: 0,
        lastReviewed: null,
      };

      setPhrases((prev) => [newPhrase, ...prev]);
      setCurrentPhrase(newPhrase);
      setInput("");
    } catch (error) {
      console.error("Translation error:", error);
      // For now, show a mock response if API fails
      const mockPhrase: Phrase = {
        id: crypto.randomUUID(),
        english: input.trim(),
        vietnamese: "[API key needed]",
        phonetic: "[Configure API]",
        category: "uncategorized",
        createdAt: Date.now(),
        reviewCount: 0,
        lastReviewed: null,
      };
      setCurrentPhrase(mockPhrase);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedPhrases = phrases.reduce((acc, phrase) => {
    if (!acc[phrase.category]) acc[phrase.category] = [];
    acc[phrase.category].push(phrase);
    return acc;
  }, {} as Record<string, Phrase[]>);

  return (
    <main className={styles.main}>
      {/* Large display mode */}
      {showLarge && currentPhrase && (
        <div className={styles.largeDisplay} onClick={() => setShowLarge(false)}>
          <p className={styles.largeVietnamese}>{currentPhrase.vietnamese}</p>
          <p className={styles.largePhonetic}>{currentPhrase.phonetic}</p>
          <p className={styles.tapHint}>Tap to close</p>
        </div>
      )}

      {/* Phrase list view */}
      {showList && (
        <div className={styles.listView}>
          <div className={styles.listHeader}>
            <h2>Saved Phrases</h2>
            <button onClick={() => setShowList(false)} className={styles.closeBtn}>
              ✕
            </button>
          </div>
          <div className={styles.listContent}>
            {Object.entries(groupedPhrases).map(([category, categoryPhrases]) => (
              <div key={category} className={styles.category}>
                <h3 className={styles.categoryTitle}>{category}</h3>
                {categoryPhrases.map((phrase) => (
                  <button
                    key={phrase.id}
                    className={styles.phraseItem}
                    onClick={() => {
                      setCurrentPhrase(phrase);
                      setShowList(false);
                    }}
                  >
                    <span className={styles.phraseEnglish}>{phrase.english}</span>
                    <span className={styles.phraseVietnamese}>{phrase.vietnamese}</span>
                  </button>
                ))}
              </div>
            ))}
            {phrases.length === 0 && (
              <p className={styles.emptyState}>No phrases saved yet</p>
            )}
          </div>
        </div>
      )}

      {/* Main interface */}
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Việt</h1>
          <button
            className={styles.listBtn}
            onClick={() => setShowList(true)}
            aria-label="View saved phrases"
          >
            <span className={styles.listIcon}>☰</span>
            {phrases.length > 0 && (
              <span className={styles.badge}>{phrases.length}</span>
            )}
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you want to say?"
            className={styles.input}
            autoComplete="off"
          />
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "..." : "→"}
          </button>
        </form>

        {currentPhrase && (
          <div className={styles.result}>
            <p className={styles.english}>{currentPhrase.english}</p>
            <p className={styles.vietnamese}>{currentPhrase.vietnamese}</p>
            <p className={styles.phonetic}>{currentPhrase.phonetic}</p>
            <button
              className={styles.expandBtn}
              onClick={() => setShowLarge(true)}
              aria-label="Show large"
            >
              Show Large
            </button>
          </div>
        )}

        <div className={styles.hint}>
          <p>Type what you want to say in English</p>
        </div>
      </div>
    </main>
  );
}
