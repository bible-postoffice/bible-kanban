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

# 프로젝트 목록 조회
@app.route('/api/projects', methods=['GET'])
def get_projects():
    response = supabase.table('kanban_projects')\
        .select('id, name')\
        .order('name')\
        .execute()
    return jsonify(response.data)

# 프로젝트 비밀번호 확인
@app.route('/api/projects/verify', methods=['POST'])
def verify_project():
    data = request.json or {}
    project_id = data.get('project_id')
    pin = data.get('pin')

    if not project_id or pin is None:
        return jsonify({'error': 'project_id and pin are required'}), 400

    response = supabase.table('kanban_projects')\
        .select('id, name, pin')\
        .eq('id', project_id)\
        .execute()

    if not response.data:
        return jsonify({'error': 'Project not found'}), 404

    project = response.data[0]
    stored_pin = str(project.get('pin', '')).strip()
    if str(pin).strip() != stored_pin:
        return jsonify({'error': 'Invalid pin'}), 401

    return jsonify({
        'success': True,
        'project': {
            'id': project['id'],
            'name': project['name']
        }
    })

# 모든 카드 조회
@app.route('/api/cards', methods=['GET'])
def get_cards():
    project_id = request.args.get('project_id')
    query = supabase.table('kanban_cards')\
        .select('*')\
        .order('created_at', desc=True)
    
    if project_id:
        query = query.eq('project_id', project_id)
    
    response = query.execute()
    return jsonify(response.data)

# 단일 카드 조회 (상세보기용)
@app.route('/api/cards/<int:card_id>', methods=['GET'])
def get_card(card_id):
    project_id = request.args.get('project_id')
    query = supabase.table('kanban_cards')\
        .select('*')\
        .eq('id', card_id)
    
    if project_id:
        query = query.eq('project_id', project_id)

    response = query.execute()

    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    else:
        return jsonify({'error': 'Card not found'}), 404

# 카드 생성
@app.route('/api/cards', methods=['POST'])
def create_card():
    try:
        data = request.json
        print(f"받은 데이터: {data}")
        
        card_data = {
            'title': data.get('title'),
            'description': data.get('description'),
            'git_issue': data.get('git_issue'),
            'assignee': data.get('assignee'),
            'issue_type': data.get('issue_type'),
            'priority': data.get('priority'),
            'column_name': data.get('column_name', 'todo')
        }

        project_id = data.get('project_id')
        if project_id:
            card_data['project_id'] = project_id
        
        # 날짜 필드 처리 - 빈 문자열이면 포함하지 않음
        start_date = data.get('start_date')
        if start_date and start_date.strip():
            card_data['start_date'] = start_date
            
        end_date = data.get('end_date')
        if end_date and end_date.strip():
            card_data['end_date'] = end_date
        
        # label 처리
        label = data.get('label')
        if label and label.strip():
            card_data['label'] = label
        
        print(f"저장할 데이터: {card_data}")
        
        response = supabase.table('kanban_cards').insert(card_data).execute()
        return jsonify(response.data[0]), 201
        
    except Exception as e:
        print(f"Error creating card: {e}")
        return jsonify({'error': str(e)}), 500

# 카드 업데이트 (PATCH 추가!)
@app.route('/api/cards/<int:card_id>', methods=['PUT', 'PATCH'])
def update_card(card_id):
    try:
        data = request.json
        project_id = request.args.get('project_id')
        
        # 업데이트할 데이터 준비
        update_data = {}
        
        for key in ['title', 'description', 'git_issue', 'assignee', 'label', 
                    'issue_type', 'priority', 'column_name', 'start_date', 'end_date']:
            if key in data:
                update_data[key] = data[key]
        
        query = supabase.table('kanban_cards').update(update_data).eq('id', card_id)
        if project_id:
            query = query.eq('project_id', project_id)

        response = query.execute()
        if response.data:
            return jsonify(response.data[0]), 200
        return jsonify({'error': 'Card not found'}), 404
        
    except Exception as e:
        print(f"Error updating card: {e}")
        return jsonify({'error': str(e)}), 500
# 카드 삭제
@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    project_id = request.args.get('project_id')
    query = supabase.table('kanban_cards').delete().eq('id', card_id)
    if project_id:
        query = query.eq('project_id', project_id)
    query.execute()
    return jsonify({'success': True}), 200

# 카드 보관 (새로 추가!)
@app.route('/api/cards/<int:card_id>/archive', methods=['POST'])
def archive_card(card_id):
    """카드를 보관함으로 이동 (column_name을 'archive'로 변경)"""
    project_id = request.args.get('project_id')
    query = supabase.table('kanban_cards')\
        .update({'column_name': 'archive'})\
        .eq('id', card_id)

    if project_id:
        query = query.eq('project_id', project_id)

    response = query.execute()
    
    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
    return jsonify({'error': 'Card not found'}), 404

# 카드 복원 (새로 추가!)
@app.route('/api/cards/<int:card_id>/restore', methods=['POST'])
def restore_card(card_id):
    """보관함에서 카드를 Done으로 복원"""
    project_id = request.args.get('project_id')
    query = supabase.table('kanban_cards')\
        .update({'column_name': 'done'})\
        .eq('id', card_id)

    if project_id:
        query = query.eq('project_id', project_id)

    response = query.execute()
    
    if response.data and len(response.data) > 0:
        return jsonify(response.data[0])
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
    app.run(debug=True, host='0.0.0.0', port=6001)
