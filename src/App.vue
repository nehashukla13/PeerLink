<script setup>
import { onMounted } from 'vue'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMessages from './components/ChatMessages.vue'
import { useThemeStore } from './stores/theme'
import { useChatStore } from './stores/chat'

const themeStore = useThemeStore()
const chatStore = useChatStore()

onMounted(() => {
  themeStore.initializeTheme()
  
  // Initialize with sample data
  chatStore.conversations = [
    {
      id: 1,
      name: 'Alice Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      lastMessage: 'Hey, how are you?',
      lastMessageTime: '10:30',
      status: 'Online'
    },
    {
      id: 2,
      name: 'Bob Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      lastMessage: 'Can we meet tomorrow?',
      lastMessageTime: '09:15',
      status: 'Offline'
    }
  ]
})
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <ChatSidebar />
    <ChatMessages />
  </div>
</template>