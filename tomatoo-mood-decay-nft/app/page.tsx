import { MintPanel } from "../components/MintPanel";
import { StageGallery } from "../components/StageGallery";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Base ERC-1155 NFT</p>
          <h1>Tomatoo Mood Decay NFT</h1>
          <p className="lede">
            かわいいピクセルアートのトマト王は、受け取ってから時間が経つほど少しずつ気分と見た目が変化します。
            転送されると、新しく受け取ったウォレットでまた元気な姿から始まります。
          </p>
          <p className="quote">
            このNFTは、移動されないまま時間が経つほど壊れていきます。
          </p>
        </div>
        <div className="hero-card">
          <p className="eyebrow">OpenSea対応版</p>
          <h2>1体ごとに個別tokenIdを発行</h2>
          <ul>
            <li>0日から7日未満: 元気</li>
            <li>7日から14日未満: 無表情</li>
            <li>14日から21日未満: 泣き</li>
            <li>21日から30日未満: 傷だらけ</li>
            <li>30日以上: ？</li>
          </ul>
          <p>
            ミントには、指定されたBase ERC-1155 NFTを5枚ロックします。Tomatooは1ウォレットにつき1体まで保有できます。
          </p>
        </div>
      </section>

      <MintPanel />
      <StageGallery />
    </main>
  );
}
