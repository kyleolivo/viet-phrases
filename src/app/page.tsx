"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

function generateSyncKey(): string {
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, "").slice(0, 8);
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
  const [isSlowSpeed, setIsSlowSpeed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

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
            const saved = localStorage.getItem("viet-phrases");
            if (saved) {
              const localPhrases = JSON.parse(saved);
              setPhrases(localPhrases);
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
        const saved = localStorage.getItem("viet-phrases");
        if (saved) {
          setPhrases(JSON.parse(saved));
        }
      }
    };

    loadPhrases();
  }, []);

  useEffect(() => {
    if (phrases.length > 0 && syncKey) {
      localStorage.setItem("viet-phrases", JSON.stringify(phrases));

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

  const handleDeletePhrase = (phraseId: string, phraseName: string) => {
    if (confirm(`Delete "${phraseName}"?`)) {
      setPhrases((prev) => prev.filter((p) => p.id !== phraseId));
      if (currentPhrase?.id === phraseId) {
        setCurrentPhrase(null);
      }
    }
  };

  const handleClearAll = () => {
    if (phrases.length === 0) return;

    if (confirm(`Delete all ${phrases.length} phrases? This cannot be undone.`)) {
      setPhrases([]);
      setCurrentPhrase(null);
      localStorage.setItem("viet-phrases", JSON.stringify([]));

      // Sync empty state to backend
      if (syncKey) {
        fetch("/api/phrases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syncKey, phrases: [] }),
        }).catch((error) => {
          console.error("Error syncing clear all:", error);
        });
      }
    }
  };

  const handleSpeak = () => {
    if (!currentPhrase) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentPhrase.vietnamese);
    utterance.lang = "vi-VN";
    utterance.rate = isSlowSpeed ? 0.6 : 1.0;

    window.speechSynthesis.speak(utterance);

    setIsSlowSpeed(!isSlowSpeed);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support speech recognition. Try using Chrome or Edge.");
      return;
    }

    // Check for secure context (HTTPS or localhost) - required by Safari 26+
    if (!window.isSecureContext) {
      alert("Voice input requires a secure connection (HTTPS). Please access this app via HTTPS or localhost.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    // Use continuous mode on macOS Safari to prevent quick timeouts
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let timeoutId: NodeJS.Timeout | null = null;

    recognition.onstart = () => {
      setIsRecording(true);
      timeoutId = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 10000);
    };

    recognition.onresult = (event: any) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } else if (interimTranscript) {
        setInput(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error, event);
      setIsRecording(false);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (event.error === "no-speech") {
        alert("No speech detected. Please try speaking clearly into your microphone.");
      } else if (event.error === "not-allowed" || event.error === "permission-denied") {
        alert("Microphone access denied. Please allow microphone access in your browser settings and system preferences.");
      } else if (event.error === "network") {
        alert("Network error. Speech recognition requires an internet connection.");
      } else if (event.error === "aborted") {
        if (event.message && event.message.includes("No speech")) {
          if (!finalTranscript.trim()) {
            alert("No speech detected. Please try speaking sooner after clicking the microphone button.");
          }
        }
      } else {
        alert(`Speech recognition error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsRecording(false);
      recognitionRef.current = null;
      alert(`Failed to start voice input: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your microphone permissions.`);
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
            <div className={styles.listHeaderActions}>
              {phrases.length > 0 && (
                <button onClick={handleClearAll} className={styles.clearAllBtn}>
                  Clear All
                </button>
              )}
              <button onClick={() => setShowList(false)} className={styles.closeBtn}>
                ✕
              </button>
            </div>
          </div>
          <div className={styles.listContent}>
            {Object.entries(groupedPhrases).map(([category, categoryPhrases]) => (
              <div key={category} className={styles.category}>
                <h3 className={styles.categoryTitle}>{category}</h3>
                {categoryPhrases.map((phrase) => (
                  <div key={phrase.id} className={styles.phraseItem}>
                    <button
                      className={styles.phraseContent}
                      onClick={() => {
                        setCurrentPhrase(phrase);
                        setShowList(false);
                      }}
                    >
                      <span className={styles.phraseEnglish}>{phrase.english}</span>
                      <span className={styles.phraseVietnamese}>{phrase.vietnamese}</span>
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhrase(phrase.id, phrase.english);
                      }}
                      aria-label="Delete phrase"
                    >
                      ✕
                    </button>
                  </div>
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
            <Link
              href="/diacritics"
              className={styles.diacriticsBtn}
              aria-label="Diacritics reference"
              title="Diacritics reference"
            >
              <span className={styles.diacriticsIcon}>ắ</span>
            </Link>
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
            type="button"
            onClick={handleVoiceInput}
            className={`${styles.micBtn} ${isRecording ? styles.recording : ""}`}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? "■" : "○"}
          </button>
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
            <div className={styles.actionButtons}>
              <button
                className={styles.speakBtn}
                onClick={handleSpeak}
                aria-label={`Speak at ${isSlowSpeed ? "slow" : "normal"} speed`}
                title={`Click to hear at ${isSlowSpeed ? "slow" : "normal"} speed`}
              >
                ▶ {isSlowSpeed ? "Slow" : "Normal"}
              </button>
              <button
                className={styles.expandBtn}
                onClick={() => setShowLarge(true)}
                aria-label="Show large"
              >
                Show Large
              </button>
            </div>
          </div>
        )}

        {phrases.length > 0 && (
          <div className={styles.recentSection}>
            <h3 className={styles.recentTitle}>Recent Phrases</h3>
            <div className={styles.recentList}>
              {phrases.slice(0, 5).map((phrase) => (
                <button
                  key={phrase.id}
                  className={styles.recentItem}
                  onClick={() => setCurrentPhrase(phrase)}
                >
                  <span className={styles.recentEnglish}>{phrase.english}</span>
                  <span className={styles.recentVietnamese}>{phrase.vietnamese}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.hint}>
          <p>Type what you want to say in English</p>
        </div>
      </div>
    </main>
  );
}
