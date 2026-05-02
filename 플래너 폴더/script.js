const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

// 할 일 추가 함수
function addTodo() {
    if (input.value.trim() === '') return; // 빈 칸이면 실행 안 함

    const li = document.createElement('li');
    li.innerHTML = `
        <span class="todo-text">${input.value}</span>
        <button class="delete-btn">삭제</button>
    `;

    // 클릭하면 완료 체크 기능
    li.querySelector('.todo-text').addEventListener('click', function() {
        this.classList.toggle('completed');
    });

    // 삭제 버튼 기능
    li.querySelector('.delete-btn').addEventListener('click', function() {
        li.remove();
    });

    todoList.appendChild(li);
    input.value = ''; // 입력창 비우기
}

// 버튼 클릭 시 추가
addBtn.addEventListener('click', addTodo);

// 엔터 키 눌렀을 때 추가
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});