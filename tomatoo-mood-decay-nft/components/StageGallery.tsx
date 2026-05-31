import Image from "next/image";

import { stageCards } from "../lib/contract";

export function StageGallery() {
  return (
    <section className="stage-section">
      <div className="section-heading">
        <p className="eyebrow">変化の流れ</p>
        <h2>ひとりの王が変わっていく5段階</h2>
        <p>
          同じトマト王の個性を保ったまま、背景や表情が少しずつ暗くなり、
          最後にはゾンビの姿へ変化します。
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
