// Garden App utilities

export interface Plant {
  id: string;
  name: string;
  species?: string;
  plantedDate?: Date;
  lastWatered?: Date;
  lastFertilized?: Date;
  notes?: string;
  location?: string;
}

// Updated: 'after_image' changed to 'after_images' array, added 'contractor_accomplishments'
export interface GenerateArgs {
  before_image: string; // Base64 encoded image for the 'before' state
  after_image: string; // Base64 encoded image for the 'after' state
  requested_tasks: string; // Newline-separated string of tasks
  contractor_accomplishments?: string; // Optional text from contractor about accomplishments
}

// Interface for backend response from analyze_landscaping
export interface ReportResponse {
  report: string; // The full markdown report
  before_analysis_text: string; // AI's analysis of the before image
  original_tasks_text: string; // The user's original requested tasks
  contractor_accomplishments_text?: string; // Contractor's claimed accomplishments (if provided)
  error?: string; // Optional error field
}

// NEW: Interface for arguments to the /ask_question endpoint
export interface AskQuestionArgs {
  question: string;
  before_image_data_url?: string; // Optional: The base64 URL of the before image
  after_image_data_urls?: string[]; // Optional: Array of base64 URLs of after images
  before_analysis_text?: string; // Optional: AI's analysis text of the before image
  original_tasks_text?: string; // Optional: User's original tasks text
  contractor_accomplishments_text?: string; // Optional: Contractor's accomplishments text
  chat_history?: { role: string; content: string; }[]; // Optional: Previous chat messages
}

// NEW: Interface for response from the /ask_question endpoint
export interface AskQuestionResponse {
  answer: string; // The AI's answer to the question
  error?: string; // Optional error field
}


// ============================================================================
// HTTP POST Methods
// ============================================================================

// Route for http://10.15.20.130:5000/analyze_landscaping
// This method sends image data and tasks to the backend for AI analysis.
export const generateReport = async (args: GenerateArgs): Promise<ReportResponse> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/analyze_landscaping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
};

// NEW: Route for http://10.132.122.162:5000/ask_question
// This method sends a question and context to the backend for AI response.
export const askQuestion = async (args: AskQuestionArgs): Promise<AskQuestionResponse> => {
  try {
    const response = await fetch('http://10.15.20.130:5000/ask_question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error asking question:", error);
    throw error;
  }
};


// Placeholder for a future POST method to add/update plant data on a backend server.
// This would require a corresponding Flask route (e.g., '/plants') in app.py.
// export const savePlantToServer = async (plant: Plant): Promise<Plant> => {
//   try {
//     const response = await fetch('http://10.132.122.162:5000/plants', {
//       method: 'POST', // Or PUT for updates
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(plant)
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
//     }

//     return response.json(); // Returns the saved plant data from the server
//   } catch (error) {
//     console.error("Error saving plant to server:", error);
//     throw error;
//   }
// };

// ============================================================================
// Local Storage Utilities (Client-side only)
// ============================================================================

export const storage = {
  // Save data to localStorage
  save: (key: string, value: any): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Get data from localStorage
  get: (key: string): any => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },

  // Remove item from localStorage
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  // Get all keys from localStorage
  keys: (): string[] => {
    return Object.keys(localStorage);
  },

  // Clear all localStorage
  clear: (): void => {
    localStorage.clear();
  }
};

export const plantStorage = {
  // Save plants array
  savePlants: (plants: Plant[]): void => {
    storage.save('garden-plants', plants);
  },

  // Get plants array
  getPlants: (): Plant[] => {
    return storage.get('garden-plants') || [];
  },

  // Add a new plant
  addPlant: (plant: Plant): void => {
    const plants = plantStorage.getPlants();
    plants.push(plant);
    plantStorage.savePlants(plants);
  },

  // Update a plant
  updatePlant: (updatedPlant: Plant): void => {
    const plants = plantStorage.getPlants();
    const index = plants.findIndex(p => p.id === updatedPlant.id);
    if (index !== -1) {
      plants[index] = updatedPlant;
      plantStorage.savePlants(plants);
    }
  },

  // Delete a plant
  deletePlant: (plantId: string): void => {
    const plants = plantStorage.getPlants();
    const filteredPlants = plants.filter(p => p.id !== plantId);
    plantStorage.savePlants(filteredPlants);
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

// Utility function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Date formatting utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const daysSince = (date: Date): number => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
