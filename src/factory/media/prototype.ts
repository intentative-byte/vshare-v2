/**
 * Renders a self-contained, accessible, social-style multimedia feed prototype.
 *
 * Accessibility & conduct built in: a vertical scroll-snap feed (role="feed"),
 * provider players with their own controls and captions requested, NO autoplay
 * (so motion/data preferences are respected and two videos never play at once),
 * keyboard navigation, pause-when-inactive via the provider JS API, honoured
 * prefers-reduced-motion, a data-saver notice, and clear creator attribution.
 * Nothing is downloaded or rehosted — videos are embeds only.
 */
import type { MediaCard } from "./types";
import { buildEmbed } from "./providers";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export interface PrototypeOptions {
  origin?: string;
  title?: string;
}

export function renderPrototype(cards: MediaCard[], options: PrototypeOptions = {}): string {
  const origin = options.origin ?? "https://vshares.example";
  const sections = cards.map((card, i) => renderCard(card, i, origin)).join("\n");

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(options.title ?? "VSHARES — multimedia learning feed (prototype)")}</title>
<style>
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0b0b0f;color:#f3f3f7}
  header{position:sticky;top:0;z-index:10;padding:.75rem 1rem;background:rgba(11,11,15,.9);backdrop-filter:blur(8px);border-bottom:1px solid #222}
  header h1{font-size:1rem;margin:0}
  header p{margin:.25rem 0 0;font-size:.8rem;color:#9aa}
  .feed{height:calc(100dvh - 4rem);overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth}
  @media (prefers-reduced-motion: reduce){.feed{scroll-behavior:auto}}
  .card{min-height:calc(100dvh - 4rem);scroll-snap-align:start;scroll-snap-stop:always;display:flex;flex-direction:column;justify-content:center;padding:1rem;gap:.75rem;border-bottom:1px solid #1a1a22}
  .frame{position:relative;width:100%;max-width:40rem;margin:0 auto;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}
  .frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .meta{max-width:40rem;margin:0 auto;width:100%}
  .chan{font-weight:700}
  .obj{color:#cdd;margin:.25rem 0}
  .tag{display:inline-block;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#9aa;border:1px solid #333;border-radius:999px;padding:.1rem .5rem;margin-right:.4rem}
  a{color:#7db4ff}
  .text-card{max-width:40rem;margin:0 auto;background:#15151d;border:1px solid #262630;border-radius:12px;padding:1.25rem}
  .image-card img{width:100%;max-width:40rem;border-radius:12px;display:block;margin:0 auto}
  .credit{font-size:.75rem;color:#9aa;margin-top:.25rem}
  .hint{font-size:.75rem;color:#9aa}
  button.nav{position:fixed;right:1rem;z-index:20;border-radius:999px;border:1px solid #333;background:#15151d;color:#f3f3f7;width:2.75rem;height:2.75rem;font-size:1.1rem;cursor:pointer}
  #up{bottom:4.5rem}#down{bottom:1rem}
</style></head>
<body>
<header>
  <h1>${esc(options.title ?? "VSHARES — value scrolling")}</h1>
  <p id="saver-note">Educational videos play on your tap; nothing autoplays. Use ↑/↓ or the buttons to move. <span id="data-note"></span></p>
</header>
<main class="feed" id="feed" role="feed" aria-label="Educational learning feed" tabindex="0">
${sections}
</main>
<button class="nav" id="up" aria-label="Previous item">↑</button>
<button class="nav" id="down" aria-label="Next item">↓</button>
<script>
(function(){
  var feed=document.getElementById('feed');
  var cards=[].slice.call(feed.querySelectorAll('.card'));
  // Data-saver notice (never blocks; just informs).
  try{ if(navigator.connection && navigator.connection.saveData){ document.getElementById('data-note').textContent='Data Saver is on — videos stay paused until you tap play.'; } }catch(e){}
  // Pause an iframe when it scrolls out of view: never two playing at once.
  function pause(iframe){ try{ iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'*'); }catch(e){} }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var f=en.target.querySelector('iframe');
        if(!f) return;
        if(en.intersectionRatio < 0.6){ pause(f); }
      });
    },{threshold:[0,0.6,1]});
    cards.forEach(function(c){ io.observe(c); });
  }
  // Keyboard navigation.
  var idx=0;
  function go(n){ idx=Math.max(0,Math.min(cards.length-1,n)); cards[idx].scrollIntoView({block:'start'}); cards[idx].setAttribute('tabindex','-1'); cards[idx].focus({preventScroll:true}); }
  document.getElementById('down').addEventListener('click',function(){ go(idx+1); });
  document.getElementById('up').addEventListener('click',function(){ go(idx-1); });
  feed.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); go(idx+1); } else if(e.key==='ArrowUp'){ e.preventDefault(); go(idx-1); } });
})();
</script>
</body></html>`;
}

function renderCard(card: MediaCard, i: number, origin: string): string {
  if (card.kind === "video") {
    const embed = buildEmbed(card, { origin, enableJsApi: true, captions: true });
    return `<section class="card" role="article" aria-label="${esc(card.title)} by ${esc(card.channel)}">
    <div class="frame">
      <iframe src="${esc(embed.src)}" title="${esc(card.title)} — ${esc(card.channel)}" loading="lazy"
        allow="${esc(embed.allow)}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <div class="meta">
      <span class="tag">${esc(card.category)}</span><span class="tag">${esc(card.level)}</span>
      <p class="chan">${esc(card.channel)}${card.liveVerified === "verified" ? " ✓" : ""}</p>
      <p class="obj">${esc(card.objective)}</p>
      <p class="hint">Captions on where available. <a href="${esc(card.originalUrl)}" rel="noopener">Watch on ${esc(card.provider)}</a> — original creator, full controls preserved.</p>
    </div>
  </section>`;
  }
  if (card.kind === "image") {
    return `<section class="card image-card" role="article" aria-label="${esc(card.title)}">
    <div class="meta"><span class="tag">${esc(card.category)}</span><span class="tag">${esc(card.level)}</span>
      <p class="obj">${esc(card.objective)}</p></div>
    <img src="${esc(card.imageUrl)}" alt="${esc(card.alt)}">
    <p class="credit">${esc(card.credit)}${card.creditUrl ? ` — <a href="${esc(card.creditUrl)}">source</a>` : ""} · ${esc(card.licence)}</p>
  </section>`;
  }
  return `<section class="card" role="article" aria-label="${esc(card.title)}">
    <div class="text-card">
      <span class="tag">${esc(card.category)}</span><span class="tag">${esc(card.level)}</span>
      <h2>${esc(card.title)}</h2>
      <p class="obj">${esc(card.objective)}</p>
      <p>${esc(card.body)}</p>
      ${card.source ? `<p class="credit">Source: <a href="${esc(card.source.url)}">${esc(card.source.publisher)}</a></p>` : ""}
    </div>
  </section>`;
}
