<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useThemeStore } from '../stores/theme'
import { format } from 'date-fns'
import { PaperClipIcon, DocumentIcon, FaceSmileIcon, UserPlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
// Updated emoji import to use the standard path
import data from '@emoji-mart/data'
import { Picker } from 'emoji-mart-vue-fast'

const themeStore = useThemeStore()
const chatStore = useChatStore()
const messageInput = ref('')
const messagesContainer = ref(null)
const fileInput = ref(null)
const isTyping = ref(false)
const typingTimeout = ref(null)
const showEmojiPicker = ref(false)
const showInviteDialog = ref(false)
const showDeleteDialog = ref(null)
const deleteForEveryone = ref(false)

const sendMessage = () => {
  if (!messageInput.value.trim()) return

  chatStore.addMessage({
    content: messageInput.value,
    sender: 'user',
    type: 'text'
  })

  messageInput.value = ''
  scrollToBottom()
  chatStore.setTyping(chatStore.activeConversationId, false)
  showEmojiPicker.value = false
}

// Simplified emoji selection handler
const onEmojiSelect = (emoji) => {
  console.log('Selected emoji:', emoji); // Debug log
  
  // Handle different emoji formats more robustly
  if (emoji && emoji.native) {
    messageInput.value += emoji.native;
  } else if (typeof emoji === 'string') {
    messageInput.value += emoji;
  } else if (emoji && emoji.unified) {
    // Convert unified format to actual emoji
    try {
      const codePoints = emoji.unified.split('-').map(hex => parseInt(hex, 16));
      messageInput.value += String.fromCodePoint(...codePoints);
    } catch (e) {
      console.error('Error converting emoji:', e);
      // Fallback to emoji id if available
      if (emoji.id) messageInput.value += `:${emoji.id}:`;
    }
  } else if (emoji && emoji.id) {
    messageInput.value += `:${emoji.id}:`;
  }
  
  showEmojiPicker.value = false;
}

const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files.length) return

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      alert(`File ${file.name} is too large. Maximum size is 10MB.`)
      continue
    }

    const reader = new FileReader()
    
    if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        chatStore.addMessage({
          content: e.target.result,
          type: 'image',
          fileName: file.name,
          fileSize: file.size,
          sender: 'user',
        })
      }
      reader.readAsDataURL(file)
    } else {
      chatStore.addMessage({
        content: `File: ${file.name}`,
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        sender: 'user',
      })
    }
  }
  
  scrollToBottom()
  event.target.value = ''
}

const handleDrop = async (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) {
    fileInput.value.files = files
    handleFileUpload({ target: fileInput.value })
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

const handleDragEnter = (event) => {
  event.preventDefault()
  event.target.classList.add('drag-over')
}

const handleDragLeave = (event) => {
  event.preventDefault()
  event.target.classList.remove('drag-over')
}

const openFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatMessageTime = (timestamp) => {
  return format(new Date(timestamp), 'HH:mm')
}

const handleTyping = () => {
  if (!isTyping.value) {
    isTyping.value = true
    chatStore.setTyping(chatStore.activeConversationId, true)
  }

  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }

  typingTimeout.value = setTimeout(() => {
    isTyping.value = false
    chatStore.setTyping(chatStore.activeConversationId, false)
  }, 2000)
}

const inviteMembers = () => {
  if (chatStore.selectedUsers && chatStore.selectedUsers.length > 0) {
    chatStore.addGroupMembers(chatStore.activeConversationId, chatStore.selectedUsers)
    showInviteDialog.value = false
  } else {
    alert('Please select at least one user to invite')
  }
}

// Delete message handler
const confirmDeleteMessage = () => {
  if (showDeleteDialog.value) {
    if (deleteForEveryone.value) {
      chatStore.deleteMessageForEveryone(chatStore.activeConversationId, showDeleteDialog.value.id)
    } else {
      chatStore.deleteMessageForMe(chatStore.activeConversationId, showDeleteDialog.value.id)
    }
    showDeleteDialog.value = null
    deleteForEveryone.value = false
  }
}

// Toggle emoji picker with better position handling
const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
  if (showEmojiPicker.value) {
    // Ensure picker is properly positioned after it's shown
    nextTick(() => {
      const pickerContainer = document.querySelector('.emoji-picker-container');
      if (pickerContainer) {
        // Make sure it's visible in viewport
        const rect = pickerContainer.getBoundingClientRect();
        if (rect.top < 0) {
          pickerContainer.style.top = '100%';
          pickerContainer.style.bottom = 'auto';
        }
      }
    });
  }
};

watch(() => chatStore.activeConversationId, () => {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
  isTyping.value = false
  showEmojiPicker.value = false
  showInviteDialog.value = false
  showDeleteDialog.value = null
})

