import { loadServerEnv, EnvValidationError } from "@dmh/config";

try {
  loadServerEnv(process.env);
  console.log("OK: environnement complet");
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
