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

// Generate a random sync key
function generateSyncKey(): string {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36)[2]
  ).join("");
}

export default function Home() {
  const [input, setInput] = useState("");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showLarge, setShowLarge] = useState(false);
  const [syncKey, setSyncKey] = useState<string>("");
  const [showSyncKey, setShowSyncKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sync key and load phrases from backend
  useEffect(() => {
    // Get or create sync key
    let key = localStorage.getItem("viet-sync-key");
    if (!key) {
      key = generateSyncKey();
      localStorage.setItem("viet-sync-key", key);
    }
    setSyncKey(key);

    // Load phrases from backend
    const loadPhrases = async () => {
      try {
        const response = await fetch(`/api/phrases?syncKey=${key}`);
        if (response.ok) {
          const data = await response.json();
          if (data.phrases && data.phrases.length > 0) {
            setPhrases(data.phrases);
          } else {
            // Fallback to localStorage if backend has no data
            const saved = localStorage.getItem("viet-phrases");
            if (saved) {
              const localPhrases = JSON.parse(saved);
              setPhrases(localPhrases);
              // Sync local phrases to backend
              if (localPhrases.length > 0) {
                await fetch("/api/phrases", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ syncKey: key, phrases: localPhrases }),
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading phrases:", error);
        // Fallback to localStorage on error
        const saved = localStorage.getItem("viet-phrases");
        if (saved) {
          setPhrases(JSON.parse(saved));
        }
      }
    };

    loadPhrases();
  }, []);

  // Save phrases to both localStorage and backend when they change
  useEffect(() => {
    if (phrases.length > 0 && syncKey) {
      // Save to localStorage immediately
      localStorage.setItem("viet-phrases", JSON.stringify(phrases));

      // Debounce backend sync to avoid too many requests
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        try {
          await fetch("/api/phrases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ syncKey, phrases }),
          });
        } catch (error) {
          console.error("Error syncing phrases:", error);
        } finally {
          setIsSyncing(false);
        }
      }, 1000);
    }
  }, [phrases, syncKey]);

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

  const handleSetSyncKey = async (newKey: string) => {
    if (!newKey.trim()) return;

    localStorage.setItem("viet-sync-key", newKey.trim());
    setSyncKey(newKey.trim());

    // Load phrases for this sync key
    try {
      const response = await fetch(`/api/phrases?syncKey=${newKey.trim()}`);
      if (response.ok) {
        const data = await response.json();
        setPhrases(data.phrases || []);
      }
    } catch (error) {
      console.error("Error loading phrases for new sync key:", error);
    }

    setShowSyncKey(false);
  };

  const handleCopySyncKey = () => {
    navigator.clipboard.writeText(syncKey);
    alert("Sync key copied! Use it on your other devices.");
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
          <p className={styles.tapHint}>Tap to close</p>
        </div>
      )}

      {/* Sync key modal */}
      {showSyncKey && (
        <div className={styles.listView}>
          <div className={styles.listHeader}>
            <h2>Sync Across Devices</h2>
            <button onClick={() => setShowSyncKey(false)} className={styles.closeBtn}>
              ✕
            </button>
          </div>
          <div className={styles.listContent}>
            <div className={styles.syncKeySection}>
              <p className={styles.syncKeyInfo}>
                Your sync key keeps your phrases in sync across all your devices.
              </p>
              <div className={styles.syncKeyDisplay}>
                <code className={styles.syncKeyCode}>{syncKey}</code>
                <button onClick={handleCopySyncKey} className={styles.copyBtn}>
                  Copy
                </button>
              </div>
              <p className={styles.syncKeyInfo}>
                To sync another device, enter your sync key there:
              </p>
              <div className={styles.syncKeyInput}>
                <input
                  type="text"
                  placeholder="Enter sync key from another device"
                  className={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSetSyncKey((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleSetSyncKey(input.value);
                  }}
                  className={styles.submitBtn}
                >
                  →
                </button>
              </div>
            </div>
          </div>
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
          <div className={styles.headerButtons}>
            <button
              className={styles.syncBtn}
              onClick={() => setShowSyncKey(true)}
              aria-label="Sync settings"
              title="Sync across devices"
            >
              <span className={styles.syncIcon}>
                {isSyncing ? "⟳" : "☁"}
              </span>
            </button>
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
          </div>
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
