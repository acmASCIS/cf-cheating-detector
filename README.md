# Codeforces Cheating Detector - Setup & Operation Guide

## 📋 Prerequisites
- Manager access to the Codeforces contest
- Node.js installed on your system
- Git installed on your system

## 🚀 Setup Steps

### Step 1: Configure Codeforces API Access
1. Go to your manager account on Codeforces
2. Ensure you're marked as manager on the intended contest (VIP)
3. Create a new API key:
   - Go to API section in your profile
   - Generate a new API key
   - **Save both the API key and secret** for later use

### Step 2: Clone and Prepare the Repository
```bash
# Clone the cheating detector repository
git clone https://github.com/acmASCIS/cf-cheating-detector.git

# Navigate to the project directory
cd cf-cheating-detector

# Pull the file approach branch
git pull origin file-approach
```

### Step 3: Environment Configuration
1. Create a `.env` file in the root directory:

2. Copy the contents from `.env.example` and paste into your new `.env` file

3. Configure your `.env` file with your credentials:
   ```env
   PORT=3030
   CF_HANDLE="your_codeforces_handle"
   CF_PASSWORD="your_codeforces_password"
   CF_KEY="your_api_key_here"
   CF_SECRET="your_api_secret_here"
   RETRIES=1
   JOBS_PER_TIME_FRAME=1
   TIME_FRAME=3000
   BASIC_AUTH_USERNAME=
   BASIC_AUTH_PASSWORD=
   ```

### Step 4: Install Dependencies
```bash
# Install backend dependencies
cd src
npm install

# Install frontend dependencies
cd ../client/src
npm install
```

## 🏃‍♂️ Running the Application

### Step 5: Start Both Services
Open **two separate command terminals**:

**Terminal 1 - Backend Server:**
```bash
cd cf-cheating-detector/src
npm run start
```

**Terminal 2 - Frontend Client:**
```bash
cd cf-cheating-detector/client/src
npm run start
```

### Step 6: Configure Detection Parameters
1. The frontend will open in your browser
2. Fill in the required information:
   - **Contest ID**: The ID of the contest you're monitoring
   - **Group ID**: The group associated with the contest
   - **Blacklist Problems**: Problems you don't want to detect cheating on
   - **Matching Percentage Threshold**: Number between 0 and 1 (submissions below this threshold won't be flagged)

3. Click **Submit**

### Step 7: Authentication
- A new window will open directing you to Codeforces
- Click on the enter button to go to Login page
- it will automatically write the username and password and submit
- The detection process will begin automatically

## ⚠️ Troubleshooting & Important Notes

### Handling Forbidden Errors
If you encounter forbidden page after processing some submissions:

1. Close the detection window
2. Go to the server terminal (Terminal 1) and Press `Ctrl+C` to stop the server
3. Check Codeforces in your normal browser to see if the ban is lifted
4. Once unbanned:
   - Go to the server terminal (Terminal 1)
   - Restart with `npm run start`
   - Return to the frontend and submit again to continue

### Starting Fresh on a New Contest
**Important**: If this is not your first time running the detector and you're analyzing a new contest:

1. Navigate to the `submissions.json` file in the cd-cheating-detector directoy
2. **Remove all submissions** from the file before starting

## 🔄 Process Flow
1. Setup credentials and environment
2. Start backend and frontend services
3. Configure detection parameters
4. Authenticate with Codeforces
5. Monitor for forbidden errors and restart if needed
6. Clear `submissions.json` when starting fresh contests

The detector will automatically analyze submissions and flag potential cheating cases based on your configured threshold and put them in an excel file named possibleCheaters.