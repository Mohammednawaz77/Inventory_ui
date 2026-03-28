const http = require("http");
const { URL } = require("url");
const inventory = require("./data/inventory");

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  response.end(JSON.stringify(payload, null, 2));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function filterInventory(items, filters) {
  const query = normalize(filters.q);
  const category = normalize(filters.category);
  const minPrice = toNumber(filters.minPrice);
  const maxPrice = toNumber(filters.maxPrice);

  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    return {
      error: "minPrice and maxPrice must be valid numbers.",
      results: [],
    };
  }

  if (
    minPrice !== null &&
    maxPrice !== null &&
    minPrice > maxPrice
  ) {
    return {
      error: "minPrice cannot be greater than maxPrice.",
      results: [],
    };
  }

  const results = items.filter((item) => {
    const matchesQuery = query
      ? item.name.toLowerCase().includes(query)
      : true;
    const matchesCategory = category
      ? item.category.toLowerCase() === category
      : true;
    const matchesMin = minPrice !== null ? item.price >= minPrice : true;
    const matchesMax = maxPrice !== null ? item.price <= maxPrice : true;

    return matchesQuery && matchesCategory && matchesMin && matchesMax;
  });

  return { error: null, results };
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/search") {
    const filters = Object.fromEntries(requestUrl.searchParams.entries());
    const { error, results } = filterInventory(inventory, filters);

    if (error) {
      sendJson(response, 400, {
        ok: false,
        error,
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      total: results.length,
      filters: {
        q: filters.q || "",
        category: filters.category || "",
        minPrice: filters.minPrice || "",
        maxPrice: filters.maxPrice || "",
      },
      results,
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/categories") {
    const categories = [...new Set(inventory.map((item) => item.category))].sort();
    sendJson(response, 200, {
      ok: true,
      categories,
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "inventory-search-api",
    });
    return;
  }

  sendJson(response, 404, {
    ok: false,
    error: "Route not found.",
  });
});

server.listen(PORT, () => {
  console.log(`Inventory API running on http://localhost:${PORT}`);
});
