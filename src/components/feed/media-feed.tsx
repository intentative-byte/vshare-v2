"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Accessible, mobile-first multimedia learning feed.
 *
 * Vertical scroll-snap navigation, keyboard (↑/↓) and touch; provider players
 * keep their own controls and captions; NO autoplay (so reduced-motion and
 * data-saver preferences are respected and two videos never play at once); each
 * video pauses when it scrolls out of view. Items are plain serializable data,
 * so this stays a client component without pulling the engine into the bundle.
 */
export type FeedItem =
  | {
      kind: "video";
      id: string;
      src: string;
      allow: string;
      title: string;
      channel: string;
      channelUrl?: string;
      originalUrl: string;
      provider: string;
      objective: string;
      category: string;
      level: string;
      liveVerified: boolean;
    }
  | {
      kind: "image";
      id: string;
      imageUrl: string;
      alt: string;
      credit: string;
      creditUrl?: string;
      licence: string;
      title: string;
      objective: string;
      category: string;
      level: string;
    }
  | {
      kind: "text";
      id: string;
      title: string;
      body: string;
      objective: string;
      category: string;
      level: string;
      sourcePublisher?: string;
      sourceUrl?: string;
    };

const SURFACE = "#15151d";
const BORDER = "#262630";
const MUTED = "#a9adbd";

export function MediaFeed({ items }: { items: FeedItem[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Client-only hint; set via the DOM to avoid a hydration mismatch.
    try {
      const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
      if (conn?.saveData && noteRef.current) {
        noteRef.current.textContent = " Data Saver is on, so videos stay paused until you choose.";
      }
    } catch {
      /* ignore */
    }

    const feed = feedRef.current;
    if (!feed) return;
    const cards = Array.from(feed.querySelectorAll<HTMLElement>("[data-card]"));

    // Pause any video that leaves view: never two playing at once.
    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio < 0.6) {
              const iframe = entry.target.querySelector("iframe");
              try {
                iframe?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
                  "*",
                );
              } catch {
                /* cross-origin pause is best-effort */
              }
            }
          }
        },
        { threshold: [0, 0.6, 1] },
      );
      for (const card of cards) observer.observe(card);
    }
    return () => observer?.disconnect();
  }, [items]);

  function go(next: number) {
    const feed = feedRef.current;
    if (!feed) return;
    const cards = Array.from(feed.querySelectorAll<HTMLElement>("[data-card]"));
    const clamped = Math.max(0, Math.min(cards.length - 1, next));
    setIndex(clamped);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cards[clamped]?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    cards[clamped]?.focus({ preventScroll: true });
  }

  return (
    <div style={{ position: "relative" }}>
      <p style={{ fontSize: ".8rem", color: MUTED, margin: "0 0 .5rem" }}>
        Nothing autoplays — tap a video to play. Use ↑/↓ or the buttons to move between items.
        <span ref={noteRef} data-saver-note />
      </p>
      <div
        ref={feedRef}
        role="feed"
        aria-label="Educational learning feed"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            go(index + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            go(index - 1);
          }
        }}
        style={{
          height: "70vh",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
        }}
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
      <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
        <button type="button" aria-label="Previous item" onClick={() => go(index - 1)} style={navStyle}>
          ↑ Previous
        </button>
        <button type="button" aria-label="Next item" onClick={() => go(index + 1)} style={navStyle}>
          ↓ Next
        </button>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  background: SURFACE,
  color: "#f3f3f7",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: ".5rem .9rem",
  cursor: "pointer",
};

const link: React.CSSProperties = { color: "#7db4ff", textDecoration: "underline" };

const tag: React.CSSProperties = {
  display: "inline-block",
  fontSize: ".7rem",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  color: MUTED,
  border: `1px solid ${BORDER}`,
  borderRadius: 999,
  padding: ".1rem .5rem",
  marginRight: ".4rem",
};

function MediaCard({ item }: { item: FeedItem }) {
  const cardStyle: React.CSSProperties = {
    minHeight: "66vh",
    scrollSnapAlign: "start",
    scrollSnapStop: "always",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: ".75rem",
    padding: "1rem",
    background: "#0b0b0f",
    color: "#f3f3f7",
    borderBottom: `1px solid ${BORDER}`,
  };

  if (item.kind === "video") {
    return (
      <section data-card tabIndex={-1} role="article" aria-label={`${item.title} by ${item.channel}`} style={cardStyle}>
        <div style={{ position: "relative", width: "100%", maxWidth: "40rem", margin: "0 auto", aspectRatio: "16 / 9", background: "#000", borderRadius: 12, overflow: "hidden" }}>
          <iframe
            src={item.src}
            title={`${item.title} — ${item.channel}`}
            loading="lazy"
            allow={item.allow}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div style={{ maxWidth: "40rem", margin: "0 auto", width: "100%" }}>
          <span style={tag}>{item.category}</span>
          <span style={tag}>{item.level}</span>
          <p style={{ fontWeight: 700, margin: ".25rem 0 0" }}>
            {item.channel}
            {item.liveVerified ? " ✓" : ""}
          </p>
          <p style={{ color: "#cdd0db", margin: ".25rem 0" }}>{item.objective}</p>
          <p style={{ fontSize: ".8rem", color: MUTED }}>
            Captions on where available.{" "}
            <a href={item.originalUrl} rel="noopener" style={link}>
              Watch on {item.provider}
            </a>{" "}
            — original creator, full controls preserved.
          </p>
        </div>
      </section>
    );
  }

  if (item.kind === "image") {
    return (
      <section data-card tabIndex={-1} role="article" aria-label={item.title} style={cardStyle}>
        <div style={{ maxWidth: "40rem", margin: "0 auto", width: "100%" }}>
          <span style={tag}>{item.category}</span>
          <span style={tag}>{item.level}</span>
          <p style={{ color: "#cdd0db", margin: ".25rem 0" }}>{item.objective}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.alt} style={{ width: "100%", maxWidth: "40rem", borderRadius: 12, margin: "0 auto", display: "block" }} />
        <p style={{ fontSize: ".75rem", color: MUTED, maxWidth: "40rem", margin: ".25rem auto 0", width: "100%" }}>
          {item.credit}
          {item.creditUrl ? (
            <>
              {" — "}
              <a href={item.creditUrl} style={link}>
                source
              </a>
            </>
          ) : null}{" "}
          · {item.licence}
        </p>
      </section>
    );
  }

  return (
    <section data-card tabIndex={-1} role="article" aria-label={item.title} style={cardStyle}>
      <div style={{ maxWidth: "40rem", margin: "0 auto", width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "1.25rem" }}>
        <span style={tag}>{item.category}</span>
        <span style={tag}>{item.level}</span>
        <h2 style={{ margin: ".25rem 0" }}>{item.title}</h2>
        <p style={{ color: "#cdd0db" }}>{item.objective}</p>
        <p>{item.body}</p>
        {item.sourceUrl ? (
          <p style={{ fontSize: ".75rem", color: MUTED }}>
            Source:{" "}
            <a href={item.sourceUrl} style={link}>
              {item.sourcePublisher ?? "source"}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
