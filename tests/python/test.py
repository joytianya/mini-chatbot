import requests
import json

response = requests.post(
  url="https://openrouter.ai/api/v1/chat/completions",
  headers={
    "Authorization": "Bearer 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",
    "HTTP-Referer": "http://localhost:5173", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "Mini-Chatbot-Test", # Optional. Site title for rankings on openrouter.ai.
  },
  data=json.dumps({
    "model": "qwen/qwen3-1.7b:free", # Optional
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
)

print(response.json())