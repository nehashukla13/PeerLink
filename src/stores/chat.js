import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([])
  const groups = ref([])
  const activeConversationId = ref(null)
  const messages = ref([])
  const contacts = ref([])
  const typingUsers = ref(new Set())
  const onlineUsers = ref(new Set([1]))
  const selectedUsers = ref([])
  
  // Sample available users for demonstration
  const availableUsers = ref([
    {
      id: 2,
      name: 'Alice Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
    },
    {
      id: 3,
      name: 'Bob Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
    },
    {
      id: 4,
      name: 'Carol White',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol'
    },
    {
      id: 5,
      name: 'David Brown',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
    }
  ])

  const activeConversation = computed(() => {
    const conv = conversations.value.find(c => c.id === activeConversationId.value)
    if (conv) return { ...conv, type: 'private' }
    
    const group = groups.value.find(g => g.id === activeConversationId.value)
    if (group) return { ...group, type: 'group' }
    
    return null
  })

  const addMessage = (message) => {
    const newMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
      status: 'sent'
    }
    
    messages.value.push(newMessage)

    if (message.sender !== 'user' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('New Message', {
        body: message.content,
        icon: activeConversation.value?.avatar
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }

    // Update last message in conversation or group
    if (activeConversation.value?.type === 'private') {
      const conversationIndex = conversations.value.findIndex(c => c.id === activeConversationId.value)
      if (conversationIndex !== -1) {
        conversations.value[conversationIndex] = {
          ...conversations.value[conversationIndex],
          lastMessage: message.content,
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }
    } else {
      const groupIndex = groups.value.findIndex(g => g.id === activeConversationId.value)
      if (groupIndex !== -1) {
        groups.value[groupIndex] = {
          ...groups.value[groupIndex],
          lastMessage: message.content,
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }
    }
  }

  const createGroup = (name, avatar = null) => {
    const group = {
      id: uuidv4(),
      name,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      members: [1], // Current user ID
      creator: 1, // Current user ID
      lastMessage: 'Group created',
      lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'group'
    }
    groups.value.push(group)
    return group
  }

  const joinGroup = (groupId) => {
    const group = groups.value.find(g => g.id === groupId)
    if (group && !group.members.includes(1)) {
      group.members.push(1)
      addMessage({
        content: 'You joined the group',
        type: 'system',
        sender: 'system'
      })
    }
  }

  const leaveGroup = (groupId) => {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.members = group.members.filter(id => id !== 1)
      addMessage({
        content: 'You left the group',
        type: 'system',
        sender: 'system'
      })
      if (activeConversationId.value === groupId) {
        activeConversationId.value = null
      }
    }
  }

  const addGroupMembers = (groupId, userIds) => {
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      const newMembers = userIds.filter(id => !group.members.includes(id))
      group.members.push(...newMembers)
      
      // Add system message for each new member
      newMembers.forEach(memberId => {
        const user = availableUsers.value.find(u => u.id === memberId)
        if (user) {
          addMessage({
            content: `${user.name} has joined the group`,
            type: 'system',
            sender: 'system'
          })
        }
      })
    }
    // Clear selected users after adding
    selectedUsers.value = []
  }

  const toggleUserSelection = (userId) => {
    const index = selectedUsers.value.indexOf(userId)
    if (index === -1) {
      selectedUsers.value.push(userId)
    } else {
      selectedUsers.value.splice(index, 1)
    }
  }

  const setActiveConversation = (id) => {
    activeConversationId.value = id
    messages.value = [] // Clear messages when switching conversations
    selectedUsers.value = [] // Clear selected users when switching conversations
  }

  const setTyping = (userId, isTyping) => {
    if (isTyping) {
      typingUsers.value.add(userId)
    } else {
      typingUsers.value.delete(userId)
    }
  }

  const setUserOnlineStatus = (userId, isOnline) => {
    if (isOnline) {
      onlineUsers.value.add(userId)
    } else {
      onlineUsers.value.delete(userId)
    }

    const conversationIndex = conversations.value.findIndex(c => c.id === userId)
    if (conversationIndex !== -1) {
      conversations.value[conversationIndex] = {
        ...conversations.value[conversationIndex],
        status: isOnline ? 'Online' : 'Offline'
      }
    }
  }

  const isUserTyping = (userId) => typingUsers.value.has(userId)
  const isUserOnline = (userId) => onlineUsers.value.has(userId)

  // New methods for deleting messages
  const deleteMessageForMe = (conversationId, messageId) => {
    if (activeConversationId.value === conversationId) {
      messages.value = messages.value.filter((msg) => msg.id !== messageId)
      updateLastMessage(conversationId)
    }
  }

  const deleteMessageForEveryone = (conversationId, messageId) => {
    if (activeConversationId.value === conversationId) {
      const messageIndex = messages.value.findIndex((msg) => msg.id === messageId)
      if (messageIndex !== -1) {
        messages.value[messageIndex] = {
          ...messages.value[messageIndex],
          content: 'This message was deleted',
          type: 'system',
          sender: 'system',
          timestamp: new Date()
        }
        updateLastMessage(conversationId)
      }
    }
    // TODO: Add backend logic to notify other users (e.g., via WebSocket or API)
  }

  // Helper method to update lastMessage and lastMessageTime after deletion
  const updateLastMessage = (conversationId) => {
    const lastMessage = messages.value
      .filter((msg) => msg.sender !== 'system')
      .slice(-1)[0]

    if (activeConversation.value?.type === 'private') {
      const conversationIndex = conversations.value.findIndex(c => c.id === conversationId)
      if (conversationIndex !== -1) {
        conversations.value[conversationIndex] = {
          ...conversations.value[conversationIndex],
          lastMessage: lastMessage?.content || 'No messages',
          lastMessageTime: lastMessage
            ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : conversations.value[conversationIndex].lastMessageTime
        }
      }
    } else {
      const groupIndex = groups.value.findIndex(g => g.id === conversationId)
      if (groupIndex !== -1) {
        groups.value[groupIndex] = {
          ...groups.value[groupIndex],
          lastMessage: lastMessage?.content || 'No messages',
          lastMessageTime: lastMessage
            ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : groups.value[groupIndex].lastMessageTime
        }
      }
    }
  }

  return {
    conversations,
    groups,
    messages,
    contacts,
    activeConversation,
    activeConversationId,
    availableUsers,
    selectedUsers,
    addMessage,
    createGroup,
    joinGroup,
    leaveGroup,
    addGroupMembers,
    toggleUserSelection,
    setActiveConversation,
    setTyping,
    setUserOnlineStatus,
    isUserTyping,
    isUserOnline,
    deleteMessageForMe,
    deleteMessageForEveryone
  }
})