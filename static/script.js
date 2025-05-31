// Constants
const DEBOUNCE_DELAY = 300;

let numberOfPipes = 0;

// State management
let ingredientsData = [];
let selectedIngredients = [];
let savedIngredients = []; // New global array for saved ingredients
let activeMenu = "availableCocktails";

let selectedCocktailID = null;

// Global variable for cocktail ingredients
let selectedCocktailIngredients = [];
let selectedingforcocktail = [];
let assignedPipelines = {}; // Global object to keep track of assigned pipelines
let extraIngredients = []; // Global array to hold extra ingredients
let currentPipeAssignments = {}; // Store current pipe assignments

// Global variable to store ingredient remarks
let ingredientRemarks = {};

// Add event listener for the "Add Remark" button
document.addEventListener("DOMContentLoaded", () => {
  const addRemarkButton = document.getElementById("add-remark-button");
  const closeRemarkPopup = document.getElementById("closeRemarkPopup");
  const saveRemarksButton = document.getElementById("save-remarks");

  if (addRemarkButton) {
    addRemarkButton.addEventListener("click", showRemarkPopup);
  }

  if (closeRemarkPopup) {
    closeRemarkPopup.addEventListener("click", hideRemarkPopup);
  }

  if (saveRemarksButton) {
    saveRemarksButton.addEventListener("click", saveIngredientRemarks);
  }

  // Load remarks from db.json when the page loads
  loadRemarksFromDB();
});

// Function to load remarks from db.json
async function loadRemarksFromDB() {
  try {
    const response = await fetch("db.json");
    const ingredients = await response.json();

    // Clear the ingredientRemarks object
    ingredientRemarks = {};

    // Populate the ingredientRemarks object with remarks from db.json
    ingredients.forEach((ingredient) => {
      if (ingredient.ING_Remark && ingredient.ING_Remark.trim() !== "") {
        ingredientRemarks[ingredient.ING_Name] = ingredient.ING_Remark;
      }
    });

    console.log("Loaded remarks from db.json:", ingredientRemarks);
    
    // Update the UI to display the loaded remarks
    updateRemarksDisplay();
    updatePipelineRemarksDisplay();
  } catch (error) {
    console.error("Error loading remarks from db.json:", error);
  }
}

// Function to show the remark popup
function showRemarkPopup() {
  // Check if there are any pipeline-assigned ingredients
  const assignedIngredients = Object.values(currentPipeAssignments).filter(
    Boolean
  );

  if (assignedIngredients.length === 0) {
    showCustomAlert(
      "No ingredients assigned to pipes. Please assign ingredients to pipes first."
    );
    return;
  }

  const remarkPopup = document.getElementById("remarkPopup");
  const selectedIngredientsList = document.getElementById(
    "selected-ingredients-list"
  );

  // Clear previous content
  selectedIngredientsList.innerHTML = "";

  // Add each pipeline-assigned ingredient to the list with a remark field
  assignedIngredients.forEach((ingredientName) => {
    const ingredientItem = document.createElement("div");
    ingredientItem.className = "ingredient-remark-item";

    const existingRemark = ingredientRemarks[ingredientName] || "";

    // Find which pipe this ingredient is assigned to
    const pipeNumber = Object.entries(currentPipeAssignments).find(
      ([pipe, ing]) => ing === ingredientName
    )[0];

    ingredientItem.innerHTML = `
      <h3>${pipeNumber} : ${ingredientName}</h3>
      <textarea 
        class="ingredient-remark-textarea" 
        placeholder="Add remark for this ingredient" 
        data-ingredient="${ingredientName}"
      >${existingRemark}</textarea>
    `;

    selectedIngredientsList.appendChild(ingredientItem);
  });

  // Show the popup
  remarkPopup.style.display = "flex";
}

// Function to hide the remark popup
function hideRemarkPopup() {
  const remarkPopup = document.getElementById("remarkPopup");
  remarkPopup.style.display = "none";
}

// Function to save the ingredient remarks to db.json
async function saveIngredientRemarks() {
  const textareas = document.querySelectorAll(".ingredient-remark-textarea");
  const updatedIngredients = [];

  // Update the ingredientRemarks object with values from textareas
  textareas.forEach((textarea) => {
    const ingredientName = textarea.getAttribute("data-ingredient");
    const remarkText = textarea.value.trim();

    if (remarkText) {
      ingredientRemarks[ingredientName] = remarkText;
    } else {
      // If remark is empty, remove it from the object
      delete ingredientRemarks[ingredientName];
    }
  });

  try {
    // Fetch all ingredients from db.json
    const response = await fetch("db.json");
    const ingredients = await response.json();

    // Update the ingredients with remarks
    ingredients.forEach((ingredient) => {
      // If this ingredient has a remark in our object, add it to the ingredient
      if (ingredientRemarks[ingredient.ING_Name]) {
        ingredient.ING_Remark = ingredientRemarks[ingredient.ING_Name];
      } else {
        // If no remark, ensure the field exists but is empty
        ingredient.ING_Remark = "";
      }

      updatedIngredients.push(ingredient);
    });

    // Save the updated ingredients back to db.json through the server
    const saveResponse = await fetch("/updateIngredients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedIngredients),
    });

    if (saveResponse.ok) {
      // Hide the popup
      hideRemarkPopup();

      // Show confirmation message
      showCustomAlert("Remarks saved successfully!");

      // Refresh the ingredients display to show the updated remarks
      await fetchIngredients();
      
      // Reload remarks from db.json to ensure they are up to date
      await loadRemarksFromDB();

      // Update the pipeline remarks display
      updatePipelineRemarksDisplay();
    } else {
      const errorText = await saveResponse.text();
      showCustomAlert("Failed to save remarks. Server response: " + errorText);
    }
  } catch (error) {
    console.error("Error saving remarks:", error);
    showCustomAlert("An error occurred while saving remarks: " + error.message);
  }
}

// Function to update the pipeline remarks display
function updatePipelineRemarksDisplay() {
  // Create or update the remarks container
  let remarksContainer = document.getElementById("pipeline-remarks-container");
  if (!remarksContainer) {
    remarksContainer = document.createElement("div");
    remarksContainer.id = "pipeline-remarks-container";
    remarksContainer.className = "pipeline-remarks-container";

    // Find the parent container to append to (in the Assign Pipe section)
    const parentContainer = document.querySelector(".assign-pipe .content");
    if (parentContainer) {
      parentContainer.appendChild(remarksContainer);
    } else {
      return; // Exit if we can't find the container
    }
  }

  // Clear the container
  remarksContainer.innerHTML = "";

  // Add a heading
  const heading = document.createElement("h3");
  heading.textContent = "Pipeline Ingredient Remarks";
  remarksContainer.appendChild(heading);

  // Check if there are any pipeline ingredients with remarks
  let hasRemarks = false;

  // Get all assigned ingredients from currentPipeAssignments
  const assignedIngredients = Object.values(currentPipeAssignments).filter(
    Boolean
  );

  // Add remarks for pipeline ingredients
  assignedIngredients.forEach((ingredientName) => {
    if (ingredientRemarks[ingredientName]) {
      hasRemarks = true;

      const remarkItem = document.createElement("div");
      remarkItem.className = "pipeline-remark-item";

      // Find which pipe this ingredient is assigned to
      const pipeNumber = Object.entries(currentPipeAssignments).find(
        ([pipe, ing]) => ing === ingredientName
      )[0];

      remarkItem.innerHTML = `
        <h4>${pipeNumber}: ${ingredientName}</h4>
        <p>${ingredientRemarks[ingredientName]}</p>
      `;

      remarksContainer.appendChild(remarkItem);
    }
  });

  // If no remarks, show a message
  if (!hasRemarks) {
    const noRemarks = document.createElement("p");
    noRemarks.className = "no-remarks";
    noRemarks.textContent = "No remarks for pipeline ingredients";
    remarksContainer.appendChild(noRemarks);
  }

  // Show or hide the container based on whether there are pipeline ingredients
  remarksContainer.style.display =
    assignedIngredients.length > 0 ? "block" : "none";
}

// Call this function whenever pipe assignments change
function setupPipeDropdown(pipeNumber) {

  // Modify the option selection handler to update remarks display
  optionsContainer.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("option") &&
      !e.target.classList.contains("disabled")
    ) {
      const value = e.target.dataset.value;
      searchInput.value = e.target.textContent;
      currentPipeAssignments[`Pipe ${pipeNumber}`] = value;
      optionsContainer.style.display = "none";
      clearButton.style.display = value ? "block" : "none";

      // Remove error class when assigning an ingredient
      const pipeContainer = document.getElementById(
        `pipeContainer${pipeNumber}`
      );
      if (pipeContainer) {
        pipeContainer.classList.remove("pipe-error");
      }

      populateAssignPipeDropdowns();
      updatePipelineRemarksDisplay(); // Update the remarks display
    }
  });

}

// Global object to store notes for individual pipelines
let pipelineNotes = {};

// Function to add the "Add Note" button to each pipe dropdown container
function addNoteButtonToPipeDropdown(pipeNumber) {
  const pipeContainer = document.getElementById(`pipeContainer${pipeNumber}`);
  if (!pipeContainer) return;

  // Check if button already exists
  if (pipeContainer.querySelector(".add-note-btn")) return;

  // Create the Add Note button
  const addNoteBtn = document.createElement("button");
  addNoteBtn.className = "add-note-btn";
  addNoteBtn.textContent = "Add Note";

  // Add click event to show note popup
  addNoteBtn.addEventListener("click", (event) => {
    event.preventDefault();
    showNotePopup(pipeNumber);
  });

  // Append button to the pipe container
  pipeContainer.appendChild(addNoteBtn);
}

// Function to show the note popup for a specific pipe
function showNotePopup(pipeNumber) {
  // Get the current pipe assignments from config.json
  fetch('/config.json')
    .then(response => response.json())
    .then(config => {
      const ingredientName = config.pipeConfig[`Pipe ${pipeNumber}`];
      if (!ingredientName) return;

      // Get the current remark from db.json
      return fetch('/db.json')
        .then(response => response.json())
        .then(ingredients => {
          const ingredient = ingredients.find(ing => ing.ING_Name === ingredientName);
          const currentRemark = ingredient ? ingredient.ING_Remark : '';
          
          document.getElementById('currentPipeName').textContent = `Pipe ${pipeNumber}`;
          document.getElementById('pipeNoteTextarea').value = currentRemark;
          document.getElementById('notePopup').style.display = 'block';
        });
    })
    .catch(error => console.error('Error loading config:', error));
}

// Function to hide the note popup
function hideNotePopup() {
  document.getElementById("notePopup").style.display = "none";
}

