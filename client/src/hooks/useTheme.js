import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState({
    primary: '#1976d2',
    secondary: '#f50057',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    border: '#e0e0e0'
  })

  // 这里可以添加更多主题相关的逻辑，比如从 localStorage 读取主题设置等
  
  return {
    theme,
    setTheme
  }
} 