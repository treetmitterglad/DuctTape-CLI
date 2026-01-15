import os

from mistralai import Mistral

client = Mistral(api_key=os.environ.get("MISTRAL_API_KEY"))

inputs = [
    {"role": "user", "content": "Hello!"}
]

response = client.beta.conversations.start(
    agent_id="ag_019bbe94b7c176a59505934c19e36bb5",
    inputs=inputs,
)

print(response)
