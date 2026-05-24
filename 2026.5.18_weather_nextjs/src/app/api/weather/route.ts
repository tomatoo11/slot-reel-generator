import { NextRequest, NextResponse } from "next/server";

type OpenWeatherResponse = {
  name: string;
  weather: Array<{
    description: string;
  }>;
  main: {
    temp: number;
    humidity: number;
  };
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city = request.nextUrl.searchParams.get("city")?.trim();

  if (!city) {
    return NextResponse.json(
      { error: "都市名を入力してください。" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: ".env に OPENWEATHER_API_KEY を設定してください。" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    q: city,
    appid: apiKey,
    units: "metric",
    lang: "ja",
  });

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json(
        { error: "都市が見つかりませんでした。入力内容を確認してください。" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "天気情報を取得できませんでした。少し時間を置いて再試行してください。" },
      { status: response.status },
    );
  }

  const data = (await response.json()) as OpenWeatherResponse;

  return NextResponse.json({
    city: data.name,
    description: data.weather[0]?.description ?? "不明",
    temperature: data.main.temp,
    humidity: data.main.humidity,
  });
}
