const LOCAL_FALLBACK_URL = "http://127.0.0.1:8000";
const INVALID_PRODUCTION_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

type BackendUrlConfig = {
  configured: boolean;
  hostname: string | null;
  url: string | null;
};

export function getBackendUrlConfig(): BackendUrlConfig {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!rawUrl) {
    if (isProduction) {
      return {
        configured: false,
        hostname: null,
        url: null,
      };
    }

    return {
      configured: false,
      hostname: "127.0.0.1",
      url: LOCAL_FALLBACK_URL,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BackendConfigurationError("NEXT_PUBLIC_API_URL must be a valid absolute URL");
  }

  if (isProduction && INVALID_PRODUCTION_HOSTS.has(parsed.hostname)) {
    throw new BackendConfigurationError(
      `NEXT_PUBLIC_API_URL must not use ${parsed.hostname} in production`,
    );
  }

  return {
    configured: true,
    hostname: parsed.hostname,
    url: rawUrl.replace(/\/+$/, ""),
  };
}

export function requireBackendUrl(): string {
  const config = getBackendUrlConfig();

  if (!config.url) {
    throw new BackendConfigurationError(
      "NEXT_PUBLIC_API_URL is required in production and must point to the Railway backend",
    );
  }

  return config.url;
}
