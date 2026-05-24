import { MintPanel } from "../components/MintPanel";
import { StageGallery } from "../components/StageGallery";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Dynamic ERC-721</p>
          <h1>Tomatoo Mood Decay NFT</h1>
          <p className="lede">
            A cute pixel-art tomato king rots emotionally and physically as days pass after its last
            transfer. Move it, and the clock resets.
          </p>
          <p className="quote">
            “This NFT becomes more broken over time unless it is transferred.”
          </p>
        </div>
        <div className="hero-card">
          <p className="eyebrow">Preview Card</p>
          <h2>How the decay loop works</h2>
          <ul>
            <li>0 to &lt;7 days: CUTE</li>
            <li>7 to &lt;14 days: BLANK</li>
            <li>14 to &lt;21 days: CRYING</li>
            <li>21 to &lt;30 days: DAMAGED</li>
            <li>30+ days: ZOMBIE</li>
          </ul>
          <p>Each transfer refreshes the timer, emits metadata update events, and restores the king.</p>
        </div>
      </section>

      <MintPanel />
      <StageGallery />
    </main>
  );
}
