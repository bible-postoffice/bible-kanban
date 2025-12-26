// ========== 보관함 전용 JavaScript ==========
const API_URL = `${window.location.protocol}//${window.location.hostname}:5001/api`;
const PROJECT_STORAGE_KEY = 'kanban.project';
let currentProject = null;
let projectGateEventsBound = false;
let previousProject = null;

function buildProjectUrl(path) {
    const url = new URL(`${API_URL}${path}`);
    if (currentProject && currentProject.id) {
        url.searchParams.set('project_id', currentProject.id);
    }
    return url.toString();
}

function readStoredProject() {
    const raw = sessionStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('저장된 프로젝트 정보를 파싱할 수 없습니다:', error);
        return null;
    }
}

function updateProjectBadge() {
    const badge = document.getElementById('currentProjectBadge');
    if (!badge) {
        return;
    }
    if (currentProject && currentProject.name) {
        badge.textContent = `프로젝트: ${currentProject.name}`;
    } else {
        badge.textContent = '프로젝트 선택 필요';
    }
}

function setCurrentProject(project) {
    currentProject = project;
    sessionStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    updateProjectBadge();
    const gate = document.getElementById('projectGate');
    if (gate) {
        gate.classList.add('hidden');
    }
}

async function openProjectGate() {
    previousProject = readStoredProject();
    currentProject = null;
    sessionStorage.removeItem(PROJECT_STORAGE_KEY);
    updateProjectBadge();

    const gate = document.getElementById('projectGate');
    if (!gate) {
        return;
    }

    gate.classList.remove('hidden');
    const pinInput = document.getElementById('projectPin');
    if (pinInput) {
        pinInput.value = '';
    }
    await loadProjectOptions();
}

async function closeProjectGate() {
    const gate = document.getElementById('projectGate');
    if (!gate) {
        return;
    }

    gate.classList.add('hidden');
}

async function loadProjectOptions() {
    const select = document.getElementById('projectSelect');
    const errorEl = document.getElementById('projectError');
    if (!select) {
        return;
    }
    select.innerHTML = '';
    if (errorEl) {
        errorEl.textContent = '';
    }

    try {
        const response = await fetch(`${API_URL}/projects`);
        const projects = await response.json();

        if (!projects.length) {
            if (errorEl) {
                errorEl.textContent = '등록된 프로젝트가 없습니다.';
            }
            return;
        }

        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('프로젝트 목록 로드 실패:', error);
        if (errorEl) {
            errorEl.textContent = '프로젝트 목록을 불러오지 못했습니다.';
        }
    }
}

async function verifyProjectAccess() {
    const select = document.getElementById('projectSelect');
    const pinInput = document.getElementById('projectPin');
    const errorEl = document.getElementById('projectError');
    if (!select || !pinInput) {
        return;
    }

    if (errorEl) {
        errorEl.textContent = '';
    }

    const projectId = select.value;
    const pin = pinInput.value.trim();

    if (!projectId) {
        if (errorEl) {
            errorEl.textContent = '프로젝트를 선택하세요.';
        }
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        if (errorEl) {
            errorEl.textContent = '비밀번호는 4자리 숫자여야 합니다.';
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/projects/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, pin })
        });

        if (!response.ok) {
            if (errorEl) {
                errorEl.textContent = '비밀번호가 일치하지 않습니다.';
            }
            return;
        }

        const result = await response.json();
        setCurrentProject(result.project);
        pinInput.value = '';
        await loadArchivedCards();
    } catch (error) {
        console.error('프로젝트 인증 실패:', error);
        if (errorEl) {
            errorEl.textContent = '프로젝트 인증에 실패했습니다.';
        }
    }
}

function bindProjectGateEvents() {
    if (projectGateEventsBound) {
        return;
    }

    const enterBtn = document.getElementById('projectEnterBtn');
    const pinInput = document.getElementById('projectPin');
    const closeBtn = document.getElementById('projectGateClose');
    if (enterBtn) {
        enterBtn.onclick = verifyProjectAccess;
    }
    if (pinInput) {
        pinInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                verifyProjectAccess();
            }
        };
    }
    if (closeBtn) {
        closeBtn.onclick = closeProjectGate;
    }

    projectGateEventsBound = true;
}

async function initProjectGate() {
    const gate = document.getElementById('projectGate');
    currentProject = readStoredProject();
    updateProjectBadge();

    if (!gate) {
        if (currentProject) {
            await loadArchivedCards();
        }
        return;
    }

    if (currentProject) {
        gate.classList.add('hidden');
        await loadArchivedCards();
    } else {
        await loadProjectOptions();
    }

    bindProjectGateEvents();
}

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', function() {
    initProjectGate();

    const switchProjectBtn = document.getElementById('switchProjectBtn');
    if (switchProjectBtn) {
        switchProjectBtn.addEventListener('click', openProjectGate);
    }
    
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
        if (!currentProject || !currentProject.id) {
            return;
        }
        const response = await fetch(buildProjectUrl('/cards'));
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
        const response = await fetch(buildProjectUrl(`/cards/${cardId}`), {
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
        const response = await fetch(buildProjectUrl(`/cards/${cardId}`), {
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
