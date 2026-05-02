document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('current-date');
    const todoList = document.getElementById('todo-list');
    const timeBar = document.getElementById('time-bar');
    
    let currentUser = localStorage.getItem('planner-user') || "";
    let currentView = 'daily';
    dateInput.value = new Date().toISOString().split('T')[0];

    // 데이터 관리
    const getStore = (key) => JSON.parse(localStorage.getItem(`pln_${currentUser}_${key}`)) || [];
    const setStore = (key, val) => localStorage.setItem(`pln_${currentUser}_${key}`, JSON.stringify(val));

    // 모달 제어
    window.toggleModal = (id) => {
        const m = document.getElementById(id);
        m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
        if (m.style.display === 'flex') updateSelectors();
    };

    // 셀렉트 박스 동기화
    function updateSelectors() {
        const books = getStore('books');
        const exams = getStore('exams');
        const cats = getStore('categories');

        const catSelect = document.getElementById('todo-category-select');
        catSelect.innerHTML = '<option value="일반">일반</option>';
        if(exams.length) catSelect.innerHTML += `<optgroup label="시험">${exams.map(e=>`<option value="${e.name}">${e.name}</option>`).join('')}</optgroup>`;
        if(cats.length) catSelect.innerHTML += `<optgroup label="카테고리">${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}</optgroup>`;

        document.getElementById('todo-book-select').innerHTML = '<option value="">연동 안 함</option>' + 
            books.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

        document.getElementById('modal-book-list').innerHTML = books.map(b => `<li>${b.name} (${b.cur}/${b.totalPages}p)</li>`).join('');
        document.getElementById('modal-exam-list').innerHTML = exams.map(e => `<li>${e.name} (${e.date})</li>`).join('');
        document.getElementById('modal-cat-list').innerHTML = cats.map(c => `<li>${c} <button onclick="deleteItem('categories','${c}')">✕</button></li>`).join('');
    }

    window.deleteItem = (key, val) => {
        let items = getStore(key);
        if(key === 'categories') items = items.filter(i => i !== val);
        setStore(key, items); updateSelectors();
    };

    // 메인 렌더링
    function updateDisplay() {
        if (!currentUser) return;
        todoList.innerHTML = '';
        timeBar.innerHTML = Array(24).fill().map((_, i) => `<div class="hour-slot" id="h-${i}"></div>`).join('');
        
        if (currentView === 'daily') {
            document.getElementById('report-section').style.display = 'none';
            document.getElementById('daily-time-bar-container').style.display = 'block';
            renderDaily();
        } else {
            document.getElementById('report-section').style.display = 'block';
            document.getElementById('daily-time-bar-container').style.display = 'none';
            renderReport();
        }
    }

    function renderDaily() {
        const todos = getStore(dateInput.value);
        const exams = getStore('exams');

        todos.forEach((item, idx) => {
            const exam = exams.find(e => e.name === item.category);
            let dday = "";
            if (exam) {
                const diff = Math.ceil((new Date(exam.date) - new Date(dateInput.value)) / (86400000));
                dday = `<span class="dday-badge">D${diff === 0 ? '-Day' : (diff>0?'-'+diff:'+'+Math.abs(diff))}</span>`;
            }

            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <span class="cat-badge">${item.category}</span>${dday}
                    <div style="font-weight:bold; margin-top:5px;">${item.title}</div>
                    ${item.book ? `<small style="color:var(--primary)">📖 ${item.book} (${item.sP}~${item.eP}p)</small>` : ''}
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="done-btn" ${item.completed?'disabled':''}>${item.completed?'✓':'완료'}</button>
                    <button class="del-btn" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
                </div>`;

            if (item.completed) {
                li.style.opacity = '0.5';
                for(let i=parseInt(item.start); i<=parseInt(item.end); i++) document.getElementById(`h-${i}`)?.classList.add('active-hour');
            }

            li.querySelector('.done-btn').onclick = () => {
                item.completed = true;
                if (item.book) {
                    const books = getStore('books');
                    const bIdx = books.findIndex(b => b.name === item.book);
                    if (bIdx > -1) { books[bIdx].cur = Math.max(books[bIdx].cur, item.eP); setStore('books', books); }
                }
                todos[idx] = item; setStore(dateInput.value, todos); updateDisplay();
            };
            li.querySelector('.del-btn').onclick = () => { if(confirm("삭제할까요?")) { todos.splice(idx, 1); setStore(dateInput.value, todos); updateDisplay(); }};
            todoList.appendChild(li);
        });
    }

    function renderReport() {
        const days = currentView === 'weekly' ? 7 : 30;
        document.getElementById('report-title').innerText = `${currentView === 'weekly' ? '주간' : '월간'} 성실도 (최근 ${days}일)`;

        // 교재 진도
        const books = getStore('books');
        document.getElementById('book-progress-area').innerHTML = '<h3>📖 교재 진도</h3>' + books.map(b => {
            const p = Math.min(100, Math.round((b.cur / b.totalPages) * 100));
            return `<div class="stat-card">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span>${b.name}</span><span>${p}%</span></div>
                <div class="progress-container"><div class="progress-bar" style="width:${p}%; background:var(--primary);"></div></div>
            </div>`;
        }).join('');

        // 카테고리 통계 (수정된 로직: 완료횟수 / 기간일수)
        const counts = {};
        const today = new Date(dateInput.value);
        for(let i=0; i<days; i++) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            getStore(d.toISOString().split('T')[0]).forEach(t => {
                if(t.completed) counts[t.category] = (counts[t.category] || 0) + 1;
            });
        }

        const sArea = document.getElementById('category-stats-area');
        sArea.innerHTML = '';
        Object.entries(counts).forEach(([cat, count]) => {
            const p = Math.round((count / days) * 100);
            sArea.innerHTML += `<div class="stat-card">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:bold;">
                    <span>${cat}</span><span>${count}회 / ${days}일 (${p}%)</span>
                </div>
                <div class="progress-container"><div class="progress-bar" style="width:${Math.min(100, p)}%; background:${p>=100?'#ff9500':'#34c759'};"></div></div>
            </div>`;
        });
    }

    // 버튼 이벤트들
    document.getElementById('save-user-btn').onclick = () => {
        const u = document.getElementById('user-name-input').value.trim();
        if(u) { localStorage.setItem('planner-user', u); location.reload(); }
    };
    document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('planner-user'); location.reload(); };

    document.getElementById('add-book-btn').onclick = () => {
        const n = document.getElementById('new-book-name').value, t = document.getElementById('new-book-total').value;
        if(n && t) { const b = getStore('books'); b.push({name:n, totalPages:t, cur:0}); setStore('books', b); updateSelectors(); }
    };
    document.getElementById('add-exam-btn').onclick = () => {
        const n = document.getElementById('new-exam-name').value, d = document.getElementById('new-exam-date').value;
        if(n && d) { const e = getStore('exams'); e.push({name:n, date:d}); setStore('exams', e); updateSelectors(); }
    };
    document.getElementById('add-cat-btn').onclick = () => {
        const n = document.getElementById('new-cat-name').value.trim();
        if(n) { const c = getStore('categories'); if(!c.includes(n)) c.push(n); setStore('categories', c); updateSelectors(); }
    };

    document.getElementById('final-add-btn').onclick = () => {
        const t = getStore(dateInput.value);
        t.push({
            category: document.getElementById('todo-category-select').value,
            title: document.getElementById('todo-title').value,
            book: document.getElementById('todo-book-select').value,
            sP: parseInt(document.getElementById('todo-start-p').value) || 0,
            eP: parseInt(document.getElementById('todo-end-p').value) || 0,
            start: document.getElementById('start-t').value,
            end: document.getElementById('end-t').value,
            completed: false
        });
        setStore(dateInput.value, t); toggleModal('todo-modal'); updateDisplay();
    };

    // 날짜 이동 유틸
    const move = (n) => { const d = new Date(dateInput.value); d.setDate(d.getDate()+n); dateInput.value = d.toISOString().split('T')[0]; updateDisplay(); };
    document.getElementById('prev-date').onclick = () => move(-1);
    document.getElementById('next-date').onclick = () => move(1);
    document.getElementById('prev-week').onclick = () => move(-7);
    document.getElementById('next-week').onclick = () => move(7);
    dateInput.onchange = updateDisplay;

    document.querySelectorAll('.view-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active'); currentView = b.dataset.view; updateDisplay();
    });

    document.getElementById('open-todo-modal-btn').onclick = () => toggleModal('todo-modal');
    for(let i=0; i<24; i++) { 
        document.getElementById('start-t').add(new Option(i, i)); 
        document.getElementById('end-t').add(new Option(i, i)); 
    }

    if(currentUser) {
        document.getElementById('user-login').style.display = 'none';
        document.getElementById('user-welcome').style.display = 'block';
        document.getElementById('display-name').innerText = currentUser;
        updateDisplay();
    }
});