// Function to save the note for a specific pipe
function savePipelineNote() {
  const pipeNumber = document.getElementById('currentPipeName').textContent.split(' ')[1];
  
  // Get the current pipe assignments from config.json
  fetch('/config.json')
    .then(response => response.json())
    .then(config => {
      const ingredientName = config.pipeConfig[`Pipe ${pipeNumber}`];
      if (!ingredientName) return;

      const newRemark = document.getElementById('pipeNoteTextarea').value;

      // Load current db.json
      return fetch('/db.json')
        .then(response => response.json())
        .then(ingredients => {
          // Update the remark for the ingredient
          const updatedIngredients = ingredients.map(ing => {
            if (ing.ING_Name === ingredientName) {
              return { ...ing, ING_Remark: newRemark };
            }
            return ing;
          });

          // Save back to db.json
          return fetch('/updateIngredients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedIngredients)
          });
        });
    })
    .then(response => {
      if (response.ok) {
        hideNotePopup();
        // Reload the page to show updated remarks
        loadConfig();
      }
    })
    .catch(error => console.error('Error saving remark:', error));
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupCocktailIngredientHandlers();
  fetchIngredientsForCocktail(); // Load cocktail ingredients
});

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function checkActiveMenu() {
  // Show the appropriate section based on activeMenu
  if (activeMenu === "addIngredients") {
    showAddIngredients();
  } else if (activeMenu === "addCocktail") {
    showAddCocktail();
  } else if (activeMenu === "allCocktails") {
    showAllCocktails();
  } else if (activeMenu === "cocktailDetails") {
    showCocktailDetails();
  } else if (activeMenu === "findCocktail") {
    showSelectIng();
  } else if (activeMenu === "availableCocktails") {
    showAvailableCocktails();
  } else if (activeMenu === "assignPipe") {
    showAssignPipe();
  } else {
    showAvailableCocktails(); // Default
  }
}

function initializeApp() {
  fetchIngredients();
  setupEventListeners();
  checkActiveMenu();
  loadRemarksFromDB(); // Load remarks from db.json when the page is loaded
}

function setupCocktailIngredientHandlers() {
  // Setup search functionality for cocktail ingredients
  const cocktailSearch = document.getElementById("cocktail-ingredient-search");
  if (cocktailSearch) {
    cocktailSearch.addEventListener(
      "input",
      debounce(() => {
        const searchInput = cocktailSearch.value;
        fetchIngredientsForCocktail(searchInput);
      }, DEBOUNCE_DELAY)
    );
  }

  // Setup filter functionality for cocktail ingredients
  document.querySelectorAll("#ing-filter-cocktail a").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const selectedType = button.getAttribute("data-type");

      // Update active/deactive classes
      document.querySelectorAll("#ing-filter-cocktail a").forEach((btn) => {
        if (btn === button) {
          btn.classList.add("active");
          btn.classList.remove("deactive");
        } else {
          btn.classList.remove("active");
          btn.classList.add("deactive");
        }
      });
      updateButtonStyles();
      filterCocktailIngredientsByType(selectedType);
    });
  });
}

async function getNextProductId() {
  try {
    const response = await fetch("products.json");
    const products = await response.json();
    const highestId = products.reduce((max, product) => {
      const productId = parseInt(product.PID); // Changed from product.id to product.PID
      return productId > max ? productId : max;
    }, 0);
    const nextId = highestId + 1;
    const productIdInput = document.getElementById("product-id");
    if (productIdInput) {
      productIdInput.value = nextId; // Changed from value to textContent
    }
    return nextId;
  } catch (error) {
    console.error("Error getting next product ID:", error);
    return null;
  }
}

// Call getNextProductId when the page loads
document.addEventListener("DOMContentLoaded", () => {
  getNextProductId();
});

// Modify the fetchIngredientsForCocktail function to display remarks
async function fetchIngredientsForCocktail(searchTerm = "") {
  try {
    const ingredients = await fetchIngredientsData();
    ingredients.sort((a, b) => a.ING_Name.localeCompare(b.ING_Name));
    
    // Update the ingredientRemarks object with remarks from the loaded ingredients
    ingredients.forEach((ingredient) => {
      if (ingredient.ING_Remark && ingredient.ING_Remark.trim() !== "") {
        ingredientRemarks[ingredient.ING_Name] = ingredient.ING_Remark;
      }
    });
    
    const container = document.getElementById(
      "cocktail-ingredients-container1"
    );
    container.innerHTML = "";
    selectedingforcocktail = [];
    ingredients.forEach((ingredient) => {
      if (
        searchTerm === "" ||
        ingredient.ING_Name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        const ingDiv = document.createElement("div");
        ingDiv.classList.add("ing-item");
        const label = document.createElement("label");
        label.classList.add("btn-checkbox");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("checkbox");
        checkbox.dataset.ingredientId = ingredient.ING_ID;
        checkbox.dataset.ingredientName = ingredient.ING_Name;
        if (
          selectedCocktailIngredients.some(
            (ing) => ing.ING_Name === ingredient.ING_Name
          )
        ) {
          checkbox.checked = true;
          selectedingforcocktail.push(ingredient.ING_Name);
          console.log(`Ingredient ${ingredient.ING_Name} is already selected.`);
        }
        checkbox.addEventListener("change", (event) => {
          handleCocktailIngredientSelection(event, ingredient);
          if (event.target.checked) {
            if (!selectedingforcocktail.includes(ingredient.ING_Name)) {
              selectedingforcocktail.push(ingredient.ING_Name);
            }
          } else {
            selectedingforcocktail = selectedingforcocktail.filter(
              (name) => name !== ingredient.ING_Name
            );
          }
          const counterElement = document.getElementById("cicount");
          counterElement.textContent = `${selectedCocktailIngredients.length}`;
          console.log(
            `SelectedCocktailIngredients ${selectedCocktailIngredients.length}`
          );
          console.log(
            `selectedingforcocktail ${selectedingforcocktail.length}`
          );
          updateRemarksDisplay();
        });
        const img = document.createElement("img");
        img.src = ingredient.ING_IMG || "img/ing2.gif";
        img.alt = `Ingredient - ${ingredient.ING_Name}`;
        
        const namePara = document.createElement("p");
        namePara.textContent = ingredient.ING_Name;

        // Create measurement input
        const measurementInput = document.createElement("input");
        measurementInput.type = "text";
        measurementInput.className = "ingredient-measurement-input";
        measurementInput.setAttribute("data-ingredient", ingredient.ING_Name);
        measurementInput.placeholder = "Enter measurement (ml)";
        
        // Set initial value if ingredient is already selected
        const selectedIng = selectedCocktailIngredients.find(
          ing => ing.ING_Name === ingredient.ING_Name
        );
        if (selectedIng && selectedIng.ING_ML) {
          measurementInput.value = selectedIng.ING_ML;
        }

        label.appendChild(checkbox);
        label.appendChild(img);
        label.appendChild(namePara);
        label.appendChild(measurementInput);
        ingDiv.appendChild(label);

        // Add remark if available
        if (ingredient.ING_Remark && ingredient.ING_Remark.trim() !== "") {
          const remarkDiv = document.createElement("div");
          remarkDiv.className = "remark-text";
          remarkDiv.textContent = ingredient.ING_Remark;
          ingDiv.appendChild(remarkDiv);
        }

        container.appendChild(ingDiv);
      }
    });

    updateRemarksDisplay();
  } catch (error) {
    console.error("Error fetching ingredients for cocktail:", error);
  }
}

// Function to update the remarks display in the cocktail-ingredients-container1
function updateRemarksDisplay() {
  // Create or update the remarks container
  let remarksContainer = document.getElementById(
    "ingredient-remarks-container"
  );
  if (!remarksContainer) {
    remarksContainer = document.createElement("div");
    remarksContainer.id = "ingredient-remarks-container";
    remarksContainer.className = "ingredient-remarks-container";

    // Find the parent container to append to
    const parentContainer = document.getElementById(
      "cocktail-ingredients-container1"
    ).parentNode;
    parentContainer.appendChild(remarksContainer);
  }

  // Clear the container
  remarksContainer.innerHTML = "";

  // Add a heading
  const heading = document.createElement("h3");
  heading.textContent = "Selected Ingredient Remarks";
  remarksContainer.appendChild(heading);

  // Check if there are any selected ingredients with remarks
  let hasRemarks = false;

  // Add remarks for selected ingredients
  selectedingforcocktail.forEach((ingredientName) => {
    if (ingredientRemarks[ingredientName]) {
      hasRemarks = true;

      const remarkItem = document.createElement("div");
      remarkItem.className = "selected-remark-item";

      remarkItem.innerHTML = `
        <h4>${ingredientName}</h4>
        <p>${ingredientRemarks[ingredientName]}</p>
      `;

      remarksContainer.appendChild(remarkItem);
    }
  });

  // If no remarks, show a message
  if (!hasRemarks) {
    const noRemarks = document.createElement("p");
    noRemarks.className = "no-remarks";
    noRemarks.textContent = "No remarks for selected ingredients";
    remarksContainer.appendChild(noRemarks);
  }

  // Show or hide the container based on whether there are selected ingredients
  remarksContainer.style.display =
    selectedingforcocktail.length > 0 ? "block" : "none";
}

function handleCocktailIngredientSelection(event, ingredient) {
  if (event.target.checked) {
    selectedCocktailIngredients.push({
      ING_ID: ingredient.ING_ID,
      ING_Name: ingredient.ING_Name,
    });
    console.log(
      "Added ingredient to selectedCocktailIngredients:",
      ingredient.ING_Name
    );
  } else {
    selectedCocktailIngredients = selectedCocktailIngredients.filter(
      (ing) => ing.ING_ID !== ingredient.ING_ID
    );
    console.log(
      "Removed ingredient from selectedCocktailIngredients:",
      ingredient.ING_Name
    );
  }
}

function filterCocktailIngredientsByType(type) {
  const ingredients = document.querySelectorAll(
    "#cocktail-ingredients-container1 .ing-item"
  );
  ingredients.forEach((item) => {
    if (type === "all") {
      item.style.display = "flex";
    } else {
      const ingredientName = item.querySelector("p").textContent;
      const ingredient = ingredientsData.find(
        (ing) => ing.ING_Name === ingredientName
      );
      if (
        ingredient &&
        ingredient.ING_Type.toLowerCase() === type.toLowerCase()
      ) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    }
  });
}

