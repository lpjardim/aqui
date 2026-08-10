import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// `SHADOW_DATABASE_URL` só existe em desenvolvimento local (usada por
// `prisma migrate diff`); em produção (Vercel) não está definida, e o
// helper `env()` da Prisma rebenta se a variável não existir — por isso lê-se
// diretamente de `process.env` em vez de `env()`, que fica só para a
// obrigatória `DATABASE_URL`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
