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
    "model": "openai/gpt-4o", # Optional
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
)

print(response.json())