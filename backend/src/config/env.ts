import "dotenv/config";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  lineChannelSecret: getEnv("LINE_CHANNEL_SECRET"),
  lineChannelAccessToken: getEnv("LINE_CHANNEL_ACCESS_TOKEN"),
};
