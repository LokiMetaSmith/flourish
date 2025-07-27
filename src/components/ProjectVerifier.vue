<template>
  <div class="container">
    <h1>AI Landscaping Project Verifier</h1>

    <div class="block-section">
      <h2>Block 1: Task Ideation & Requirements</h2>
      <div class="upload-section">
        <h3>Upload Before Image</h3>
        <div class="file-group">
          <input type="file" id="beforeImageUpload" accept="image/*" @change="handleFileChange($event, 'before')">
          <label for="beforeImageUpload" class="button">Upload Before Image</label>
          <p id="beforeFileName" class="fileName">{{ beforeFileName }}</p>
        </div>
      </div>

      <div class="section">
        <h3>Define Requested Landscaping Tasks</h3>
        <p class="hint">Add individual tasks the contractor is expected to complete, or ask AI for suggestions.</p>
        <div class="task-input-group">
          <input type="text" id="newTaskInput" placeholder="e.g., Install new rose garden" v-model="newTaskInput" @keypress.enter="addTask">
          <button id="addTaskBtn" class="button secondary" @click="addTask">Add Task</button>
          <button id="suggestTasksBtn" class="button" @click="suggestTasks">Suggest Tasks (AI)</button>
        </div>
        <ul id="taskList">
          <li v-if="requestedTasks.length === 0" class="hint-small">No tasks added yet. Use "Add Task" or "Suggest Tasks".</li>
          <li v-for="(task, index) in requestedTasks" :key="index">
            {{ task }}
            <button class="remove-task-btn" @click="removeTask(index)">x</button>
          </li>
        </ul>
      </div>

      <div class="section conversation-section">
        <h3>Q&A Follow-up (Related to Before Image & Tasks)</h3>
        <p class="hint">Ask questions about the 'Before' image or suggested tasks. Click "Analyze & Generate Initial Report" first!</p>
        <div id="chatHistory">
          <div v-for="(msg, index) in chatConversationHistory" :key="index" :class="`${msg.role}-message`">
            {{ msg.message }}
          </div>
        </div>
        <div class="chat-input-group">
          <input type="text" id="chatInput" placeholder="Ask a question (e.g., What type of grass is this?)..." v-model="chatInput" :disabled="!chatEnabled || isLoading" @keypress.enter="sendChatMessage">
          <button id="sendChatBtn" class="button primary" @click="sendChatMessage" :disabled="!chatEnabled || isLoading">Send</button>
        </div>
        <div v-if="chatLoading" class="chat-loading-spinner"></div>
      </div>

      <button id="analyzeBtn" class="button primary" @click="analyzeProject">Analyze & Generate Initial Report</button>

      <div class="section report-section">
        <h3>Initial Project Report</h3>
        <pre id="reportOutput">{{ reportOutput }}</pre>
        <button id="downloadBidBtn" class="button success" @click="downloadBid">Download Bid & Analysis</button>
        <p class="hint">This report describes the 'Before' image and the initial tasks.</p>
      </div>
    </div>

    <div class="block-section">
      <h2>Block 2: Contractor's Work Details</h2>
      <div class="upload-section">
        <h3>Upload After Image(s)</h3>
        <div class="file-group">
          <input type="file" id="afterImageUpload" accept="image/*" multiple @change="handleFileChange($event, 'after')">
          <label for="afterImageUpload" class="button">Upload After Image(s)</label>
          <p id="afterFileName" class="fileName">{{ afterFileName }}</p>
        </div>
      </div>

      <div class="section">
        <h3>Contractor's Accomplishments (Optional)</h3>
        <p class="hint">Contractor describes the work they believe was accomplished in the 'After' image(s).</p>
        <textarea id="contractorAccomplishments" placeholder="E.g., I installed new sod in the bare patch and trimmed all the hedges. The rose garden was planted as requested." rows="5" v-model="contractorAccomplishments"></textarea>
      </div>

      <div class="section">
        <h3>Select Completed Tasks</h3>
        <p class="hint">Contractor can select which of the requested tasks they completed.</p>
        <ul id="completedTaskList">
          <li v-if="requestedTasks.length === 0" class="hint-small">Generate tasks in Block 1 first.</li>
          <li v-for="(task, index) in requestedTasks" :key="index">
            <input type="checkbox" :id="`completed-task-${index}`" :value="task" v-model="contractorSelectedTasks">
            <label :for="`completed-task-${index}`">{{ task }}</label>
          </li>
        </ul>
        <button id="finalizeWorkBtn" class="button primary" @click="finalizeWork">Finalize Work (For Final Report)</button>
      </div>
    </div>

    <div class="block-section">
      <h2>Block 3: Final Report & Payment Validation</h2>
      <div class="section report-section">
        <h3>Final Project Verification Report</h3>
        <pre id="finalReportOutput">{{ finalReportOutput }}</pre>
        <button id="downloadFinalReportBtn" class="button success" @click="downloadFinalReport">Download Final Report</button>
      </div>
    </div>

    <div v-if="isLoading" id="loading" class="loading-spinner"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// Import service functions and interfaces
