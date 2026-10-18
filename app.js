"use strict";

const STORAGE_KEY = "pocket-ledger-expenses";
const CATEGORIES = [
  "Food & drink",
  "Transport",
  "Home",
  "Shopping",
  "Health",
  "Fun",
  "Other"
];

const formPanel = document.querySelector("#expense-form-panel");
const expenseForm = document.querySelector("#expense-form");
const expenseList = document.querySelector("#expense-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const filteredTotal = document.querySelector("#filtered-total");
const resultCount = document.querySelector("#result-count");
const storageMessage = document.querySelector("#storage-message");
const formMessage = document.querySelector("#form-message");
const categoryFilter = document.querySelector("#category-filter");
const dateFrom = document.querySelector("#date-from");
const dateTo = document.querySelector("#date-to");
const expenseName = document.querySelector("#expense-name");
const expenseAmount = document.querySelector("#expense-amount");
const expenseDate = document.querySelector("#expense-date");
const formTitle = document.querySelector("#form-title");
const saveButton = document.querySelector("#save-expense");

let expenses = readExpenses();
let editingId = null;

function todayAsString() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR"
  }).format(amount);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function readExpenses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved expenses are not a list.");

    const validExpenses = parsed.filter((expense) =>
      expense &&
      typeof expense.id === "string" &&
      typeof expense.name === "string" &&
      Number.isFinite(expense.amount) &&
      expense.amount > 0 &&
      CATEGORIES.includes(expense.category) &&
      /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
    );

    if (validExpenses.length !== parsed.length) {
      storageMessage.textContent = "Some saved entries could not be read and were left out.";
    }

    return validExpenses;
  } catch (error) {
    storageMessage.textContent = "Saved expenses could not be loaded. You can still add new entries.";
    console.error("Could not load saved expenses:", error);
    return [];
  }
}

function saveExpenses(nextExpenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextExpenses));
    expenses = nextExpenses;
    storageMessage.textContent = "";
    renderExpenses();
    return true;
  } catch (error) {
    storageMessage.textContent = "Your change could not be saved. Check your browser storage settings and try again.";
    console.error("Could not save expenses:", error);
    return false;
  }
}

function getVisibleExpenses() {
  return expenses
    .filter((expense) => !categoryFilter.value || expense.category === categoryFilter.value)
    .filter((expense) => !dateFrom.value || expense.date >= dateFrom.value)
    .filter((expense) => !dateTo.value || expense.date <= dateTo.value)
    .sort((first, second) => {
      const byDate = second.date.localeCompare(first.date);
      return byDate || second.id.localeCompare(first.id);
    });
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createExpenseRow(expense) {
  const item = makeElement("li", "expense-item");
  const main = makeElement("div", "expense-main");
  const mark = makeElement("span", "category-mark", expense.category.slice(0, 1));
  mark.setAttribute("aria-hidden", "true");

  const details = makeElement("div");
  details.append(
    makeElement("p", "expense-name", expense.name),
    makeElement("p", "expense-date", formatDate(expense.date))
  );
  main.append(mark, details);

  const category = makeElement("span", "expense-category", expense.category);
  const amount = makeElement("p", "expense-amount", formatCurrency(expense.amount));

  const actions = makeElement("div", "expense-actions");
  const editButton = makeElement("button", "expense-action", "Edit");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.dataset.id = expense.id;
  editButton.setAttribute("aria-label", `Edit ${expense.name}`);

  const deleteButton = makeElement("button", "expense-action expense-action-delete", "Delete");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = expense.id;
  deleteButton.setAttribute("aria-label", `Delete ${expense.name}`);

  actions.append(editButton, deleteButton);
  item.append(main, category, amount, actions);
  return item;
}

function renderExpenses() {
  const visibleExpenses = getVisibleExpenses();
  const total = visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  filteredTotal.textContent = formatCurrency(total);
  resultCount.textContent = `${visibleExpenses.length} ${visibleExpenses.length === 1 ? "expense" : "expenses"}`;
  expenseList.replaceChildren(...visibleExpenses.map(createExpenseRow));

  const noSavedExpenses = expenses.length === 0;
  emptyState.hidden = visibleExpenses.length > 0;
  expenseList.hidden = visibleExpenses.length === 0;
  emptyTitle.textContent = noSavedExpenses ? "Nothing here just yet" : "No expenses match";
  emptyCopy.textContent = noSavedExpenses
    ? "Add your first expense and it will show up here."
    : "Try changing the category or date range.";
  document.querySelector("#empty-add").hidden = !noSavedExpenses;
}

function openForm(expense) {
  editingId = expense ? expense.id : null;
  expenseForm.reset();
  formMessage.textContent = "";
  formTitle.textContent = expense ? "Edit this expense" : "Add an expense";
  saveButton.textContent = expense ? "Save changes" : "Save expense";
  expenseDate.value = expense ? expense.date : todayAsString();
  if (expense) {
    expenseName.value = expense.name;
    expenseAmount.value = expense.amount.toFixed(2);
    document.querySelector("#expense-category").value = expense.category;
  }
  formPanel.hidden = false;
  expenseName.focus();
  formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
  formPanel.hidden = true;
  expenseForm.reset();
  formMessage.textContent = "";
  editingId = null;
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

document.querySelector("#add-expense").addEventListener("click", () => openForm());
document.querySelector("#empty-add").addEventListener("click", () => openForm());
document.querySelector("#close-form").addEventListener("click", closeForm);
document.querySelector("#cancel-form").addEventListener("click", closeForm);

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const name = expenseName.value.trim();
  const amount = Number(expenseAmount.value);
  const category = document.querySelector("#expense-category").value;
  const date = expenseDate.value;

  if (!name || !Number.isFinite(amount) || amount <= 0 || !CATEGORIES.includes(category) || !date) {
    formMessage.textContent = "Add a description, a positive amount, a category, and a date.";
    return;
  }

  const currentExpense = expenses.find((expense) => expense.id === editingId);
  const updatedExpense = {
    id: editingId || createId(),
    name,
    amount: Math.round(amount * 100) / 100,
    category,
    date
  };

  const nextExpenses = currentExpense
    ? expenses.map((expense) => expense.id === editingId ? updatedExpense : expense)
    : [...expenses, updatedExpense];

  if (saveExpenses(nextExpenses)) closeForm();
});

expenseList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const expense = expenses.find((item) => item.id === button.dataset.id);
  if (!expense) return;

  if (button.dataset.action === "edit") {
    openForm(expense);
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Remove "${expense.name}" from your expenses?`);
    if (confirmed) {
      saveExpenses(expenses.filter((item) => item.id !== expense.id));
    }
  }
});

[categoryFilter, dateFrom, dateTo].forEach((filter) => {
  filter.addEventListener("change", renderExpenses);
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  categoryFilter.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  renderExpenses();
});

renderExpenses();
