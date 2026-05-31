import { MintPanel } from "../components/MintPanel";
import { StageGallery } from "../components/StageGallery";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Base ERC-1155 Edition</p>
          <h1>Tomatoo Mood Decay NFT</h1>
          <p className="lede">
            かわいいピクセルアートのトマト王は、ウォレットに届いてから時間が経つほど
            気分も見た目も少しずつ崩れていきます。誰かに送ると、受け取った側では
            また元気な姿から始まります。
          </p>
          <p className="quote">
            このNFTは、移動されないまま時間が経つほど壊れていきます。
          </p>
        </div>
        <div className="hero-card">
          <p className="eyebrow">変化システム</p>
          <h2>5段階で変化します</h2>
          <ul>
            <li>0日から7日未満: 元気</li>
            <li>7日から14日未満: 無表情</li>
            <li>14日から21日未満: 泣き</li>
            <li>21日から30日未満: 傷だらけ</li>
            <li>30日以上: ゾンビ</li>
          </ul>
          <p>
            1つのウォレットが持てるTomatooは1体だけです。ミントするには、指定された
            Base ERC-1155 NFTを5枚ロックします。
          </p>
        </div>
      </section>

      <MintPanel />
      <StageGallery />
    </main>
  );
}
