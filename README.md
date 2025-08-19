
# Full-Stack AI API Server & Frontend

> [!IMPORTANT]
> **Termux Users: Avoid the `EPERM` Error!**
> If you get an error during `npm install` that says `EPERM: operation not permitted, symlink`, it means your project is in the wrong folder.
>
> **Do not** run this project from your `Download` folder (`/storage/emulated/0/Download`). Android blocks installations there.
>
> **Solution:** You MUST move the `backend` and `frontend` folders to your Termux home directory (`~/`) **before** running `npm install`.

This project contains a Node.js backend server and a React frontend to create and serve a real API powered by the Google Gemini models.

**Follow these instructions carefully in Termux to get everything running.**

---

### Step 1: Install Node.js

First, make sure you have Node.js installed in Termux. If you don't, run these commands:

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs -y
```

---

### Step 2: Move Project Folders (If Necessary)

Your `backend` and `frontend` folders must be in your Termux home directory (`~`) to work correctly.

If you extracted the project in your `Download` folder, run these commands to move the folders:

```bash
# Move the backend folder to your home directory
mv "/storage/emulated/0/Download/custom-api-simulator (2)/backend" ~/

# Move the frontend folder to your home directory
mv "/storage/emulated/0/Download/custom-api-simulator (2)/frontend" ~/
```
*(Replace `custom-api-simulator (2)` with your actual project folder name if it's different)*

After moving, your home directory (`~`) should contain both a `backend` and a `frontend` folder.

---

### Step 3: Set Up The Backend Server

The backend securely manages your API key and communicates with Google.

1.  **Navigate into the `backend` directory in your home folder:**
    ```bash
    cd ~/backend
    ```

2.  **Install the necessary packages:**
    ```bash
    npm install
    ```
    *(This will take a minute. It reads `package.json` and downloads libraries like Express).*

3.  **Set up your API Key:**
    *   Create a file named `.env` using the `nano` text editor:
        ```bash
        nano .env
        ```
    *   Inside the editor, add your **real** Google Gemini API Key like this:
        ```
        API_KEY=your_real_google_api_key_goes_here
        ```
    *   Save the file by pressing `CTRL+X`, then `Y`, then `ENTER`.

4.  **Start your backend server:**
    ```bash
    node server.js
    ```
    If successful, you will see the message: `✅ Real API server running on http://localhost:3001`.

**Leave this terminal window open!** The server must keep running.

---

### Step 4: Run The Frontend UI

The frontend is the user interface you'll see in the browser.

1.  **Open a NEW Termux session.**
    *(Swipe from the left edge of your screen and tap "New session").* You will now have two terminals running.

2.  **In the new terminal, navigate to the `frontend` directory:**
    ```bash
    cd ~/frontend
    ```

3.  **Install and run a simple web server:**
    *This command will install `http-server` if needed and run it in one step.*
    ```bash
    npx http-server -p 8080
    ```
    If successful, you will see messages like `Available on:` followed by URLs.

---

### Step 5: View Your App!

1.  Open the Chrome browser on your phone.
2.  Go to the address: **`http://localhost:8080`**
3.  Your application is now running! All API calls are sent to your backend server running in the first Termux window. You can even see log messages there when you make a call.

To stop the servers, go into each Termux session and press `CTRL+C`.
