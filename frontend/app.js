function resolveApiBaseUrl() {
  const configuredBaseUrl = document.body.dataset.apiBaseUrl;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (window.location.port === "4000") {
    return window.location.origin;
  }

  return "http://localhost:4000";
}

const API_BASE_URL = resolveApiBaseUrl();

const form = document.getElementById("search-form");
const categorySelect = document.getElementById("category");
const resultMeta = document.getElementById("result-meta");
const resultsBody = document.getElementById("results-body");
const emptyState = document.getElementById("empty-state");
const messageBox = document.getElementById("message-box");
const resetButton = document.getElementById("reset-btn");

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`.trim();
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function buildRow(item) {
  return `
    <tr>
      <td>
        <div class="item-name">${item.name}</div>
        <div class="pill">${item.id}</div>
      </td>
      <td>${item.category}</td>
      <td>${item.supplier}</td>
      <td>${item.stock}</td>
      <td>${currency(item.price)}</td>
    </tr>
  `;
}

function renderResults(items) {
  resultsBody.innerHTML = items.map(buildRow).join("");
  emptyState.classList.toggle("hidden", items.length > 0);
}

function getFormValues() {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function validatePriceRange(values) {
  if (!values.minPrice || !values.maxPrice) {
    return null;
  }

  const min = Number(values.minPrice);
  const max = Number(values.maxPrice);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return "Prices must be valid numbers.";
  }

  if (min > max) {
    return "Min price cannot be greater than max price.";
  }

  return null;
}

async function loadCategories() {
  const response = await fetch(`${API_BASE_URL}/categories`);
  const data = await response.json();

  data.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

async function runSearch() {
  const values = getFormValues();
  const validationError = validatePriceRange(values);

  if (validationError) {
    setMessage(validationError, "error");
    resultMeta.textContent = "Validation error";
    renderResults([]);
    return;
  }

  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value.trim() !== "") {
      params.set(key, value.trim());
    }
  });

  const queryLabel = params.toString() ? `?${params.toString()}` : "(all inventory)";
  resultMeta.textContent = `Searching ${queryLabel}`;
  setMessage(values.q ? `Searching for "${values.q}"...` : "Showing all inventory.", "");

  try {
    const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed.");
    }

    renderResults(data.results);
    resultMeta.textContent = `${data.total} item${data.total === 1 ? "" : "s"} matched`;

    if (data.total === 0) {
      setMessage("No inventory matched the current filters.", "info");
      return;
    }

    setMessage("Results updated successfully.");
  } catch (error) {
    renderResults([]);
    resultMeta.textContent = "Connection issue";
    setMessage(
      "Unable to reach the backend API. Make sure backend/server.js is running on port 4000.",
      "error"
    );
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

resetButton.addEventListener("click", () => {
  form.reset();
  setMessage("Filters cleared. Reloading inventory.");
  runSearch();
});

async function bootstrap() {
  try {
    await loadCategories();
    await runSearch();
  } catch (error) {
    resultMeta.textContent = "Startup issue";
    setMessage(
      "The UI loaded, but categories could not be fetched. Start the backend server first.",
      "error"
    );
  }
}

bootstrap();
