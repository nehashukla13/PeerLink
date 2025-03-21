import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  const toggleTheme = () => {
    isDark.value = !isDark.value
    updateTheme()
  }

  const updateTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize theme
  const initializeTheme = () => {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    updateTheme()
  }

  watch(isDark, updateTheme)

  return {
    isDark,
    toggleTheme,
    initializeTheme
  }
})