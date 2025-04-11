// Firebase Imports (ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
  getFirestore, doc, setDoc, addDoc, 
  collection, onSnapshot, serverTimestamp, 
  query, orderBy, getDoc 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgkuvc-KFsWtNl_9E1xXSTHQZbrLJy2To",
  authDomain: "charoom-1bc36.firebaseapp.com",
  projectId: "charoom-1bc36",
  storageBucket: "charoom-1bc36.firebasestorage.app",
  messagingSenderId: "553045103803",
  appId: "1:553045103803:web:3c6e2b614272cab867059e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const elements = {
  usernameInput: document.getElementById("username"),
  roomCodeInput: document.getElementById("room-code"),
  createRoomBtn: document.getElementById("create-room-btn"),
  joinRoomBtn: document.getElementById("join-room-btn"),
  chatSection: document.getElementById("chat-section"),
  authSection: document.getElementById("auth-section"),
  chatBox: document.getElementById("chat-box"),
  messageInput: document.getElementById("message-input"),
  sendBtn: document.getElementById("send-btn"),
  leaveRoomBtn: document.getElementById("leave-room-btn"),
  roomTitle: document.getElementById("room-id"),
  toast: document.getElementById("toast"),
  toast2: document.getElementById("toast2")
};

let roomId;
let username;

// Perspective API Configuration
const perspectiveApiKey = 'AIzaSyDQpDRlAG4toBVY2vzV1blqwx9VzC1U0HA';

// Profanity Check Function
async function containsProfanity(text) {
  try {
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveApiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        languages: ["en"],
        requestedAttributes: {
          TOXICITY: {}, SEVERE_TOXICITY: {}, INSULT: {}, 
          PROFANITY: {}, THREAT: {}
        }
      })
    });

    const result = await response.json();
    return Object.values(result.attributeScores)
      .some(score => score.summaryScore.value >= 0.3);
  } catch (error) {
    console.error("Profanity check failed:", error);
    return false;
  }
}

// Toast Notification System
function showToast(message, isError = true) {
  const toast = isError ? elements.toast : elements.toast2;
  toast.querySelector("i").parentNode.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Chat Interface Management
function showChatSection() {
  elements.authSection.style.display = "none";
  elements.chatSection.style.display = "block";
  elements.messageInput.focus();
}

function clearChatBox() {
  elements.chatBox.innerHTML = "";
}

// Real-time Message Listener
function listenForMessages() {
  const messagesRef = collection(db, "rooms", roomId, "messages");
  const q = query(messagesRef, orderBy("timestamp"));
  
  onSnapshot(q, (snapshot) => {
    clearChatBox();
    snapshot.forEach(doc => {
      const { username, text } = doc.data();
      const messageElement = document.createElement("p");
      messageElement.innerHTML = `
        <span style="color: #1f51ff; font-weight: bold;">
          ${username}
        </span>: ${text}
      `;
      elements.chatBox.appendChild(messageElement);
    });
    elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
  });
}

// Room Creation Handler
elements.createRoomBtn.addEventListener("click", async () => {
  username = elements.usernameInput.value.trim();
  if (!username) return showToast("Username required", true);

  try {
    if (await containsProfanity(username)) {
      return showToast("Invalid username", true);
    }

    roomId = Math.random().toString(36).substring(2, 8);
    await setDoc(doc(db, "rooms", roomId), {
      created: serverTimestamp()
    });
    elements.roomTitle.textContent = roomId;
    showChatSection();
    listenForMessages();
  } catch (error) {
    showToast("Failed to create room", true);
    console.error("Room creation error:", error);
  }
});

// Room Joining Handler
elements.joinRoomBtn.addEventListener("click", async () => {
  username = elements.usernameInput.value.trim();
  roomId = elements.roomCodeInput.value.trim();

  if (!username || !roomId) {
    return showToast("Username and room code required", true);
  }

  try {
    if (await containsProfanity(username)) {
      return showToast("Invalid username", true);
    }

    const roomDoc = await getDoc(doc(db, "rooms", roomId));
    if (!roomDoc.exists()) {
      return showToast("Room not found", true);
    }

    elements.roomTitle.textContent = roomId;
    showChatSection();
    listenForMessages();
  } catch (error) {
    showToast("Failed to join room", true);
    console.error("Room join error:", error);
  }
});

// Message Sending System
elements.sendBtn.addEventListener("click", sendMessage);
elements.messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  try {
    if (message.length > 300 || message.length < 2) {
      return showToast("Message must be 2-300 characters", true);
    }

    if (await containsProfanity(message)) {
      return showToast("Message blocked", true);
    }

    await addDoc(collection(db, "rooms", roomId, "messages"), {
      username,
      text: message,
      timestamp: serverTimestamp()
    });
    elements.messageInput.value = "";
  } catch (error) {
    showToast("Failed to send message", true);
    console.error("Message send error:", error);
  }
}

// Room Code Copy Feature
elements.roomTitle.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(roomId);
    showToast("Room code copied!", false);
  } catch (error) {
    showToast("Failed to copy code", true);
    console.error("Copy error:", error);
  }
});

// Room Exit Handler
elements.leaveRoomBtn.addEventListener("click", () => {
  location.reload();
});

// Keyboard Focus Enhancement
document.addEventListener('keydown', (e) => {
  if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
    elements.messageInput.focus();
  }
});