onMounted(() => {
  scrollToBottom()
  
  // Check if emoji data is loaded correctly
  if (!data || typeof data !== 'object') {
    console.error('Emoji data not loaded correctly:', data);
  }
  
  if ('Notification' in window) {
    Notification.requestPermission()
  }

  window.addEventListener('online', () => {
    chatStore.setUserOnlineStatus(chatStore.activeConversationId, true)
  })
  
  window.addEventListener('offline', () => {
    chatStore.setUserOnlineStatus(chatStore.activeConversationId, false)
  })
  
  // Add global click handler to close emoji picker when clicking outside
  document.addEventListener('click', (event) => {
    // Find closest button to check if it's the emoji button
    const emojiButton = event.target.closest('button');
    const isEmojiButton = emojiButton && emojiButton.classList.contains('emoji-button');
    
    // Find if click is inside emoji picker
    const emojiPicker = document.querySelector('.emoji-picker-container');
    const isClickInPicker = emojiPicker && emojiPicker.contains(event.target);
    
    // Close picker if click is outside both emoji button and picker
    if (showEmojiPicker.value && !isEmojiButton && !isClickInPicker) {
      showEmojiPicker.value = false;
    }
  });
})
</script>

<template>
  <div 
    class="flex-1 flex flex-col h-screen"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
  >
    <!-- Chat Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <img
              v-if="chatStore.activeConversation?.avatar"
              :src="chatStore.activeConversation.avatar"
              :alt="chatStore.activeConversation?.name"
              class="w-10 h-10 rounded-full"
            >
            <div 
              v-if="chatStore.activeConversation?.type === 'private' && chatStore.isUserOnline(chatStore.activeConversationId)"
              class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
            ></div>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="font-bold">{{ chatStore.activeConversation?.name }}</h2>
              <span 
                v-if="chatStore.activeConversation?.type === 'group'"
                class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
              >
                Group
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              <template v-if="chatStore.activeConversation?.type === 'private'">
                <span v-if="chatStore.isUserTyping(chatStore.activeConversationId)">
                  typing...
                </span>
                <span v-else>
                  {{ chatStore.isUserOnline(chatStore.activeConversationId) ? 'Online' : 'Offline' }}
                </span>
              </template>
              <template v-else-if="chatStore.activeConversation?.type === 'group'">
                {{ chatStore.activeConversation.members.length }} members
              </template>
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            v-if="chatStore.activeConversation?.type === 'group'"
            @click="showInviteDialog = true"
            class="btn btn-secondary flex items-center space-x-1"
            title="Invite Members"
          >
            <UserPlusIcon class="w-5 h-5" />
            <span>Invite</span>
          </button>
          
          <button
            v-if="chatStore.activeConversation?.type === 'group' && !chatStore.activeConversation.members.includes(1)"
            @click="chatStore.joinGroup(chatStore.activeConversationId)"
            class="btn btn-primary"
          >
            Join Group
          </button>
          <button
            v-else-if="chatStore.activeConversation?.type === 'group'"
            @click="chatStore.leaveGroup(chatStore.activeConversationId)"
            class="btn btn-secondary"
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-for="message in chatStore.messages"
        :key="message.id"
        :class="[
          'flex',
          message.sender === 'system' ? 'justify-center' : message.sender === 'user' ? 'justify-end' : 'justify-start'
        ]"
      >
        <div
          v-if="message.sender === 'system'"
          class="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
        >
          {{ message.content }}
        </div>
        <div
          v-else
          class="relative group"
          :class="[
            'max-w-[70%] rounded-lg p-3',
            message.sender === 'user'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800'
          ]"
        >
          <!-- Delete button (visible on hover for user messages) -->
          <button
            v-if="message.sender === 'user'"
            @click="showDeleteDialog = message"
            class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
            title="Delete Message"
          >
            <TrashIcon class="w-5 h-5" />
          </button>

          <!-- Image message -->
          <img
            v-if="message.type === 'image'"
            :src="message.content"
            :alt="message.fileName"
            class="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            @click="window.open(message.content, '_blank')"
          >
          
          <!-- File message -->
          <div
            v-else-if="message.type === 'file'"
            class="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
            @click="window.open(message.content, '_blank')"
          >
            <DocumentIcon class="w-5 h-5" />
            <span>{{ message.fileName }}</span>
            <span class="text-xs opacity-75">
              ({{ Math.round(message.fileSize / 1024) }} KB)
            </span>
          </div>
          
          <!-- Text message or deleted message -->
          <p v-else>{{ message.content }}</p>
          
          <span class="text-xs opacity-75 mt-1 block">
            {{ formatMessageTime(message.timestamp) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <div class="relative">
        <div class="flex items-center space-x-4">
          <input
            v-model="messageInput"
            type="text"
            placeholder="Type a message..."
            class="input flex-1"
            @keyup.enter="sendMessage"
            @input="handleTyping"
          >
          <input
            ref="fileInput"
            type="file"
            multiple
            class="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
            @change="handleFileUpload"
          >
          <button
            @click="toggleEmojiPicker"
            class="btn btn-secondary relative emoji-button"
            title="Add emoji"
          >
            <FaceSmileIcon class="w-5 h-5" />
          </button>
          <button
            @click="openFileInput"
            class="btn btn-secondary"
            title="Attach files"
          >
            <PaperClipIcon class="w-5 h-5" />
          </button>
          <button
            @click="sendMessage"
            class="btn btn-primary"
          >
            Send
          </button>
        </div>
        
        <!-- Emoji Picker -->
        <div
          v-if="showEmojiPicker"
          class="absolute bottom-full mb-2 right-0 z-50 emoji-picker-container"
        >
          <Picker
            :data="data"
            :theme="themeStore.isDark ? 'dark' : 'light'"
            @select="onEmojiSelect"
            title="Pick an emoji"
            emoji="point_up"
            :native="true"
            set="apple"
            :skin="1"
            :perLine="8"
          />
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        Drag and drop files here or click the attachment button. Maximum file size: 10MB
      </p>
    </div>

    <!-- Invite Members Dialog -->
    <div
      v-if="showInviteDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
        @click.stop
      >
        <h3 class="text-lg font-bold mb-4">Invite Members</h3>
        <div class="max-h-60 overflow-y-auto mb-4">
          <div
            v-for="user in chatStore.availableUsers"
            :key="user.id"
            class="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
            @click="chatStore.toggleUserSelection(user.id)"
          >
            <input
              type="checkbox"
              :checked="chatStore.selectedUsers && chatStore.selectedUsers.includes(user.id)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            >
            <img
              :src="user.avatar"
              :alt="user.name"
              class="w-8 h-8 rounded-full"
            >
            <span>{{ user.name }}</span>
          </div>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            class="btn btn-secondary"
            @click="showInviteDialog = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click="inviteMembers"
            :disabled="!chatStore.selectedUsers || !chatStore.selectedUsers.length"
          >
            Invite Selected
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Message Confirmation Dialog -->
    <div
      v-if="showDeleteDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="showDeleteDialog = null"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
        @click.stop
      >
        <h3 class="text-lg font-bold mb-4">Delete Message</h3>
        <p class="mb-4">Are you sure you want to delete this message?</p>
        <div class="mb-4">
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              v-model="deleteForEveryone"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            >
            <span>Delete for everyone</span>
          </label>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            class="btn btn-secondary"
            @click="showDeleteDialog = null"
          >
            Cancel
          </button>
          <button
            class="btn btn-danger"
            @click="confirmDeleteMessage"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Replaced @apply with raw CSS to avoid PostCSS errors */
.drag-over {
  border: 2px solid #3b82f6; /* Equivalent to ring-2 ring-primary-500 */
  opacity: 0.5; /* Equivalent to ring-opacity-50 */
}

/* Improved emoji picker styling */
.emoji-picker-container {
  background: var(--emoji-picker-bg, white);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  max-height: 320px;
  display: flex;
}

/* Target all emoji-mart elements more globally */
:deep(.emoji-mart) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  width: 320px !important;
  max-height: 320px !important;
}

:deep(.emoji-mart-bar) {
  border-color: #e5e7eb;
}

:deep(.emoji-mart-search) {
  padding: 10px;
}

:deep(.emoji-mart-search input) {
  width: 100%;
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
}

:deep(.emoji-mart-scroll) {
  height: 220px;
  padding: 0 6px;
  will-change: transform;
  overflow-y: auto;
}

:deep(.emoji-mart-category .emoji-mart-emoji span) {
  width: 22px !important;
  height: 22px !important;
}

/* Dark mode support */
.dark .emoji-picker-container {
  --emoji-picker-bg: #1f2937;
}

.dark :deep(.emoji-mart) {
  background-color: #1f2937;
  border-color: #374151;
}

.dark :deep(.emoji-mart-bar) {
  border-color: #374151;
}

.dark :deep(.emoji-mart-search) {
  background-color: #1f2937;
}

.dark :deep(.emoji-mart-search input) {
  background-color: #374151;
  border-color: #4b5563;
  color: #ffffff;
}

.dark :deep(.emoji-mart-category-label span) {
  background-color: #1f2937;
  color: #d1d5db;
}

/* Style for the delete button */
.btn-danger {
  background-color: #ef4444; /* Equivalent to bg-red-500 */
  color: #ffffff; /* Equivalent to text-white */
}

.btn-danger:hover {
  background-color: #dc2626; /* Equivalent to hover:bg-red-600 */
}
</style>