// Supabase 환경변수 (HTML에서 전달받음)
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;
const API_URL = `${window.location.protocol}//${window.location.hostname}:5001/api`;

// ========== 전역 변수 ==========
let currentDate = new Date();
let currentView = 'week'; // 주별 뷰로 시작
let allCards = [];
const PROJECT_STORAGE_KEY = 'kanban.project';
let currentProject = null;
let projectGateEventsBound = false;
let previousProject = null;

// 이슈 타입 아이콘
const issueIcons = {
    story: '📖',
    task: '✅',
    bug: '🐛'
};

// 우선순위 아이콘
const priorityIcons = {
    highest: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    lowest: '🔵'
};

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
        await loadCards();
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
            await loadCards();
        }
        return;
    }

    if (currentProject) {
        gate.classList.add('hidden');
        await loadCards();
    } else {
        await loadProjectOptions();
    }

    bindProjectGateEvents();
}

// ========== 알림 ==========
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ========== 달력 렌더링 ==========
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendarGrid || !currentMonth) {
        console.error('달력 요소를 찾을 수 없습니다');
        return;
    }

    // 기존 날짜 칸 제거 (헤더는 유지)
    const dayHeaders = Array.from(calendarGrid.querySelectorAll('.calendar-day-header'));
    calendarGrid.innerHTML = '';
    dayHeaders.forEach(header => calendarGrid.appendChild(header));
    
    if (currentView === 'week') {
        renderWeekView();
    } else {
        renderMonthView();
    }
}

// 주별 뷰 렌더링
function renderWeekView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = currentDate.getDate();

    const currentDay = new Date(year, month, date);
    const dayOfWeek = currentDay.getDay();
    const startOfWeek = new Date(currentDay);
    startOfWeek.setDate(date - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                        '7월', '8월', '9월', '10월', '11월', '12월'];
    const startMonth = startOfWeek.getMonth();
    const endMonth = endOfWeek.getMonth();
    
    if (startMonth === endMonth) {
        document.getElementById('currentMonth').textContent = 
            `${startOfWeek.getFullYear()}년 ${monthNames[startMonth]} ${startOfWeek.getDate()}일 - ${endOfWeek.getDate()}일`;
    } else {
        document.getElementById('currentMonth').textContent = 
            `${monthNames[startMonth]} ${startOfWeek.getDate()}일 - ${monthNames[endMonth]} ${endOfWeek.getDate()}일`;
    }

    const calendarGrid = document.getElementById('calendarGrid');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const currentCellDate = new Date(startOfWeek);
        currentCellDate.setDate(startOfWeek.getDate() + i);

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day week-view';

        if (currentCellDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        const dayNumberDiv = document.createElement('div');
        dayNumberDiv.className = 'day-number';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayNumberDiv.textContent = `${dayNames[i]} ${currentCellDate.getDate()}`;
        dayCell.appendChild(dayNumberDiv);

        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'calendar-cards';
        cardsDiv.dataset.date = currentCellDate.toISOString().split('T')[0];
        dayCell.appendChild(cardsDiv);

        calendarGrid.appendChild(dayCell);
    }

    renderCalendarCards();
}

// 월별 뷰 렌더링
function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                        '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;

    const calendarGrid = document.getElementById('calendarGrid');
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const monthLength = lastDay.getDate();

    const prevLastDay = new Date(year, month, 0);
    const prevMonthLength = prevLastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dayCounter = 1;
    let nextMonthCounter = 1;

    for (let i = 0; i < 42; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        let currentCellDate;
        let dayNumber;
        let isOtherMonth = false;

        if (i < startingDayOfWeek) {
            dayNumber = prevMonthLength - startingDayOfWeek + i + 1;
            currentCellDate = new Date(year, month - 1, dayNumber);
            isOtherMonth = true;
        } else if (dayCounter <= monthLength) {
            dayNumber = dayCounter;
            currentCellDate = new Date(year, month, dayNumber);
            dayCounter++;
        } else {
            dayNumber = nextMonthCounter;
            currentCellDate = new Date(year, month + 1, dayNumber);
            nextMonthCounter++;
            isOtherMonth = true;
        }

        if (isOtherMonth) {
            dayCell.classList.add('other-month');
        }

        if (currentCellDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        const dayNumberDiv = document.createElement('div');
        dayNumberDiv.className = 'day-number';
        dayNumberDiv.textContent = dayNumber;
        dayCell.appendChild(dayNumberDiv);

        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'calendar-cards';
        cardsDiv.dataset.date = currentCellDate.toISOString().split('T')[0];
        dayCell.appendChild(cardsDiv);

        calendarGrid.appendChild(dayCell);
    }

    renderCalendarCards();
}

