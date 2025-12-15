// ========== 보관함 전용 JavaScript ==========

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', function() {
    loadArchivedCards();
    
    // 모달 닫기
    const closeBtn = document.getElementById('closeDetail');
    if (closeBtn) {
        closeBtn.onclick = closeDetailModal;
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('detailModal');
        if (event.target == modal) {
            closeDetailModal();
        }
    };
});

// 보관된 카드 로드
async function loadArchivedCards() {
    try {
        const response = await fetch('/api/cards');
        const cards = await response.json();
        
        const archiveGrid = document.getElementById('archiveGrid');
        archiveGrid.innerHTML = '';
        
        // archive 카드만 필터링
        const archivedCards = cards.filter(card => card.column_name === 'archive');
        
        if (archivedCards.length === 0) {
            archiveGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #95a5a6;">
                    <h3 style="font-size: 48px; margin-bottom: 20px;">📦</h3>
                    <p style="font-size: 18px;">보관된 카드가 없습니다</p>
                    <p style="font-size: 14px; margin-top: 10px;">Done 컬럼에서 카드를 보관해보세요</p>
                </div>
            `;
            return;
        }
        
        archivedCards.forEach(card => {
            const cardElement = createCardElement(card);
            archiveGrid.appendChild(cardElement);
        });
        
    } catch (error) {
        console.error('Failed to load archived cards:', error);
    }
}

// 카드 요소 생성
function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.onclick = () => showCardDetail(card);
    
    const issueTypeIcon = {
        'story': '📖',
        'task': '✅',
        'bug': '🐛'
    };
    
    const priorityIcon = {
        'highest': '🔴',
        'high': '🟠',
        'medium': '🟡',
        'low': '🟢',
        'lowest': '🔵'
    };
    
    cardDiv.innerHTML = `
        <div class="card-header">
            <span class="issue-icon">${issueTypeIcon[card.issue_type] || ''}</span>
            <span class="priority-badge">${priorityIcon[card.priority] || ''}</span>
        </div>
        <div class="card-title">${card.title}</div>
        ${card.description ? `<div class="card-description">${card.description}</div>` : ''}
        <div class="card-meta">
            ${card.assignee ? `<span class="card-assignee">👤 ${card.assignee}</span>` : ''}
            ${card.git_issue ? `<span class="git-issue">🔗 ${card.git_issue}</span>` : ''}
            ${card.label ? `<span class="meta-item">🏷️ ${card.label}</span>` : ''}
        </div>
        ${card.due_date ? `<div class="card-due-date">📅 ${card.due_date}</div>` : ''}
    `;
    
    return cardDiv;
}

// 카드 상세 보기
async function showCardDetail(card) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    const issueTypeIcon = {
        'story': '📖',
        'task': '✅',
        'bug': '🐛'
    };
    
    const priorityIcon = {
        'highest': '🔴',
        'high': '🟠',
        'medium': '🟡',
        'low': '🟢',
        'lowest': '🔵'
    };
    
    content.innerHTML = `
        <div class="detail-header">
            <div class="detail-title-section">
                <h2 class="detail-title">
                    ${issueTypeIcon[card.issue_type] || ''} 
                    ${card.title}
                </h2>
                <div class="detail-meta">
                    <span class="priority-badge">${priorityIcon[card.priority] || ''}</span>
                    ${card.assignee ? `<span class="card-assignee">👤 ${card.assignee}</span>` : ''}
                    ${card.git_issue ? `<span class="git-issue">🔗 ${card.git_issue}</span>` : ''}
                    ${card.due_date ? `<span class="meta-item">📅 ${card.due_date}</span>` : ''}
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn-edit" onclick="restoreCard(${card.id})">↩️ 복원</button>
                <button class="btn-delete" onclick="deleteCard(${card.id})">🗑️ 삭제</button>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📝 설명</h3>
            <div class="detail-description">
                ${card.description || '설명이 없습니다.'}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// 카드 복원 (Done으로)
async function restoreCard(cardId) {
    if (!confirm('이 카드를 Done 컬럼으로 복원하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cards/${cardId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ column_name: 'done' })
        });
        
        if (response.ok) {
            alert('카드가 Done 컬럼으로 복원되었습니다! ↩️');
            closeDetailModal();
            loadArchivedCards();
        }
    } catch (error) {
        console.error('카드 복원 실패:', error);
        alert('카드 복원에 실패했습니다.');
    }
}

// 카드 삭제
async function deleteCard(cardId) {
    if (!confirm('정말 이 카드를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cards/${cardId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('카드가 삭제되었습니다.');
            closeDetailModal();
            loadArchivedCards();
        }
    } catch (error) {
        console.error('카드 삭제 실패:', error);
        alert('카드 삭제에 실패했습니다.');
    }
}

// 모달 닫기
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}
