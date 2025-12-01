const socket = io("http://localhost:3000",{
  transports: ['websocket'],
  withCredentials: true,
});
const API_BASE_URL = 'http://localhost:3000/api'; 
let selectedMemberIds = [];

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentConversationId){
    console.log(text);
    return;
  } 
  console.log(text);
  console.log(currentConversationId);//chạy đến đây rồi
  

  // Gửi qua socket
  socket.emit(
    "chat:message",
    {
      conversation: currentConversationId,
      content: text,
    },
    (ack) => {
      // callback từ server
      if (!ack || !ack.ok) {
        console.error("Gửi tin nhắn thất bại:", ack?.error);
        // TODO: có thể hiện thông báo lỗi, rollback bubble nếu muốn
      }
      console.log("Gửi tin nhắn thành công=================");
    }
  );

  messageInput.value = "";
  messageInput.style.height = "auto";
  messagesArea.scrollTop = messagesArea.scrollHeight;

}
// format giờ
function formatTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
//render message khi nhận tin nhắn
function appendMessage(message, currentUserId, messagesArea) {
  console.log("sender: ", message.sender);
  console.log("current user id: ", currentUserId);
  const isOwn = String(message.sender) === String(currentUserId);
  const time = formatTime(message.createdAt);
  const text = message.content;

  const statusHTML = isOwn
    ? `<span class="message-status ms-2">✓✓</span>`
    : "";
  let filesHTML = "";
  if (Array.isArray(message.files) && message.files.length > 0) {
    const parts = message.files.map((file) => {
      const fileName = file.fileName ? escapeHtml(file.fileName) : "File";

      // nếu là ảnh thì render <img>, nếu không thì render link tải
      if (file.fileType && file.fileType.startsWith("image/")) {
        return `
          <div class="message-image-wrapper mt-1">
            <img 
              src="${file.url}" 
              alt="${fileName}" 
              class="message-image"
            />
          </div>
        `;
      }

      // các loại file khác (pdf, doc, zip...)
      return `
        <div class="message-file-wrapper mt-1">
          <a href="${file.url}" target="_blank" class="message-file-link">
            📎 ${fileName}
          </a>
        </div>
      `;
    });

    filesHTML = `<div class="message-files mt-1">${parts.join("")}</div>`;
  }
  const messageHTML = `
    <div class="message-group mb-3">
      <div class="message ${isOwn ? "sent" : "received"} mb-2">
        <div class="message-bubble">${escapeHtml(text)}</div>
        <small class="text-muted  ${isOwn ? "me-2" : "ms-2"}me-2">${time}</small>
        ${statusHTML}
      </div>
    </div>
  `;

  messagesArea.insertAdjacentHTML("beforeend", messageHTML);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Search conversations
document.getElementById("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase()
  const items = document.querySelectorAll(".conversation-item")

  items.forEach((item) => {
    const name = item.querySelector(".conversation-name").textContent.toLowerCase()
    item.style.display = name.includes(query) ? "flex" : "none"
  })
})

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