// 달력에 카드 배치
// 달력에 카드 배치
function renderCalendarCards() {
    allCards.forEach(card => {
        if (card.start_date && card.end_date) {
            const start = new Date(card.start_date + 'T00:00:00+09:00');
            const end = new Date(card.end_date + 'T00:00:00+09:00');
            
            // 시작일부터 종료일까지 모든 날짜에 카드 표시
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                const dayCell = document.querySelector(`[data-date="${dateStr}"]`);
                
                if (dayCell) {
                    const cardEl = createCalendarCardElement(card, date, start, end);
                    dayCell.appendChild(cardEl);
                }
            }
        }
    });
}


// 달력용 카드 요소 생성
// 달력용 카드 요소 생성
function createCalendarCardElement(card, currentDate, startDate, endDate) {
    const cardEl = document.createElement('div');
    cardEl.className = 'calendar-card';
    cardEl.onclick = (e) => {
        e.stopPropagation();
        showCardDetail(card.id);
    };
    
    // 기간의 시작, 중간, 끝에 따라 클래스 추가
    const isStart = currentDate.toISOString().split('T')[0] === startDate.toISOString().split('T')[0];
    const isEnd = currentDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
    
    if (isStart && isEnd) {
        cardEl.classList.add('card-single');
    } else if (isStart) {
        cardEl.classList.add('card-start');
    } else if (isEnd) {
        cardEl.classList.add('card-end');
    } else {
        cardEl.classList.add('card-span');
    }
    
    // 우선순위에 따른 배경색
    const priorityColors = {
        highest: '#ffebee',
        high: '#fff3e0',
        medium: '#fff9c4',
        low: '#e8f5e9',
        lowest: '#e3f2fd'
    };
    
    cardEl.style.backgroundColor = priorityColors[card.priority] || '#f5f5f5';
    
    cardEl.innerHTML = `
        <span class="calendar-card-icon">${issueIcons[card.issue_type]}</span>
        <span class="calendar-card-title">${card.title}</span>
        <span class="calendar-card-priority">${priorityIcons[card.priority]}</span>
    `;
    
    return cardEl;
}

