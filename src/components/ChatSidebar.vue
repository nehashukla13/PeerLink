<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '../stores/chat'
import { useThemeStore } from '../stores/theme'
import { 
  MagnifyingGlassIcon, 
  SunIcon, 
  MoonIcon,
  UserGroupIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

const chatStore = useChatStore()
const themeStore = useThemeStore()
const searchQuery = ref('')
const showNewGroupDialog = ref(false)
const newGroupName = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase()
  const filteredConversations = chatStore.conversations.filter(conv => 
    conv.name.toLowerCase().includes(query)
  )
  const filteredGroups = chatStore.groups.filter(group => 
    group.name.toLowerCase().includes(query)
  )
  return [...filteredConversations, ...filteredGroups].sort((a, b) => {
    const timeA = new Date(a.lastMessageTime)
    const timeB = new Date(b.lastMessageTime)
    return timeB - timeA
  })
})

const createNewGroup = () => {
  if (newGroupName.value.trim()) {
    const group = chatStore.createGroup(newGroupName.value.trim())
    chatStore.setActiveConversation(group.id)
    newGroupName.value = ''
    showNewGroupDialog.value = false
  }
}
</script>

<template>
  <div class="w-80 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Chats</h2>
        <div class="flex items-center space-x-2">
          <button 
            @click="showNewGroupDialog = true"
            class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Create new group"
          >
            <UserGroupIcon class="w-5 h-5" />
          </button>
          <button 
            @click="themeStore.toggleTheme" 
            class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <SunIcon v-if="themeStore.isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <!-- Search -->
      <div class="relative">
        <MagnifyingGlassIcon class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search conversations..."
          class="input pl-10"
        >
      </div>
    </div>

    <!-- Conversations List -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        @click="chatStore.setActiveConversation(item.id)"
        :class="[
          'p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200',
          chatStore.activeConversationId === item.id ? 'bg-gray-100 dark:bg-gray-800' : ''
        ]"
      >
        <div class="flex items-center space-x-3">
          <div class="relative">
            <img
              :src="item.avatar"
              :alt="item.name"
              class="w-12 h-12 rounded-full"
            >
            <div 
              v-if="item.type === 'private' && chatStore.isUserOnline(item.id)"
              class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
            ></div>
            <div
              v-if="item.type === 'group'"
              class="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center"
            >
              <UserGroupIcon class="w-3 h-3 text-white" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <h3 class="font-medium truncate">{{ item.name }}</h3>
              <span 
                v-if="item.type === 'group'"
                class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                Group
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ item.lastMessage }}
            </p>
          </div>
          <span class="text-xs text-gray-400">
            {{ item.lastMessageTime }}
          </span>
        </div>
      </div>
    </div>

    <!-- New Group Dialog -->
    <div
      v-if="showNewGroupDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click="showNewGroupDialog = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
        @click.stop
      >
        <h3 class="text-lg font-bold mb-4">Create New Group</h3>
        <input
          v-model="newGroupName"
          type="text"
          placeholder="Enter group name"
          class="input mb-4"
          @keyup.enter="createNewGroup"
        >
        <div class="flex justify-end space-x-2">
          <button
            class="btn btn-secondary"
            @click="showNewGroupDialog = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click="createNewGroup"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  </div>
</template>