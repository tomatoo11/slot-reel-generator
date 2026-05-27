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
        {stageCards.map((card) => (
          <article className="stage-card" key={card.stage}>
            <div className="stage-image-wrap">
              <Image src={card.image} alt={card.mood} width={320} height={320} className="stage-image" />
            </div>
            <div className="stage-copy">
              <p className="stage-meta">
                {card.stage} / {card.window}
              </p>
              <h3>{card.mood}</h3>
              <p>{card.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