function setupEventListeners() {
  // Ingredient filter buttons
  document.querySelectorAll(".ing-filter a").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const selectedType = button.getAttribute("data-type");

      // Remove active class from all buttons and add it to the clicked button
      document
        .querySelectorAll(".ing-filter a")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Call filter function with the selected type
      filterIngredientsByType(selectedType);
    });
  });

  async function ShowProductsFunc() {
    // First, show the Assign Pipeline section

    // Check if there are selected ingredients
    if (selectedIngredients.length === 0) {
      showCustomAlert(
        "No ingredients selected. Please select at least one ingredient."
      );
      return; // Exit if no ingredients are selected
    }

    showAssignPipe(); // This will display the Assign Pipeline section

    // Get the number of pipes from the input field
    const numPipes = parseInt(numPipesInput.value);

    // If numPipes is not set or invalid, default to 1
    if (isNaN(numPipes) || numPipes < 1 || numPipes > 100) {
      numPipesInput.value = 1; // Reset to 1 if invalid
    }

    // Populate the dropdowns in the Assign Pipeline section with selected ingredients
    populateAssignPipeDropdowns();
  }

  document
    .getElementById("showProducts")
    .addEventListener("click", async () => {
      ShowProductsFunc();
    });

  // Check which menu should be active
  if (activeMenu === "addIngredients") {
    showAddIngredients();
  } else if (activeMenu === "addCocktail") {
    showAddCocktail();
  } else if (activeMenu === "allCocktails") {
    showAllCocktails(); // Default to All Cocktails
  } else if (activeMenu === "cocktailDetails") {
    showCocktailDetails(); // Default to Cocktail Details
  } else if (activeMenu === "availableCocktails") {
    showAvailableCocktails();
  } else if (activeMenu === "assignPipe") {
    showAssignPipe();
  } else {
    showAvailableCocktails(); // Default
  }
  // Set up event listeners for buttons
  document
    .getElementById("add-new-btn")
    .addEventListener("click", function (event) {
      event.preventDefault();
      showAddIngredients();
    });

  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
  function handleSearchInput() {
    const searchInput = document.getElementById("ingredient-search").value;
    fetchIngredients(searchInput);
  }

  // Set up event listener for search input
  document
    .getElementById("ingredient-search")
    .addEventListener("input", debounce(handleSearchInput, 300));

  // Add click handler for ingredient search
  document
    .getElementById("ingredient-search")
    .addEventListener("click", function() {
      this.value = "";
      fetchIngredients("");
    });

  // Add click handler for cocktail ingredient search
  document
    .getElementById("cocktail-ingredient-search")
    .addEventListener("click", function() {
      this.value = "";
      fetchIngredientsForCocktail("");
    });

  // Fetch ingredients ID when the DOM is loaded
  fetchIngredientsID();
} // Close setupEventListeners

// Toggle visibility of sections
const selectIngBtn = document.getElementById("selectIngBtn");
const addIngredientsBtn = document.getElementById("addIngredientsBtn");
const addCocktailBtn = document.getElementById("addCocktailBtn");
const allCocktailsBtn = document.getElementById("allCocktailsBtn");
const availableCocktailsBtn = document.getElementById("availableCocktailsBtn");
const cotailInfoBtn = document.getElementById("cotailInfo"); // New button
const assignPipeBtn = document.getElementById("assignPipeBtn");
const cocktailIDEle = document.getElementById("cocktail-id");

const findIngSection = document.querySelector(".find-ing");
const addIngSection = document.querySelector(".add-ing");
const addCocktailSection = document.querySelector(".add-cocktail");
const allCocktailSection = document.querySelector(".all-cocktail");
const cocktailDetailsSection = document.querySelector(".cocktail-details"); // New section for cocktail details
const availableCocktailsSection = document.querySelector(
  ".available-cocktails"
);
const assignPipeSection = document.querySelector(".assign-pipe");

async function showAvailableCocktails() {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "block";
  cocktailDetailsSection.style.display = "none";
  assignPipeSection.style.display = "none";
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.add("active");
  availableCocktailsBtn.classList.remove("deactive");
  assignPipeBtn.classList.add("deactive");
  assignPipeBtn.classList.remove("active");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active");
  cotailInfoBtn.classList.add("deactive");
  document.getElementById("back-button-all-cocktail").style.display = "none";
  updateButtonStyles();

  // Fetch both cocktails and ingredients data
  const [cocktails, ingredients] = await Promise.all([
    fetchCocktails(),
    fetchIngredientsData()
  ]);

  // Create a map of ingredient names to their types for quick lookup
  const ingredientTypes = {};
  ingredients.forEach(ing => {
    ingredientTypes[ing.ING_Name] = ing.ING_Type;
  });

  // Filter cocktails based on saved ingredients, only checking ml measurements
  const filteredCocktails = cocktails.filter((cocktail) => {
    return cocktail.PIng.every((ingredient) => {
      // If it's a garnish ingredient, don't check if it's available
      if (ingredientTypes[ingredient.ING_Name] === "Garnish") {
        return true;
      }
      
      // Check if the ingredient has ml measurement
      const hasMLMeasurement = ingredient.ING_ML && ingredient.ING_ML.toLowerCase().includes('ml');
      
      // If it's not measured in ml, treat it as optional
      if (!hasMLMeasurement) {
        return true;
      }
      
      // For ml measurements, check if the ingredient is available
      return savedIngredients.includes(ingredient.ING_Name);
    });
  });

  const cocktailListContainer = document.querySelector(".cocktail-list");
  cocktailListContainer.innerHTML = ""; // Clear existing content

  // Check if there are any filtered cocktails
  if (filteredCocktails.length === 0) {
    const noCocktailMessage = document.createElement("p");
    noCocktailMessage.className = "no-cocktail-message";
    noCocktailMessage.textContent = "No Cocktails Found, Please Assign Proper Ingredients";
    cocktailListContainer.appendChild(noCocktailMessage);
  } else {
    // Display filtered cocktails
    displayCocktails(filteredCocktails);
  }
}

// Function to show the "Assign Pipe" section
function showAssignPipe() {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "none"; // Hide Cocktail Details section
  assignPipeSection.style.display = "block";
  availableCocktailsSection.style.display = "none";
  document.getElementById("pipeAssignContainer").style.display = "block"; // Show the Assign Pipeline section

  assignPipeBtn.classList.add("active");
  assignPipeBtn.classList.remove("deactive");
  // Update button states
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active"); // Remove active from Cocktail Info
  cotailInfoBtn.classList.add("deactive");
  updateButtonStyles();
}

// Function to show the "Find Cocktail" section
function showSelectIng() {
  fetchIngredients();
  updateSelectedCount();
  findIngSection.style.display = "block";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "none"; // Hide Cocktail Details section
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  assignPipeSection.style.display = "none";
  assignPipeBtn.classList.remove("deactive");
  assignPipeBtn.classList.add("active");
  selectIngBtn.classList.add("active");
  selectIngBtn.classList.remove("deactive");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active"); // Remove active from Cocktail Info
  cotailInfoBtn.classList.add("deactive");

  updateButtonStyles();
}

// Function to show the "Add Ingredients" section
function showAddIngredients() {
  findIngSection.style.display = "none";
  addIngSection.style.display = "block";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "none";
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  assignPipeSection.style.display = "none";
  assignPipeBtn.classList.remove("active");
  assignPipeBtn.classList.add("deactive");
  addIngredientsBtn.classList.add("active");
  addIngredientsBtn.classList.remove("deactive");
  selectIngBtn.classList.remove("active");
  selectIngBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active");
  cotailInfoBtn.classList.add("deactive");
  updateButtonStyles();
  fetchIngredientsID();
}

// Function to show the "Cocktail Details" section
function showCocktailDetails() {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "block"; // Show Cocktail Details section
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  assignPipeSection.style.display = "none";
  assignPipeBtn.classList.remove("active");
  assignPipeBtn.classList.add("deactive");
  cotailInfoBtn.classList.add("active");
  cotailInfoBtn.classList.remove("deactive");
  selectIngBtn.classList.remove("active");
  selectIngBtn.classList.add("deactive");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  updateButtonStyles();
}

// Function to show the "Add Cocktail" section
function showAddCocktail() {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "block";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "none";
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  assignPipeSection.style.display = "none";
  assignPipeBtn.classList.remove("active");
  assignPipeBtn.classList.add("deactive");
  // Load cocktail ingredients when showing add cocktail section
  fetchIngredientsForCocktail();
  addCocktailBtn.classList.add("active");
  addCocktailBtn.classList.remove("deactive");
  selectIngBtn.classList.remove("active");
  selectIngBtn.classList.add("deactive");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  allCocktailsBtn.classList.remove("active");
  allCocktailsBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active");
  cotailInfoBtn.classList.add("deactive");
  updateButtonStyles();
}

document.getElementById("serial-out-button").addEventListener("click", () => {
  // Get the cocktail ID from the hidden element
  const cocktailIDElement = document.getElementById("cocktail-id");
  if (!cocktailIDElement) {
    showCustomAlert("No cocktail selected");
    return;
  }
  
  selectedCocktailID = parseInt(cocktailIDElement.textContent);
  if (!selectedCocktailID) {
    showCustomAlert("Invalid cocktail ID");
    return;
  }

  // Get the cocktail's ingredients and their assigned pipes
  const cocktailIngredients = [];
  const cocktail = document.querySelector(".cocktail-details");
  const ingredients = cocktail.querySelectorAll(
    "#cocktail-ingredients-container .ing-item p"
  );

  ingredients.forEach((ingredientElem) => {
    const ingredientName = ingredientElem.textContent;
    // Find the pipe number for this ingredient from currentPipeAssignments
    let pipeNumber = null;
    for (const [pipe, ingredient] of Object.entries(currentPipeAssignments)) {
      if (ingredient === ingredientName) {
        pipeNumber = pipe.split(" ")[1]; // Get the number from "Pipe X"
        break;
      }
    }
    if (pipeNumber) {
      cocktailIngredients.push({
        name: ingredientName,
        pipe: pipeNumber,
      });
    }
  });

  // Call the sendPipesToPython function with the prepared ingredients
  sendPipesToPython(cocktailIngredients);
});

// Function to send assigned pipelines to the Python script
async function sendPipesToPython(assignedPipes) {
  console.log('Starting sendPipesToPython with assigned pipes:', assignedPipes);
  
  const drinkType = document.querySelector(
    'input[name="drink-type"]:checked'
  ).value;
  console.log('Selected drink type:', drinkType);
  
  const isAlcoholic = document.getElementById("alcoholic").checked;
  console.log('Is alcoholic:', isAlcoholic);

  // Get the cocktail details from products.json
  const response = await fetch('products.json');
  const cocktails = await response.json();
  const selectedCocktail = cocktails.find(cocktail => cocktail.PID === selectedCocktailID);
  
  if (!selectedCocktail) {
    throw new Error('Selected cocktail not found');
  }

  // Create a map of ingredient names to their measurements
  const ingredientMeasurements = {};
  selectedCocktail.PIng.forEach(ingredient => {
    ingredientMeasurements[ingredient.ING_Name] = ingredient.ING_ML;
  });
  
  const dataToSend = {
    productId: selectedCocktailID,
    ingredients: assignedPipes.map(pipe => ({
      ...pipe,
      ingMl: ingredientMeasurements[pipe.name] || "50"  // Get measurement from cocktail ingredients, default to "50" if not found
    })),
    drinkType: drinkType,
    isAlcoholic: isAlcoholic
  };
  console.log('Prepared data to send:', JSON.stringify(dataToSend, null, 2));
  
  showLoadingPage();
  console.log('Loading page displayed');
  
  try {
    const response = await fetch("/send-pipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });
    
    console.log('Received response from server:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      if (data.status === "COMPLETED") {
        console.log("Drink preparation completed");
        hideLoadingPage();
        showCustomAlert("Your drink is ready!");
      } else {
        console.log("Received OK from Python. Starting completion check...");
        checkCompletionStatus();
      }
    } else {
      const errorText = await response.text();
      console.error('Server returned error:', errorText);
      throw new Error(errorText);
    }
  } catch (error) {
    console.error("Error sending data to Python:", error);
    hideLoadingPage();
    displayErrorMessage(error.message);
  }
}

