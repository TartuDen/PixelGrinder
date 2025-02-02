// managers/ChatManager.js

function makeDraggable(elmnt, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  dragHandle.onmousedown = dragMouseDown;
  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export default class ChatManager {
  constructor() {
    this.chatContainer = null;
    this.messagesDiv = null;
  }
  
  init() {
    let existingChat = document.getElementById("system-chat");
    if (existingChat) {
      this.chatContainer = existingChat;
    } else {
      this.chatContainer = document.createElement("div");
      this.chatContainer.id = "system-chat";
      document.body.appendChild(this.chatContainer);
    }

    // If there's no header, create one
    if (!this.chatContainer.querySelector('.chat-header')) {
      const header = document.createElement("div");
      header.className = "drag-header chat-header";
      header.innerText = "System Chat";
      this.chatContainer.appendChild(header);

      const messages = document.createElement("div");
      messages.className = "chat-messages";
      this.chatContainer.appendChild(messages);
      this.messagesDiv = messages;
    } else {
      // If the DOM structure is already there, retrieve it
      this.messagesDiv = this.chatContainer.querySelector('.chat-messages');
    }

    // Make the entire chat container draggable by its header
    const headerEl = this.chatContainer.querySelector(".chat-header");
    if (headerEl) {
      makeDraggable(this.chatContainer, headerEl);
    }
  }
  
  addMessage(msg) {
    if (!this.messagesDiv) return;
    const messageDiv = document.createElement("div");
    messageDiv.innerText = msg;
    this.messagesDiv.appendChild(messageDiv);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
  }
}
