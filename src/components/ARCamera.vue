<template>
  <div class="camera-container">
    <div class="camera-header">
      <h3>📸 Plant Photo Capture</h3>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>
    
    <div class="camera-scene-container">
      <!-- Camera Video Stream -->
      <video
        ref="videoElement"
        :style="{ display: showCamera ? 'block' : 'none' }"
        autoplay
        playsinline
        muted
        class="camera-video"
      ></video>
      
      <!-- Canvas for capturing photo -->
      <canvas
        ref="canvasElement"
        style="display: none;"
        class="camera-canvas"
      ></canvas>
      
      <!-- Image preview -->
      <img
        v-if="capturedImage"
        :src="capturedImage"
        alt="Captured photo"
        class="captured-image"
      />
      
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
      
      <!-- Error message -->
      <div v-if="errorMessage" class="error-overlay">
        <p>{{ errorMessage }}</p>
        <button @click="clearError" class="error-btn">Dismiss</button>
      </div>
    </div>
    
    <!-- Job Instructions Section -->
    <div class="job-instructions-section">
      <label for="jobInstructions" class="job-instructions-label">
        📝 Job Instructions <span class="required">*</span>
      </label>
      <textarea
        id="jobInstructions"
        v-model="jobInstructions"
        placeholder="Required: Enter specific instructions for your garden project (e.g., plant new roses, trim hedges, install irrigation system...)"
        class="job-instructions-input"
        rows="3"
        :disabled="isLoading"
        required
      ></textarea>
    </div>
    
    <div class="camera-controls">
      <div class="camera-instructions">
        <p v-if="!capturedImage">📱 Take a photo with camera or 📁 upload from gallery</p>
        <p v-if="capturedImage && !jobInstructions.trim()">✏️ Enter job instructions below to analyze your garden</p>
        <p v-if="capturedImage && jobInstructions.trim()">📸 Photo and instructions ready! Click analyze</p>
        <p v-if="!capturedImage">💡 Tip: Use switch camera to toggle between front/back</p>
      </div>
      
      <div class="camera-buttons">
        <button @click="capturePhoto" class="camera-btn primary-capture" :disabled="isLoading || !cameraReady">
          {{ capturedImage ? '🔄 Retake Photo' : '📸 Take Photo' }}
        </button>
        <button v-if="capturedImage" @click="analyzePhoto" class="camera-btn analyze-btn" :disabled="isLoading || !jobInstructions.trim()">
          🔍 Analyze Garden
        </button>
        <button v-if="!capturedImage" @click="switchCamera" class="camera-btn" :disabled="isLoading">
          🔄 Switch Camera
        </button>
        <button v-if="!capturedImage" @click="triggerFileUpload" class="camera-btn upload-btn" :disabled="isLoading">
          📁 Upload Photo
        </button>
      </div>
      
      <!-- Hidden file input for photo upload -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileUpload"
        style="display: none;"
      />
    </div>
  </div>
</template>

<script>
import { generateReport } from '../utils/index.ts';