async function loadGroupConversations() {
  try {
    console.log("Đang load group chat======");
    // Gửi yêu cầu GET tới API /conversations để lấy dữ liệu cuộc trò chuyện
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: "GET",  // Cách thức GET để lấy dữ liệu
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include" // Đảm bảo cookie được gửi kèm theo mỗi yêu cầu
    });

    // Kiểm tra phản hồi từ API
    if (!response.ok) {
      throw new Error("Lỗi khi lấy cuộc trò chuyện");
    }

    // Chuyển dữ liệu JSON từ phản hồi
    const data = await response.json();
    const conversations = data.conversations;
    // Tạo phần tử cho mỗi cuộc trò chuyện
    const conversationsContainer = document.querySelector(".conversation-list");
    conversationsContainer.innerHTML = "";  // Làm trống danh sách cuộc trò chuyện cũ

    conversations.forEach(conversation => {
      if(conversation.isGroup){
        // Tạo phần tử div cho mỗi cuộc trò chuyện
        const conversationElement = document.createElement("div");
        conversationElement.classList.add("conversation-item", "active", "btn-chat-group");

        // Avatar của cuộc trò chuyện (group hoặc user)
        const avatar = conversation.avatarUrl || "image/group-avt.png";  // Đặt ảnh mặc định nếu không có avatar
        const avatarElement = document.createElement("img");
        avatarElement.src = avatar;
        avatarElement.alt = "Avatar";
        avatarElement.classList.add("rounded-circle");
        avatarElement.width = 45;
        avatarElement.height = 45;
        // Thông tin cuộc trò chuyện
        const conversationInfo = document.createElement("div");
        conversationInfo.classList.add("conversation-info");

        const title = conversation.title || "Unnamed Group";
        const titleElement = document.createElement("div");
        titleElement.classList.add("conversation-title");
        titleElement.textContent = title;

        const lastMessage = conversation.lastMessage ? conversation.lastMessage.content : "Chưa có tin nhắn";
        const lastMessageElement = document.createElement("small");
        lastMessageElement.classList.add("last-message");
        lastMessageElement.textContent = lastMessage;

        const lastActive = new Date(conversation.lastActiveAt).toLocaleString();
        const lastActiveElement = document.createElement("div");
        lastActiveElement.classList.add("last-active");
        lastActiveElement.textContent = `Last active: ${lastActive}`;

        // Thêm tất cả phần tử vào phần tử chứa cuộc trò chuyện
        conversationInfo.appendChild(titleElement);
        conversationInfo.appendChild(lastMessageElement);
        conversationInfo.appendChild(lastActiveElement);
        conversationElement.appendChild(avatarElement);
        conversationElement.appendChild(conversationInfo);

         // GẮN DATA-* Ở ĐÂY
        conversationElement.dataset.id = conversation._id;        // data-id
        conversationElement.dataset.title = title;                // data-title
        conversationElement.dataset.avatar = avatar;              // data-avatar

        // memberIds: mảng id user (trừ currentUser nếu muốn)
        const memberIds = (conversation.members || []).map((m) => {
          // nếu populate thì m.user là object, còn không thì là id
          return typeof m.user === "object" ? m.user._id : m.user;
        });

        conversationElement.dataset.memberIds = JSON.stringify(memberIds);
        // => sau này đọc lại: JSON.parse(el.dataset.memberIds)

        // Thêm cuộc trò chuyện vào container
        conversationsContainer.appendChild(conversationElement);
      }
    });
  } catch (error) {
    console.error("Lỗi khi tải cuộc trò chuyện:", error);
  }
}

