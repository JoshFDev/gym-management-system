const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
    version: "2.0.0",
});
