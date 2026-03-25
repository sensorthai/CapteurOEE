module.exports = {
  apps : [{
    name: "OEEServer",
    script: "./dist/server.cjs",
    env: {
      PORT: 3002
    }
  }]
}