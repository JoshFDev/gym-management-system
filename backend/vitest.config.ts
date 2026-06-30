import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        extensions: [".js", ".ts", ".json"],
    },
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./src/__tests__/setup.ts"],
        testTimeout: 30000,
        hookTimeout: 30000,
        include: ["src/__tests__/**/*.test.ts"],
    },
});