// Function to check completion status
function checkCompletionStatus() {
  fetch('/check-completion')
    .then(response => response.json())
    .then(data => {
      if (data.status === 'completed') {
        // Drink is ready, hide loading page
        hideLoadingPage();
        showCustomAlert("Your drink is ready!");
        // Clear the completion status for next time
        fetch('/delete_processing_flag', { method: 'POST' });
      } else {
        // Still processing, check again after a short delay
        setTimeout(checkCompletionStatus, 1000);
      }
    })
    .catch(error => {
      console.error('Error checking completion:', error);
      hideLoadingPage();
      displayErrorMessage("Error checking drink status");
    });
}

// Function to show the loading page
function showLoadingPage() {
    const loadingPage = document.getElementById('loading-page');
    loadingPage.style.display = 'flex';
    
    // Add click handler for cancel button
    const cancelButton = document.getElementById('cancel-drink-button');
    cancelButton.onclick = cancelDrink;
}

function cancelDrink() {
    // Send cancel request to server
    fetch('/cancel-drink', { method: 'POST' })
        .then(response => {
            if (response.ok) {
                // Hide loading page
                hideLoadingPage();
                // Show cancelled message
                showMessage('Drink preparation cancelled', 'error');
            } else {
                throw new Error('Failed to cancel drink');
            }
        })
        .catch(error => {
            console.error('Error cancelling drink:', error);
            showMessage('Failed to cancel drink', 'error');
        });
}

function hideLoadingPage() {
    const loadingPage = document.getElementById('loading-page');
    loadingPage.style.display = 'none';
}

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Function to display error message on the loading page
function displayErrorMessage(message) {
  const loadingPage = document.getElementById("loading-page");
  loadingPage.innerHTML = `<h1>Error</h1><p>${message}</p><button id="cancel-button">Cancel</button>`;
  loadingPage.style.display = "block"; // Ensure the loading page is visible

  // Add event listener for cancel button
  document.getElementById("cancel-button").addEventListener("click", () => {
    hideLoadingPage(); // Hide loading page when canceled
  });
}

// Add click event listeners to the buttons
selectIngBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showSelectIng();
});

addIngredientsBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showAddIngredients();
});

addCocktailBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showAddCocktail();
});

allCocktailsBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showAllCocktails(); // Show All Cocktails section
});

cotailInfoBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showCocktailDetails(); // Show Cocktail Details section
});

availableCocktailsBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showAvailableCocktails();
});

assignPipeBtn.addEventListener("click", function (event) {
  event.preventDefault();
  showAssignPipe();
});

document
  .getElementById("add-new-btn")
  .addEventListener("click", function (event) {
    event.preventDefault();
    showAddIngredients();
  });

document
  .getElementById("add-new-btn")
  .addEventListener("click", function (event) {
    event.preventDefault();
    showAddIngredients();
  });

document
  .getElementById("ingredient-image")
  .addEventListener("change", (event) => {
    event.preventDefault(); // Prevent default form submission
  });

const elementsToTrack = [
  "ingredient-search",
  "cocktail-ingredient-search",
  "ingredient-name",
  "product-name",
  "product-description",
  "how-to-make",
];

let lastFocusState = false;

let lastActiveElement = null;

function checkFocus(event) {
  // Only handle focus events for specific elements that need server notification
  const targetId = event.target.id;

  if (!elementsToTrack.includes(targetId)) {
    return; // Don't process focus events for other input fields
  }

  // For blur events, check if we're switching to another tracked input
  if (event.type === "blur") {
    // Use setTimeout to check after the new element receives focus
    setTimeout(() => {
      const newActiveElement = document.activeElement;
      if (!elementsToTrack.includes(newActiveElement.id)) {
        updateFocusState(false);
      }
    }, 0);
  } else if (event.type === "focus") {
    updateFocusState(true);
  }
}

function updateFocusState(isFocused) {
  if (lastFocusState === isFocused) return; // Avoid duplicate requests

  lastFocusState = isFocused;
  if (isFocused) {
    fetch("/focus-in", {
      method: "POST",
    })
      .then((response) => response.text())
      .then((data) => console.log(data))
      .catch((error) => console.error("Focus event error:", error));
  } else {
    // Only send focus-out if we're not focused on any tracked input
    const activeElement = document.activeElement;
    if (!elementsToTrack.includes(activeElement.id)) {
      fetch("/focus-out", {
        method: "POST",
      })
        .then((response) => response.text())
        .then((data) => console.log(data))
        .catch((error) => console.error("Focus event error:", error));
    }
  }
}

function pollFocusState() {
  const activeElement = document.activeElement;
  const isFocused = elementsToTrack.includes(activeElement.id);
  if (isFocused !== lastFocusState) {
    updateFocusState(isFocused);
  }
}

// Add event listeners to all relevant input fields
const searchInputs = document.querySelectorAll(
  "#ingredient-search, #cocktail-ingredient-search, #ingredient-name, #product-name, #product-desc, #how-to-make"
);
searchInputs.forEach((input) => {
  input.addEventListener("focus", checkFocus);
  input.addEventListener("blur", checkFocus);
});

// Start polling focus state every 200ms
setInterval(pollFocusState, 200);

// Function to fetch existing ingredients and set up the form
async function fetchIngredientsID() {
  try {
    const response = await fetch("db.json");
    const data = await response.json();
    const ingredients = data;

    // Get the last ingredient ID and generate the new ID
    const lastId =
      ingredients.length > 0
        ? parseInt(ingredients[ingredients.length - 1].ING_ID)
        : 0;
    const newId = lastId + 1; // Calculate the new ID

    // Set the new ID as text content of the span
    document.getElementById("ingredient-id").textContent = newId; // Set new ID as text
  } catch (error) {
    console.error("Error fetching ingredients:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const submitButton = document.getElementById("submit-button");
  fetchIngredientsID();

  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();

    // Show loading screen
    document.getElementById("loading-page").style.display = "block";

    const ingredientId = document.getElementById("ingredient-id").textContent;
    const ingredientName = document.getElementById("ingredient-name").value;
    const ingredientType = document.getElementById("ingredient-type").value;
    const ingredientImageInput = document.getElementById("ingredient-image");
    const ingredientImage = ingredientImageInput.files[0];
    const ingredientRemark = document.getElementById("ingredient-remark").value; // Get remark value

    // Initialize an array to collect error messages
    let errorMessages = [];

    // Validate inputs
    if (!ingredientId) {
      errorMessages.push("Ingredient ID is required.");
    }
    if (!ingredientName) {
      errorMessages.push("Ingredient Name is required.");
    }
    if (!ingredientType) {
      errorMessages.push("Ingredient Type is required.");
    }
    if (!ingredientImage) {
      errorMessages.push("Ingredient Image is required.");
    }

    // If there are error messages, showCustomAlert the user and return
    if (errorMessages.length > 0) {
      showCustomAlert(errorMessages.join("\n"));
      return;
    }

    // Read the image file and convert it to a Base64 string
    const reader = new FileReader();
    reader.readAsDataURL(ingredientImage);
    reader.onload = async () => {
      const newIngredient = {
        ING_ID: ingredientId,
        ING_Name: ingredientName,
        ING_Type: ingredientType,
        ING_IMG: reader.result,
        ING_Remark: ingredientRemark || "" // Add remark to the ingredient object
      };

      // Append new ingredient to db.json
      try {
        const response = await fetch("/addIngredient", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newIngredient),
        })
          .then((response) => {
            console.log("Response received:", response);
            return response;
          })
          .catch((error) => {
            console.error("Error sending request:", error);
          });

        if (response.ok) {
          // Wait for image processing to complete
          await waitForImageProcessing();

          // Hide loading screen
          document.getElementById("loading-page").style.display = "none";

          showCustomAlert("Ingredient added successfully!");
          console.log("Refreshing ingredient list after adding...");
          await fetchIngredients(); // Refresh the ingredient list after adding
          console.log("Clearing form fields...");
          resetIngredientForm(); // Clear the form fields
          console.log("Fetching new ID for the next ingredient...");
          await fetchIngredientsID(); // Fetch new ID for the next ingredient
          document.getElementById("ingredient-name").focus();
        } else {
          const errorText = await response.text();
          showCustomAlert(
            "Failed to add the ingredient. Server response: " + errorText
          );
        }
      } catch (error) {
        console.error("Error adding ingredient:", error);
        showCustomAlert(
          "An error occurred while adding the ingredient: " + error.message
        );
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading image file:", error);
      showCustomAlert(
        "An error occurred while reading the image file: " + error.message
      );
    };
  });

  // Function to reset the ingredient form fields
  function resetIngredientForm() {
    enableForms(); // Enable inputs before resetting
    document.getElementById("ingredient-name").value = ""; // Clear the ingredient name
    document.getElementById("ingredient-type").value = "Liquid"; // Reset to default type
    document.getElementById("ingredient-image").value = ""; // Clear the image input
    document.getElementById("image-name").textContent = ""; // Clear the displayed image name
    document.getElementById("ingredient-remark").value = ""; // Clear the remark field
  }
});

enableForms();

function enableForms() {
  const inputs = document.querySelectorAll("input, textarea, select"); // Select all input fields
  inputs.forEach((input) => {
    input.disabled = false; // Enable each input field
  });
}

