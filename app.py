from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Supabase 클라이언트
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 루트 경로
@app.route('/')
def index():
    return render_template('index.html', 
                         supabase_url=SUPABASE_URL,
                         supabase_key=SUPABASE_KEY)

# 모든 카드 조회
@app.route('/api/cards', methods=['GET'])
def get_cards():
    response = supabase.table('kanban_cards')\
        .select('*')\
        .order('position')\
        .execute()
    return jsonify(response.data)

# 단일 카드 조회 (상세보기용)
@app.route('/api/cards/<int:card_id>', methods=['GET'])
def get_card(card_id):
    response = supabase.table('kanban_cards')\
        .select('*')\
        .eq('id', card_id)\
        .execute()

    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    else:
        return jsonify({'error': 'Card not found'}), 404

# 카드 생성
@app.route('/api/cards', methods=['POST'])
def create_card():
    data = request.json

    # 데이터베이스에 있는 컬럼만 사용
    card_data = {
        'title': data.get('title'),
        'description': data.get('description', ''),
        'column_name': data.get('column_name', 'todo'),
        'assignee': data.get('assignee', ''),
        'issue_type': data.get('issue_type', 'task'),
        'git_issue': data.get('git_issue', ''),
        'priority': data.get('priority', 'medium'),
        'due_date': data.get('due_date', None),
        'position': data.get('position', 0)
    }

    # labels 컬럼이 있으면 추가 (없으면 제외)
    if 'labels' in data:
        card_data['labels'] = data['labels']

    response = supabase.table('kanban_cards').insert(card_data).execute()
    return jsonify(response.data[0]), 201

# 카드 업데이트
@app.route('/api/cards/<int:card_id>', methods=['PUT'])
def update_card(card_id):
    data = request.json
    response = supabase.table('kanban_cards')\
        .update(data)\
        .eq('id', card_id)\
        .execute()
    return jsonify(response.data[0])

# 카드 삭제
@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    supabase.table('kanban_cards').delete().eq('id', card_id).execute()
    return '', 204

# 댓글 조회
@app.route('/api/cards/<int:card_id>/comments', methods=['GET'])
def get_comments(card_id):
    response = supabase.table('kanban_comments')\
        .select('*')\
        .eq('card_id', card_id)\
        .order('created_at')\
        .execute()
    return jsonify(response.data)

# 댓글 추가
@app.route('/api/cards/<int:card_id>/comments', methods=['POST'])
def add_comment(card_id):
    data = request.json
    response = supabase.table('kanban_comments').insert({
        'card_id': card_id,
        'author': data['author'],
        'content': data['content']
    }).execute()
    return jsonify(response.data[0]), 201

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5001)