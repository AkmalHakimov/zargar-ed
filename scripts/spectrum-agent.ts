import { Spectrum, type PlatformProviderConfig } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import { whatsappBusiness } from "spectrum-ts/providers/whatsapp-business";
import { processStudentMessage } from "../lib/agent";
import { normalizePlatform, resolveMessagingStudent } from "../lib/photon";

const courseId = process.env.PHOTON_DEFAULT_COURSE_ID ?? process.env.SPECTRUM_DEFAULT_COURSE_ID ?? "course_ai101";

async function main() {
  const providers = buildProviders();
  const cloudConfig = process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET
    ? {
        projectId: process.env.SPECTRUM_PROJECT_ID,
        projectSecret: process.env.SPECTRUM_PROJECT_SECRET
      }
    : {};

  const app = await Spectrum({
    ...cloudConfig,
    providers
  } as Parameters<typeof Spectrum>[0]);

  console.log(`Zargar Spectrum agent online for course ${courseId}. Providers: ${providerNames().join(", ")}`);

  for await (const [space, message] of app.messages) {
    if (message.content.type !== "text") {
      await space.send("I can help with text questions from your course materials. Send me a question in words.");
      continue;
    }

    const platform = normalizePlatform(message.platform);
    const senderId = message.sender?.id ?? message.space?.id ?? "spectrum-user";
    const student = await resolveMessagingStudent({ courseId, platform, senderId });
    const result = await processStudentMessage({
      courseId,
      studentId: student.id,
      message: message.content.text,
      platform
    });

    await space.send(result.response);
  }
}

function providerNames() {
  return (process.env.SPECTRUM_PROVIDERS ?? "terminal")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
}

function buildProviders(): PlatformProviderConfig[] {
  return providerNames().map((provider) => {
    if (provider === "terminal") {
      return terminal.config({
        commands: [
          { name: "/whoami", description: "Show the current messaging identity" }
        ]
      });
    }

    if (provider === "imessage") {
      return process.env.SPECTRUM_IMESSAGE_LOCAL === "true"
        ? imessage.config({ local: true })
        : imessage.config();
    }

    if (provider === "whatsapp") {
      const accessToken = requireEnv("WA_TOKEN");
      const phoneNumberId = requireEnv("WA_NUMBER_ID");
      const appSecret = process.env.WA_SECRET;
      return whatsappBusiness.config({ accessToken, phoneNumberId, appSecret });
    }

    throw new Error(`Unsupported SPECTRUM_PROVIDERS entry: ${provider}`);
  });
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for this Spectrum provider.`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