async function fetchIngredients(searchTerm = "") {
  try {
    const response = await fetch("db.json");
    const data = await response.json();
    ingredientsData = data;

    // Sort ingredients alphabetically by name
    ingredientsData.sort((a, b) => a.ING_Name.localeCompare(b.ING_Name));

    // Update the ingredientRemarks object with remarks from the loaded ingredients
    ingredientsData.forEach((ingredient) => {
      if (ingredient.ING_Remark && ingredient.ING_Remark.trim() !== "") {
        ingredientRemarks[ingredient.ING_Name] = ingredient.ING_Remark;
      }
    });

    const container = document.getElementById("ingredients-container");
    container.innerHTML = ""; // Clear existing ingredients

    // Loop through each ingredient and create divs
    ingredientsData.forEach((ingredient) => {
      const ingredientName = ingredient.ING_Name.toLowerCase();

      // Check if searchTerm is empty or if the ingredient name includes the search term
      if (
        searchTerm === "" ||
        ingredientName.includes(searchTerm.toLowerCase())
      ) {
        const ingDiv = document.createElement("div");
        ingDiv.classList.add("ing-item");

        const label = document.createElement("label");
        label.classList.add("btn-checkbox");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("checkbox");

        // Check if this ingredient was previously selected
        if (selectedIngredients.includes(ingredient.ING_Name)) {
          checkbox.checked = true; // Keep it checked
        }

        updateSelectedCount();

        // Add event listener to handle checkbox changes
        checkbox.addEventListener("change", (event) => {
          const ingredientName = ingredient.ING_Name;
          if (event.target.checked) {
            // If checked, add to selectedIngredients
            if (!selectedIngredients.includes(ingredientName)) {
              selectedIngredients.push(ingredientName);
            }
          } else {
            // If unchecked, remove from selectedIngredients
            selectedIngredients = selectedIngredients.filter(
              (name) => name !== ingredientName
            );
          }
          updateSelectedCount(); // Update the selected count
        });

        const imgSrc =
          ingredient.ING_IMG && ingredient.ING_IMG.trim() !== ""
            ? ingredient.ING_IMG
            : "img/ing2.gif";
        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = `Ingredient - ${ingredient.ING_Name}`;

        const para = document.createElement("p");
        para.textContent = ingredient.ING_Name;

        label.appendChild(checkbox);
        label.appendChild(img);
        label.appendChild(para);
        ingDiv.appendChild(label);
        container.appendChild(ingDiv);
      }
    });

    updateSelectedCount(); // Update the selected count
    
    // Update the UI to display the loaded remarks
    updateRemarksDisplay();
    updatePipelineRemarksDisplay();
  } catch (error) {
    console.error(`Error fetching ingredients: ${error.message}`);
  }
}

// Function to handle checkbox changes
function handleCheckboxChange(event) {
  const ingredientName = event.target
    .closest(".ing-item")
    .querySelector("p").textContent;

  if (event.target.checked) {
    if (!selectedIngredients.includes(ingredientName)) {
      selectedIngredients.push(ingredientName);
    }
  } else {
    selectedIngredients = selectedIngredients.filter(
      (name) => name !== ingredientName
    );
  }

  updateSelectedCount(); // Update the selected count
}

// Function to update the selected count
function updateSelectedCount() {
  const selectedCount = selectedIngredients.length; // Get count from selectedIngredients array
  const selectedCountElement = document.querySelector(".fi-top p span");

  // Update displayed count
  selectedCountElement.textContent = `${selectedCount}`;
}

// Add event delegation to the ingredients container
document.addEventListener("DOMContentLoaded", () => {
  const ingredientsContainer = document.querySelector(".ing-grid");

  ingredientsContainer.addEventListener("change", (event) => {
    if (event.target.matches(".checkbox")) {
      handleCheckboxChange(event);
    }
  });
});
function handleSearchInput() {
  const searchInput = document.getElementById("ingredient-search").value; // Get the input value
  fetchIngredients(searchInput); // Fetch ingredients based on the search input

  // Log the search term to the Python server
  console.log(`Search term: ${searchInput}`);
}
document.addEventListener("DOMContentLoaded", () => {
  // Add event listener to the search input
  document
    .getElementById("ingredient-search")
    .addEventListener("input", handleSearchInput);
});

async function fetchIngredientsTypes() {
  try {
    const response = await fetch("db.json");
    const data = await response.json();
    
    // Define the order of types we want to display
    const orderedTypes = ['Strong', 'Soft', 'Other', 'Juice', 'Fruit', 'Beverage'];
    
    // Create filter buttons based on the ordered types
    const filterContainer = document.getElementById("ing-filterfind");
    
    // First add the "All" button
    const allButton = document.createElement("a");
    allButton.className = "btn active";
    allButton.setAttribute("data-type", "all");
    allButton.textContent = "All Ingredients";
    filterContainer.appendChild(allButton);
    
    // Then add the ordered type buttons
    orderedTypes.forEach((type) => {
      const button = document.createElement("a");
      button.className = "btn deactive";
      button.setAttribute("data-type", type);
      button.textContent = type;
      filterContainer.appendChild(button);

      // Add click event to filter by type
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const selectedType = button.getAttribute("data-type");
        filterIngredientsByType(selectedType);
      });
    });
  } catch (error) {
    console.error("Error fetching ingredient types:", error);
  }
}

// Function to filter ingredients by type
function filterIngredientsByType(type) {
  const checkboxes = document.querySelectorAll(".checkbox");

  // Loop through all checkboxes (ingredients)
  checkboxes.forEach((checkbox, index) => {
    const ingredientItem = checkbox.closest(".ing-item");

    // Check if the index is within the bounds of ingredientsData
    if (index < ingredientsData.length) {
      const ingredientType = ingredientsData[index].ING_Type; // Get the ingredient type

      // Show all ingredients if 'all' is selected, otherwise filter by type
      if (
        type === "all" ||
        ingredientType.toLowerCase() === type.toLowerCase()
      ) {
        ingredientItem.style.display = "flex"; // Show the ingredient item
      } else {
        ingredientItem.style.display = "none"; // Hide the ingredient item
      }
    } else {
      // If the index is out of bounds, simply hide the item
      ingredientItem.style.display = "none"; // Hide the ingredient item
    }
  });

  // Update button states to reflect the active filter
  document.querySelectorAll(".ing-filter a").forEach((btn) => {
    btn.classList.remove("active"); // Remove active class from all buttons
    btn.classList.add("deactive"); // Add deactive class to all buttons
    updateButtonStyles();
  });

  // Set the active class on the selected type button
  const activeButton = document.querySelector(
    `.ing-filter a[data-type="${type}"]`
  );
  if (activeButton) {
    activeButton.classList.add("active"); // Add active class to the clicked button
    activeButton.classList.remove("deactive"); // Remove deactive class from the clicked button
    updateButtonStyles();
  }
}

// Add event listeners to filter buttons
document.querySelectorAll(".ing-filter a").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent default anchor behavior
    const selectedType = button.getAttribute("data-type");
    // Call filter function with the selected type
    filterIngredientsByType(selectedType);

    // Remove active class from all buttons and add it to the clicked button
    document
      .querySelectorAll(".ing-filter a")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

document.getElementById("back-button").addEventListener("click", (event) => {
  event.preventDefault(); // Prevent default button behavior
  console.log("Back button clicked");
  showAvailableCocktails(); // Call the function to show the Find Cocktail section
  console.log("Find Cocktail section displayed");
});

document.getElementById("back-button1").addEventListener("click", (event) => {
  event.preventDefault(); // Prevent default button behavior
  console.log("Back button 1 clicked");
  showAvailableCocktails(); // Call the function to show the Find Cocktail section
  console.log("Find Cocktail section displayed");
});

let selectedPipelines = {}; // Global object to keep track of selected pipelines

// Function to display the selected image name
function displayImageName() {
  // Get the file input element
  const fileInput = document.getElementById("ingredient-image"); // or "product-image" based on your context
  const imageNameDisplay = document.getElementById("image-name"); // The span where you want to display the image name

  // Check if a file is selected
  if (fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name; // Get the name of the selected file
    // Display the file name in the span with a message
  } else {
    imageNameDisplay.textContent = ""; // Clear the display if no file is selected
  }
}

async function showAllCocktails(selectedIngredients = []) {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "block"; // Show All Cocktails section
  cocktailDetailsSection.style.display = "none";
  assignPipeSection.style.display = "none";
  availableCocktailsSection.style.display = "none";
  availableCocktailsBtn.classList.remove("active");
  availableCocktailsBtn.classList.add("deactive");
  assignPipeSection.style.display = "none";
  assignPipeBtn.classList.remove("active");
  assignPipeBtn.classList.add("deactive");
  allCocktailsBtn.classList.add("active");
  allCocktailsBtn.classList.remove("deactive");
  selectIngBtn.classList.remove("active");
  selectIngBtn.classList.add("deactive");
  addIngredientsBtn.classList.remove("active");
  addIngredientsBtn.classList.add("deactive");
  addCocktailBtn.classList.remove("active");
  addCocktailBtn.classList.add("deactive");
  cotailInfoBtn.classList.remove("active");
  cotailInfoBtn.classList.add("deactive");
  updateButtonStyles();

  document.getElementById("back-button-all-cocktail").style.display = "block";

  // Fetch cocktails
  const cocktails = await fetchCocktails();
  // Display all cocktails if no ingredients are selected
  extraIngredients = [];
  displayCocktails(cocktails);
}

// Function to fetch cocktails from products.json
async function fetchCocktails() {
  try {
    const response = await fetch("products.json");
    const cocktails = await response.json();
    return cocktails; // Return the fetched cocktails
  } catch (error) {
    console.error("Error fetching cocktails:", error);
    return []; // Return an empty array on error
  }
}

// Function to display cocktails in the UI
function displayCocktails(cocktails) {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "block"; // Show All Cocktails section
  cocktailDetailsSection.style.display = "none";
  assignPipeSection.style.display = "none";

  updateButtonStyles();
  const cocktailListContainer = document.querySelector(".cocktail-list");
  cocktailListContainer.innerHTML = ""; // Clear existing content

  cocktails.forEach((cocktail) => {
    const cocktailItem = document.createElement("div");
    cocktailItem.classList.add("cl-item");
    cocktailItem.id = `cocktail-${cocktail.PID}`; // Set the ID for each cocktail item

    cocktailItem.innerHTML = `
        <img src="${cocktail.PImage || 'img/upload/extra_cocktail.png'}" alt="${cocktail.PName}" />
        <p>${cocktail.PName}</p>
      `;

    // Append the cocktail item to the cocktail list container
    cocktailListContainer.appendChild(cocktailItem);

    // Add click event to show cocktail details
    cocktailItem.addEventListener("click", () => {
      wshowCocktailDetails(cocktail); // Show details of the clicked cocktail
    });
  });
}

