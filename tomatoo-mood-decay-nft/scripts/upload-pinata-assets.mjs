import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const jwt = process.env.PINATA_JWT;

if (!jwt || jwt === "your-pinata-jwt") {
  throw new Error("PINATA_JWT is not set in .env");
}

const assets = [
  ["STAGE1_IMAGE_URI", "public/assets/stage1-cute.png"],
  ["STAGE2_IMAGE_URI", "public/assets/stage2-blank.png"],
  ["STAGE3_IMAGE_URI", "public/assets/stage3-crying.png"],
  ["STAGE4_IMAGE_URI", "public/assets/stage4-damaged.png"],
  ["STAGE5_IMAGE_URI", "public/assets/stage5-zombie.png"]
];

const results = [];

for (const [envName, filePath] of assets) {
  const bytes = await readFile(filePath);
  const fileName = basename(filePath);
  const file = new File([bytes], fileName, { type: "image/png" });
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: `tomatoo-mood-decay-${fileName}`
    })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`
    },
    body: formData
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Pinata upload failed for ${filePath}: ${JSON.stringify(body)}`);
  }

  const uri = `ipfs://${body.IpfsHash}`;
  results.push({
    envName,
    filePath,
    uri,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${body.IpfsHash}`
  });

  console.log(`${envName}=${uri}`);
}

await writeFile(
  join(process.cwd(), "pinata-upload-results.json"),
  `${JSON.stringify(results, null, 2)}\n`,
  "utf8"
);

console.log("\nSaved pinata-upload-results.json");
