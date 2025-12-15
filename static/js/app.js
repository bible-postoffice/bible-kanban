// Supabase 환경변수 (HTML에서 전달받음)
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;
const API_URL = `${window.location.protocol}//${window.location.hostname}:5001/api`;

// ========== 전역 변수 ==========
let currentDate = new Date();
let currentView = 'week'; // 주별 뷰로 시작
let allCards = [];

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
function renderCalendarCards() {
    document.querySelectorAll('.calendar-cards').forEach(c => c.innerHTML = '');

    const cardsWithDueDate = allCards.filter(card => card.due_date);

    cardsWithDueDate.forEach(card => {
        const dueDate = card.due_date.split('T')[0];
        const cardContainer = document.querySelector(`.calendar-cards[data-date="${dueDate}"]`);

        if (cardContainer) {
            const calendarCard = document.createElement('div');
            calendarCard.className = 'calendar-card';
            
            calendarCard.onclick = (e) => {
                e.stopPropagation();
                showCardDetail(card.id);
            };

            calendarCard.innerHTML = `
                <div class="calendar-card-title">${issueIcons[card.issue_type]} ${card.title}</div>
                <div class="calendar-card-meta">
                    <span>${priorityIcons[card.priority]}</span>
                    ${card.assignee ? `<span>👤 ${card.assignee}</span>` : ''}
                </div>
            `;

            cardContainer.appendChild(calendarCard);
        }
    });
}

// ========== 카드 로드 ==========
async function loadCards() {
    try {
        const response = await fetch('/api/cards');
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

    let dueDateHtml = '';
    if (card.due_date) {
        const dueDate = new Date(card.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);

        let dueDateClass = 'card-due-date';
        if (dueDateOnly < today) {
            dueDateClass += ' overdue';
        } else if (dueDateOnly.getTime() === today.getTime()) {
            dueDateClass += ' today';
        }

        dueDateHtml = `
            <div class="${dueDateClass}">
                📅 ${dueDate.toLocaleDateString('ko-KR')}
            </div>
        `;
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
        ${dueDateHtml}
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

                await fetch(`/api/cards/${cardId}`, {
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
        const response = await fetch(`/api/cards/${cardId}`);
        const card = await response.json();
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        
        content.innerHTML = `
            <div class="detail-header">
                <div class="detail-title-section">
                    <h2 class="detail-title">
                        ${issueIcons[card.issue_type] || ''} 
                        ${card.title}
                    </h2>
                    <div class="detail-meta">
                        <span class="priority-badge">${priorityIcons[card.priority] || ''}</span>
                        ${card.assignee ? `<span class="card-assignee">👤 ${card.assignee}</span>` : ''}
                        ${card.git_issue ? `<span class="git-issue">🔗 ${card.git_issue}</span>` : ''}
                        ${card.due_date ? `<span class="meta-item">📅 ${card.due_date}</span>` : ''}
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn-edit" onclick="editCard(${card.id})">✏️ 수정</button>
                    ${card.column_name === 'done' ? `
                        <button class="btn-archive" onclick="archiveCard(${card.id})">📦 보관</button>
                    ` : ''}
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
    } catch (error) {
        console.error('카드 상세 정보 로드 실패:', error);
    }
}

// ========== 카드 보관 ==========
async function archiveCard(cardId) {
    if (!confirm('이 카드를 보관하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cards/${cardId}/archive`, {
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
        await fetch(`/api/cards/${cardId}`, {
            method: 'DELETE'
        });

        closeDetailModal();
        showNotification('카드가 삭제되었습니다');
        await loadCards();
    } catch (error) {
        console.error('카드 삭제 실패:', error);
    }
}

// ========== 카드 수정 ==========
function editCard(cardId) {
    alert('수정 기능은 추후 구현 예정입니다');
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
            
            const cardData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                git_issue: document.getElementById('gitIssue').value,
                assignee: document.getElementById('assignee').value,
                label: document.getElementById('label').value,
                issue_type: document.getElementById('issueType').value,
                priority: document.getElementById('priority').value,
                due_date: document.getElementById('dueDate').value,
                column_name: document.getElementById('columnName').value
            };
            
            try {
                const response = await fetch('/api/cards', {
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
                }
            } catch (error) {
                console.error('카드 생성 실패:', error);
                alert('카드 생성에 실패했습니다.');
            }
        });
    }
    
    // 모달 닫기 (외부 클릭)
    const detailModal = document.getElementById('detailModal');
    const closeDetail = document.getElementById('closeDetail');
    
    if (closeDetail) {
        closeDetail.addEventListener('click', closeDetailModal);
    }
    
    window.onclick = function(event) {
        if (cardModal && event.target == cardModal) {
            cardModal.style.display = 'none';
        }
        if (detailModal && event.target == detailModal) {
            closeDetailModal();
        }
    };
}

// ========== 페이지 로드 시 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ 페이지 로드 시작');
    
    // 1. 전역 변수 초기화
    currentView = 'week';
    currentDate = new Date();
    
    // 2. 카드 로드 (renderCalendar 포함)
    loadCards();
    
    // 3. 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('✅ 초기화 완료');
});