async function wshowCocktailDetails(cocktail) {
  findIngSection.style.display = "none";
  addIngSection.style.display = "none";
  addCocktailSection.style.display = "none";
  allCocktailSection.style.display = "none";
  cocktailDetailsSection.style.display = "block"; // Show Cocktail Details section
  assignPipeSection.style.display = "none";

  // Update the cocktail image and name
  const cocktailID = document.getElementById("cocktail-id");
  const cocktailImage = document.getElementById("cocktail-image");
  const cocktailName = document.getElementById("cocktail-name");
  const cocktailDescription = document.getElementById("cocktail-description");
  const cocktailIngredientsContainer = document.getElementById(
    "cocktail-ingredients-container"
  );
  const cocktailHtm = document.getElementById("htm");
  const showRemarkDiv = document.querySelector(".show-remark p");
  const showRemarkSection = document.querySelector(".show-remark");

  // Hide the remark section initially
  showRemarkSection.style.display = "none";

  cocktailImage.src = cocktail.PImage || 'img/upload/extra_cocktail.png'; // Set the image source with fallback
  cocktailID.textContent = cocktail.PID;
  selectedCocktailID = parseInt(cocktail.PID); // Set the global selectedCocktailID
  cocktailName.textContent = cocktail.PName; // Set the cocktail name
  cocktailDescription.textContent = cocktail.PDesc;
  cocktailHtm.textContent = cocktail.PHtm;
  const htmTitle = document.getElementById("htm-title");

  // Fetch complete ingredient details from db.json
  let ingredientsData = [];
  try {
    const response = await fetch("db.json");
    ingredientsData = await response.json();
  } catch (error) {
    console.error("Error fetching ingredients:", error);
  }

  // Create a map of ingredient names to their full details
  const ingredientMap = {};
  ingredientsData.forEach(ing => {
    ingredientMap[ing.ING_Name] = ing;
  });

  // Clear previous ingredients
  cocktailIngredientsContainer.innerHTML = "";

  // Populate the ingredients with full details
  cocktail.PIng.forEach((ingredient) => {
    const ingredientItem = document.createElement("div");
    ingredientItem.classList.add("ing-item");

    // Get complete ingredient details from the map
    const fullIngredient = ingredientMap[ingredient.ING_Name] || ingredient;

    // Check if the ingredient is selected
    const isSelected = selectedIngredients.includes(ingredient.ING_Name);
    console.log(`checking ${ingredient.ING_Name} is ${isSelected}`);
    const className = isSelected ? "" : "not-selected";

    ingredientItem.innerHTML = `
      <label class="btn-checkbox">
        <img src="${fullIngredient.ING_IMG || 'img/ing2.gif'}" alt="Ingredient - ${ingredient.ING_Name}" />
        <p class="${className}">${ingredient.ING_Name}</p>
        <p class="ingredient-measurement">${ingredient.ING_ML || 'Not Specified'}</p>
      </label>
    `;

    // Add click handler to show remark
    ingredientItem.addEventListener("click", () => {
      const remark = ingredientRemarks[ingredient.ING_Name] || "No remark available";
      showRemarkDiv.innerHTML = `<span>Remark for ${ingredient.ING_Name}: </span>${remark}`;
      showRemarkSection.style.display = "block";
    });

    cocktailIngredientsContainer.appendChild(ingredientItem);
  });

  if (cocktail.PHtm && cocktail.PHtm.trim() !== "") {
    cocktailHtm.textContent = cocktail.PHtm;
    htmTitle.style.display = "block";
    cocktailHtm.style.display = "block";
  } else {
    htmTitle.style.display = "none";
    cocktailHtm.style.display = "none";
  }
}

// Function to fetch all ingredients from db.json
async function fetchIngredientsData() {
  const response = await fetch("db.json");
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid data structure in db.json");
  }
  return data;
}

// Function to fetch existing cocktails and get the next PID
async function fetchNextCocktailId() {
  try {
    const response = await fetch("products.json");
    const cocktails = await response.json();
    const lastId =
      cocktails.length > 0
        ? Math.max(...cocktails.map((cocktail) => parseInt(cocktail.PID)))
        : 0;
    return lastId + 1;
  } catch (error) {
    console.error("Error fetching cocktails:", error);
    return 1;
  }
}

// Function to handle cocktail form submission
document.addEventListener("DOMContentLoaded", () => {
  const cocktailSubmitButton = document.getElementById("add-cocktail-button");
  if (cocktailSubmitButton) {
    cocktailSubmitButton.addEventListener("click", async (event) => {
      event.preventDefault();

      const cocktailId = document.getElementById("product-id").value;
      const cocktailName = document.getElementById("product-name").value;
      const cocktailType = document.getElementById("product-type").value;
      const cocktailDesc = document.getElementById("product-description").value;
      const cocktailHtm = document.getElementById("how-to-make").value;
      const cocktailImageInput = document.getElementById("product-image");
      const cocktailImage = cocktailImageInput.files[0];

      // Validate inputs
      let errorMessages = [];
      if (!cocktailId) errorMessages.push("Cocktail ID is required.");
      if (!cocktailName) errorMessages.push("Cocktail Name is required.");
      if (!cocktailType) errorMessages.push("Cocktail Type is required.");
      if (!cocktailDesc) errorMessages.push("Description is required.");
      if (!cocktailImage) errorMessages.push("Cocktail Image is required.");
      if (selectedCocktailIngredients.length === 0)
        errorMessages.push("At least one ingredient is required.");

      if (errorMessages.length > 0) {
        showCustomAlert(errorMessages.join("\n"));
        return;
      }

      // Read the image file and convert it to a Base64 string
      const reader = new FileReader();
      reader.readAsDataURL(cocktailImage);
      reader.onload = async () => {
        // Generate PNID (Product NID) - using timestamp for uniqueness
        const pnid = Date.now().toString();

        // Get ingredient measurements from the form
        const ingredientMeasurements = {};
        const measurementInputs = document.querySelectorAll('.ingredient-measurement-input');
        measurementInputs.forEach(input => {
          const ingredientName = input.getAttribute('data-ingredient');
          const measurement = input.value.trim();
          if (measurement) {
            ingredientMeasurements[ingredientName] = measurement;
          }
        });

        // Update selectedCocktailIngredients with measurements
        const ingredientsWithMeasurements = selectedCocktailIngredients.map(ing => ({
          ...ing,
          ING_ML: ingredientMeasurements[ing.ING_Name] || '0'
        }));

        const newCocktail = {
          PID: parseInt(cocktailId),
          PNID: pnid,
          PName: cocktailName,
          PImage: reader.result,
          PCat: cocktailType,
          PDesc: cocktailDesc,
          PHtm: cocktailHtm,
          PIng: ingredientsWithMeasurements
        };

        console.log("Submitting cocktail with ingredients:", ingredientsWithMeasurements);

        try {
          const response = await fetch("/addCocktail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newCocktail),
          });

          if (response.ok) {
            // Wait for image processing to complete
            await waitForImageProcessing();

            // Hide loading screen
            document.getElementById("loading-page").style.display = "none";

            showCustomAlert("Cocktail added successfully!");
            // Reset form and fetch new ID
            resetCocktailForm();
            await updateNextCocktailId();
            await fetchNextCocktailId();
            // Clear selected ingredients
            clearaddcocktailform();
          } else {
            const errorText = await response.text();
            showCustomAlert(
              "Failed to add the cocktail. Server response: " + errorText
            );
          }
        } catch (error) {
          console.error("Error adding cocktail:", error);
          showCustomAlert(
            "An error occurred while adding the cocktail: " + error.message
          );
        }
      };
      await updateNextCocktailId();

      reader.onerror = (error) => {
        console.error("Error reading image file:", error);
        showCustomAlert(
          "An error occurred while reading the image file: " + error.message
        );
      };
    });
  }
});

function clearaddcocktailform() {
  resetCocktailForm();
  updateNextCocktailId(); // Update the ID first
  fetchNextCocktailId(); // Refresh the ID again to ensure accuracy

  // Clear selected ingredients
  selectedCocktailIngredients = [];
  const counterElement = document.getElementById("cicount");
  counterElement.textContent = "0";
  document
    .querySelectorAll('#cocktail-ingredients-container1 input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });
  enableForms();
}

document
  .getElementById("clear-all-add-cocktail")
  .addEventListener("click", () => {
    clearaddcocktailform();
  });

function resetCocktailForm() {
  document.getElementById("product-type").value = "Cocktail";
  document.getElementById("product-description").value = "";
  document.getElementById("how-to-make").value = "";
  document.getElementById("product-image").value = "";
  document.getElementById("product-name").value = "";

  // Enable the inputs
  enableForms();

  // Focus on the first input field
  document.getElementById("product-name").focus(); // Adjust to your first input ID
}

// Function to update the next cocktail ID
async function updateNextCocktailId() {
  const nextId = await fetchNextCocktailId();
  const productIdInput = document.getElementById("product-id");
  if (productIdInput) {
    productIdInput.value = nextId;
  }
}

async function waitForImageProcessing() {
  const maxAttempts = 30; // Maximum number of attempts (30 * 500ms = 15 seconds max)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch("processing_complete");
      if (response.ok) {
        // Delete the flag file after successful check
        await fetch("/delete_processing_flag", { method: "POST" });
        return true;
      }
    } catch (error) {
      console.log("Waiting for image processing to complete...");
    }

    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before next attempt
    attempts++;
  }

  console.warn("Image processing timed out");
  return false;
}

function showCustomAlert(message) {
  if (message) {
    document.getElementById("alert-message").innerHTML = message.replace(
      /\n/g,
      "<br>"
    ); // Replace \n with <br>
  } else {
    document.getElementById("alert-message").innerHTML = ""; // Clear message if undefined
  }
  document.getElementById("custom-alert").style.display = "block"; // Show the alert
}

// Close the alert when the OK button is clicked
document.getElementById("alert-ok").onclick = function () {
  document.getElementById("custom-alert").style.display = "none"; // Hide the alert
};

/////////////////////////////////////////////////////////////
///Select Number Of Pipes To Assign & Searchable dropdown///
///////////////////////////////////////////////////////////

const numPipesInput = document.getElementById("numPipes");
const generateButton = document.getElementById("generate");
const saveButton = document.getElementById("save");
const pipeAssignContainer = document.getElementById("pipeAssignContainer");
const errorMessage = document.getElementById("errorMessage");

generateButton.addEventListener("click", () => {
  const numPipes = parseInt(numPipesInput.value);
  numberOfPipes = numPipes;

  // Validate the number of pipes
  if (isNaN(numPipes) || numPipes < 1 || numPipes > 100) {
    showCustomAlert("Please enter a valid number between 1 and 100.");
    return;
  }

  // Remove assignments for pipes that no longer exist
  Object.keys(currentPipeAssignments).forEach((pipe) => {
    const pipeNumber = parseInt(pipe.split(" ")[1]);
    if (pipeNumber > numPipes) {
      delete currentPipeAssignments[pipe];
    }
  });

  // Clear existing dropdowns in the container
  pipeAssignContainer.innerHTML = "";

  // Call the function to populate the dropdowns with the selected ingredients
  populateAssignPipeDropdowns();
});

