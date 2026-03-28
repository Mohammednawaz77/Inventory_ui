const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const FRONTEND_ROOT = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function resolveFilePath(requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  return path.join(FRONTEND_ROOT, safePath);
}

const server = http.createServer((request, response) => {
  const filePath = resolveFilePath(request.url);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Frontend file not found.");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "text/plain; charset=utf-8",
    });
    response.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
});
