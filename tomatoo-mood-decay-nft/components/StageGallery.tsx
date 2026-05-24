import Image from "next/image";

import { stageCards } from "../lib/contract";

export function StageGallery() {
  return (
    <section className="stage-section">
      <div className="section-heading">
        <p className="eyebrow">Decay Journey</p>
        <h2>Five moods, one doomed king</h2>
        <p>
          The same tomato monarch remains recognizable throughout the entire lifecycle while the
          world around him becomes colder, flatter, sadder, damaged, and finally undead.
        </p>
      </div>

      <div className="stage-grid">
        {stageCards.map((card, index) => {
          const isSpoiler = index >= 3;

          return (
          <article className="stage-card" key={card.stage}>
            <div className="stage-image-wrap">
              {isSpoiler ? (
                <div className="spoiler-cover">
                  <p className="spoiler-label">Hidden Evolution</p>
                  <h3>Unlocked after mint</h3>
                  <p>Stage 4 and Stage 5 stay hidden to protect the reveal.</p>
                </div>
              ) : (
                <Image src={card.image} alt={card.mood} width={320} height={320} className="stage-image" />
              )}
            </div>
            <div className="stage-copy">
              <p className="stage-meta">
                {card.stage} · {card.window}
              </p>
              <h3>{isSpoiler ? "CLASSIFIED" : card.mood}</h3>
              <p>
                {isSpoiler
                  ? "The later decay forms are intentionally concealed so collectors can discover them in sequence."
                  : card.description}
              </p>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
