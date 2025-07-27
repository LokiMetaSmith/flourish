<template>
  <div class="container">
    <h1>AI Landscaping Project Verifier</h1>

    <div class="upload-section">
      <h2>Upload Images</h2>
      <div class="file-group">
        <input type="file" id="beforeImageUpload" accept="image/*" @change="handleFileChange($event, 'before')">
        <label for="beforeImageUpload" class="button">Upload Before Image</label>
        <p id="beforeFileName" class="fileName">{{ beforeFileName }}</p>
      </div>
      <div class="file-group">
        <input type="file" id="afterImageUpload" accept="image/*" @change="handleFileChange($event, 'after')">
        <label for="afterImageUpload" class="button">Upload After Image</label>
        <p id="afterFileName" class="fileName">{{ afterFileName }}</p>
      </div>
    </div>

    <div class="editor-area">
      <div class="controls">
        <div class="section">
          <h2>Requested Landscaping Tasks</h2>
          <p class="hint">List the specific tasks the contractor was supposed to complete (e.g., "Install new flower bed with roses and mulch; Lay sod in bare dirt area; Trim bushes."). Separate tasks with semicolons or new lines.</p>
          <textarea id="requestedTasks" placeholder="Enter tasks here..." rows="8" v-model="requestedTasks"></textarea>
          <button id="analyzeBtn" class="button primary" @click="analyzeProject">Analyze & Generate Report</button>
        </div>
        <div class="section report-section">
          <h2>Project Report</h2>
          <pre id="reportOutput">{{ reportOutput }}</pre>
          <button id="downloadReportBtn" class="button success" @click="downloadReport">Download Report</button>
        </div>
      </div>
    </div>
    <div id="loading" class="loading-spinner" v-if="loading"></div>
  </div>
</template>

<script>
import { generateReport } from '../utils';

export default {
  name: 'ProjectVerifier',
  data() {
    return {
      beforeImage: null,
      afterImage: null,
      beforeFileName: '',
      afterFileName: '',
      requestedTasks: '',
      reportOutput: '',
      loading: false,
    };
  },
  methods: {
    handleFileChange(event, type) {
      const file = event.target.files[0];
      if (!file) return;

      if (type === 'before') {
        this.beforeImage = file;
        this.beforeFileName = file.name;
      } else {
        this.afterImage = file;
        this.afterFileName = file.name;
      }
    },
    async analyzeProject() {
      if (!this.beforeImage || !this.afterImage || !this.requestedTasks) {
        alert('Please upload both images and enter the requested tasks.');
        return;
      }

      this.loading = true;
      this.reportOutput = '';

      const reader = new FileReader();
      const afterReader = new FileReader();

      reader.onload = async (event) => {
        const beforeImageBase64 = event.target.result.split(',')[1];

        afterReader.onload = async (event) => {
          const afterImageBase64 = event.target.result.split(',')[1];

          const args = {
            before_image: beforeImageBase64,
            after_image: afterImageBase64,
            requested_tasks: this.requestedTasks,
          };

          try {
            const response = await generateReport(args);
            const result = await response.json();
            this.reportOutput = JSON.stringify(result, null, 2);
          } catch (error) {
            this.reportOutput = `Error generating report: ${error.message}`;
          } finally {
            this.loading = false;
          }
        };

        afterReader.readAsDataURL(this.afterImage);
      };

      reader.readAsDataURL(this.beforeImage);
    },
    downloadReport() {
      if (!this.reportOutput) {
        alert('No report to download.');
        return;
      }

      const blob = new Blob([this.reportOutput], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'landscaping_report.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

h1 {
  text-align: center;
  color: #2E7D32;
  margin-bottom: 2rem;
}

.upload-section {
  display: flex;
  justify-content: space-around;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.file-group {
  text-align: center;
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

.editor-area {
  margin-top: 2rem;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.section {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.section h2 {
  color: #2E7D32;
  margin-top: 0;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.hint {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.4;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;
}

#reportOutput {
  white-space: pre-wrap;
  background-color: #e9ecef;
  padding: 1rem;
  border-radius: 8px;
  min-height: 150px;
}

.loading-spinner {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