async function loadUsers() {
  console.log("Đang load users============================");
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ' + localStorage.getItem('token') // Nếu bạn cần sử dụng token
      }
    });

    if (!response.ok) {
      throw new Error('Lỗi khi lấy danh sách người dùng');
    }

    const data = await response.json();
    const users = data.users;

    // Lấy phần tử chứa danh sách người dùng
    
      const List = document.getElementById('conversation-list');
      List.innerHTML = '';  // Xóa danh sách cũ trước khi thêm danh sách mới

      // Lặp qua tất cả người dùng và tạo các phần tử hiển thị
      users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-item', 'conversation-item', 'active');
        // Thêm lớp online hoặc offline tùy theo trạng thái
        userItem.classList.add(user.isOnline ? 'online' : 'offline'); 

        userItem.innerHTML = `
          <img src="${user.avatarUrl || '/image/default-avatar.jpg'}" alt="${user.username}'s avatar" class="avatar">
          <div class="user-info">
            <p class="username">${user.username}</p>
            <span class="status">${user.isOnline ? 'Online' : 'Offline'}</span>
          </div>
        `;
        userItem.dataset.userId = user._id;
        userItem.dataset.name = user.username;
        userItem.dataset.avt = user.avatarUrl;
        userItem.dataset.status = user.isOnline ? 'Online' : 'Offline';

        // Thêm phần tử vào danh sách
        if(user.username !== data.username) List.appendChild(userItem);
      });

  } catch (error) {
    console.error("Lỗi khi tải người dùng:", error);
  }
}
async function openDirectConversation(partnerId, partnerUsername, partnerAvtUrl,partnerStatus) {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        isGroup: false,
        memberIds: [partnerId]
      })
    });

    if (!res.ok) {
      console.error("Không tạo được conversation");
      return;
    }

    const data = await res.json();
    const conversation = data.conversation;

    // 1. Lưu conversation hiện tại
    currentConversationId = conversation._id;

    // 2. Join room socket theo conversationId
    socket.emit("conversation:join", { conversationId: currentConversationId });

    // Update chat header
    document.querySelector(".chat-header img").src = partnerAvtUrl;
    document.querySelector(".chat-header .fw-bold").textContent = partnerUsername;
    document.querySelector(".chat-header .status-partner").textContent = partnerStatus;

    // 3. Load lịch sử tin nhắn (nếu có endpoint)
    await loadMessagesForConversation(currentConversationId);
  } catch (err) {
    console.error("Lỗi khi mở conversation:", err);
  }
}
async function loadMessagesForConversation(conversationId) {  
  console.log("Đang load tin nhắn cho conversation: ",conversationId);

  if (!conversationId){
    console.log("Không có ID cuộc trò chuyện=======");
    return;
  }
  // Bọc socket.emit bằng Promise cho dễ dùng với async await
  const res = await new Promise((resolve) => {
    socket.emit(
      "chat:history",
      { conversation: conversationId, limit: 50 },
      (ack) => {
        resolve(ack);
      }
    );
  });

  if (!res || !res.ok) {
    console.error("Không load được lịch sử:", res?.error);
    return;
  }

  const messages = res.messages || [];
  console.log("Tin nhắn đã load được: ", messages);
  const messagesArea = document.getElementById("messagesArea");
  messagesArea.innerHTML = "";

  if (!messages.length) {
    messagesArea.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="fa fa-comment-dots fa-3x mb-3"></i>
        <p>Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên!</p>
      </div>
    `;
    return;
  }

  // messages: [{ id, conversation: id, sender: id, content, createdAt }, ...]
  messages.forEach((message) => {
    appendMessage(message, currentUserId, messagesArea);
  });

  scrollToBottom();
  console.log("✅ Messages rendered successfully!");
}
function scrollToBottom() {
  const messagesArea = document.getElementById("messagesArea");
  if (!messagesArea) return;

  // Dùng requestAnimationFrame để đợi DOM render xong
  requestAnimationFrame(() => {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  });
}
async function openGroupConversation(groupTitle, memberIds, groupAvatarUrl) {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        isGroup: true,       // 🔥 khác 1–1 ở đây
        title: groupTitle,
        memberIds: memberIds // mảng id user
      }),
    });

    if (!res.ok) {
      console.error("Không tạo được group conversation");
      return;
    }

    const data = await res.json();
    const conversation = data.conversation;

    // 1. Lưu conversation hiện tại
    currentConversationId = conversation._id;

    // 2. Join room socket theo conversationId
    socket.emit("conversation:join", { conversationId: currentConversationId });

    // 3. Update chat header cho nhóm
    const headerImg = document.querySelector(".chat-header img");
    const headerTitle = document.querySelector(".chat-header .fw-bold");
    const headerStatus = document.querySelector(".chat-header .status-partner");

    headerImg.src =
      groupAvatarUrl ||
      "/image/group-avt.png"; // tuỳ bạn set ảnh default

    // ưu tiên title từ server (vì backend set lại nếu null)
    headerTitle.textContent = conversation.title || groupTitle || "Nhóm mới";

    // ví dụ: "5 thành viên"
    const memberCount =
      (conversation.members && conversation.members.length) ||
      (memberIds ? memberIds.length + 1 : 1); // +1 tính cả mình

    headerStatus.textContent = `${memberCount} thành viên`;

    // 4. Load lịch sử tin nhắn
    await loadMessagesForConversation(currentConversationId);
  } catch (err) {
    console.error("Lỗi khi mở group conversation:", err);
  }
}

// xử lí tạo group
async function loadUsersForGroup() {
  const listEl = document.getElementById("groupUsersList");
  listEl.innerHTML = `<div class="text-muted small">Đang tải...</div>`;

  try {
    console.log("Đang load user ch ôpp up tạo group======");
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      listEl.innerHTML = `<div class="text-danger small">Không lấy được danh sách người dùng</div>`;
      return;
    }

    const data = await res.json();
    const users = data.users || [];

    // bỏ chính mình khỏi danh sách
    const filtered = users.filter((u) => u._id !== currentUserId);

    if (!filtered.length) {
      listEl.innerHTML = `<div class="text-muted small">Không còn ai để thêm vào nhóm</div>`;
      return;
    }

    listEl.innerHTML = "";

    filtered.forEach((user) => {
      const row = document.createElement("label");
      row.className = "group-user-item";

      row.innerHTML = `
        <input type="checkbox" class="form-check-input me-2" 
               value="${user._id}" />
        <img src="${user.avatarUrl || "/image/default-avatar.jpg"}" alt="">
        <div>
          <div class="fw-semibold">${user.username}</div>
          <div class="small text-muted">${user.isOnline ? "Online" : "Offline"}</div>
        </div>
      `;

      const checkbox = row.querySelector("input[type=checkbox]");
      
      checkbox.addEventListener("change", (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          if (!selectedMemberIds.includes(id)) {
            selectedMemberIds.push(id);
          }
        } else {
          selectedMemberIds = selectedMemberIds.filter((x) => x !== id);
        }
      });

      listEl.appendChild(row);
    });
  } catch (err) {
    console.error("Lỗi load users cho group:", err);
    listEl.innerHTML = `<div class="text-danger small">Lỗi khi tải danh sách</div>`;
  }
}

// hàm DOM chính
document.addEventListener('DOMContentLoaded', function() {
  
  const currentUserId = window.currentUserId;
  loadUsers();
  const messageInput = document.getElementById("messageInput")
  const messagesArea = document.getElementById("messagesArea");// nơi để vẽ message
  messageInput.addEventListener("input", function () {
    this.style.height = "auto"
    this.style.height = Math.min(this.scrollHeight, 100) + "px"
  });

  //gửi tin nhắn
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();//gửi xong load luôn
    }
  })


  //gửi ảnh
  const imageInput = document.getElementById("imageInput");
  const btnSendImage = document.getElementById("btnSendImage");

  btnSendImage.addEventListener("click", () => {
    imageInput.click(); // mở hộp chọn file
  });
  imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("conversationId", currentConversationId); // bạn đang chat ở phòng nào
  formData.append("content", ""); // nếu muốn kèm caption thì gửi text ở đây

  const res = await fetch(`${API_BASE_URL}/messages/image`, {
    method: "POST",
    body: formData,
    credentials: "include", // nếu dùng cookie
  });
  const data = await res.json();
  console.log(data);
  if (!data.ok) {
    console.error(data.error); // đang lỗi ở đây=====================================================
    return;
  }
  // tin nhắn kèm ảnh là data.message
  // render ngay hoặc chờ socket bắn về
  appendMessage(data.message);
});



  // nhận sự kiện tin nhắn đến
  socket.on("chat:message", (message) => {
    // chỉ render nếu tin nhắn thuộc conversation đang mở
    if (message.conversation === currentConversationId) {
      appendMessage(message, currentUserId, messagesArea);
    }
  });
  //xử lí nhấn nút Trò chuyện trong user
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".user-item");
    if (!btn) return;
    console.log("Vừa nhấn nút Trò chuyện==============");
    const partnerId = btn.dataset.userId;
    const partnerUsername = btn.dataset.name;
    const partnerAvtUrl = btn.dataset.avt;
    const partnerStatus = btn.dataset.status;

    //load box chat
    openDirectConversation(partnerId, partnerUsername, partnerAvtUrl,partnerStatus);
  });
  // xử lí nhấn group chat
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".btn-chat-group");
    if (!item) return;
    console.log("Vừa nhấn group chat ==============");
    const groupTitle = item.dataset.title;
    const groupAvatarUrl = item.dataset.avatar;
    const memberIds = JSON.parse(item.dataset.memberIds || "[]");

    //load box chat
    openGroupConversation(groupTitle, memberIds, groupAvatarUrl);
  });


  //lấy ra danh sách group chat
  const groupListBtn = document.getElementById("group-list-btn");
  groupListBtn.addEventListener("click", () => {
    loadGroupConversations();
  })
  // lấy danh sách user
  const userListBtn = document.getElementById("user-list-btn");
  userListBtn.addEventListener("click", () => {
    loadUsers();
  })

  // xử lí tạo group chat
  createGroupModal.addEventListener("show.bs.modal", () => {
    console.log("po up đã hiện");
    loadUsersForGroup();
  });

  // Khi đóng modal thì reset
  createGroupModal.addEventListener("hidden.bs.modal", () => {
    selectedMemberIds = [];
    document.getElementById("groupTitleInput").value = "";
    document.getElementById("groupUsersList").innerHTML = "";
  });
  // Submit form tạo group chat
  const createGroupForm = document.getElementById("createGroupForm");
  if (createGroupForm) {
    createGroupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("groupTitleInput").value.trim();

      if (!title) {
        alert("Nhập tên nhóm");
        return;
      }

      if (!selectedMemberIds.length) {
        alert("Chọn ít nhất một thành viên");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            memberIds: selectedMemberIds,
            isGroup: true,
          }),
        });

        if (!res.ok) {
          console.error("Tạo nhóm thất bại");
          alert("Không tạo nhóm chat");
          return;
        }

        const data = await res.json();
        const conversation = data.conversation;

        // đóng modal
        const modalInstance = bootstrap.Modal.getInstance(createGroupModal);
        modalInstance.hide();

        // chuyển sang nhóm vừa tạo
        currentConversationId = conversation._id;
        socket.emit("conversation:join", { conversationId: currentConversationId });
        await openGroupConversation(title, selectedMemberIds);

        // có thể update sidebar hiển thị nhóm mới nếu muốn
        console.log("Tạo nhóm thành công: ", conversation);
      } catch (err) {
        console.error("Lỗi khi tạo nhóm:", err);
        alert("Có lỗi phía server");
      }
    });
  }
})