function populateAssignPipeDropdowns() {
  const pipeAssignContainer = document.getElementById("pipeAssignContainer");
  pipeAssignContainer.innerHTML = "";

  for (let i = 1; i <= numberOfPipes; i++) {
    const dropdownContainer = document.createElement("div");
    dropdownContainer.className = "pipe-dropdown-container";
    dropdownContainer.id = `pipeContainer${i}`; // Add ID for targeting

    // Create dropdown with search input
    dropdownContainer.innerHTML = `
          <label for="pipeDropdown${i}">Pipe ${i}</label>
          <div class="pipe-dropdown-wrapper">
              <div class="search-input-container">
                  <input type="text" 
                      class="pipe-dropdown-search" 
                      id="pipeSearch${i}" 
                      placeholder="Search ingredient..."
                  />
                  <button class="clear-pipe-search" id="clearSearch${i}">x</button>
              </div>
              <div class="pipe-dropdown-options" id="pipeOptions${i}">
                  <div class="option" data-value="">Select Ingredient</div>
                  ${selectedIngredients
                    .map((ingredient) => {
                      const isAssigned = isIngredientAssigned(ingredient);
                      return `<div class="option ${
                        isAssigned ? "disabled" : ""
                      }" 
                          data-value="${ingredient}"
                          title="${
                            isAssigned ? "Already assigned to another pipe" : ""
                          }"
                          >${ingredient}</div>`;
                    })
                    .join("")}
              </div>
          </div>
      `;

    pipeAssignContainer.appendChild(dropdownContainer);
    setupPipeDropdown(i);
  }
      // Update UI to show notes and remarks
      updatePipelineRemarksDisplay();
      updateRemarksDisplay();
}

// Check if ingredient is already assigned to any pipe
function isIngredientAssigned(ingredient) {
  return Object.values(currentPipeAssignments).includes(ingredient);
}

function setupPipeDropdown(pipeNumber) {
  const searchInput = document.getElementById(`pipeSearch${pipeNumber}`);
  const optionsContainer = document.getElementById(`pipeOptions${pipeNumber}`);
  const clearButton = document.getElementById(`clearSearch${pipeNumber}`);

  // Show options on focus
  searchInput.addEventListener("focus", () => {
    optionsContainer.style.display = "block";
    // Immediately update remarks displays after selection
    updatePipelineRemarksDisplay();
    updateRemarksDisplay();
  });

  // Handle search
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const options = optionsContainer.querySelectorAll(
      ".option:not(.no-results)"
    );

    clearButton.style.display = searchTerm ? "block" : "none";

    let hasResults = false;
    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.style.display = "block";
        hasResults = true;
      } else {
        option.style.display = "none";
      }
    });

    // Remove existing no-results message if it exists
    const existingNoResults = optionsContainer.querySelector(".no-results");
    if (existingNoResults) {
      existingNoResults.remove();
    }

    // Add no-results message if no matches found and search term isn't empty
    if (!hasResults && searchTerm) {
      const noResults = document.createElement("div");
      noResults.className = "option no-results";
      noResults.textContent = "No matching ingredients found";
      optionsContainer.appendChild(noResults);
    }
  });

  // Handle clear button click
  clearButton.addEventListener("click", () => {
    // Get the current assignment before clearing
    const currentAssignment = currentPipeAssignments[`Pipe ${pipeNumber}`];

    // Clear the input and assignment
    searchInput.value = "";
    clearButton.style.display = "none";
    currentPipeAssignments[`Pipe ${pipeNumber}`] = "";

    // Immediately update all dropdowns to reflect the unassigned ingredient
    populateAssignPipeDropdowns();

    // Stop event propagation to prevent dropdown from showing
    event.stopPropagation();
  });

  // Handle option selection
  optionsContainer.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("option") &&
      !e.target.classList.contains("disabled")
    ) {
      const value = e.target.dataset.value;
      searchInput.value = e.target.textContent;
      currentPipeAssignments[`Pipe ${pipeNumber}`] = value;
      optionsContainer.style.display = "none";
      clearButton.style.display = value ? "block" : "none";

      // Remove error class when assigning an ingredient
      const pipeContainer = document.getElementById(
        `pipeContainer${pipeNumber}`
      );
      if (pipeContainer) {
        pipeContainer.classList.remove("pipe-error");
      }

      populateAssignPipeDropdowns();
      
      // Immediately update remarks displays after selection
      updatePipelineRemarksDisplay();
      updateRemarksDisplay();
    }
    // Immediately update remarks displays after selection
    updatePipelineRemarksDisplay();
    updateRemarksDisplay();
  });

  // Close options when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !searchInput.contains(e.target) &&
      !optionsContainer.contains(e.target) &&
      !clearButton.contains(e.target)
    ) {
      optionsContainer.style.display = "none";
    }
  });

  // Set previous value if exists
  const previousAssignment = currentPipeAssignments[`Pipe ${pipeNumber}`];
  if (previousAssignment && selectedIngredients.includes(previousAssignment)) {
    searchInput.value = previousAssignment;
    clearButton.style.display = "block";
  }

  // Add the note button after setting up the dropdown
  addNoteButtonToPipeDropdown(pipeNumber);
  // Immediately update remarks displays after selection
  updatePipelineRemarksDisplay();
  updateRemarksDisplay();
}

// Add event listeners for the note popup
document.addEventListener("DOMContentLoaded", () => {
  // Existing event listeners...

  // Add event listeners for note popup
  const closeNotePopup = document.getElementById("closeNotePopup");
  const saveNoteButton = document.getElementById("save-note");

  if (closeNotePopup) {
    closeNotePopup.addEventListener("click", hideNotePopup);
  }

  if (saveNoteButton) {
    saveNoteButton.addEventListener("click", savePipelineNote);
  }

  // Modify populateAssignPipeDropdowns to add note buttons
  const originalPopulateAssignPipeDropdowns = populateAssignPipeDropdowns;
  populateAssignPipeDropdowns = function () {
    originalPopulateAssignPipeDropdowns();

    // Add note buttons to all pipe containers
    for (let i = 1; i <= numberOfPipes; i++) {
      addNoteButtonToPipeDropdown(i);
    }
  };
});

// Add function to save pipeline notes to config
const originalSaveConfig = saveConfig;
saveConfig = function (numberOfPipes, selectedIngredients) {
  // Call the original saveConfig function
  originalSaveConfig(numberOfPipes, selectedIngredients);

  // Save pipeline notes to localStorage
  localStorage.setItem("pipelineNotes", JSON.stringify(pipelineNotes));
};

// Add function to load pipeline notes from config
const originalLoadConfig = loadConfig;
loadConfig = async function () {
  await originalLoadConfig();

  // Load remarks from db.json and config.json
  try {
    const [dbResponse, configResponse] = await Promise.all([
      fetch('/db.json'),
      fetch('/config.json')
    ]);
    
    const ingredients = await dbResponse.json();
    const config = await configResponse.json();
    
    // Create a map of ingredient names to their remarks
    const ingredientRemarks = {};
    ingredients.forEach(ingredient => {
      if (ingredient.ING_Remark) {
        ingredientRemarks[ingredient.ING_Name] = ingredient.ING_Remark;
      }
    });

    // Add remark indicators to pipes with remarks
    for (const pipeName in config.pipeConfig) {
      const pipeNumber = parseInt(pipeName.split(" ")[1]);
      const ingredientName = config.pipeConfig[pipeName];
      
      if (ingredientRemarks[ingredientName]) {
        addNoteButtonToPipeDropdown(pipeNumber);

        // Add remark indicator
        const pipeContainer = document.getElementById(
          `pipeContainer${pipeNumber}`
        );
        if (pipeContainer) {
          const noteIndicator = document.createElement("div");
          noteIndicator.className = "note-indicator";
          noteIndicator.title = ingredientRemarks[ingredientName];
          pipeContainer.appendChild(noteIndicator);
        }
      }
    }
  } catch (error) {
    console.error('Error loading remarks:', error);
  }
};

saveButton.addEventListener("click", () => {
  // Call the saveConfig function with the current global variables
  saveConfig(numberOfPipes, selectedIngredients);
});

// Function to handle dropdown functionality
function setupDropdown(input, optionsContainer) {
  const originalOptions = Array.from(optionsContainer.children);

  // Prevent blur event from closing the dropdown when clicking on options
  optionsContainer.addEventListener("mousedown", (event) => {
    event.preventDefault(); // Prevent focus loss
  });

  input.addEventListener("focus", () => {
    optionsContainer.style.display = "block";
    input.nextElementSibling.style.transform = "rotate(180deg)"; // Rotate arrow
    resetDropdownOptions(optionsContainer, originalOptions);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      optionsContainer.style.display = "none";
      input.nextElementSibling.style.transform = "rotate(0deg)"; // Reset arrow
    }, 200); // Delay to allow click event to register
  });

  input.addEventListener("input", () => {
    const filter = input.value.toLowerCase();
    let hasResults = false;

    originalOptions.forEach((option) => {
      if (option.textContent.toLowerCase().includes(filter)) {
        option.style.display = "";
        hasResults = true;
      } else {
        option.style.display = "none";
      }
    });

    if (!hasResults) {
      optionsContainer.innerHTML =
        '<div class="no-result">No results found</div>';
    } else {
      resetDropdownOptions(optionsContainer, originalOptions);
    }
  });

  optionsContainer.addEventListener("click", (event) => {
    if (
      event.target.tagName === "DIV" &&
      !event.target.classList.contains("no-result")
    ) {
      input.value = event.target.textContent;
      optionsContainer.style.display = "none";
      input.nextElementSibling.style.transform = "rotate(0deg)"; // Reset arrow
    }
  });
}

function resetDropdownOptions(container, originalOptions) {
  container.innerHTML = ""; // Clear the current content
  originalOptions.forEach((option) => {
    container.appendChild(option); // Add original options back
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const customizeButton = document.getElementById("customize");
  const popup = document.getElementById("customizePopup");
  const closePopup = document.getElementById("closePopup");
  const numPipesInput = document.getElementById("numPipes");
  const generateButton = document.getElementById("generate");
  const defaultButtons = document.querySelectorAll(".default-num-btn");

  // Open the popup when "Customize" button is clicked
  customizeButton.addEventListener("click", () => {
    console.log("Customize button clicked");
    popup.style.display = "flex";
  });

  // Close the popup when the close button is clicked
  closePopup.addEventListener("click", () => {
    console.log("Close button clicked");
    popup.style.display = "none";
  });

  // Close the popup when clicking outside the content
  window.addEventListener("click", (event) => {
    if (event.target === popup) {
      console.log("Clicked outside the popup");
      popup.style.display = "none";
    }
  });

  // Automatically close popup after generating custom pipes
  generateButton.addEventListener("click", () => {
    const numPipes = parseInt(numPipesInput.value);
    console.log(`Generating ${numPipes} pipes`);

    if (!isNaN(numPipes) && numPipes >= 1 && numPipes <= 100) {
      popup.style.display = "none"; // Close the popup after generating
    }
  });

  defaultButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      // Remove 'selected' class from all buttons
      defaultButtons.forEach((btn) => btn.classList.remove("selected"));

      // Add 'selected' class to the clicked button
      event.target.classList.add("selected");
      const numPipes = parseInt(event.target.getAttribute("data-value"));
      numPipesInput.value = numPipes; // Set the input value
      generateButton.click(); // Trigger the generate logic

      popup.style.display = "none"; // Close the popup after selecting default
    });
  });
});

