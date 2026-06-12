// Minimal ambient declaration for `process.env` in Vercel Edge runtime.
// We avoid pulling @types/node — Edge functions only see the env vars
// Vercel explicitly injects.
declare const process: {
  env: Record<string, string | undefined>;
};