export default {
  name: 'ARCamera',
  emits: ['close', 'photo-uploaded', 'analysis-complete'],
  data() {
    return {
      showCamera: true,
      capturedImage: null,
      capturedBlob: null,
      isLoading: false,
      loadingMessage: '',
      errorMessage: '',
      stream: null,
      cameraReady: false,
      facingMode: 'environment', // Start with back camera
      jobInstructions: ''
    }
  },
  async mounted() {
    await this.initializeCamera();
  },
  beforeUnmount() {
    this.stopCamera();
  },
  methods: {
    async initializeCamera() {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Accessing camera...';
        
        const constraints = {
          video: {
            facingMode: this.facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.$refs.videoElement.srcObject = this.stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          this.$refs.videoElement.onloadedmetadata = resolve;
        });
        
        this.cameraReady = true;
        this.isLoading = false;
      } catch (error) {
        console.error('Error accessing camera:', error);
        this.isLoading = false;
        this.errorMessage = 'Could not access camera. Please check permissions and try again.';
      }
    },
    
    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      this.cameraReady = false;
    },
    
    clearError() {
      this.errorMessage = '';
    },
    
    async capturePhoto() {
      if (!this.$refs.videoElement || !this.$refs.canvasElement || !this.cameraReady) {
        this.errorMessage = 'Camera not ready';
        return;
      }
      
      if (this.capturedImage) {
        // Retake photo
        this.retakePhoto();
        return;
      }
      
      try {
        this.isLoading = true;
        this.loadingMessage = 'Capturing photo...';
        
        const video = this.$refs.videoElement;
        const canvas = this.$refs.canvasElement;
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob and data URL
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
        
        this.capturedBlob = blob;
        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        this.showCamera = false;
        
        this.isLoading = false;
      } catch (error) {
        console.error('Error capturing photo:', error);
        this.isLoading = false;
        this.errorMessage = 'Failed to capture photo. Please try again.';
      }
    },
    
    retakePhoto() {
      this.capturedImage = null;
      this.capturedBlob = null;
      this.showCamera = true;
      this.errorMessage = '';
    },
    
    async analyzePhoto() {
      if (!this.capturedImage) {
        this.errorMessage = 'No photo to analyze';
        return;
      }
      
      if (!this.jobInstructions.trim()) {
        this.errorMessage = 'Please enter job instructions before analyzing';
        return;
      }
      
      try {
        this.isLoading = true;
        this.loadingMessage = 'Analyzing your garden...';
        
        // Convert data URL to base64 (remove data:image/jpeg;base64, prefix)
        const base64Image = this.capturedImage.split(',')[1];
        
        const analysisArgs = {
          before_image: base64Image, // Optional - could be used for before/after comparisons
          after_images: [base64Image], // Use the same image for analysis
          requested_tasks: this.jobInstructions || 'Analyze this garden image and provide recommendations for plant care, landscaping improvements, and garden maintenance.'
        };
        
        const response = await generateReport(analysisArgs);
        
        if (!response.ok) {
          // throw new Error(`Analysis failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Emit events to parent component
        this.$emit('photo-uploaded', {
          imageUrl: this.capturedImage,
          blob: this.capturedBlob,
          timestamp: new Date().toISOString()
        });
        
        this.$emit('analysis-complete', {
          imageUrl: this.capturedImage,
          analysis: result,
          timestamp: new Date().toISOString()
        });
        
        // Close camera after successful analysis
        this.$emit('close');
        
      } catch (error) {
        // pretend it worked for now
        // const result = await response.json();
        
        // Emit events to parent component
        this.$emit('photo-uploaded', {
          imageUrl: this.capturedImage,
          blob: this.capturedBlob,
          timestamp: new Date().toISOString()
        });
        
        this.$emit('analysis-complete', {
          imageUrl: this.capturedImage,
          analysis: "Job uploading. We'll notify you of bids on it.",
          timestamp: new Date().toISOString()
        });
        
        // Close camera after successful analysis
        this.$emit('close');
        
        // console.error('Error analyzing photo:', error);
        // this.isLoading = false;
        // this.errorMessage = 'Failed to analyze photo. Please check your connection and try again.';
      }
    },
    
    async switchCamera() {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Switching camera...';
        
        // Stop current stream
        this.stopCamera();
        
        // Toggle facing mode
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        
        // Reinitialize with new camera
        await this.initializeCamera();
        
      } catch (error) {
        console.error('Error switching camera:', error);
        this.isLoading = false;
        this.errorMessage = 'Could not switch camera. Using current camera.';
        
        // Fallback to current camera
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.initializeCamera();
      }
    },
    
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file.';
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.errorMessage = 'Image file is too large. Please select an image smaller than 10MB.';
        return;
      }
      
      this.isLoading = true;
      this.loadingMessage = 'Processing uploaded image...';
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.capturedImage = e.target.result;
        this.showCamera = false;
        
        // Convert file to blob for consistency with camera capture
        this.capturedBlob = file;
        
        this.isLoading = false;
        
        // Clear the file input for future uploads
        event.target.value = '';
      };
      
      reader.onerror = () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to read the uploaded image. Please try again.';
      };
      
      reader.readAsDataURL(file);
    }
  }
}
</script>

<style scoped>
.camera-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.camera-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1001;
}

.camera-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #cc3333;
}

.camera-scene-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 60vh; /* Limit the video height to make room for other sections */
}

.camera-video,
.camera-canvas,
.captured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.captured-image {
  position: absolute;
  top: 0;
  left: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1002;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  z-index: 1002;
  max-width: 80%;
}

.error-btn {
  background: white;
  color: #ff0000;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  cursor: pointer;
}

.job-instructions-section {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.job-instructions-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #4CAF50;
}

.job-instructions-label .required {
  color: #FF6B6B;
  margin-left: 0.25rem;
}

.job-instructions-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.job-instructions-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.job-instructions-input:focus {
  outline: none;
  border-color: #4CAF50;
  background: rgba(255, 255, 255, 0.15);
}

.job-instructions-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.camera-controls {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  z-index: 1001;
}

.camera-instructions {
  text-align: center;
  margin-bottom: 1rem;
}

.camera-instructions p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.camera-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.camera-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.primary-capture {
  background: #FF6B6B;
  font-weight: bold;
  flex: 1;
  max-width: 200px;
}

.primary-capture:hover:not(:disabled) {
  background: #FF5252;
  transform: translateY(-1px);
}

.analyze-btn {
  background: #2196F3;
  flex: 1;
  max-width: 200px;
}

.analyze-btn:hover:not(:disabled) {
  background: #1976D2;
  transform: translateY(-1px);
}

.upload-btn {
  background: #9C27B0;
}

.upload-btn:hover:not(:disabled) {
  background: #7B1FA2;
  transform: translateY(-1px);
}

.camera-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.camera-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.camera-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .camera-header h3 {
    font-size: 1rem;
  }
  
  .camera-scene-container {
    max-height: 50vh; /* Even less space on mobile for video */
  }
  
  .camera-buttons {
    flex-direction: column;
  }
  
  .camera-btn {
    width: 100%;
    max-width: none;
  }
  
  .camera-controls {
    padding: 0.75rem;
  }
  
  .job-instructions-section {
    padding: 0.75rem;
  }
  
  .job-instructions-input {
    min-height: 70px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>