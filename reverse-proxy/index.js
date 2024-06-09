const express = require("express");
const app = express();
const PORT = process.env.PORT || 9000;
const httpProxy = require("http-proxy");
const BASE_PATH = process.env.BASE_PATH;
const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  const urlResolvesTo = `${BASE_PATH}/${subdomain}`;

  proxy.web(req, res, { target: urlResolvesTo, changeOrigin: true }, (err) => {
    if (err) {
      res.status(404).json({
        message: "Not Found",
      });
    }
  });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

proxy.on("proxyRes", (proxyRes, req, res) => {
  if (proxyRes.statusCode >= 400) {
    res.status(404).json({
      message: "Not Found",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