async function saveConfig(numberOfPipes, selectedIngredients) {
  // Check if all pipes are assigned
  let unassignedPipes = [];
  for (let i = 1; i <= numberOfPipes; i++) {
    const searchInput = document.getElementById(`pipeSearch${i}`);
    const pipeContainer = document.getElementById(`pipeContainer${i}`);

    if (!searchInput || !searchInput.value.trim()) {
      unassignedPipes.push(i);
      // Add error class to highlight unassigned pipe
      if (pipeContainer) {
        pipeContainer.classList.add("pipe-error");
      }
    } else {
      // Remove error class if pipe is assigned
      if (pipeContainer) {
        pipeContainer.classList.remove("pipe-error");
      }
    }
  }

  if (unassignedPipes.length > 0) {
    showCustomAlert(
      `Please assign ingredients to all pipes.\nUnassigned pipes:\n ${unassignedPipes
        .map(
          (num) => `<span style="color:red;font-weight:bold">Pipe ${num}</span>`
        )
        .join(", ")}`
    );
    return;
  }

  // Update savedIngredients when saving
  savedIngredients = selectedIngredients;

  const configData = {
    numberOfPipes: numberOfPipes,
    pipeConfig: currentPipeAssignments,
    selectedIngredients: savedIngredients,
    pipeNotes: pipelineNotes, // Add pipe notes to config
    ingredientRemarks: ingredientRemarks // Add ingredient remarks to config
  };

  try {
    const response = await fetch("/save-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configData),
    });

    if (response.ok) {
      showCustomAlert("Configuration saved successfully!");
      // Update available cocktails after successful save
      showAvailableCocktails();
    }
    loadConfig();
  } catch (error) {
    console.error("Error saving configuration:", error);
    showCustomAlert("Failed to save configuration");
  }
}

async function loadConfig() {
  try {
    const response = await fetch("config.json");
    const configData = await response.json();

    // Initialize both arrays from config
    savedIngredients = configData.selectedIngredients || [];
    selectedIngredients = [...savedIngredients]; // Copy saved ingredients to selected
    numberOfPipes = configData.numberOfPipes || 0;

    // Load pipe assignments
    currentPipeAssignments = configData.pipeConfig || {};

    // Load pipe notes and ingredient remarks
    pipelineNotes = configData.pipeNotes || {};
    ingredientRemarks = configData.ingredientRemarks || {};

    await fetchIngredients();
    updateSelectedCount();

    // Populate dropdowns with current assignments
    if (configData.pipeConfig) {
      populateAssignPipeDropdowns();
    }

    // Update UI to show notes and remarks
    updatePipelineRemarksDisplay();
    updateRemarksDisplay();

    console.log(
      `Loaded ${numberOfPipes} pipes and saved ingredients:`,
      savedIngredients
    );
  } catch (error) {
    console.error("Error loading configuration:", error);
  }
}

// Call loadConfig when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  updateSelectedCount();
  console.log(selectedIngredients);
  showAvailableCocktails();
  // You can also call other initialization functions here
});

document.getElementById("clear-all-button").addEventListener("click", () => {
  // Call the function to clear all selected ingredients
  clearAllSelectedIngredients();
});

function clearAllSelectedIngredients() {
  // Deselect all checkboxes
  const checkboxes = document.querySelectorAll(".checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false; // Uncheck each checkbox
  });

  // Clear the selectedIngredients array
  selectedIngredients = []; // Reset selected ingredients

  // Update the count display
  updateSelectedCount(); // This function should update the UI to reflect the count
}

function updatePipesAndIngredients() {
  const numPipeInput = document.getElementById("numPipeInput").value; // Get the updated number of pipes
  numberOfPipes = parseInt(numPipeInput, 10); // Update the global variable

  selectedIngredients = []; // Reset selectedIngredients array

  // Loop through each pipe dropdown and capture the selected ingredients
  for (let i = 1; i <= numberOfPipes; i++) {
    const dropdown = document.getElementById(`pipeDropdown${i}`);
    if (dropdown) {
      const ingredientName = dropdown.value;
      if (ingredientName) {
        selectedIngredients.push(ingredientName); // Update selectedIngredients
      }
    }
  }
}

numPipesInput.addEventListener("input", () => {
  numberOfPipes = parseInt(numPipesInput.value);
});

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("ingredient-search");
  const clearButton = document.getElementById("clear-search");

  // Show clear button when there is input
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() !== "") {
      clearButton.style.display = "inline"; // Show the clear button
    } else {
      clearButton.style.display = "none"; // Hide the clear button
    }
  });

  // Clear the input field when the clear button is clicked
  clearButton.addEventListener("click", () => {
    searchInput.value = ""; // Clear the input field
    clearButton.style.display = "none"; // Hide the clear button
    fetchIngredients(); // Optionally, refresh the ingredient list
  });

  // Existing search input event listener
  searchInput.addEventListener("input", debounce(handleSearchInput, 300)); // Assuming you have a debounce function
});

// Add this function to handle dropdown updates
function updateAllDropdowns() {
  // Just call populateAssignPipeDropdowns to refresh all dropdowns
  populateAssignPipeDropdowns();
}

// Exit button handler
document
  .getElementById("exit-button")
  .addEventListener("click", async function () {
    // Show custom alert with exit confirmation
    const alertMessage = document.getElementById("alert-message");
    const alertOk = document.getElementById("alert-ok");
    const alertCancel = document.createElement("button");
    alertCancel.className = "btn active";  // Added 'active' class to match OK button
    alertCancel.textContent = "Cancel";
    
    // Store original OK button click handler
    const originalOkHandler = alertOk.onclick;
    
    // Set up new alert content
    alertMessage.innerHTML = "Are you sure you want to exit?";
    
    // Add cancel button
    const modalContent = document.querySelector(".modal-content");
    modalContent.appendChild(alertCancel);
    
    // Show the alert
    document.getElementById("custom-alert").style.display = "block";
    
    // Handle exit confirmation
    alertOk.onclick = async function() {
      try {
        const response = await fetch("/shutdown", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // Close the window after a short delay to ensure the server has time to shut down
          setTimeout(() => {
            window.close();
          }, 500);
        } else {
          showCustomAlert("Failed to shutdown server");
        }
      } catch (error) {
        console.error("Error during shutdown:", error);
        showCustomAlert("Error during shutdown: " + error.message);
      }
    };
    
    // Handle cancel
    alertCancel.onclick = function() {
      // Restore original OK button handler
      alertOk.onclick = originalOkHandler;
      // Remove cancel button
      modalContent.removeChild(alertCancel);
      // Hide the alert
      document.getElementById("custom-alert").style.display = "none";
    };
  });

// New Changes

// Alcohol Preference Checkbox Single Value Selection
function toggleCheckbox(clickedCheckbox) {
  document
    .querySelectorAll('.alc-pre input[type="checkbox"]')
    .forEach((checkbox) => {
      if (checkbox !== clickedCheckbox) {
        checkbox.checked = false;
      }
    });
}

// Add event listener for the update button
document.getElementById("update").addEventListener("click", async function() {
  try {
    // Show a loading popup
    showPopup("Checking for updates and syncing data...", false);
    
    // Check for updates
    const response = await fetch("/check-updates", {
      method: "GET"
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.hasUpdates) {
        // Show update available popup with pull button
        showUpdatePopup(data.message);
      } else {
        // Show no updates available popup
        if (data.firebaseSync) {
          showPopup("No updates available. You are using the latest version.", true);
        } else {
          showPopup("No updates available. You are using the latest version.", true);
        }
      }
    } else {
      showPopup("Error checking for updates. Please try again later.", true);
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    showPopup("Error checking for updates. Please try again later.", true);
  }
});

// Function to show update popup with pull button
function showUpdatePopup(message) {
  // Create popup container
  const popupContainer = document.createElement("div");
  popupContainer.className = "popup-container";
  
  // Create popup content
  const popupContent = document.createElement("div");
  popupContent.className = "popup-content";
  
  // Create message element
  const messageElement = document.createElement("p");
  messageElement.textContent = message;
  
  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "popup-buttons";
  
  // Create pull button
  const pullButton = document.createElement("button");
  pullButton.className = "modern-button btn";
  pullButton.textContent = "Pull Updates";
  pullButton.addEventListener("click", async () => {
    try {
      // Show loading popup
      showPopup("Updating and syncing data... This may take a moment.", false);
      
      // Call the update endpoint
      const response = await fetch("/pull-updates", {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.firebaseSync) {
          showPopup("Update successful! Data has been synced with Firebase. The application will restart.", true);
        } else {
          showPopup("Update successful! Failed to sync with Firebase. The application will restart.", true);
        }
        
        // Wait a moment before reloading the page
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showPopup("Error updating. Please try again later.", true);
      }
    } catch (error) {
      console.error("Error updating:", error);
      showPopup("Error updating. Please try again later.", true);
    }
  });
  
  // Create cancel button
  const cancelButton = document.createElement("button");
  cancelButton.className = "modern-button btn cancel";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    document.body.removeChild(popupContainer);
  });
  
  // Assemble the popup
  buttonContainer.appendChild(pullButton);
  buttonContainer.appendChild(cancelButton);
  popupContent.appendChild(messageElement);
  popupContent.appendChild(buttonContainer);
  popupContainer.appendChild(popupContent);
  document.body.appendChild(popupContainer);
}

// Update popup functionality
function showPopup(message, isError = false) {
    const popup = document.getElementById('updatePopup');
    const content = document.getElementById('updatePopupContent');
    
    // Set the message and style
    content.innerHTML = `<p style="color: ${isError ? '#ff4444' : '#359267'}; font-size: 18px;">${message}</p>`;
    
    // Show the popup
    popup.style.display = 'flex';
    
    // If it's not an error message, automatically hide after 3 seconds
    if (!isError) {
        setTimeout(() => {
            popup.style.display = 'none';
        }, 3000);
    }
}

// Close popup when clicking the close button
document.getElementById('closeUpdatePopup').addEventListener('click', () => {
    document.getElementById('updatePopup').style.display = 'none';
});

// Close popup when clicking outside
document.getElementById('updatePopup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('updatePopup')) {
        document.getElementById('updatePopup').style.display = 'none';
    }
});