function formatKSTDateTime(utcDateString) {
    const date = new Date(utcDateString);
    return date.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ========== 카드 로드 ==========
async function loadCards() {
    try {
        if (!currentProject || !currentProject.id) {
            return;
        }
        const response = await fetch(buildProjectUrl('/cards'));
        const cards = await response.json();
        
        console.log('로드된 카드:', cards.length, '개');
        
        // 전역 변수에 저장 (archive 제외)
        allCards = cards.filter(card => card.column_name !== 'archive');
        
        // 모든 컨테이너 비우기
        document.querySelectorAll('.cards-container').forEach(container => {
            container.innerHTML = '';
        });
        
        allCards.forEach(card => {
            // column_name 정규화
            let columnName = card.column_name;
            if (columnName === 'in_progress') {
                columnName = 'inprogress';
            }
            
            const container = document.getElementById(`${columnName}-cards`);
            if (container) {
                const cardElement = createCardElement(card);
                container.appendChild(cardElement);
            } else {
                console.warn(`Container not found for column: ${columnName}`);
            }
        });
        
        initializeSortable();
        renderCalendar();
    } catch (error) {
        console.error('Failed to load cards:', error);
    }
}


// ========== 카드 요소 생성 ==========
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.id = card.id;
    div.onclick = () => showCardDetail(card.id);

    let dateHtml = '';
    
    // start_date와 end_date 표시
    if (card.start_date || card.end_date) {
        const startDate = card.start_date ? new Date(card.start_date + 'T00:00:00+09:00') : null;
        const endDate = card.end_date ? new Date(card.end_date + 'T00:00:00+09:00') : null;
        
        // 오늘 날짜를 한국 시간으로 가져오기
        const today = new Date();
        const kstToday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        kstToday.setHours(0, 0, 0, 0);
        
        let dateClass = 'card-due-date';
        let dateText = '';
        
        // 날짜 텍스트 생성
        if (startDate && endDate) {
            const start = startDate.toLocaleDateString('ko-KR', { 
                timeZone: 'Asia/Seoul',
                month: 'numeric', 
                day: 'numeric' 
            });
            const end = endDate.toLocaleDateString('ko-KR', { 
                timeZone: 'Asia/Seoul',
                month: 'numeric', 
                day: 'numeric' 
            });
            
            if (card.start_date === card.end_date) {
                dateText = `📅 ${start}`;
            } else {
                dateText = `📅 ${start} ~ ${end}`;
            }
            
            // 종료일 기준으로 색상 결정
            const endDateOnly = new Date(endDate);
            endDateOnly.setHours(0, 0, 0, 0);
            
            if (endDateOnly < kstToday) {
                dateClass += ' overdue';
            } else if (endDateOnly.getTime() === kstToday.getTime()) {
                dateClass += ' today';
            }
        } else if (startDate) {
            dateText = `📅 ${startDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
        } else if (endDate) {
            dateText = `📅 ~ ${endDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
            
            const endDateOnly = new Date(endDate);
            endDateOnly.setHours(0, 0, 0, 0);
            
            if (endDateOnly < kstToday) {
                dateClass += ' overdue';
            } else if (endDateOnly.getTime() === kstToday.getTime()) {
                dateClass += ' today';
            }
        }
        
        if (dateText) {
            dateHtml = `<div class="${dateClass}">${dateText}</div>`;
        }
    }

    div.innerHTML = `
        <div class="card-header">
            <span class="issue-icon">${issueIcons[card.issue_type]}</span>
            <span class="priority-badge">${priorityIcons[card.priority]}</span>
        </div>
        <div class="card-title">${card.title}</div>
        <div class="card-description">${card.description || ''}</div>
        <div class="card-meta">
            ${card.assignee ? `<span class="card-assignee">👤 ${card.assignee}</span>` : ''}
            ${card.git_issue ? `<span class="meta-item">🔗 ${card.git_issue}</span>` : ''}
        </div>
        ${dateHtml}
    `;

    return div;
}



// ========== Sortable 초기화 ==========
function initializeSortable() {
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'cards',
            animation: 150,
            onEnd: async (evt) => {
                const cardId = evt.item.dataset.id;
                const newColumn = evt.to.dataset.column;

                await fetch(buildProjectUrl(`/cards/${cardId}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ column_name: newColumn })
                });

                showNotification('카드가 이동되었습니다');
                await loadCards();
            }
        });
    });
}


// ========== 카드 상세 보기 ==========
async function showCardDetail(cardId) {
    try {
        const response = await fetch(buildProjectUrl(`/cards/${cardId}`));
        const card = await response.json();
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        
        // 날짜 포맷팅
        let dateText = '';
        if (card.start_date || card.end_date) {
            const startDate = card.start_date ? new Date(card.start_date + 'T00:00:00+09:00') : null;
            const endDate = card.end_date ? new Date(card.end_date + 'T00:00:00+09:00') : null;
            
            if (startDate && endDate) {
                if (card.start_date === card.end_date) {
                    dateText = startDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
                } else {
                    dateText = `${startDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ ${endDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
                }
            } else if (startDate) {
                dateText = `시작: ${startDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
            } else if (endDate) {
                dateText = `종료: ${endDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
            }
        }
        
        // 설명 정리
        let description = '설명이 없습니다.';
        if (card.description) {
            description = card.description.trim();
        }
        
        // HTML 생성
        let html = `
            <div class="modal-detail-wrapper">
                <span class="close" id="closeDetail">&times;</span>
                
                <div class="modal-detail-header">
                    <h1 class="modal-detail-title">
                        ${issueIcons[card.issue_type] || '✅'} ${card.title}
                    </h1>
                </div>
                
                <div class="modal-detail-meta">`;
        
        if (card.priority) {
            html += `<span class="detail-meta-badge priority">${priorityIcons[card.priority] || '🟡'}</span>`;
        }
        
        if (card.assignee) {
            html += `<span class="detail-meta-badge assignee">👤 ${card.assignee}</span>`;
        }
        
        if (card.label) {
            html += `<span class="detail-meta-badge label">🏷️ ${card.label}</span>`;
        }
        
        if (card.git_issue) {
            html += `<span class="detail-meta-badge git">🔗 ${card.git_issue}</span>`;
        }
        
        if (dateText) {
            html += `<span class="detail-meta-badge date">📅 ${dateText}</span>`;
        }
        
        html += `
                </div>
                
                <div class="modal-detail-body">
                    <div class="modal-detail-section">
                        <h3 class="section-title">📝 설명</h3>
                        <div class="section-content">${description}</div>
                    </div>
                </div>
                
                <div class="modal-detail-footer">
                    <button class="btn-edit" onclick="editCard(${card.id})">✏️ 수정</button>`;
        
        if (card.column_name === 'done') {
            html += `<button class="btn-archive" onclick="archiveCard(${card.id})">📦 보관</button>`;
        }
        
        html += `
                    <button class="btn-delete" onclick="deleteCard(${card.id})">🗑️ 삭제</button>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        const closeBtn = document.getElementById('closeDetail');
        if (closeBtn) {
            closeBtn.onclick = closeDetailModal;
        }
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('카드 상세 정보 로드 실패:', error);
        alert('카드 정보를 불러오는데 실패했습니다.');
    }
}





// ========== 카드 수정 ==========
async function editCard(cardId) {
    try {
        // 카드 데이터 가져오기
        const response = await fetch(buildProjectUrl(`/cards/${cardId}`));
        const card = await response.json();
        
        // 상세 모달 닫기
        closeDetailModal();
        
        // 수정 모달 열기
        const editModal = document.getElementById('editModal');
         const closeEditModal = editModal ? editModal.querySelector('.close') : null;
    
        if (closeEditModal) {
            closeEditModal.addEventListener('click', function() {
                editModal.style.display = 'none';
            });
        }
        // 폼에 기존 데이터 채우기
        document.getElementById('editCardId').value = card.id;
        document.getElementById('editTitle').value = card.title;
        document.getElementById('editDescription').value = card.description || '';
        document.getElementById('editGitIssue').value = card.git_issue || '';
        document.getElementById('editAssignee').value = card.assignee || '';
        document.getElementById('editLabel').value = card.label || '';
        document.getElementById('editIssueType').value = card.issue_type;
        document.getElementById('editPriority').value = card.priority;
        document.getElementById('editStartDate').value = card.start_date || '';
        document.getElementById('editDueDate').value = card.end_date || '';
        document.getElementById('editColumnName').value = card.column_name;
        
        editModal.style.display = 'block';
    } catch (error) {
        console.error('카드 정보 로드 실패:', error);
        alert('카드 정보를 불러올 수 없습니다.');
    }
}

// ========== 카드 보관 ==========
async function archiveCard(cardId) {
    if (!confirm('이 카드를 보관하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(buildProjectUrl(`/cards/${cardId}/archive`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('카드가 보관함으로 이동되었습니다! 📦');
            closeDetailModal();
            loadCards();
        }
    } catch (error) {
        console.error('카드 보관 실패:', error);
        alert('카드 보관에 실패했습니다.');
    }
}


// ========== 카드 삭제 ==========
async function deleteCard(cardId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
        await fetch(buildProjectUrl(`/cards/${cardId}`), {
            method: 'DELETE'
        });

        closeDetailModal();
        showNotification('카드가 삭제되었습니다');
        await loadCards();
    } catch (error) {
        console.error('카드 삭제 실패:', error);
    }
}




// ========== 모달 닫기 ==========
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ========== 이벤트 리스너 설정 ==========
function setupEventListeners() {
    const switchProjectBtn = document.getElementById('switchProjectBtn');
    if (switchProjectBtn) {
        switchProjectBtn.addEventListener('click', openProjectGate);
    }

    // 달력 전환 버튼
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', function() {
            const calendarSection = document.getElementById('calendarSection');
            const kanbanSection = document.getElementById('kanbanSection');
            
            if (calendarSection.classList.contains('hidden')) {
                calendarSection.classList.remove('hidden');
                kanbanSection.classList.add('hidden');
                toggleViewBtn.textContent = '📋 칸반 보기';
            } else {
                calendarSection.classList.add('hidden');
                kanbanSection.classList.remove('hidden');
                toggleViewBtn.textContent = '📅 달력 보기';
            }
        });
    }
    
    // 달력 이전/다음 버튼
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            if (currentView === 'month') {
                currentDate.setMonth(currentDate.getMonth() - 1);
            } else {
                currentDate.setDate(currentDate.getDate() - 7);
            }
            renderCalendar();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            if (currentView === 'month') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() + 7);
            }
            renderCalendar();
        });
    }
    
    // 월별/주별 뷰 버튼
    const monthViewBtn = document.getElementById('monthViewBtn');
    const weekViewBtn = document.getElementById('weekViewBtn');
    
    if (monthViewBtn && weekViewBtn) {
        monthViewBtn.addEventListener('click', function() {
            currentView = 'month';
            monthViewBtn.classList.add('active');
            weekViewBtn.classList.remove('active');
            renderCalendar();
        });
        
        weekViewBtn.addEventListener('click', function() {
            currentView = 'week';
            weekViewBtn.classList.add('active');
            monthViewBtn.classList.remove('active');
            renderCalendar();
        });
    }
    
    // 카드 추가 버튼
    const addCardBtn = document.getElementById('addCardBtn');
    const cardModal = document.getElementById('cardModal');
    const closeModal = cardModal ? cardModal.querySelector('.close') : null;
    const cardForm = document.getElementById('cardForm');
    
    if (addCardBtn && cardModal) {
        addCardBtn.addEventListener('click', function() {
            cardModal.style.display = 'block';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            cardModal.style.display = 'none';
        });
    }
    if (cardForm) {
    cardForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('dueDate').value;
    
    const cardData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        git_issue: document.getElementById('gitIssue').value,
        assignee: document.getElementById('assignee').value,
        issue_type: document.getElementById('issueType').value,
        priority: document.getElementById('priority').value,
        column_name: document.getElementById('columnName').value
    };

    if (currentProject && currentProject.id) {
        cardData.project_id = currentProject.id;
    }
    
    // 날짜가 입력된 경우에만 추가
    if (startDateValue) {
        cardData.start_date = startDateValue;
    }
    if (endDateValue) {
        cardData.end_date = endDateValue;
    }
    
    console.log('전송할 데이터:', cardData);
    
    try {
        const response = await fetch(buildProjectUrl('/cards'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cardData)
        });
        
        if (response.ok) {
            cardModal.style.display = 'none';
            cardForm.reset();
            showNotification('카드가 추가되었습니다');
            loadCards();
        } else {
            const error = await response.json();
            console.error('에러:', error);
            alert('카드 생성에 실패했습니다.');
        }
    } catch (error) {
        console.error('카드 생성 실패:', error);
        alert('카드 생성에 실패했습니다.');
    }
    // 수정 모달 닫기
const editModal = document.getElementById('editModal');
const closeEdit = document.getElementById('closeEdit');

if (closeEdit) {
    closeEdit.addEventListener('click', function() {
        editModal.style.display = 'none';
    });
}

// 수정 폼 제출
const editForm = document.getElementById('editForm');
if (editForm) {
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cardId = document.getElementById('editCardId').value;
        const startDateValue = document.getElementById('editStartDate').value;
        const endDateValue = document.getElementById('editDueDate').value;
        
        const cardData = {
            title: document.getElementById('editTitle').value,
            description: document.getElementById('editDescription').value,
            git_issue: document.getElementById('editGitIssue').value,
            assignee: document.getElementById('editAssignee').value,
            issue_type: document.getElementById('editIssueType').value,
            priority: document.getElementById('editPriority').value,
            column_name: document.getElementById('editColumnName').value
        };
        
        // 날짜가 입력된 경우에만 추가
        if (startDateValue) {
            cardData.start_date = startDateValue;
        }
        if (endDateValue) {
            cardData.end_date = endDateValue;
        }
        
        // label 추가
        const labelValue = document.getElementById('editLabel').value;
        if (labelValue) {
            cardData.label = labelValue;
        }
        
        try {
            const response = await fetch(buildProjectUrl(`/cards/${cardId}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cardData)
            });
            
            if (response.ok) {
                editModal.style.display = 'none';
                editForm.reset();
                showNotification('카드가 수정되었습니다');
                loadCards();
            } else {
                const error = await response.json();
                console.error('에러:', error);
                alert('카드 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('카드 수정 실패:', error);
            alert('카드 수정에 실패했습니다.');
        }
    });
}



});

}

    // 모달 닫기 (외부 클릭)
    const detailModal = document.getElementById('detailModal');
    const closeDetail = document.getElementById('closeDetail');
    
    if (closeDetail) {
        closeDetail.addEventListener('click', closeDetailModal);
    }
    
        // 모달 외부 클릭 시 닫기 (기존 코드에 추가)
    window.onclick = function(event) {
    if (cardModal && event.target == cardModal) {
        cardModal.style.display = 'none';
    }
    if (detailModal && event.target == detailModal) {
        closeDetailModal();
    }
    if (editModal && event.target == editModal) {
        editModal.style.display = 'none';
    }
};
}

// ========== 페이지 로드 시 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ 페이지 로드 시작');
    
    // 1. 전역 변수 초기화
    currentView = 'week';
    currentDate = new Date();

    // 2. 이벤트 리스너 설정
    setupEventListeners();

    // 3. 프로젝트 인증 및 카드 로드
    initProjectGate();
    
    console.log('✅ 초기화 완료');
});
