from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import json

app = Flask(__name__)
CORS(app)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2-vision"

TONE_PROMPTS = {
    "감성적": "감성적이고 서정적인 문체로",
    "유머러스": "유머러스하고 재치있는 문체로",
    "정보형": "유용한 정보와 팁을 담아 실용적인 문체로",
}


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    image_base64 = data.get("image")
    location = data.get("location", "")
    tone = data.get("tone", "감성적")

    tone_desc = TONE_PROMPTS.get(tone, TONE_PROMPTS["감성적"])
    location_desc = f"{location}에서 찍은 " if location else ""

    prompt = f"""이 {location_desc}여행 사진을 보고 {tone_desc} 한국어 SNS 여행 후기를 작성해줘.

조건:
- 3~5문장 분량
- 마지막에 관련 해시태그 5개 포함
- 해시태그는 #으로 시작
- 후기와 해시태그 사이에 빈 줄 하나

후기만 작성하고 다른 설명은 하지 마."""

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "images": [image_base64],
        "stream": False,
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return jsonify({"review": result.get("response", "")})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Ollama 서버에 연결할 수 없어요. ollama serve 실행했는지 확인해주세요."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