import { generateReport, sendChatQuery } from '../utils/index.ts';
import type { ReportResponse, ChatQueryArgs, ChatQueryResponse } from '../utils/index.ts';

interface ChatMessage {
  role: 'user' | 'ai';
  message: string;
}

export default defineComponent({
  name: 'ProjectVerifier',
  data() {
    return {
      // --- Block 1 Data ---
      beforeImageFile: null as File | null,
      beforeFileName: 'No file chosen',
      beforeImageDataURL: null as string | null,

      newTaskInput: '',
      requestedTasks: [] as string[],

      reportOutput: '',

      // --- Block 2 Data ---
      afterImageFiles: [] as File[],
      afterFileName: 'No files chosen',
      afterImageDataURLs: [] as string[],
      contractorAccomplishments: '',
      contractorSelectedTasks: [] as string[],

      finalReportOutput: '',

      // --- Shared / State Data ---
      isLoading: false,
      loadingMessage: '',
      errorMessage: '',

      // Data passed to chat and download buttons after initial analysis
      storedBeforeAnalysisText: null as string | null,
      storedOriginalTasksText: null as string | null,
      currentReport: null as string | null,

      // Chat Data
      chatInput: '',
      chatEnabled: false,
      chatLoading: false,
      chatConversationHistory: [{ role: 'ai', message: 'Hi! I can answer questions about your landscaping project. Start by suggesting tasks or analyzing your images.' }] as ChatMessage[],
    };
  },
  methods: {
    // --- General Utilities ---
    async readFileAsDataURL(file: File): Promise<string | ArrayBuffer | null> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result || null);
        reader.onerror = (error: ProgressEvent<FileReader>) => reject(error);
        reader.readAsDataURL(file);
      });
    },

    // --- Image Upload Handlers ---
    async handleFileChange(event: Event, type: 'before' | 'after') {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) {
        if (type === 'before') {
          this.beforeImageFile = null;
          this.beforeFileName = 'No file chosen';
          this.beforeImageDataURL = null;
        } else {
          this.afterImageFiles = [];
          this.afterFileName = 'No files chosen';
          this.afterImageDataURLs = [];
        }
        return;
      }

      this.isLoading = true; // Use main spinner for file processing
      try {
        let names: string[] = [];
        let dataURLs: string[] = [];

        for (const file of Array.from(files)) {
          names.push(file.name);
          const dataURL = await this.readFileAsDataURL(file);
          if (typeof dataURL === 'string') {
            dataURLs.push(dataURL);
          }
        }

        if (type === 'before') {
          this.beforeImageFile = files[0];
          this.beforeFileName = names[0];
          this.beforeImageDataURL = dataURLs[0];
          console.log('beforeImageDataURL set:', this.beforeFileName);
        } else { // type === 'after'
          this.afterImageFiles = Array.from(files); // Store File objects
          this.afterFileName = names.join(', ');
          this.afterImageDataURLs = dataURLs; // Store all base64 data URLs
          console.log('afterImageDataURLs set:', this.afterFileName);
          this.updateCompletedTaskList(); // Update Block 2's task list based on images
        }
      } catch (error: any) {
        this.errorMessage = `Failed to read file(s): ${error.message}`;
        console.error('File read error:', error);
      } finally {
        this.isLoading = false;
      }
    },

    // --- Task List Management ---
    addTask() {
      const taskText = this.newTaskInput.trim();
      if (taskText) {
        this.requestedTasks.push(taskText);
        this.newTaskInput = ''; // Clear input
        this.updateCompletedTaskList(); // Update Block 2's list
      } else {
        alert('Please enter a task.');
      }
    },
    removeTask(index: number) {
      this.requestedTasks.splice(index, 1); // Remove task from array
      this.updateCompletedTaskList(); // Re-render Block 2's list
    },
    updateCompletedTaskList() {
      // This re-renders the checkboxes in Block 2 based on requestedTasks
      // No explicit logic needed here other than forcing a re-render by Vue reactivity
    },

    // --- Suggest Tasks Functionality ---
    async suggestTasks() {
      console.log('Suggest Tasks button clicked!');
      if (!this.beforeImageDataURL) {
        alert('Please upload a "Before" image first to get task suggestions.');
        return;
      }

      this.isLoading = true;
      this.reportOutput = 'Generating task suggestions...';
      this.chatEnabled = false; // Disable chat during suggestion generation

      try {
        const response = await fetch('/suggest_tasks', { // Call the new endpoint
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ before_image: this.beforeImageDataURL.split(',')[1] }) // Send base64 part only
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received Suggested Tasks:', data.suggested_tasks);

        const suggestedTasksArray = data.suggested_tasks.split('\n')
          .map((task: string) => task.trim())
          .filter((task: string) => task.length > 0 && task.startsWith('- '));

        suggestedTasksArray.forEach((task: string) => {
          this.requestedTasks.push(task.substring(2)); // Remove bullet point
        });
        // Vue's reactivity will re-render taskList and completedTaskList automatically
        
        this.reportOutput = 'Task suggestions generated and added to your list. Review and click "Analyze & Generate Initial Report".';

        // Re-enable chat after suggestion generation
        this.chatEnabled = true;
        this.chatConversationHistory = [{ role: 'ai', message: 'Hi! I can answer questions about your landscaping project. Start by suggesting tasks or analyzing your images.' }];


      } catch (error: any) {
        console.error('Error suggesting tasks:', error);
        this.reportOutput = `Error suggesting tasks: ${error.message}`;
        alert('Failed to suggest tasks: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },

    // --- Analyze Initial Project Button (Block 1 Trigger) ---
    async analyzeProject() {
      console.log('Analyze & Generate Initial Report button clicked!');

      if (!this.beforeImageDataURL) {
        alert('Please upload a "Before" image to generate the initial report.');
        return;
      }
      if (this.requestedTasks.length === 0) {
        alert('Please add some requested landscaping tasks before generating the report.');
        return;
      }

      this.isLoading = true;
      this.reportOutput = 'Generating initial project report...';
      this.chatEnabled = false; // Disable chat during analysis

      try {
        const args = {
          before_image: this.beforeImageDataURL.split(',')[1], // Send base64 part only
          // Send first after image if available, otherwise null. Backend handles conditional verification.
          after_image: this.afterImageDataURLs.length > 0 ? this.afterImageDataURLs[0].split(',')[1] : null,
          requested_tasks: this.requestedTasks.join('\n'), // Join tasks for backend
          contractor_accomplishments: this.contractorAccomplishments // Send contractor's text
        };

        const data: ReportResponse = await generateReport(args); // Call generateReport from utils/index.ts

        this.storedBeforeAnalysisText = data.before_analysis_text;
        this.storedOriginalTasksText = data.original_tasks_text;
        this.currentReport = data.report;

        this.reportOutput = data.report;
        console.log('Attempted to set reportOutput.textContent.');

        // Enable chat after successful report generation
        this.chatEnabled = true;
        this.chatConversationHistory = [{ role: 'ai', message: 'Hi! I can answer questions about your landscaping project once you\'ve generated the initial report.' }];

      } catch (error: any) {
        console.error('Error generating initial report:', error);
        this.reportOutput = `Error: ${error.message}`;
        alert('Failed to generate initial report: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },

    // --- Download Bid & Analysis Button ---
    downloadBid() {
      console.log('Download Bid & Analysis button clicked!');
      if (!this.storedBeforeAnalysisText || !this.storedOriginalTasksText) {
        alert('Please generate an initial report or tasks first.');
        return;
      }

      const combinedText = `--- Landscaping Project Bid & Initial Analysis ---\n\n` +
                           `**Generated on: ${new Date().toLocaleString()}**\n\n` +
                           `### Before Image Analysis (Current State)\n\n${this.storedBeforeAnalysisText}\n\n` +
                           `### Original Requested Tasks\n\n${this.storedOriginalTasksText}\n\n` +
                           `This document outlines the initial state and requested tasks for bidding purposes.`;

      const blob = new Blob([combinedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'landscaping_bid_analysis.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // --- Block 2 Logic (Finalize Work) ---
    finalizeWork() {
      console.log('Finalize Work button clicked!');
      if (!this.beforeImageDataURL || this.afterImageDataURLs.length === 0 || this.requestedTasks.length === 0) {
          alert('Please ensure Block 1 is complete and "After Images" are uploaded in Block 2.');
          return;
      }
      
      const selectedTasks = this.contractorSelectedTasks; // This array is already populated by v-model

      console.log('Contractor Selected Tasks:', selectedTasks);
      alert('Contractor work details prepared. Now you can generate the Final Report from Block 3.');
      // This button primarily serves as a confirmation and preparation step.
      // The actual final report generation is triggered by the Block 3 button.
    },

    // --- Block 3 Logic (Download Final Report) ---
    async downloadFinalReport() {
      console.log('Download Final Report button clicked!');
      if (!this.beforeImageDataURL || this.afterImageDataURLs.length === 0 || this.requestedTasks.length === 0) {
          alert('Please complete Block 1 and upload After Images in Block 2.');
          return;
      }

      const selectedTasks = this.contractorSelectedTasks; // Already available from v-model

      this.finalReportOutput = 'Generating final verification report...';
      this.isLoading = true; // Use main spinner for this heavy operation

      try {
          const args = {
              before_image: this.beforeImageDataURL.split(',')[1],
              after_image: this.afterImageDataURLs[0].split(',')[1], // Send only the first after image
              requested_tasks: this.requestedTasks.join('\n'), // All tasks from Block 1
              contractor_accomplishments: this.contractorAccomplishments,
              contractor_selected_tasks: selectedTasks
          };

          const response = await fetch('/generate_final_report', { // Call the new endpoint
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(args),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Received Final Report Data:', data);
          this.finalReportOutput = data.final_report; // Display final report

          const finalReportBlob = new Blob([data.final_report], { type: 'text/plain' });
          const url = URL.createObjectURL(finalReportBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'landscaping_final_verification_report.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);


      } catch (error: any) {
          console.error('Error generating final report:', error);
          this.finalReportOutput = `Error: ${error.message}`;
          alert('Failed to generate final report: ' + error.message);
      } finally {
          this.isLoading = false;
      }
    },


    // --- Chat Functionality ---
    async sendChatMessage() {
        const userMessage = this.chatInput.trim();
        if (!userMessage) return;

        this.displayChatMessage(userMessage, 'user');
        this.chatInput = ''; // Clear input
        this.chatEnabled = false; // Disable during send
        this.chatLoading = true; // Show chat specific spinner

        // Prepare context for the AI
        const chatContext = {
            before_analysis: this.storedBeforeAnalysisText || '',
            original_tasks: this.storedOriginalTasksText || '',
            contractor_accomplishments: this.contractorAccomplishments,
            full_report: this.currentReport || '',
            conversation_history: this.chatConversationHistory // Send history for continuity
        };

        const args: ChatQueryArgs = {
            user_question: userMessage,
            // Send before_image only if after_image is not present
            before_image: this.afterImageDataURLs.length === 0 && this.beforeImageDataURL ? this.beforeImageDataURL.split(',')[1] : null,
            // Always prefer sending the first after_image if available
            after_image: this.afterImageDataURLs.length > 0 ? this.afterImageDataURLs[0].split(',')[1] : null,
            context: chatContext
        };

        try {
            const data: ChatQueryResponse = await sendChatQuery(args); // Call sendChatQuery from utils/index.ts
            console.log('Received Chat API Response:', data);
            const aiMessage = data.response;
            this.displayChatMessage(aiMessage, 'ai');
            this.chatConversationHistory.push({ role: 'ai', message: aiMessage });

        } catch (error: any) {
            console.error('Error during chat query:', error);
            this.displayChatMessage(`Error: ${error.message}`, 'ai');
        } finally {
            this.chatLoading = false;
            this.chatEnabled = true;
            // No need to focus input, Vue handles v-model
        }
    },

    displayChatMessage(message: string, sender: 'user' | 'ai') {
        this.chatConversationHistory.push({ role: sender, message: message });
        // Vue's reactivity will render this to the template
        // Auto-scroll logic if needed, might need a ref to chatHistory div
        this.$nextTick(() => { // Ensures DOM is updated before scrolling
            const chatHistoryDiv = this.$el.querySelector('#chatHistory');
            if (chatHistoryDiv) {
                chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
            }
        });
    }
  },
  // Lifecycle hook for initial setup
  mounted() {
    // Initial render of task list (empty initially)
    this.updateCompletedTaskList(); // No, this only updates rendering, not initial data. renderTaskList() does initial data.
    // Ensure chat is disabled on mount
    this.chatEnabled = false;
  }
});
</script>

<style scoped>
/* Scoped styles specific to ProjectVerifier.vue */

/* Main container for the verifier, acts like the old 'container' */
.container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
  color: #333;
}

h1 {
  text-align: center;
  color: #2E7D32;
  margin-bottom: 2rem;
}

/* Styles for the main blocks (Block 1, 2, 3) */
.block-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  background-color: #fcfcfc;
}

.block-section h2 {
  color: #2E7D32;
  margin-top: 0;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

/* --- Re-used sections styles (from previous style.css) --- */
.upload-section {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap; /* Allow wrap for responsiveness */
}

.file-group {
  text-align: center;
  margin: 0.5rem; /* Spacing between groups */
}

.file-group input[type="file"] {
  display: none;
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 500;
  border: 2px solid transparent;
}

.button:hover {
  transform: translateY(-2px);
}

.button.primary {
  background-color: #4CAF50;
  color: white;
}

.button.primary:hover {
  background-color: #45a049;
}

.button.secondary {
  background-color: #007bff;
  color: white;
  border: 2px solid transparent;
}

.button.secondary:hover {
  background-color: #0056b3;
}


.button.success {
    background-color: #28a745;
    color: white;
}

.button.success:hover {
    background-color: #218838;
}

.fileName {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.section {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  margin-bottom: 1.5rem; /* Spacing between sections */
}

.section h3 { /* For h3 headings within sections */
  color: #2E7D32;
  margin-top: 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.hint {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.hint-small {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
  margin-top: 0.5rem;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
}

/* Task input group specific styles */
.task-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap; /* Allow wrapping */
}
.task-input-group input[type="text"] {
  flex: 1; /* Take remaining space */
  min-width: 150px; /* Ensure input is not too small */
}

/* Task list styling */
#taskList, #completedTaskList {
  list-style: none; /* Remove default bullets */
  padding: 0;
  margin: 0;
}

#taskList li, #completedTaskList li {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 0.7rem 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.95rem;
}

.remove-task-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.remove-task-btn:hover {
  background-color: #c82333;
}

/* Completed tasks checkbox styling */
#completedTaskList li input[type="checkbox"] {
  margin-right: 0.8rem;
  transform: scale(1.2); /* Make checkbox slightly larger */
  cursor: pointer;
}
#completedTaskList li label {
  flex: 1; /* Label takes up remaining space */
  cursor: pointer;
}

/* Report output areas */
.report-section pre {
  white-space: pre-wrap;
  background-color: #e9ecef;
  padding: 1rem;
  border-radius: 8px;
  min-height: 150px;
  max-height: 400px; /* Add max-height for scrolling */
  overflow-y: auto;
  border: 1px solid #dee2e6;
  margin-bottom: 1rem;
}

/* Loading spinner */
#loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 8px solid #f3f3f3; /* Light grey */
  border-top: 8px solid #4CAF50; /* Green */
  border-radius: 50%;
  animation: spin 1s linear infinite;
  z-index: 1000;
  display: none; /* Hidden by default, controlled by v-if */
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Chat specific styles */
.conversation-section {
  margin-bottom: 1.5rem;
}

#chatHistory {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
  background-color: #fbfbfb;
}

.user-message {
  text-align: right;
  background-color: #e3f2fd; /* Light blue */
  padding: 0.6rem 1rem;
  border-radius: 12px;
  margin-left: 20%; /* Keep messages on one side */
  margin-bottom: 0.5rem;
  color: #2196F3;
  word-wrap: break-word; /* Ensure long words break */
}

.ai-message {
  text-align: left;
  background-color: #e8f5e9; /* Light green */
  padding: 0.6rem 1rem;
  border-radius: 12px;
  margin-right: 20%; /* Keep messages on one side */
  margin-bottom: 0.5rem;
  color: #4CAF50;
  word-wrap: break-word; /* Ensure long words break */
}

.chat-input-group {
  display: flex;
  gap: 0.5rem;
}

.chat-input-group input[type="text"] {
  flex: 1;
  border-radius: 8px;
}

.chat-loading-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0.5rem auto;
    display: none; /* Controlled by v-if in template */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .container {
    margin: 1rem;
    padding: 1rem;
  }
  .upload-section, .task-input-group, .chat-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  .file-group, .task-input-group input[type="text"], .chat-input-group input[type="text"] {
    width: 100%;
    margin-right: 0;
  }
  .button.primary, .button.secondary {
    width: 100%;
    margin-top: 0.5rem;
  }
  .controls {
    grid-template-columns: 1fr;
  }
  .user-message, .ai-message {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
