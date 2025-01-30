// managers/ChatManager.js

export default class ChatManager {
    constructor() {
      this.chatContainer = null;
    }
  
    init() {
      // Create a container for the system chat in bottom-left corner.
      this.chatContainer = document.createElement("div");
      this.chatContainer.id = "system-chat";
      this.chatContainer.style.position = "fixed";
      this.chatContainer.style.bottom = "20px";
      this.chatContainer.style.left = "20px";
      this.chatContainer.style.width = "300px";
      this.chatContainer.style.maxHeight = "200px";
      this.chatContainer.style.overflowY = "auto";
      this.chatContainer.style.backgroundColor = "rgba(0,0,0,0.5)";
      this.chatContainer.style.padding = "5px";
      this.chatContainer.style.border = "1px solid #999";
      this.chatContainer.style.fontFamily = "Cinzel, serif";
      this.chatContainer.style.color = "#f1c40f";
      this.chatContainer.style.zIndex = 9999;
      document.body.appendChild(this.chatContainer);
    }
  
    /**
     * Add a new message to the chat window.
     * @param {string} msg
     */
    addMessage(msg) {
      const messageDiv = document.createElement("div");
      messageDiv.innerText = msg;
      this.chatContainer.appendChild(messageDiv);
      // Auto-scroll to bottom
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }
  