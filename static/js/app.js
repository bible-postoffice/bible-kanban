// Supabase 환경변수 (HTML에서 전달받음)
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;
const API_URL = 'http://localhost:5001/api';

// 전역 변수
let currentDate = new Date();
let allCards = [];
let currentView = 'month'; // 월별/주별 뷰 상태

// 모달 관련
const modal = document.getElementById('cardModal');
const detailModal = document.getElementById('detailModal');
const addCardBtn = document.getElementById('addCardBtn');
const closeBtn = document.querySelector('.close');
const closeDetail = document.getElementById('closeDetail');
const cardForm = document.getElementById('cardForm');
const toggleViewBtn = document.getElementById('toggleViewBtn');
const calendarSection = document.getElementById('calendarSection');

// 이벤트 리스너
addCardBtn.onclick = () => modal.style.display = 'block';
closeBtn.onclick = () => modal.style.display = 'none';
closeDetail.onclick = () => detailModal.style.display = 'none';

toggleViewBtn.onclick = () => {
    calendarSection.classList.toggle('hidden');
};

window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === detailModal) detailModal.style.display = 'none';
};

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

// 뷰 전환 버튼 이벤트 리스너 (버튼이 있을 때만 실행)
const monthViewBtn = document.getElementById('monthViewBtn');
const weekViewBtn = document.getElementById('weekViewBtn');

if (monthViewBtn && weekViewBtn) {
    monthViewBtn.onclick = () => {
        currentView = 'month';
        monthViewBtn.classList.add('active');
        weekViewBtn.classList.remove('active');
        renderCalendar();
    };

    weekViewBtn.onclick = () => {
        currentView = 'week';
        weekViewBtn.classList.add('active');
        monthViewBtn.classList.remove('active');
        renderCalendar();
    };
}

// 달력 이전/다음 버튼
document.getElementById('prevMonth').onclick = () => {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCalendar();
};

document.getElementById('nextMonth').onclick = () => {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCalendar();
};

// 실시간 업데이트 표시
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

// 달력 렌더링 (뷰에 따라 분기)
function renderCalendar() {
    if (currentView === 'month') {
        renderMonthView();
    } else {
        renderWeekView();
    }
}

// 월별 뷰 렌더링
function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                        '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;

    const calendarGrid = document.getElementById('calendarGrid');
    const dayCells = calendarGrid.querySelectorAll('.calendar-day');
    dayCells.forEach(cell => cell.remove());

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
    const dayCells = calendarGrid.querySelectorAll('.calendar-day');
    dayCells.forEach(cell => cell.remove());

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
            const cardId = card.id;
            
            calendarCard.onclick = (e) => {
                e.stopPropagation();
                showCardDetail(cardId);
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

// 카드 로드
async function loadCards() {
    const response = await fetch(`${API_URL}/cards`);
    const cards = await response.json();
    allCards = cards;

    document.querySelectorAll('.cards-container').forEach(c => c.innerHTML = '');

    cards.forEach(card => {
        const cardElement = createCardElement(card);
        document.getElementById(`${card.column_name}-cards`).appendChild(cardElement);
    });

    renderCalendar();
    initSortable();
}

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

function initSortable() {
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'cards',
            animation: 150,
            onEnd: async (evt) => {
                const cardId = evt.item.dataset.id;
                const newColumn = evt.to.dataset.column;

                await fetch(`${API_URL}/cards/${cardId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ column_name: newColumn })
                });

                showNotification('카드가 이동되었습니다');
                await loadCards();
            }
        });
    });
}

async function showCardDetail(cardId) {
    const response = await fetch(`${API_URL}/cards/${cardId}`);
    const card = await response.json();

    const commentsResponse = await fetch(`${API_URL}/cards/${cardId}/comments`);
    const comments = await commentsResponse.json();

    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = `
        <div class="detail-header">
            <div class="detail-title-section">
                <div class="detail-title">
                    ${issueIcons[card.issue_type]} ${card.title}
                </div>
                <div class="detail-meta">
                    <span class="meta-item">${priorityIcons[card.priority]} ${card.priority}</span>
                    ${card.assignee ? `<span class="card-assignee">👤 ${card.assignee}</span>` : ''}
                    ${card.git_issue ? `<span class="git-issue">🔗 ${card.git_issue}</span>` : ''}
                    ${card.due_date ? `<span class="meta-item">📅 ${new Date(card.due_date).toLocaleDateString('ko-KR')}</span>` : ''}
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn-edit" onclick="editCard(${card.id})">수정</button>
                <button class="btn-delete" onclick="deleteCard(${card.id})">삭제</button>
            </div>
        </div>

        <div class="detail-section">
            <h3>📝 설명</h3>
            <div class="detail-description">${card.description || '설명이 없습니다.'}</div>
        </div>

        <div class="detail-section">
            <h3>💬 댓글 (${comments.length})</h3>
            <div class="comments-list">
                ${comments.map(c => `
                    <div class="comment-item">
                        <div class="comment-author">${c.author}</div>
                        <div class="comment-time">${new Date(c.created_at).toLocaleString('ko-KR')}</div>
                        <div class="comment-content">${c.content}</div>
                    </div>
                `).join('') || '<p style="color: #95a5a6;">댓글이 없습니다.</p>'}
            </div>
            <div class="comment-form">
                <input type="text" id="commentAuthor" class="comment-input" placeholder="이름" style="flex: 0.3;">
                <input type="text" id="commentContent" class="comment-input" placeholder="댓글을 입력하세요" style="flex: 1;">
                <button class="btn-comment" onclick="addComment(${card.id})">작성</button>
            </div>
        </div>
    `;

    detailModal.style.display = 'block';
}

async function addComment(cardId) {
    const author = document.getElementById('commentAuthor').value;
    const content = document.getElementById('commentContent').value;

    if (!author || !content) {
        alert('이름과 댓글 내용을 입력하세요');
        return;
    }

    await fetch(`${API_URL}/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content })
    });

    showNotification('댓글이 추가되었습니다');
    showCardDetail(cardId);
}

cardForm.onsubmit = async (e) => {
    e.preventDefault();

    const cardData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        assignee: document.getElementById('assignee').value,
        issue_type: document.getElementById('issueType').value,
        priority: document.getElementById('priority').value,
        due_date: document.getElementById('dueDate').value || null,
        column_name: document.getElementById('columnName').value,
        git_issue: document.getElementById('gitIssue').value
    };

    await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
    });

    modal.style.display = 'none';
    cardForm.reset();
    showNotification('카드가 추가되었습니다');
    await loadCards();
};

async function deleteCard(cardId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    await fetch(`${API_URL}/cards/${cardId}`, {
        method: 'DELETE'
    });

    detailModal.style.display = 'none';
    showNotification('카드가 삭제되었습니다');
    await loadCards();
}

function editCard(cardId) {
    alert('수정 기능은 추후 구현 예정입니다');
}

loadCards();
