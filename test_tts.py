import requests

response = requests.post('http://127.0.0.1:5000/tts', json={'text': 'Hello world', 'lang': 'en'})
print(response.status_code)
print(response.text)
if response.status_code == 200:
    with open('test.mp3', 'wb') as f:
        f.write(response.content)
    print("Audio saved to test.mp3")