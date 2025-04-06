import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState({
    light: {
      primary: '#1f1f1f',
      secondary: '#626365',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: {
        primary: '#1f1f1f',
        secondary: '#626365',
      },
      border: '#e3e3e3',
      messageBackground: {
        user: '#f8f9fa',
        assistant: '#ffffff'
      }
    },
    dark: {
      primary: '#e3e3e3',
      secondary: '#a8a9ab', 
      background: '#1f1f1f',
      surface: '#2d2d2d',
      text: {
        primary: '#e3e3e3',
        secondary: '#a8a9ab',
      },
      border: '#3d3d3d',
      messageBackground: {
        user: '#2d2d2d',
        assistant: '#1f1f1f'
      }
    }
  })

  // 这里可以添加更多主题相关的逻辑，比如从 localStorage 读取主题设置等
  
  return {
    theme,
    setTheme
  }
} 