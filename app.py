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

# ========== 페이지 라우트 ==========

@app.route('/')
def index():
    """메인 페이지 (달력 + 칸반)"""
    return render_template('index.html', 
                         supabase_url=SUPABASE_URL,
                         supabase_key=SUPABASE_KEY)

@app.route('/archive')
def archive():
    """보관함 페이지"""
    return render_template('archive.html',
                         supabase_url=SUPABASE_URL,
                         supabase_key=SUPABASE_KEY)

# ========== API 엔드포인트 ==========

# 모든 카드 조회
@app.route('/api/cards', methods=['GET'])
def get_cards():
    response = supabase.table('kanban_cards')\
        .select('*')\
        .order('created_at', desc=True)\
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
    if 'label' in data:
        card_data['label'] = data['label']

    response = supabase.table('kanban_cards').insert(card_data).execute()
    return jsonify(response.data[0]), 201

# 카드 업데이트 (PATCH 추가!)
@app.route('/api/cards/<int:card_id>', methods=['PUT', 'PATCH'])
def update_card(card_id):
    data = request.json
    response = supabase.table('kanban_cards')\
        .update(data)\
        .eq('id', card_id)\
        .execute()
    
    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    else:
        return jsonify({'error': 'Card not found'}), 404

# 카드 삭제
@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    supabase.table('kanban_cards').delete().eq('id', card_id).execute()
    return jsonify({'success': True}), 200

# 카드 보관 (새로 추가!)
@app.route('/api/cards/<int:card_id>/archive', methods=['POST'])
def archive_card(card_id):
    """카드를 보관함으로 이동 (column_name을 'archive'로 변경)"""
    response = supabase.table('kanban_cards')\
        .update({'column_name': 'archive'})\
        .eq('id', card_id)\
        .execute()
    
    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    else:
        return jsonify({'error': 'Card not found'}), 404

# 카드 복원 (새로 추가!)
@app.route('/api/cards/<int:card_id>/restore', methods=['POST'])
def restore_card(card_id):
    """보관함에서 카드를 Done으로 복원"""
    response = supabase.table('kanban_cards')\
        .update({'column_name': 'done'})\
        .eq('id', card_id)\
        .execute()
    
    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    else:
        return jsonify({'error': 'Card not found'}), 404

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
    app.run(debug=True, host='0.0.0.0', port=5001)
