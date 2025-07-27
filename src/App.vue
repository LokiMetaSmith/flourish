<template>
  <div class="app">
    <!-- Hamburger Menu -->
    <div class="hamburger-menu">
      <button @click="toggleMenu" class="hamburger-btn" :class="{ 'menu-open': showMenu }">
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <!-- Menu Overlay -->
      <div v-if="showMenu" class="menu-overlay" @click="closeMenu"></div>
      
      <!-- Menu Content -->
      <div class="menu-content" :class="{ 'menu-open': showMenu }">
        <div class="menu-header">
          <h3>Select User Type</h3>
          <button @click="closeMenu" class="menu-close">✕</button>
        </div>
        
        <div class="menu-options">
          <button 
            @click="setUserType('contractor')" 
            class="menu-option" 
            :class="{ 'active': userType === 'contractor' }"
          >
            <span class="option-icon">🔨</span>
            <span class="option-text">Contractor</span>
            <span v-if="userType === 'contractor'" class="option-check">✓</span>
          </button>
          
          <button 
            @click="setUserType('customer')" 
            class="menu-option" 
            :class="{ 'active': userType === 'customer' }"
          >
            <span class="option-icon">🏠</span>
            <span class="option-text">Customer</span>
            <span v-if="userType === 'customer'" class="option-check">✓</span>
          </button>
        </div>
        
        <div class="menu-footer">
          <p class="current-selection">Current: {{ userTypeDisplay }}</p>
        </div>
      </div>
    </div>

    <!-- AR Camera Component -->
    <ARCamera v-if="showAR" @close="closeAR" @photo-uploaded="onPhotoUploaded" @analysis-complete="onAnalysisComplete" />
    <ProjectVerifier v-if="showProjectVerifier" />
    
    <header>
      <h1>🌱 Flourish</h1>
      <p>Gardening dreams coming true and staying true</p>
    </header>
    
    <main>
      <div class="welcome">
        <p v-if="userType === 'customer'">Start by adding a photo of a place you want help with</p>
        
        <div class="actions">
          <button class="btn-secondary" @click="viewGarden">View Projects</button>
          <button class="btn-secondary" @click="openProjectVerifier">Verify Project</button>
          <button class="btn-ar" @click="openAR">{{this.userType === `customer` ? 'Add Photo' : 'Finish Job'}}</button>
        </div>
        
        <div class="features">
          <div class="feature-card">
            <h3>🌿 Plant Suggestions</h3>
            <p>Find inspiration with the help of AI</p>
          </div>
          <div class="feature-card">
            <h3>💧 Care Reminders</h3>
            <p>Never forget to water or fertilize your plants</p>
          </div>
          <div class="feature-card">
            <h3>🔍 Find help</h3>
            <p>Accept competitive bids on your project</p>
          </div>
        </div>
      </div>
    </main>
    
    <footer>
      <p>Version {{ version }}</p>
    </footer>
  </div>
</template>

<script>
import packageJson from "../package.json";
import ARCamera from "./components/ARCamera.vue";
import ProjectVerifier from "./components/ProjectVerifier.vue";
import { generateReport } from "./utils"

export default {
  name: 'App',
  components: {
    ARCamera,
    ProjectVerifier
  },
  data() {
    return {
      version: packageJson.version,
      showAR: false,
      showProjectVerifier: false,
      uploadedPhotos: [],
      analysisResults: [],
      showMenu: false,
      userType: 'customer' // default to customer
    }
  },
  computed: {
    userTypeDisplay() {
      return this.userType === 'contractor' ? 'Contractor 🔨' : 'Customer 🏠';
    }
  },
  methods: {
    openProjectVerifier() {
      this.showProjectVerifier = true;
    },
    async viewGarden() {
      const foo = await generateReport(); 
      console.log(`foo`, foo);
    },
    openAR() {
      // call generateReport in utils
      // Check if device supports camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.showAR = true;
      } else {
        alert('Camera access is not supported on this device');
      }
    },
    closeAR() {
      this.showAR = false;
    },
    async onPhotoUploaded(photoData) {
      console.log('Photo uploaded:', photoData);
      this.uploadedPhotos.push(photoData);
      // You can add logic here to display the photo or save it to a backend
      alert(`Photo uploaded successfully! Total photos: ${this.uploadedPhotos.length}`);
    },
    onAnalysisComplete(analysisData) {
      console.log('Analysis complete:', analysisData);
      this.analysisResults.push(analysisData);
      // Display analysis results to the user
      alert(`Garden analysis complete! Check console for results.`);
    },
    toggleMenu() {
      this.showMenu = !this.showMenu;
    },
    closeMenu() {
      this.showMenu = false;
    },
    setUserType(type) {
      this.userType = type;
      this.closeMenu();
      console.log('User type set to:', type);
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Hamburger Menu Styles */
.hamburger-menu {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 2000;
}

.hamburger-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.hamburger-btn:hover {
  background: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.hamburger-btn span {
  width: 20px;
  height: 2px;
  background: #333;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger-btn.menu-open span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger-btn.menu-open span:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.menu-open span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

.menu-content {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100vh;
  background: white;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transition: left 0.3s ease;
  z-index: 2001;
  display: flex;
  flex-direction: column;
}

.menu-content.menu-open {
  left: 0;
}

.menu-header {
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.menu-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.menu-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-close:hover {
  background: #e9ecef;
  color: #333;
}

.menu-options {
  flex: 1;
  padding: 1rem 0;
}

.menu-option {
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.menu-option:hover {
  background: #f8f9fa;
}

.menu-option.active {
  background: #e3f2fd;
  border-left: 4px solid #2196F3;
}

.option-icon {
  font-size: 1.5rem;
  width: 2rem;
  text-align: center;
}

.option-text {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

.option-check {
  color: #4CAF50;
  font-size: 1.2rem;
  font-weight: bold;
}

.menu-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.current-selection {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}

header {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  padding: 2rem;
  text-align: center;
}

header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 300;
}

header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.welcome {
  text-align: center;
  padding: 2rem 0;
}

.welcome h2 {
  color: #2E7D32;
  margin-bottom: 1rem;
}

.welcome p {
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 3rem;
}

.btn-primary, .btn-secondary, .btn-ar {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: #4CAF50;
  border: 2px solid #4CAF50;
}

.btn-secondary:hover {
  background: #4CAF50;
  color: white;
  transform: translateY(-2px);
}

.btn-ar {
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  color: white;
  border: 2px solid transparent;
}

.btn-ar:hover {
  background: linear-gradient(135deg, #FF5252, #FF7043);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.feature-card h3 {
  color: #2E7D32;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.feature-card p {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

footer {
  background: #f5f5f5;
  padding: 1rem;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  header {
    padding: 1.5rem;
  }
  
  header h1 {
    font-size: 2rem;
  }
  
  main {
    padding: 1rem;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-primary, .btn-secondary, .btn-ar {
    width: 100%;
    max-width: 250px;
  }
  
  .features {
    grid-template-columns: 1fr;
  }
}
</style>
