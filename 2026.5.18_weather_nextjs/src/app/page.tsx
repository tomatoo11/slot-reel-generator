"use client";

import { FormEvent, useState } from "react";

type WeatherInfo = {
  city: string;
  description: string;
  temperature: number;
  humidity: number;
};

type WeatherApiResponse =
  | WeatherInfo
  | {
      error: string;
    };

export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError("都市名を入力してください。");
      setWeather(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setWeather(null);

    try {
      const params = new URLSearchParams({
        city: trimmedCity,
      });

      const response = await fetch(`/api/weather?${params.toString()}`);
      const data = (await response.json()) as WeatherApiResponse;

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "天気情報を取得できませんでした。");
      }

      if ("error" in data) {
        throw new Error(data.error);
      }

      setWeather(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="weather-panel" aria-labelledby="page-title">
        <div className="header">
          <p className="eyebrow">現在の天気</p>
          <h1 id="page-title">都市の天気を調べる</h1>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="city">都市名</label>
          <div className="search-row">
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="例: Tokyo"
              autoComplete="address-level2"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "取得中..." : "天気を見る"}
            </button>
          </div>
        </form>

        {error ? <p className="message error">{error}</p> : null}

        {weather ? (
          <div className="result" aria-live="polite">
            <h2>{weather.city}</h2>
            <dl>
              <div>
                <dt>天気</dt>
                <dd>{weather.description}</dd>
              </div>
              <div>
                <dt>気温</dt>
                <dd>{Math.round(weather.temperature)}℃</dd>
              </div>
              <div>
                <dt>湿度</dt>
                <dd>{weather.humidity}%</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>
    </main>
  );
}
